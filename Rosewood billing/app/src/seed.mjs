import { melbourneDate } from './money.mjs';

/** Synthetic sample records only. Operation keys make setup resumable and repeatable. */
export function seedDemo(service) {
  const actor = {
    id: 'synthetic-demo-seed',
    name: 'Synthetic demo setup',
    email: 'seed@example.test',
    role: 'admin',
  };
  if (!service.getState(actor).settings.demoMode)
    throw new Error('Demo records may only be seeded into a sample database.');
  const command = (key, type, payload) =>
    service.execute(actor, { type, payload }, `demo-v1-${key}`);
  const account = (key, name) =>
    command(`account-${key}`, 'account.create', {
      name: `Synthetic ${name} family`,
      billingName: `Synthetic ${name} payer`,
      email: `${key}@example.test`,
      address: '1 Example Street\nSampletown VIC 3000',
      contactAllowed: false,
    });
  const a = account('warren', 'Warren'),
    b = account('nguyen', 'Nguyen'),
    c = account('patel', 'Patel');
  // Additive seed step preserves existing demo-v1 operation hashes and staff edits.
  for (const original of [a, b, c]) {
    const current = service
      .getState(actor)
      .accounts.find((candidate) => candidate.id === original.id);
    if (current.revision === 1 && !current.xeroContactName)
      command(`account-xero-${original.id}`, 'account.update', {
        id: original.id,
        expectedRevision: 1,
        name: original.name,
        billingName: original.billingName,
        email: original.email,
        address: original.address,
        contactAllowed: original.contactAllowed,
        status: original.status,
        xeroContactName: original.billingName,
      });
  }
  // Use the persisted first creation date, so a later startup replays the same seed content.
  const anchor = melbourneDate(new Date(a.createdAt));
  const date = (offset) => {
    const d = new Date(`${anchor}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  command('settings', 'settings.update', {
    expectedRevision: 1,
    schoolName: 'Rosewood College',
    legalName: 'Synthetic Rosewood Billing Demo',
    abn: '',
    address: '1 Example Street\nSampletown VIC 3000',
    email: 'finance@example.test',
    phone: '',
    paymentInstructions: 'SAMPLE ONLY — no payment is requested. Bank details are not configured.',
    defaultDueDays: 30,
    gstRegistered: false,
    taxPolicyApproved: false,
    xeroTaxMappings: {
      GST_FREE: 'GST Free Income',
      NO_GST: 'BAS Excluded',
      GST_10: 'GST on Income',
    },
  });
  const student = (key, accountId, name, level) =>
    command(`student-${key}`, 'student.create', {
      accountId,
      name: `Synthetic ${name}`,
      yearLevel: level,
      entryYear: 2027,
      status: 'prospective',
    });
  const s1 = student('maya', a.id, 'Maya Warren', 'Foundation'),
    s2 = student('leo', a.id, 'Leo Warren', 'Year 2'),
    s3 = student('alex', b.id, 'Alex Nguyen', 'Foundation'),
    s4 = student('sam', c.id, 'Sam Patel', 'Year 1');
  const fee = (key, description, unitCents, category) =>
    command(`fee-${key}`, 'fee.create', {
      code: key.toUpperCase(),
      description,
      unitCents,
      taxCode: 'GST_FREE',
      category,
      accountCode: '200',
      active: true,
    });
  const tuition = fee('tuition', 'Tuition fee — sample term', 180000, 'tuition'),
    levy = fee('resources', 'Learning resources — sample term', 25000, 'levy');
  const line = (student, fee) => ({
    studentId: student.id,
    description: fee.description,
    quantity: 1,
    unitCents: fee.unitCents,
    discountCents: 0,
    taxCode: fee.taxCode,
    category: fee.category,
    accountCode: fee.accountCode,
  });
  const invoice = (key, accountId, lines, dueOffset, issue = true) => {
    const i = command(`invoice-${key}`, 'invoice.create', {
      accountId,
      issueDate: date(-60),
      dueDate: date(dueOffset),
      year: 2027,
      term: 'Term 1',
      description: 'Synthetic sample billing — no payment requested',
      lines,
    });
    return issue
      ? command(`issue-${key}`, 'invoice.issue', { id: i.id, expectedRevision: i.revision })
      : i;
  };
  const i1 = invoice('warren', a.id, [line(s1, tuition), line(s2, tuition)], -30);
  const i2 = invoice('nguyen', b.id, [line(s3, tuition), line(s3, levy)], -15);
  invoice('patel', c.id, [line(s4, tuition)], -45);
  invoice('warren-resources', a.id, [line(s1, levy), line(s2, levy)], 20);
  invoice('patel-draft', c.id, [line(s4, levy)], 30, false);
  const payment = (key, accountId, amountCents, purpose = 'fees') =>
    command(`payment-${key}`, 'payment.record', {
      accountId,
      purpose,
      amountCents,
      paidOn: date(-10),
      method: 'bank_transfer',
      reference: `SYNTHETIC-${key.toUpperCase()}`,
    });
  const p1 = payment('warren-part', a.id, 120000);
  command('confirm-warren', 'payment.confirm', {
    id: p1.id,
    evidence: 'Synthetic bank evidence for demonstration only.',
    allocations: [{ invoiceId: i1.id, amountCents: 120000 }],
  });
  const p2 = payment('nguyen-full', b.id, 230000);
  command('confirm-nguyen', 'payment.confirm', {
    id: p2.id,
    evidence: 'Synthetic transfer verified in sample mode.',
    allocations: [{ invoiceId: i2.id, amountCents: 205000 }],
  });
  payment('patel-pending', c.id, 90000);
  const bond = payment('warren-bond', a.id, 50000, 'bond');
  command('confirm-bond', 'payment.confirm', {
    id: bond.id,
    evidence: 'Synthetic refundable bond received. Sample data only.',
    allocations: [],
  });
  command('plan-warren', 'plan.create', {
    invoiceId: i1.id,
    instalments: [
      { dueDate: date(-30), amountCents: 120000 },
      { dueDate: date(0), amountCents: 120000 },
      { dueDate: date(30), amountCents: 120000 },
    ],
  });
  return service.getState(actor);
}
