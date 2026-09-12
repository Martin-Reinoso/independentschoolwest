import { PDFDocument } from 'pdfkit';
import { fileURLToPath } from 'node:url';

const fonts = {
  regular:
    process.env.BILLING_FONT_REGULAR ||
    fileURLToPath(new URL('../assets/fonts/NotoSans-Regular.ttf', import.meta.url)),
  bold:
    process.env.BILLING_FONT_BOLD ||
    fileURLToPath(new URL('../assets/fonts/NotoSans-Bold.ttf', import.meta.url)),
};
const ink = '#193349',
  muted = '#566573',
  accent = '#146958',
  rule = '#dce3e6';
const money = (cents) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format((cents || 0) / 100);
const date = (value) =>
  !value
    ? '-'
    : /^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ? String(value).split('-').reverse().join('/')
      : new Intl.DateTimeFormat('en-AU', {
          timeZone: 'Australia/Melbourne',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(new Date(value));
const label = (value) => String(value || '').replaceAll('_', ' ');
const fail = (message) =>
  Object.assign(new Error(message), { status: 400, code: 'DOCUMENT_UNSUPPORTED_TEXT' });

/** Render only the authenticated service's document projection, never browser totals. */
export async function renderDocument(payload) {
  const { kind, document = {}, generatedAt } = payload;
  if (!['invoice', 'receipt', 'credit', 'statement'].includes(kind))
    throw fail('Unknown document type.');
  const snapshot = document.snapshot || document;
  const seller = snapshot.sellerSnapshot || document.sellerSnapshot || payload.settings || {};
  const account = snapshot.accountSnapshot || document.accountSnapshot || payload.account || {};
  const sample = Boolean(seller.demoMode || payload.settings?.demoMode);
  const number = document.number || snapshot.number || account.code || '';
  const title =
    kind === 'invoice'
      ? seller.gstRegistered && document.taxCents > 0
        ? 'Tax invoice'
        : 'Invoice'
      : kind === 'receipt'
        ? 'Payment receipt'
        : kind === 'credit'
          ? 'Credit note'
          : 'Account statement';
  const pdf = new PDFDocument({
    size: 'A4',
    margin: 42,
    bufferPages: true,
    compress: true,
    info: {
      Title: `${sample ? 'SAMPLE - ' : ''}${title} ${number}`,
      Author: seller.legalName || 'Rosewood College',
      Subject: 'School billing document',
      CreationDate: new Date(document.issuedAt || generatedAt || Date.now()),
    },
  });
  pdf.registerFont('regular', fonts.regular).registerFont('bold', fonts.bold);
  const chunks = [];
  const complete = new Promise((resolve, reject) => {
    pdf.on('data', (chunk) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
  });
  const left = 42,
    right = 553.28,
    width = right - left,
    bottom = 757;
  let y = 42;

  function text(
    value,
    x,
    at,
    w,
    { size = 9, bold = false, color = ink, align = 'left', ...options } = {},
  ) {
    const valueText = String(value ?? '');
    pdf
      .font(bold ? 'bold' : 'regular')
      .fontSize(size)
      .fillColor(color);
    // PDFKit embeds Fontkit fonts. Fail visibly for unsupported characters instead of
    // producing a legally meaningful name with missing glyphs.
    const font = pdf._font?.font;
    if (font?.hasGlyphForCodePoint) {
      for (const ch of valueText) {
        if (/\s/u.test(ch)) continue;
        if (!font.hasGlyphForCodePoint(ch.codePointAt(0)))
          throw fail(
            'A character cannot be rendered by the configured document font. Configure a font covering this language and retry.',
          );
      }
    }
    const height = pdf.heightOfString(valueText, { width: w, align, lineGap: 2, ...options });
    pdf.text(valueText, x, at, { width: w, align, lineGap: 2, ...options });
    return height;
  }
  function line(at = y) {
    pdf.moveTo(left, at).lineTo(right, at).lineWidth(0.6).strokeColor(rule).stroke();
  }
  function page() {
    pdf.addPage();
    y = 43;
    text(seller.schoolName || 'Rosewood College', left, y, 310, {
      bold: true,
      size: 10,
      height: 16,
      ellipsis: true,
    });
    text(`${title} ${number}`, 342, y, right - 342, { size: 9, align: 'right', color: muted });
    y += 26;
    line();
    y += 19;
  }
  function ensure(height) {
    if (y + height > bottom) page();
  }
  // Split at measured text boundaries before drawing. PDFKit's implicit page
  // breaks cannot coordinate adjacent columns, repeated headers or our footer.
  function fit(value, w, height, { size = 9, bold = false } = {}) {
    const points = Array.from(String(value ?? ''));
    pdf.font(bold ? 'bold' : 'regular').fontSize(size);
    const measured = (str) => pdf.heightOfString(str, { width: w, lineGap: 2 });
    let low = 0,
      high = points.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (measured(points.slice(0, mid).join('')) <= height) low = mid;
      else high = mid - 1;
    }
    if (low < points.length) {
      for (let i = low - 1; i > low * 0.8; i--) {
        if (/\s/u.test(points[i])) {
          low = i + 1;
          break;
        }
      }
    }
    if (!low && points.length) throw fail('The configured document font cannot fit on a page.');
    return [points.slice(0, low).join(''), points.slice(low).join('')];
  }
  function paragraph(value, { bold = false, color = muted, size = 9 } = {}) {
    let rest = String(value || '');
    while (rest) {
      ensure(40);
      const [part, remaining] = fit(rest, width, bottom - y - 12, { bold, size });
      y += text(part, left, y, width, { bold, color, size }) + 12;
      rest = remaining;
      if (rest) page();
    }
  }
  function columns(
    values,
    positions,
    widths,
    { size = 9, aligns = [], continuation = () => {} } = {},
  ) {
    let remaining = values.map((value) => String(value ?? ''));
    do {
      if (y + 50 > bottom) {
        page();
        continuation();
      }
      const parts = remaining.map((value, i) => fit(value, widths[i], bottom - y - 20, { size }));
      const heights = parts.map(([part], i) =>
        text(part, positions[i], y + 3, widths[i], { size, align: aligns[i] || 'left' }),
      );
      y += Math.max(20, ...heights) + 15;
      remaining = parts.map(([, rest]) => rest);
      if (remaining.some(Boolean)) {
        page();
        continuation();
      }
    } while (remaining.some(Boolean));
  }
  function heading(value) {
    ensure(42);
    y += text(value, left, y, width, { bold: true, size: 11 }) + 12;
  }
  function table(headers, rows, widths, aligns = []) {
    const startY = () => {
      pdf.rect(left, y, width, 25).fill('#eef3f3');
      let x = left + 8;
      headers.forEach((h, i) => {
        text(h, x, y + 7, widths[i] - 16, {
          bold: true,
          size: 8,
          color: muted,
          align: aligns[i] || 'left',
        });
        x += widths[i];
      });
      y += 30;
    };
    ensure(67);
    startY();
    for (const row of rows) {
      let x = left + 8;
      const positions = widths.map((w) => {
        const at = x;
        x += w;
        return at;
      });
      pdf.font('regular').fontSize(8.5);
      const height =
        Math.max(
          20,
          ...row.map((cell, i) =>
            pdf.heightOfString(String(cell ?? ''), { width: widths[i] - 16, lineGap: 2 }),
          ),
        ) + 20;
      if (height < 610 && y + height > bottom) {
        page();
        startY();
      }
      columns(
        row,
        positions,
        widths.map((w) => w - 16),
        { size: 8.5, aligns, continuation: startY },
      );
      line(y - 3);
    }
    y += 15;
  }
  function totals(rows) {
    ensure(rows.length * 25 + 17);
    for (const [name, value, strong] of rows) {
      if (strong) {
        pdf.rect(302, y - 4, right - 302, 27).fill('#eef3f3');
      }
      text(name, 312, y, 145, { bold: Boolean(strong), size: strong ? 10 : 9 });
      text(money(value), 448, y, right - 458, {
        align: 'right',
        bold: Boolean(strong),
        size: strong ? 10 : 9,
      });
      y += 26;
    }
    y += 11;
  }

  try {
    y += text(seller.schoolName || 'Rosewood College', left, y, 325, { bold: true, size: 15 }) + 18;
    text(title, left, y, 340, { bold: true, size: 29 });
    text(number, 343, y + 9, right - 343, { size: 12, bold: true, align: 'right' });
    y += 51;
    if (sample) {
      paragraph('SAMPLE DOCUMENT - Synthetic data. Not a request for payment.', {
        bold: true,
        color: accent,
      });
    }
    if (document.status === 'draft')
      paragraph('DRAFT - This document has not been issued.', { bold: true });
    if (document.status === 'void')
      paragraph(
        'VOID - This invoice is no longer payable. Original issue details are retained below.',
        { bold: true, color: '#943b27' },
      );
    if (document.reversed || payload.reversed)
      paragraph(
        'REVERSED PAYMENT - This receipt is retained as history and no longer confirms an active payment.',
        { bold: true, color: '#943b27' },
      );
    line();
    y += 18;
    const issuer = [
      seller.legalName || seller.schoolName,
      seller.abn ? `ABN ${seller.abn}` : '',
      seller.address,
      seller.email,
      seller.phone,
    ]
      .filter(Boolean)
      .join('\n');
    const debtor = [
      account.billingName || account.name,
      account.address,
      account.email,
      account.code ? `Account ${account.code}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const h1 = text('ISSUED BY', left, y, 235, { bold: true, size: 8, color: muted });
    text(kind === 'receipt' ? 'RECEIVED FROM' : 'BILL TO', 320, y, right - 320, {
      bold: true,
      size: 8,
      color: muted,
    });
    y += h1 + 8;
    columns([issuer, debtor], [left, 320], [240, right - 320]);
    y += 7;

    if (kind === 'invoice') {
      paragraph(
        `Issued ${date(document.issueDate)}    Due ${date(document.dueDate)}    ${document.year || ''}${document.term ? ` / ${document.term}` : ''}    Currency AUD`,
        { color: ink },
      );
      if (document.description) paragraph(document.description);
      const invoiceLines = document.lines || snapshot.lines || [];
      table(
        ['Description / student', 'Qty', 'Unit', 'Discount', 'GST', 'Amount'],
        invoiceLines.map((item) => [
          [
            item.description,
            item.studentName,
            item.taxCode === 'GST_FREE'
              ? 'GST-free'
              : item.taxCode === 'NO_GST'
                ? 'No GST'
                : 'GST 10%',
          ]
            .filter(Boolean)
            .join('\n'),
          item.quantity,
          money(item.unitCents),
          money(item.discountCents),
          money(item.taxCents),
          money(item.totalCents),
        ]),
        [196, 32, 69, 70, 62, width - 429],
        ['', 'right', 'right', 'right', 'right', 'right'],
      );
      totals([
        ['Subtotal before discounts', document.subtotalCents],
        ['Discounts', -document.discountCents],
        ['GST', document.taxCents],
        ['Invoice total (AUD)', document.totalCents, true],
      ]);
      paragraph(
        'This is the original issued invoice. Use the current account statement for payments, credits and the outstanding balance.',
      );
      heading('Payment instructions');
      paragraph(
        seller.paymentInstructions || 'Please contact the school for payment arrangements.',
      );
      paragraph(`Payment reference: ${number}`, { bold: true, color: ink });
    } else if (kind === 'receipt') {
      const receipt = snapshot;
      paragraph(
        `Received ${date(receipt.paidOn || document.paidOn)}    Receipt issued ${date(document.issuedAt)}    Currency AUD`,
        { color: ink },
      );
      paragraph(
        `Method: ${label(receipt.method)}\nTransaction reference: ${receipt.reference || '-'}\nPurpose: ${receipt.purpose === 'bond' ? 'Refundable family bond' : 'School fees'}`,
      );
      totals([['Amount received (AUD)', receipt.amountCents ?? document.amountCents, true]]);
      const allocations = receipt.allocations || [];
      if (allocations.length) {
        heading('Applied when this receipt was issued');
        table(
          ['Invoice', 'Applied amount'],
          allocations.map((a) => [a.invoiceNumber || a.invoiceId, money(a.amountCents)]),
          [width - 140, 140],
          ['', 'right'],
        );
      }
      if (receipt.purpose === 'bond')
        paragraph(
          'This amount is held as a refundable family bond. It has not been applied to tuition fees.',
        );
      else if (receipt.unallocatedCents > 0)
        paragraph(
          `${money(receipt.unallocatedCents)} was left as unapplied fee credit when this receipt was issued.`,
        );
      paragraph(
        'A partial payment receipt does not confirm that the full invoice is paid. Later allocations or corrections appear on the current account statement.',
      );
      const refunds = payload.refunds || document.refunds || [];
      if (refunds.length) {
        heading('Subsequent recorded refunds');
        table(
          ['Date / reference', 'Amount'],
          refunds.map((r) => [`${date(r.paidOn)}\n${r.reference}`, money(r.amountCents)]),
          [width - 140, 140],
          ['', 'right'],
        );
        paragraph(
          'The original amount received remains shown above; these later refund events are separate.',
        );
      }
    } else if (kind === 'credit') {
      paragraph(
        `Credit issued ${date(document.issuedAt)}    Original invoice ${snapshot.invoiceNumber || document.invoiceNumber || document.invoiceId || ''}`,
        { color: ink },
      );
      paragraph(`Reason: ${document.reason || snapshot.reason || '-'}`);
      table(
        ['Original line / adjustment', 'Credit', 'GST adjustment'],
        (document.lines || snapshot.lines || []).map((item) => [
          item.description || item.invoiceLineId,
          money(item.amountCents),
          money(item.taxCents),
        ]),
        [width - 205, 95, 110],
        ['', 'right', 'right'],
      );
      totals([
        ['Credit total (AUD)', document.amountCents, true],
        ['GST included in credit', document.taxCents],
      ]);
      paragraph(
        'This credit reduces the original obligation. It is not a receipt of money or evidence that a refund has been made.',
      );
    } else {
      paragraph(`Statement as at ${date(payload.today || generatedAt)}    Currency AUD`, {
        color: ink,
      });
      const invoices = payload.invoices || document.invoices || [];
      const payments = payload.payments || document.payments || [];
      const credits = payload.credits || document.credits || [];
      const refunds = payload.refunds || document.refunds || [];
      heading('Issued invoices and current balances');
      table(
        ['Invoice / due date', 'Original', 'Credit', 'Applied', 'Due'],
        invoices
          .filter((i) => i.status !== 'draft')
          .map((i) => [
            `${i.number}${i.status === 'void' ? ' (void)' : ''}\nDue ${date(i.dueDate)}`,
            money(i.totalCents),
            money(i.creditedCents),
            money(i.paidCents),
            money(i.balanceCents),
          ]),
        [195, 79, 79, 79, width - 432],
        ['', 'right', 'right', 'right', 'right'],
      );
      totals([
        ['Outstanding fees', account.balanceCents, true],
        ['Unapplied fee credit', account.unallocatedCents],
        ['Pending verification', account.pendingCents],
        ['Refundable bonds held', account.bondHeldCents],
      ]);
      if (payments.length) {
        heading('Payment record');
        table(
          ['Date / reference', 'Purpose', 'State', 'Amount'],
          payments.map((p) => [
            `${date(p.paidOn)}\n${p.reference}`,
            label(p.purpose),
            label(p.status),
            money(p.amountCents),
          ]),
          [221, 75, 112, width - 408],
          ['', '', '', 'right'],
        );
      }
      if (credits.length) {
        heading('Credit notes');
        table(
          ['Credit / reason', 'Date', 'Amount'],
          credits.map((c) => [`${c.number}\n${c.reason}`, date(c.issuedAt), money(c.amountCents)]),
          [width - 195, 95, 100],
          ['', '', 'right'],
        );
      }
      if (refunds.length) {
        heading('Recorded refunds');
        table(
          ['Reference / reason', 'Date', 'Amount'],
          refunds.map((r) => [`${r.reference}\n${r.reason}`, date(r.paidOn), money(r.amountCents)]),
          [width - 195, 95, 100],
          ['', '', 'right'],
        );
      }
      paragraph(
        'Pending payments do not reduce fees owing. Unapplied fee credit and refundable bonds are shown separately; bond funds do not settle tuition invoices. This statement is not a new invoice.',
      );
    }
    const range = pdf.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index++) {
      pdf.switchToPage(index);
      line(781);
      text(
        `${sample ? 'SAMPLE  |  ' : ''}${seller.schoolName || 'Rosewood College'}  |  ${number}`,
        left,
        785,
        400,
        { size: 7, color: muted, lineBreak: false },
      );
      text(`${index + 1} / ${range.count}`, 479, 785, right - 479, {
        size: 7,
        align: 'right',
        color: muted,
        lineBreak: false,
      });
    }
    pdf.end();
    return await complete;
  } catch (error) {
    pdf.destroy();
    // No document has been sent to a client yet; the server can return a safe error.
    throw error;
  }
}
