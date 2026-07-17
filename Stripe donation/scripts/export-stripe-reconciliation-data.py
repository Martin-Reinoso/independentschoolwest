import csv
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path


STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY") or os.environ.get("STRIPE_RESTRICTED_KEY") or ""
API_BASE = "https://api.stripe.com/v1"
MELBOURNE_OFFSET_STANDARD = timedelta(hours=10)
MELBOURNE_OFFSET_DST = timedelta(hours=11)


def parse_args(argv):
    days = 90
    out_dir = None
    index = 0
    while index < len(argv):
        arg = argv[index]
        if arg.startswith("--days="):
            days = int(arg.split("=", 1)[1])
        elif arg == "--days" and index + 1 < len(argv):
            index += 1
            days = int(argv[index])
        elif arg.startswith("--out-dir="):
            out_dir = arg.split("=", 1)[1]
        elif arg == "--out-dir" and index + 1 < len(argv):
            index += 1
            out_dir = argv[index]
        index += 1
    if days < 1:
        raise ValueError("--days must be positive")
    if out_dir is None:
        out_dir = ".codex-temp/stripe-recon/data"
    return days, Path(out_dir)


def stripe_request(endpoint, params=None):
    if not STRIPE_SECRET_KEY:
        raise RuntimeError("Missing STRIPE_SECRET_KEY or STRIPE_RESTRICTED_KEY.")

    params = params or {}
    query = urllib.parse.urlencode(params, doseq=True)
    url = f"{API_BASE}{endpoint}"
    if query:
        url = f"{url}?{query}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {STRIPE_SECRET_KEY}"})
    with urllib.request.urlopen(req) as response:
        return json.load(response)


def stripe_list(endpoint, params=None, limit=100):
    params = dict(params or {})
    results = []
    starting_after = None
    while len(results) < limit:
        page_limit = min(100, limit - len(results))
        page_params = dict(params)
        page_params["limit"] = page_limit
        if starting_after:
            page_params["starting_after"] = starting_after
        payload = stripe_request(endpoint, page_params)
        data = payload.get("data", [])
        results.extend(data)
        if not payload.get("has_more") or not data:
            break
        starting_after = data[-1]["id"]
    return results


def melbourne_datetime(ts):
    utc_dt = datetime.fromtimestamp(ts, tz=timezone.utc)
    year = utc_dt.year

    def first_sunday(year_num, month_num):
        dt = datetime(year_num, month_num, 1, tzinfo=timezone.utc)
        while dt.weekday() != 6:
            dt += timedelta(days=1)
        return dt

    dst_start_local = first_sunday(year, 10).replace(hour=2, minute=0, second=0)
    dst_end_local = first_sunday(year, 4).replace(hour=3, minute=0, second=0)

    dst_start_utc = (dst_start_local - MELBOURNE_OFFSET_STANDARD).replace(tzinfo=timezone.utc)
    dst_end_utc = (dst_end_local - MELBOURNE_OFFSET_DST).replace(tzinfo=timezone.utc)

    in_dst = utc_dt >= dst_start_utc or utc_dt < dst_end_utc
    offset = MELBOURNE_OFFSET_DST if in_dst else MELBOURNE_OFFSET_STANDARD
    return (utc_dt + offset).replace(tzinfo=None)


def fmt_date(ts):
    return melbourne_datetime(ts).strftime("%Y-%m-%d")


def fmt_time(ts):
    return melbourne_datetime(ts).strftime("%H:%M:%S")


def amount_decimal(cents):
    if cents is None:
        return ""
    return f"{cents / 100:.2f}"


def custom_field_map(custom_fields):
    mapped = {}
    for field in custom_fields or []:
        key = field.get("key")
        if not key:
            continue
        text = field.get("text") or {}
        mapped[key] = text.get("value") or ""
    return mapped


