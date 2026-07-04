#!/usr/bin/env python3

import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print(
            "Usage: prepare-webhook-env.py <service-account-json> <spreadsheet-id>",
            file=sys.stderr,
        )
        return 1

    service_account_path = Path(sys.argv[1]).expanduser()
    spreadsheet_id = sys.argv[2].strip()

    if not service_account_path.exists():
        print(f"Service account file not found: {service_account_path}", file=sys.stderr)
        return 1

    payload = json.loads(service_account_path.read_text())
    private_key = payload["private_key"].replace("\n", "\\n")

    env = {
        "GOOGLE_SERVICE_ACCOUNT_EMAIL": payload["client_email"],
        "GOOGLE_PRIVATE_KEY": private_key,
        "GOOGLE_SHEETS_SPREADSHEET_ID": spreadsheet_id,
        "GOOGLE_SHEETS_DONATIONS_RANGE": "Donations!A:AA",
        "GOOGLE_SHEETS_PAYOUTS_RANGE": "Payouts!A:I",
        "GOOGLE_SHEETS_PAYOUT_TXNS_RANGE": "Payout Transactions!A:U",
        "GOOGLE_SHEETS_EVENT_LOG_RANGE": "Event Log!A:C",
        "DISPLAY_TIME_ZONE": "Australia/Melbourne",
    }

    print(json.dumps(env, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