def donation_rows(checkout_sessions, invoices):
    rows = []
    by_invoice = {}
    by_payment_intent = {}

    subscription_session_by_id = {}
    for session in checkout_sessions:
        if session.get("mode") == "subscription" and session.get("subscription"):
            subscription_session_by_id[session["subscription"]] = session

    for session in checkout_sessions:
        metadata = session.get("metadata") or {}
        if metadata.get("donation_mode") != "oneTime" or session.get("payment_status") != "paid":
            continue

        fields = custom_field_map(session.get("custom_fields"))
        payment_intent_id = session.get("payment_intent")
        if isinstance(payment_intent_id, dict):
            payment_intent_id = payment_intent_id.get("id")

        donor_name = " ".join(filter(None, [fields.get("first_name", ""), fields.get("last_name", "")])).strip() or (
            (session.get("customer_details") or {}).get("name") or ""
        )
        row = {
            "donation_key": session["id"],
            "transaction_date": fmt_date(session["created"]),
            "transaction_time": fmt_time(session["created"]),
            "mode": "oneTime",
            "amount": amount_decimal(session.get("amount_total")),
            "currency": (session.get("currency") or "").upper(),
            "payment_status": session.get("payment_status") or "",
            "donor_email": (session.get("customer_details") or {}).get("email") or session.get("customer_email") or "",
            "donor_name": donor_name,
            "first_name": fields.get("first_name", ""),
            "last_name": fields.get("last_name", ""),
            "message": fields.get("message", ""),
            "invoice_id": session.get("invoice") or "",
            "payment_intent_id": payment_intent_id or "",
            "checkout_session_id": session["id"],
            "subscription_id": "",
            "stripe_hosted_receipt_url": "",
            "charge_id": "",
            "charge_date": "",
            "charge_time": "",
            "gross_amount": "",
            "stripe_fee": "",
            "net_amount": "",
            "payout_id": "",
            "payout_date": "",
            "payout_time": "",
            "payout_arrival_date": "",
            "payout_amount": "",
            "payout_status": "",
            "payout_trace_id": "",
            "reconciliation_note": "",
        }
        rows.append(row)
        if row["invoice_id"]:
            by_invoice[row["invoice_id"]] = row
        if row["payment_intent_id"]:
            by_payment_intent[row["payment_intent_id"]] = row

    for invoice in invoices:
        lines = (invoice.get("lines") or {}).get("data") or []
        donation_line = next((line for line in lines if (line.get("metadata") or {}).get("donation_mode") == "monthly"), None)
        if not donation_line or invoice.get("status") != "paid":
            continue

        subscription_id = (((donation_line.get("parent") or {}).get("subscription_item_details") or {}).get("subscription")) or ""
        session = subscription_session_by_id.get(subscription_id)
        fields = custom_field_map((session or {}).get("custom_fields") or [])
        donor_name = " ".join(filter(None, [fields.get("first_name", ""), fields.get("last_name", "")])).strip() or invoice.get(
            "customer_name", ""
        )
        row = {
            "donation_key": invoice["id"],
            "transaction_date": fmt_date(invoice["created"]),
            "transaction_time": fmt_time(invoice["created"]),
            "mode": "monthly",
            "amount": amount_decimal(invoice.get("amount_paid")),
            "currency": (invoice.get("currency") or "").upper(),
            "payment_status": invoice.get("status") or "",
            "donor_email": invoice.get("customer_email") or ((session or {}).get("customer_details") or {}).get("email") or "",
            "donor_name": donor_name,
            "first_name": fields.get("first_name", ""),
            "last_name": fields.get("last_name", ""),
            "message": fields.get("message", ""),
            "invoice_id": invoice["id"],
            "payment_intent_id": invoice.get("payment_intent") or "",
            "checkout_session_id": (session or {}).get("id") or "",
            "subscription_id": subscription_id,
            "stripe_hosted_receipt_url": invoice.get("hosted_invoice_url") or invoice.get("invoice_pdf") or "",
            "charge_id": "",
            "charge_date": "",
            "charge_time": "",
            "gross_amount": "",
            "stripe_fee": "",
            "net_amount": "",
            "payout_id": "",
            "payout_date": "",
            "payout_time": "",
            "payout_arrival_date": "",
            "payout_amount": "",
            "payout_status": "",
            "payout_trace_id": "",
            "reconciliation_note": "",
        }
        rows.append(row)
        by_invoice[row["invoice_id"]] = row
        if row["payment_intent_id"]:
            by_payment_intent[row["payment_intent_id"]] = row

    return rows, by_invoice, by_payment_intent


def charge_preference_key(charge):
    has_balance_txn = 1 if charge.get("balance_transaction") else 0
    captured = 1 if charge.get("captured") else 0
    paid = 1 if charge.get("paid") else 0
    created = charge.get("created") or 0
    return (has_balance_txn, captured, paid, created)


def payout_transaction_rows(payouts):
    rows = []
    payout_summary = {}
    charge_to_payout = {}

    for payout in payouts:
        payout_id = payout["id"]
        balance_txns = stripe_list(
            "/balance_transactions",
            {"payout": payout_id, "expand[]": ["data.source"]},
            limit=500,
        )

        gross = 0
        fees = 0
        net_contribution = 0
        adjustment_total = 0
        charge_count = 0
        refund_count = 0

        for txn in balance_txns:
            source = txn.get("source")
            source_id = source.get("id") if isinstance(source, dict) else source
            source_type = source.get("object") if isinstance(source, dict) else ""
            reporting_category = txn.get("reporting_category") or ""

            row = {
                "payout_id": payout_id,
                "payout_date": fmt_date(payout["created"]),
                "payout_time": fmt_time(payout["created"]),
                "payout_arrival_date": fmt_date(payout["arrival_date"]) if payout.get("arrival_date") else "",
                "payout_status": payout.get("status") or "",
                "payout_trace_id": ((payout.get("trace_id") or {}).get("value")) or "",
                "payout_amount": amount_decimal(payout.get("amount")),
                "balance_transaction_id": txn["id"],
                "available_on_date": fmt_date(txn["available_on"]) if txn.get("available_on") else "",
                "reporting_category": reporting_category,
                "type": txn.get("type") or "",
                "description": txn.get("description") or "",
                "source_id": source_id or "",
                "source_object": source_type or "",
                "amount": amount_decimal(txn.get("amount")),
                "fee": amount_decimal(txn.get("fee")),
                "net": amount_decimal(txn.get("net")),
                "currency": (txn.get("currency") or "").upper(),
                "source_invoice_id": "",
                "source_payment_intent_id": "",
                "source_receipt_url": "",
            }

            if source_type == "charge":
                charge_count += 1
                gross += txn.get("amount", 0)
                fees += txn.get("fee", 0)
                net_contribution += txn.get("net", 0)
                row["source_invoice_id"] = source.get("invoice") or ""
                payment_intent_id = source.get("payment_intent")
                if isinstance(payment_intent_id, dict):
                    payment_intent_id = payment_intent_id.get("id")
                row["source_payment_intent_id"] = payment_intent_id or ""
                row["source_receipt_url"] = source.get("receipt_url") or ""
                charge_to_payout[source["id"]] = payout_id
            elif source_type == "refund":
                refund_count += 1
                gross += txn.get("amount", 0)
                fees += txn.get("fee", 0)
                net_contribution += txn.get("net", 0)
            elif reporting_category == "fee":
                adjustment_total += txn.get("net", 0)
                net_contribution += txn.get("net", 0)

            rows.append(row)

        payout_summary[payout_id] = {
            "payout_id": payout_id,
            "payout_date": fmt_date(payout["created"]),
            "payout_time": fmt_time(payout["created"]),
            "payout_arrival_date": fmt_date(payout["arrival_date"]) if payout.get("arrival_date") else "",
            "payout_status": payout.get("status") or "",
            "payout_trace_id": ((payout.get("trace_id") or {}).get("value")) or "",
            "payout_amount": amount_decimal(payout.get("amount")),
            "currency": (payout.get("currency") or "").upper(),
            "gross_charges_in_payout": amount_decimal(gross),
            "stripe_fees_in_payout": amount_decimal(fees),
            "net_transactions_in_payout": amount_decimal(net_contribution),
            "adjustment_total": amount_decimal(adjustment_total),
            "charge_count": charge_count,
            "refund_count": refund_count,
        }

    return rows, payout_summary, charge_to_payout


def enrich_donations_with_charge_data(rows, by_invoice, by_payment_intent, payout_id_by_charge, payout_lookup):
    charges = stripe_list(
        "/charges",
        {"created[gte]": int(time.time()) - 365 * 24 * 60 * 60, "expand[]": ["data.balance_transaction"]},
        limit=300,
    )
    charges_by_id = {charge["id"]: charge for charge in charges}

    rows_by_key = {row["donation_key"]: row for row in rows}
    charges_sorted = sorted(charges, key=charge_preference_key)
    for charge in charges_sorted:
        invoice_id = charge.get("invoice") or ""
        payment_intent_id = charge.get("payment_intent")
        if isinstance(payment_intent_id, dict):
            payment_intent_id = payment_intent_id.get("id")

        donation = None
        if invoice_id and invoice_id in by_invoice:
            donation = by_invoice[invoice_id]
        elif payment_intent_id and payment_intent_id in by_payment_intent:
            donation = by_payment_intent[payment_intent_id]

        if not donation:
            continue

        existing_charge = charges_by_id.get(donation.get("charge_id"))
        if existing_charge and charge_preference_key(existing_charge) > charge_preference_key(charge):
            continue

        donation["charge_id"] = charge["id"]
        donation["charge_date"] = fmt_date(charge["created"])
        donation["charge_time"] = fmt_time(charge["created"])
        donation["gross_amount"] = amount_decimal(charge.get("amount"))
        donation["stripe_fee"] = amount_decimal((charge.get("balance_transaction") or {}).get("fee")) if isinstance(charge.get("balance_transaction"), dict) else donation["stripe_fee"]
        donation["stripe_hosted_receipt_url"] = donation["stripe_hosted_receipt_url"] or charge.get("receipt_url") or ""

        payout_id = payout_id_by_charge.get(charge["id"], "")
        if payout_id and payout_id in payout_lookup:
            payout = payout_lookup[payout_id]
            donation["payout_id"] = payout_id
            donation["payout_date"] = payout["payout_date"]
            donation["payout_time"] = payout["payout_time"]
            donation["payout_arrival_date"] = payout["payout_arrival_date"]
            donation["payout_amount"] = payout["payout_amount"]
            donation["payout_status"] = payout["payout_status"]
            donation["payout_trace_id"] = payout["payout_trace_id"]

        charge_bt = charge.get("balance_transaction")
        if isinstance(charge_bt, dict):
            donation["stripe_fee"] = amount_decimal(charge_bt.get("fee"))
            donation["net_amount"] = amount_decimal(charge_bt.get("net"))

    for row in rows_by_key.values():
        if row["mode"] == "monthly" and not row["charge_id"] and row["invoice_id"]:
            invoice_charges = stripe_list("/charges", {"invoice": row["invoice_id"], "expand[]": ["data.balance_transaction"]}, limit=5)
            if invoice_charges:
                charge = sorted(invoice_charges, key=charge_preference_key)[-1]
                row["charge_id"] = charge["id"]
                row["charge_date"] = fmt_date(charge["created"])
                row["charge_time"] = fmt_time(charge["created"])
                row["gross_amount"] = amount_decimal(charge.get("amount"))
                row["stripe_hosted_receipt_url"] = row["stripe_hosted_receipt_url"] or charge.get("receipt_url") or ""

                charge_bt_ref = charge.get("balance_transaction")
                if charge_bt_ref:
                    charge_bt = charge_bt_ref if isinstance(charge_bt_ref, dict) else stripe_request(f"/balance_transactions/{charge_bt_ref}")
                    row["stripe_fee"] = amount_decimal(charge_bt.get("fee"))
                    row["net_amount"] = amount_decimal(charge_bt.get("net"))

                payout_id = payout_id_by_charge.get(charge["id"], "")
                if payout_id and payout_id in payout_lookup:
                    payout = payout_lookup[payout_id]
                    row["payout_id"] = payout_id
                    row["payout_date"] = payout["payout_date"]
                    row["payout_time"] = payout["payout_time"]
                    row["payout_arrival_date"] = payout["payout_arrival_date"]
                    row["payout_amount"] = payout["payout_amount"]
                    row["payout_status"] = payout["payout_status"]
                    row["payout_trace_id"] = payout["payout_trace_id"]

        if row["payout_id"]:
            row["reconciliation_note"] = "Included in Stripe payout shown in payout columns."
        else:
            row["reconciliation_note"] = "Not yet linked to an automatic payout in the retrieved window."

    return charges_by_id


def supplemental_donation_rows(rows, payout_transactions, charges_by_id, payout_lookup, existing_charge_ids):
    supplemental = []
    for txn in payout_transactions:
        if txn.get("type") != "charge":
            continue

        charge_id = txn.get("source_id") or ""
        if not charge_id or charge_id in existing_charge_ids:
            continue

        charge = charges_by_id.get(charge_id)
        if not charge:
            charge = stripe_request(f"/charges/{charge_id}", {"expand[]": ["balance_transaction"]})
            charges_by_id[charge_id] = charge

        billing = charge.get("billing_details") or {}
        metadata = charge.get("metadata") or {}
        donor_name = (billing.get("name") or metadata.get("fullName") or "").strip()
        first_name = (metadata.get("first_name") or "").strip()
        last_name = (metadata.get("last_name") or "").strip()
        if not first_name and donor_name:
            parts = donor_name.split()
            if len(parts) > 1:
                first_name = " ".join(parts[:-1])
                last_name = parts[-1]
            else:
                first_name = donor_name
        payout = payout_lookup.get(txn["payout_id"], {})
        charge_bt = charge.get("balance_transaction") or {}

        supplemental.append(
            {
                "donation_key": f"supplemental:{charge_id}",
                "transaction_date": fmt_date(charge["created"]),
                "transaction_time": fmt_time(charge["created"]),
                "mode": "oneTime",
                "amount": amount_decimal(charge.get("amount")),
                "currency": (charge.get("currency") or "").upper(),
                "payment_status": "paid" if charge.get("paid") else charge.get("status") or "",
                "donor_email": billing.get("email") or metadata.get("email") or charge.get("receipt_email") or "",
                "donor_name": donor_name,
                "first_name": first_name,
                "last_name": last_name,
                "message": metadata.get("message") or metadata.get("note") or "",
                "invoice_id": charge.get("invoice") or "",
                "stripe_hosted_receipt_url": charge.get("receipt_url") or txn.get("source_receipt_url") or "",
                "charge_id": charge_id,
                "charge_date": fmt_date(charge["created"]),
                "charge_time": fmt_time(charge["created"]),
                "gross_amount": amount_decimal(charge.get("amount")),
                "stripe_fee": amount_decimal(charge_bt.get("fee")) if isinstance(charge_bt, dict) else txn.get("fee") or "",
                "net_amount": amount_decimal(charge_bt.get("net")) if isinstance(charge_bt, dict) else txn.get("net") or "",
                "payout_id": txn["payout_id"],
                "payout_date": payout.get("payout_date") or txn.get("payout_date") or "",
                "payout_time": payout.get("payout_time") or txn.get("payout_time") or "",
                "payout_arrival_date": payout.get("payout_arrival_date") or txn.get("payout_arrival_date") or "",
                "payout_amount": payout.get("payout_amount") or txn.get("payout_amount") or "",
                "payout_status": payout.get("payout_status") or txn.get("payout_status") or "",
                "payout_trace_id": payout.get("payout_trace_id") or txn.get("payout_trace_id") or "",
                "reconciliation_note": "Backfilled from Stripe payout charge data.",
            }
        )
        existing_charge_ids.add(charge_id)

    rows.extend(supplemental)
    return supplemental


def write_csv(path, rows, fieldnames):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def main(argv):
    days, out_dir = parse_args(argv)
    since = int(time.time()) - days * 24 * 60 * 60

    checkout_sessions = stripe_list("/checkout/sessions", {"created[gte]": since}, limit=250)
    invoices = stripe_list("/invoices", {"status": "paid", "created[gte]": since}, limit=250)
    payouts = stripe_list("/payouts", {"created[gte]": since}, limit=100)

    donations, by_invoice, by_payment_intent = donation_rows(checkout_sessions, invoices)
    payout_transactions, payout_summary, charge_to_payout = payout_transaction_rows(payouts)
    charges_by_id = enrich_donations_with_charge_data(donations, by_invoice, by_payment_intent, charge_to_payout, payout_summary)
    existing_charge_ids = {row["charge_id"] for row in donations if row.get("charge_id")}
    supplemental_donation_rows(donations, payout_transactions, charges_by_id, payout_summary, existing_charge_ids)

    payout_rows = []
    for payout_id, summary in payout_summary.items():
        gross_total = float(summary["gross_charges_in_payout"])
        net_total = float(summary["payout_amount"])
        payout_rows.append(
            {
                "payout_date": summary["payout_date"],
                "payout_id": payout_id,
                "trace_id": summary["payout_trace_id"],
                "payout_amount": summary["payout_amount"],
                "donations_grouped_in_this_payout": summary["charge_count"],
                "gross_donations_in_this_payout": f"{gross_total:.2f}",
                "fees_adjustments": f"{gross_total - net_total:.2f}",
                "net_donations_in_this_payout": f"{net_total:.2f}",
                "stripe_payout_status": summary["payout_status"],
            }
        )

    payout_rows.sort(key=lambda row: (row["payout_date"], row["payout_id"]))
    donations.sort(key=lambda row: (row["transaction_date"], row["transaction_time"]))
    payout_transactions.sort(key=lambda row: (row["payout_date"], row["payout_time"], row["available_on_date"], row["balance_transaction_id"]))

    write_csv(
        out_dir / "donations.csv",
        donations,
        [
            "transaction_date",
            "transaction_time",
            "mode",
            "amount",
            "currency",
            "payment_status",
            "donor_email",
            "donor_name",
            "first_name",
            "last_name",
            "message",
            "invoice_id",
            "stripe_hosted_receipt_url",
            "charge_id",
            "charge_date",
            "charge_time",
            "gross_amount",
            "stripe_fee",
            "net_amount",
            "payout_id",
            "payout_date",
            "payout_time",
            "payout_arrival_date",
            "payout_amount",
            "payout_status",
            "payout_trace_id",
            "reconciliation_note",
        ],
    )
    write_csv(
        out_dir / "payouts.csv",
        payout_rows,
        [
            "payout_date",
            "payout_id",
            "trace_id",
            "payout_amount",
            "donations_grouped_in_this_payout",
            "gross_donations_in_this_payout",
            "fees_adjustments",
            "net_donations_in_this_payout",
            "stripe_payout_status",
        ],
    )
    write_csv(
        out_dir / "payout_transactions.csv",
        payout_transactions,
        [
            "payout_id",
            "payout_date",
            "payout_time",
            "payout_arrival_date",
            "payout_status",
            "payout_trace_id",
            "payout_amount",
            "balance_transaction_id",
            "available_on_date",
            "reporting_category",
            "type",
            "description",
            "source_id",
            "source_object",
            "amount",
            "fee",
            "net",
            "currency",
            "source_invoice_id",
            "source_payment_intent_id",
            "source_receipt_url",
        ],
    )

    (out_dir / "donations.json").write_text(json.dumps(donations, indent=2), encoding="utf-8")
    (out_dir / "payouts.json").write_text(json.dumps(payout_rows, indent=2), encoding="utf-8")
    (out_dir / "payout_transactions.json").write_text(json.dumps(payout_transactions, indent=2), encoding="utf-8")

    summary = {
        "days": days,
        "donations": len(donations),
        "payouts": len(payout_rows),
        "payout_transactions": len(payout_transactions),
        "out_dir": str(out_dir),
    }
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main(sys.argv[1:])
