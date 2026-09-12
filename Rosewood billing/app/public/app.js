'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escape = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const money = (cents) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(
      (Number(cents) || 0) / 100,
    );
  const amount = (cents) => ((Number(cents) || 0) / 100).toFixed(2);
  const date = (value) =>
    value
      ? new Intl.DateTimeFormat('en-AU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Australia/Melbourne',
        }).format(new Date(value.length === 10 ? `${value}T12:00:00+10:00` : value))
      : '—';
  const time = (value) =>
    value
      ? new Intl.DateTimeFormat('en-AU', {
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'Australia/Melbourne',
        }).format(new Date(value))
      : '—';
  const label = (value) =>
    String(value || '')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  const icons = {
    overview:
      '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    accounts:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
    students: '<path d="m2 9 10-5 10 5-10 5-10-5Zm4 2v6c4 3 8 3 12 0v-6m4-2v7"/>',
    invoices: '<path d="M6 3h9l4 4v14H5V3h1Zm8 0v5h5M8 12h8m-8 4h5"/>',
    payments: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h3"/>',
    plans:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-12 5 2 2 4-4"/>',
    batches: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5"/>',
    fees: '<path d="M20 13 11 22 2 13V3h10l8 10Z"/><circle cx="7" cy="8" r="1"/>',
    reports: '<path d="M3 3v18h18M8 16v-5m5 5V7m5 9v-8"/>',
    audit: '<path d="M3 12a9 9 0 1 0 2.7-6.4L3 8m0-5v5h5m4-1v5l3 2"/>',
    settings:
      '<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3H9Z"/><circle cx="12" cy="12" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    warning: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/>',
    shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
    logout: '<path d="M9 4H4v16h5m6-13 5 5-5 5m-7-5h12"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    edit: '<path d="m15 4 5 5M4 20l4-1L21 6a2 2 0 0 0-3-3L5 16l-1 4Z"/>',
    bond: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    refresh:
      '<path d="M20 7v5h-5M4 17v-5h5M5.2 7a8 8 0 0 1 13.2-2L20 7M4 17l1.6 2a8 8 0 0 0 13.2-2"/>',
    link: '<path d="m10 13 4-4m-6 6-2 2a3 3 0 0 1-4-4l5-5a3 3 0 0 1 4 0m2 0 2-2a3 3 0 0 1 4 4l-5 5a3 3 0 0 1-4 0"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  };
  const icon = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.invoices}</svg>`;
  const app = $('#app'),
    dialog = $('#workspace-dialog');
  let session = null,
    state = null,
    screen = 'overview',
    recordId = null,
    menuOpen = false,
    modal = null,
    previousFocus = null;
  let filters = {},
    noticeTimer,
    isLoading = false;
  const retryKeys = new Map();
  const canWrite = () => ['billing', 'finance', 'admin'].includes(session?.user?.role);
  const canFinance = () => ['finance', 'admin'].includes(session?.user?.role);
  const canAdmin = () => session?.user?.role === 'admin';
  const find = (collection, id) => (state?.[collection] || []).find((row) => row.id === id);
  const accountName = (id) => find('accounts', id)?.name || 'Unknown account';
  const invoiceName = (id) => find('invoices', id)?.number || 'Draft invoice';
  const match = (value, query) =>
    String(value ?? '')
      .toLowerCase()
      .includes(
        String(query || '')
          .trim()
          .toLowerCase(),
      );
  const sum = (rows, field) => rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
  function button(text, action, id = '', variant = '', symbol = '') {
    return `<button type="button" class="button ${escape(variant)}" data-action="${escape(action)}" data-id="${escape(id)}">${symbol ? icon(symbol) : ''}${escape(text)}</button>`;
  }
  function badge(value, tone) {
    const colours = {
      issued: 'blue',
      draft: '',
      void: 'red',
      unpaid: 'amber',
      part_paid: 'amber',
      paid: 'teal',
      credited: 'purple',
      pending: 'amber',
      confirmed: 'teal',
      rejected: 'red',
      reversed: 'red',
      prospective: 'blue',
      active: 'teal',
      inactive: '',
      archived: '',
      fees: '',
      bond: 'purple',
      preview: 'blue',
      committed: 'teal',
      imported: 'teal',
      exported: 'blue',
      overdue: 'red',
      due: 'amber',
      future: 'blue',
      settled: 'teal',
      scheduled: 'blue',
      cancelled: 'red',
      generated: 'blue',
      import_recorded: 'teal',
    };
    return `<span class="badge ${escape(tone ?? colours[value] ?? '')}">${escape(label(value))}</span>`;
  }
  function invoiceBadges(row) {
    return `<div class="badges">${badge(row.status === 'issued' ? row.settlementStatus : row.status)}${row.overdue ? badge('overdue') : ''}</div>`;
  }
  const empty = (title, text, action = '') =>
    `<div class="empty">${icon('invoices')}<h3>${escape(title)}</h3><p>${escape(text)}</p>${action}</div>`;
  const panel = (title, body, action = '', caption = '', footer = '') =>
    `<section class="panel"><header class="panel-header"><div><h2>${escape(title)}</h2>${caption ? `<p class="panel-caption">${escape(caption)}</p>` : ''}</div>${action}</header>${body}${footer ? `<div class="panel-footer">${escape(footer)}</div>` : ''}</section>`;
  const table = (headers, rows, className = '') =>
    `<div class="table-wrap ${escape(className)}" tabindex="0" role="region" aria-label="Billing table; scroll horizontally if needed"><table><thead><tr>${headers.map((h) => `<th scope="col"${h.startsWith('£') ? ' class="right"' : ''}>${escape(h.replace(/^£/, ''))}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  const title = (heading, description, actions = '', eyebrow = 'Staff workspace') =>
    `<div class="page-heading"><div><div class="eyebrow">${escape(eyebrow)}</div><h1>${escape(heading)}</h1><p>${escape(description)}</p></div><div class="heading-actions">${actions}</div></div>`;
  const moneyCell = (value) => `<td class="right money">${escape(money(value))}</td>`;
  const listLink = (titleText, subtitle, action, id) =>
    `<button class="link-button" type="button" data-action="${escape(action)}" data-id="${escape(id)}"><span class="cell-title">${escape(titleText)}</span>${subtitle ? `<span class="cell-sub">${escape(subtitle)}</span>` : ''}</button>`;
  const detailField = (name, value) =>
    `<div><dt>${escape(name)}</dt><dd>${escape(value === undefined || value === null || value === '' ? '—' : value)}</dd></div>`;
  const kpi = (name, value, note, symbol, cls = '') =>
    `<div class="kpi ${escape(cls)}"><div class="kpi-label">${escape(name)}${icon(symbol)}</div><div class="kpi-value money">${escape(value)}</div><div class="kpi-note">${escape(note)}</div></div>`;
  function toast(message, error = false) {
    clearTimeout(noticeTimer);
    const notice = $('#notice');
    notice.textContent = message;
    notice.className = `toast${error ? ' error' : ''}`;
    notice.hidden = false;
    noticeTimer = setTimeout(
      () => {
        notice.hidden = true;
      },
      error ? 9000 : 5000,
    );
  }
  async function request(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
    if (!response.ok) {
      let error;
      try {
        error = await response.json();
      } catch {
        error = {};
      }
      const issue = new Error(
        error.message ||
          (response.status === 401
            ? 'Your session has ended. Sign in again to continue.'
            : 'The request could not be completed. Please try again.'),
      );
      issue.status = response.status;
      issue.code = error.error;
      throw issue;
    }
    if (response.status === 204) return null;
    return response.json();
  }
  async function command(type, payload) {
    const fingerprint = JSON.stringify({ type, payload });
    if (!retryKeys.has(fingerprint)) retryKeys.set(fingerprint, crypto.randomUUID());
    modal?.commandFingerprints.add(fingerprint);
    if (modal) modal.requestStarted = true;
    const response = await request('/api/commands', {
      method: 'POST',
      headers: { 'X-CSRF-Token': session.csrfToken, 'Idempotency-Key': retryKeys.get(fingerprint) },
      body: fingerprint,
    });
    return response?.result;
  }
  async function loadState() {
    state = await request('/api/state');
    for (const name of [
      'accounts',
      'students',
      'fees',
      'invoices',
      'payments',
      'receipts',
      'allocations',
      'credits',
      'refunds',
      'plans',
      'batches',
      'exports',
      'audit',
    ])
      state[name] ||= [];
    state.summary ||= {};
    state.settings ||= {};
  }
  async function refresh() {
    if (isLoading) return;
    isLoading = true;
    try {
      await loadState();
      render();
    } catch (error) {
      handleError(error);
    } finally {
      isLoading = false;
    }
  }
  function handleError(error) {
    if (error.status === 401) {
      session = null;
      state = null;
      closeDialog();
      renderLogin(error.message);
    } else toast(error.message, true);
  }
  function navigate(next, id = null) {
    screen = next;
    recordId = id;
    menuOpen = false;
    filters = {};
    render();
    $('#main-content')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  function renderLogin(message = '') {
    app.innerHTML = `<div class="login-shell"><aside class="login-art"><div class="brand"><div class="brand-mark">R</div><div><div class="brand-name">Rosewood College</div><div class="brand-sub">Growing together</div></div></div><div class="login-art-copy"><div class="eyebrow">School billing</div><h1>A clearer view<br>of every account.</h1><p>One considered space for family invoices, payment progress and the details that matter.</p></div><footer>Rosewood College · Staff workspace</footer></aside><main class="login-form-wrap" id="main-content" tabindex="-1"><form id="login-form" class="login-form"><div class="eyebrow">Welcome back</div><h2>Staff sign in</h2><p>Use your named staff account to access the school finance workspace.</p><div id="login-error" class="form-error" role="alert" ${message ? '' : 'hidden'}>${escape(message)}</div>${field('email', 'Email address', 'email', '', { required: true, autocomplete: 'username' })}${field('password', 'Password', 'password', '', { required: true, autocomplete: 'current-password' })}<button class="button primary wide" type="submit">Sign in ${icon('arrow')}</button><div class="login-note">Access is for authorised staff. Billing credentials are managed separately from the enrolment application. Contact your school administrator if you need an account.</div></form></main></div>`;
    $('#login-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget,
        submit = $('button[type=submit]', form);
      submit.disabled = true;
      submit.textContent = 'Signing in…';
      $('#login-error').hidden = true;
      try {
        session = await request('/api/login', {
          method: 'POST',
          body: JSON.stringify({
            email: form.elements.email.value.trim(),
            password: form.elements.password.value,
          }),
        });
        form.reset();
        await loadState();
        render();
      } catch (error) {
        $('#login-error').textContent = error.message;
        $('#login-error').hidden = false;
      } finally {
        if (submit.isConnected) {
          submit.disabled = false;
          submit.innerHTML = `Sign in ${icon('arrow')}`;
        }
      }
    });
  }
  function render() {
    if (!session) return renderLogin();
    if (!state) return;
    const navigation = [
      ['overview', 'Overview'],
      ['accounts', 'Accounts'],
      ['students', 'Students'],
      ['invoices', 'Invoices'],
      ['payments', 'Payments & receipts'],
      ['plans', 'Payment plans'],
      ['batches', 'Billing runs'],
      ['fees', 'Fee catalogue'],
      ['reports', 'Reports & exports'],
      ['audit', 'Activity log'],
    ];
    if (canAdmin()) navigation.push(['settings', 'Settings']);
    const active =
      { account: 'accounts', invoice: 'invoices', payment: 'payments', batch: 'batches' }[screen] ||
      screen;
    const pageLabel = navigation.find((item) => item[0] === active)?.[1] || 'Workspace';
    const user = session.user;
    app.innerHTML = `<div class="shell${menuOpen ? ' menu-open' : ''}"><aside class="sidebar" aria-label="Main navigation"><div class="brand"><div class="brand-mark" aria-hidden="true">R</div><div><div class="brand-name">Rosewood</div><div class="brand-sub">College · Billing</div></div></div><div class="nav-label">Workspace</div><nav class="nav">${navigation.map(([key, name], index) => `${index === 8 ? '<div class="nav-label">Management</div>' : ''}<button type="button" class="nav-button${active === key ? ' active' : ''}" data-action="navigate" data-id="${key}" ${active === key ? 'aria-current="page"' : ''}>${icon(key)}<span>${escape(name)}</span>${key === 'invoices' && state.summary.draftCount ? `<span class="nav-count">${escape(state.summary.draftCount)}</span>` : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="workspace-label">${icon('shield')}<span>Staff access<br><span class="small muted">Private billing workspace</span></span></div><div class="user-card"><div class="avatar" aria-hidden="true">${escape(
      (user.name || 'Staff')
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join(''),
    )}</div><div class="user-info"><div class="user-name">${escape(user.name)}</div><div class="user-role">${escape(user.role)}</div></div><button type="button" class="logout" data-action="logout" aria-label="Sign out">${icon('logout')}</button></div></div></aside><div class="content"><header class="topbar"><button class="icon-button mobile-menu" type="button" data-action="menu" aria-label="${menuOpen ? 'Close' : 'Open'} navigation" aria-expanded="${menuOpen}">${icon(menuOpen ? 'close' : 'menu')}</button><div class="topbar-path"><span>School administration</span>${icon('chevron')}<strong>${escape(pageLabel)}</strong></div><div class="topbar-meta"><span class="date-label">${escape(date(state.today))}</span><span><span class="status-dot"></span>Connected</span><button class="icon-button" type="button" data-action="refresh" aria-label="Refresh billing records">${icon('refresh')}</button></div></header><main id="main-content" class="main" tabindex="-1">${state.settings.demoMode ? `<div class="sample-bar">${icon('shield')}<span><strong>Demonstration workspace.</strong> Synthetic records only. Documents are marked as samples.</span></div>` : ''}${renderPage()}<div class="footer-note"><span>Rosewood College · Billing workspace</span><span>AUD · Financial dates in Melbourne time · ${escape(label(user.role))} access</span></div></main></div></div>`;
    bindFilters();
  }
  function renderPage() {
    switch (screen) {
      case 'overview':
        return overview();
      case 'accounts':
        return accountsPage();
      case 'account':
        return accountPage();
      case 'students':
        return studentsPage();
      case 'invoices':
        return invoicesPage();
      case 'invoice':
        return invoicePage();
      case 'payments':
        return paymentsPage();
      case 'payment':
        return paymentPage();
      case 'plans':
        return plansPage();
      case 'batches':
        return batchesPage();
      case 'batch':
        return batchPage();
      case 'fees':
        return feesPage();
      case 'reports':
        return reportsPage();
      case 'audit':
        return auditPage();
      case 'settings':
        return settingsPage();
      default:
        return overview();
    }
  }
  function toolbar(placeholder, options = [], counts = '') {
    return `<div class="toolbar"><div class="search">${icon('search')}<input id="list-search" type="search" aria-label="${escape(placeholder)}" placeholder="${escape(placeholder)}" value="${escape(filters.search || '')}"></div><div class="filter-group">${options.map(([key, name, values]) => `<select data-filter="${escape(key)}" aria-label="${escape(name)}"><option value="">${escape(name)}</option>${values.map((v) => `<option value="${escape(Array.isArray(v) ? v[0] : v)}" ${filters[key] === (Array.isArray(v) ? v[0] : v) ? 'selected' : ''}>${escape(Array.isArray(v) ? v[1] : label(v))}</option>`).join('')}</select>`).join('')}</div>${counts ? `<span class="list-count">${escape(counts)}</span>` : ''}</div>`;
  }
  function bindFilters() {
    const search = $('#list-search');
    search?.addEventListener('input', (event) => {
      const cursor = event.target.selectionStart;
      filters.search = event.target.value;
      render();
      const next = $('#list-search');
      next?.focus({ preventScroll: true });
      if (next && cursor != null) next.setSelectionRange(cursor, cursor);
    });
    $$('[data-filter]').forEach((select) =>
      select.addEventListener('change', (event) => {
        filters[event.target.dataset.filter] = event.target.value;
        render();
      }),
    );
  }
  function overview() {
    const s = state.summary,
      overdue = state.invoices
        .filter((i) => i.overdue)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
      pending = state.payments.filter((p) => p.status === 'pending'),
      draft = state.invoices.filter((i) => i.status === 'draft');
    const actions = canWrite()
      ? button('Record payment', 'payment-new', '', '', 'plus') +
        button('New invoice', 'invoice-new', '', 'primary', 'plus')
      : '';
    const maxAge = Math.max(1, ...(s.ageing || []).map((a) => a.amountCents));
    const attention = [
      [
        pending.length,
        'Payments to verify',
        'Reported funds remain separate until finance confirms receipt.',
        'payments',
        'warning',
      ],
      [
        overdue.length,
        'Invoices past due',
        'Review outstanding balances and the next follow-up.',
        'invoices',
        'clock',
      ],
      [
        draft.length,
        'Drafts ready for review',
        'Check invoice details before assigning an invoice number.',
        'invoices',
        'invoices',
      ],
    ];
    return (
      title(
        'Billing overview',
        'A clear picture of family accounts and the payments that need your attention.',
        actions,
        'Rosewood College',
      ) +
      `<div class="kpi-grid">${kpi('Outstanding fees', money(s.outstandingCents), 'Issued invoice balances, after credits', 'invoices', 'highlight')}${kpi('Overdue', money(s.overdueCents), `${s.overdueCount || 0} ${s.overdueCount === 1 ? 'invoice past its' : 'invoices past their'} due date`, 'clock', 'attention')}${kpi('Confirmed received', money(s.receivedCents), 'Verified fee payments; bonds excluded', 'payments')}${kpi('Awaiting verification', money(s.pendingCents), 'Reported payments, not confirmed funds', 'shield')}</div>` +
      `<div class="layout-2">${panel('Needs attention', `<div class="attention-list">${attention.map(([count, name, description, destination, symbol]) => `<div class="attention-item"><div class="attention-icon${count ? '' : ' teal'}">${icon(symbol)}</div><div><strong>${escape(count)} ${escape(name.toLowerCase().replace(/\b(payments|invoices|drafts)\b/g, (word) => (count === 1 ? word.slice(0, -1) : word)))}</strong><p>${escape(description)}</p></div>${button('View', 'navigate', destination, 'small')}</div>`).join('')}</div>`)}${panel('Receivables by age', `<div class="panel-body">${(s.ageing || []).map((a) => `<div class="age-row"><span>${escape(a.label)}</span><progress class="age-bar" value="${Math.max(0, a.amountCents)}" max="${maxAge}" aria-label="${escape(a.label)}: ${escape(money(a.amountCents))}"></progress><span class="money right">${escape(money(a.amountCents))}</span></div>`).join('') || '<p class="muted small">No receivables to age.</p>'}</div>`, '', 'Outstanding balances by invoice due date')}</div>` +
      panel(
        'Outstanding invoices',
        overdue.length || state.invoices.some((i) => i.balanceCents > 0 && i.status === 'issued')
          ? invoiceTable(
              (overdue.length
                ? overdue
                : state.invoices.filter((i) => i.balanceCents > 0 && i.status === 'issued')
              ).slice(0, 6),
            )
          : empty(
              'All clear',
              'Issued invoices with outstanding balances will appear here.',
              canWrite() ? button('Create an invoice', 'invoice-new', '', 'small', 'plus') : '',
            ),
        button('All invoices', 'navigate', 'invoices', 'small ghost', 'arrow'),
      ) +
      `<div class="panel"><div class="panel-body minor-grid"><div class="minor-card"><span>Billing accounts</span><strong>${escape(s.accountCount || 0)}</strong><span>${escape(s.studentCount || 0)} students linked</span></div><div class="minor-card"><span>Unallocated fee funds</span><strong class="money">${escape(money(s.unallocatedCents))}</strong><span>Available to allocate or refund</span></div><div class="minor-card"><span>Refundable bonds held</span><strong class="money">${escape(money(s.bondHeldCents))}</strong><span>Kept separate from fee receipts</span></div></div></div>`
    );
  }
  function accountsPage() {
    const rows = state.accounts.filter(
      (a) =>
        match(`${a.name} ${a.billingName} ${a.code} ${a.email}`, filters.search) &&
        (!filters.status || a.status === filters.status),
    );
    return (
      title(
        'Family accounts',
        'Payer details, linked students and a complete view of each billing account.',
        canWrite() ? button('New account', 'account-new', '', 'primary', 'plus') : '',
      ) +
      toolbar(
        'Search accounts, codes or email',
        [['status', 'All accounts', ['active', 'archived']]],
        `${rows.length} accounts`,
      ) +
      panel(
        'Accounts',
        rows.length
          ? table(
              ['Account', 'Students', '£Outstanding', '£Available funds', 'Status', ''],
              rows.map(
                (a) =>
                  `<tr><td>${listLink(a.name, a.code, 'account-open', a.id)}</td><td><span class="cell-title">${escape(
                    state.students
                      .filter((s) => s.accountId === a.id)
                      .map((s) => s.name)
                      .join(', ') || 'No students yet',
                  )}</span><span class="cell-sub">${escape(a.email || 'No billing email')}</span></td>${moneyCell(a.balanceCents)}${moneyCell(a.unallocatedCents)}<td>${badge(a.status)}</td><td>${button('Open', 'account-open', a.id, 'small ghost', 'arrow')}</td></tr>`,
              ),
            )
          : empty(
              'No accounts found',
              'Create a billing account before adding a student or invoice.',
            ),
      )
    );
  }
  function breadcrumb(back, text) {
    return `<div class="breadcrumb"><button class="link-button" type="button" data-action="navigate" data-id="${escape(back)}">${escape(text)}</button>${icon('chevron')}<span>Details</span></div>`;
  }
  function accountPage() {
    const a = find('accounts', recordId);
    if (!a)
      return empty('Account unavailable', 'Refresh the workspace and choose another account.');
    const students = state.students.filter((s) => s.accountId === a.id),
      invoices = state.invoices.filter((i) => i.accountId === a.id),
      payments = state.payments.filter((p) => p.accountId === a.id);
    return (
      breadcrumb('accounts', 'Accounts') +
      title(
        a.name,
        `${a.code} · ${a.billingName || a.name}`,
        button('Statement', 'statement-download', a.id, '', 'download') +
          (canWrite()
            ? button('Edit account', 'account-edit', a.id, '', 'edit') +
              button('New invoice', 'invoice-new', a.id, 'primary', 'plus')
            : ''),
        'Account details',
      ) +
      `<div class="kpi-grid">${kpi('Outstanding fees', money(a.balanceCents), 'Issued invoices less allocations and credits', 'invoices', 'highlight')}${kpi('Available fee funds', money(a.unallocatedCents), 'Confirmed money not allocated to invoices', 'payments')}${kpi('Bonds held', money(a.bondHeldCents), 'Refundable funds; separate from fees', 'bond')}${kpi('Pending payments', money(a.pendingCents), 'Awaiting finance verification', 'clock')}</div>` +
      `<div class="layout-equal">${panel('Billing details', `<div class="panel-body"><dl class="detail-grid">${detailField('Billing name', a.billingName)}${detailField('Email', a.email)}${detailField('Postal address', a.address)}${detailField('Status', label(a.status))}${detailField('Contact permission', a.contactAllowed ? 'Contact permitted' : 'Contact not permitted')}${detailField('Account code', a.code)}${detailField('Xero contact mapping', a.xeroContactName)}</dl></div>`)}${panel(
        'Students',
        students.length
          ? table(
              ['Student', 'Year / status', ''],
              students.map(
                (s) =>
                  `<tr><td><span class="cell-title">${escape(s.name)}</span><span class="cell-sub">${s.enrolmentReference ? `Reference: ${escape(s.enrolmentReference)} · unverified` : 'No enrolment reference'}</span></td><td><span class="cell-title">${escape(s.yearLevel)} · ${escape(s.entryYear)}</span><span class="cell-sub">${badge(s.status)}</span></td><td>${canWrite() ? button('Edit', 'student-edit', s.id, 'small ghost', 'edit') : ''}</td></tr>`,
              ),
            )
          : empty(
              'No students linked',
              'Prospective students can be added before enrolment is complete.',
            ),
        canWrite() ? button('Add student', 'student-new', a.id, 'small', 'plus') : '',
      )}</div>` +
      panel(
        'Invoices',
        invoices.length
          ? invoiceTable(invoices)
          : empty('No invoices yet', 'Create a draft to start billing this account.'),
      ) +
      panel(
        'Payments and receipts',
        payments.length
          ? paymentTable(payments)
          : empty(
              'No payments reported',
              'Record a payment when the school receives a transfer report or payment evidence.',
            ),
        canWrite() ? button('Record payment', 'payment-new', a.id, 'small', 'plus') : '',
      ) +
      panel(
        'Account activity',
        auditList(
          state.audit
            .filter(
              (event) =>
                event.entityId === a.id ||
                invoices.some((i) => i.id === event.entityId) ||
                payments.some((p) => p.id === event.entityId),
            )
            .slice(0, 12),
        ),
      )
    );
  }
  function studentsPage() {
    const rows = state.students.filter(
      (s) =>
        match(
          `${s.name} ${s.yearLevel} ${s.entryYear} ${s.enrolmentReference} ${accountName(s.accountId)}`,
          filters.search,
        ) &&
        (!filters.status || s.status === filters.status),
    );
    return (
      title(
        'Students',
        'Start with prospective students and add an enrolment reference when it is available.',
        canWrite() ? button('Add student', 'student-new', '', 'primary', 'plus') : '',
      ) +
      `<div class="notice-box">Billing records stand independently of enrolment. A saved application reference is an unverified link; it does not enrol a student or change their application.</div>` +
      toolbar(
        'Search students or application references',
        [['status', 'All students', ['prospective', 'active', 'inactive']]],
        `${rows.length} students`,
      ) +
      panel(
        'Student register',
        rows.length
          ? table(
              ['Student', 'Entry', 'Billing account', 'Enrolment reference', 'Status', ''],
              rows.map(
                (s) =>
                  `<tr><td><span class="cell-title">${escape(s.name)}</span></td><td>${escape(s.yearLevel)}<span class="cell-sub">${escape(s.entryYear)}</span></td><td>${listLink(accountName(s.accountId), '', 'account-open', s.accountId)}</td><td><span class="cell-title mono">${escape(s.enrolmentReference || '—')}</span>${s.enrolmentReference ? '<span class="cell-sub">Unverified reference</span>' : ''}</td><td>${badge(s.status)}</td><td><div class="row-actions">${canWrite() ? button('Link', 'student-link', s.id, 'small ghost', 'link') + button('Edit', 'student-edit', s.id, 'small', 'edit') : ''}</div></td></tr>`,
              ),
            )
          : empty(
              'No students found',
              'A prospective student needs only a name, intended entry details and a billing account.',
            ),
      )
    );
  }
  function invoiceTable(rows) {
    return table(
      ['Invoice / account', 'Due date', '£Total', '£Outstanding', 'Status', ''],
      rows.map(
        (i) =>
          `<tr><td>${listLink(i.number || 'Draft invoice', accountName(i.accountId), 'invoice-open', i.id)}</td><td>${escape(date(i.dueDate))}<span class="cell-sub">${escape(i.year)}${i.term ? ` · ${escape(i.term)}` : ''}</span></td>${moneyCell(i.totalCents)}${moneyCell(i.balanceCents)}<td>${invoiceBadges(i)}</td><td>${button('View', 'invoice-open', i.id, 'small ghost', 'arrow')}</td></tr>`,
      ),
    );
  }
  function invoicesPage() {
    const rows = state.invoices.filter(
      (i) =>
        match(`${i.number} ${i.description} ${accountName(i.accountId)}`, filters.search) &&
        (!filters.status ||
          i.status === filters.status ||
          i.settlementStatus === filters.status ||
          (filters.status === 'overdue' && i.overdue)),
    );
    return (
      title(
        'Invoices',
        'Prepare, review and issue invoices. Track settlement without changing the original document.',
        canWrite() ? button('New invoice', 'invoice-new', '', 'primary', 'plus') : '',
      ) +
      toolbar(
        'Search invoice number or account',
        [
          [
            'status',
            'All invoices',
            ['draft', 'issued', 'unpaid', 'part_paid', 'paid', 'credited', 'overdue', 'void'],
          ],
        ],
        `${rows.length} invoices`,
      ) +
      panel(
        'Invoice register',
        rows.length
          ? invoiceTable(rows)
          : empty(
              'No invoices found',
              'Create an invoice from a fee template or your own line items.',
            ),
      )
    );
  }
  function invoicePage() {
    const i = find('invoices', recordId);
    if (!i) return empty('Invoice unavailable', 'Refresh and select another invoice.');
    const actions =
      i.status === 'draft' && canWrite()
        ? button('Edit draft', 'invoice-edit', i.id, '', 'edit') +
          button('Issue invoice', 'invoice-issue', i.id, 'primary', 'check')
        : button('Download invoice', 'invoice-download', i.id, 'primary', 'download');
    const corrections =
      i.status === 'issued' && canFinance()
        ? (i.balanceCents > 0 ? button('Credit lines', 'credit-new', i.id, 'small') : '') +
          (!state.allocations.some((a) => a.invoiceId === i.id) && !i.creditedCents
            ? button('Void invoice', 'invoice-void', i.id, 'small danger')
            : '')
        : '';
    const allocations = state.allocations.filter((a) => a.invoiceId === i.id && !a.releasedAt),
      credits = state.credits.filter((c) => c.invoiceId === i.id),
      plans = state.plans.filter((p) => p.invoiceId === i.id);
    return (
      breadcrumb('invoices', 'Invoices') +
      title(
        i.number || 'Draft invoice',
        `${accountName(i.accountId)} · ${i.description || 'School fees'}`,
        actions,
        'Invoice detail',
      ) +
      panel(
        'Invoice details',
        `<div class="panel-body"><div class="action-strip section-space">${invoiceBadges(i)}${corrections}</div><dl class="detail-grid">${detailField('Bill to', i.accountSnapshot?.billingName || find('accounts', i.accountId)?.billingName || accountName(i.accountId))}${detailField('Issue date', date(i.issueDate))}${detailField('Due date', date(i.dueDate))}${detailField('School year', i.year)}${detailField('Term', i.term)}${detailField('Description', i.description)}</dl></div>${table(
          ['Description / student', 'Qty', '£Unit price', '£Discount', 'Tax', '£Line total'],
          (i.lines || []).map(
            (l) =>
              `<tr><td><span class="cell-title">${escape(l.description)}</span><span class="cell-sub">${escape(l.studentName || find('students', l.studentId)?.name || 'Account charge')}</span></td><td>${escape(l.quantity)}</td>${moneyCell(l.unitCents)}${moneyCell(l.discountCents)}<td>${escape(taxLabel(l.taxCode))}</td>${moneyCell(l.totalCents ?? lineTotals(l).totalCents)}</tr>`,
          ),
        )}<div class="panel-body"><div class="total-list"><div><span>Subtotal</span><span class="money">${escape(money(i.subtotalCents))}</span></div><div><span>Discounts</span><span class="money">−${escape(money(i.discountCents))}</span></div><div><span>GST</span><span class="money">${escape(money(i.taxCents))}</span></div><div class="grand"><span>Invoice total</span><span class="money">${escape(money(i.totalCents))}</span></div><div><span>Payments allocated</span><span class="money">${escape(money(i.paidCents))}</span></div><div><span>Credits applied</span><span class="money">${escape(money(i.creditedCents))}</span></div><div class="grand"><span>Outstanding</span><span class="money">${escape(money(i.balanceCents))}</span></div></div></div>`,
        '',
        i.status === 'draft'
          ? 'Drafts have no invoice number until issued.'
          : 'The original issued document is preserved. Corrections are recorded separately.',
      ) +
      `<div class="layout-equal">${panel(
        'Allocated payments',
        allocations.length
          ? table(
              ['Payment', 'Date', '£Applied'],
              allocations.map((a) => {
                const p = find('payments', a.paymentId);
                return `<tr><td>${listLink(p?.reference || 'Payment', label(p?.method), 'payment-open', a.paymentId)}</td><td>${escape(date(p?.paidOn))}</td>${moneyCell(a.amountCents)}</tr>`;
              }),
            )
          : empty(
              'No payments allocated',
              'Confirmed fee payments can be allocated from their payment record.',
            ),
        canWrite() && i.status === 'issued'
          ? button('Record payment', 'payment-new', i.accountId, 'small', 'plus')
          : '',
      )}${panel(
        'Credit notes',
        credits.length
          ? table(
              ['Credit note', 'Reason', '£Amount', ''],
              credits.map(
                (c) =>
                  `<tr><td>${escape(c.number)}</td><td class="wrap">${escape(c.reason)}</td>${moneyCell(c.amountCents)}<td>${button('PDF', 'credit-download', c.id, 'small ghost', 'download')}</td></tr>`,
              ),
            )
          : empty('No credit notes', 'Line-specific credits preserve the original invoice.'),
      )}</div>` +
      panel(
        'Payment arrangement',
        plans.length
          ? `<div class="panel-body">${plans.map(planDetail).join('')}</div>`
          : empty(
              'No payment plan',
              'An agreed schedule tracks progress against this invoice. It does not collect payments.',
            ),
        canWrite() && i.status === 'issued' && !plans.length && i.balanceCents > 0
          ? button('Create plan', 'plan-new', i.id, 'small', 'plus')
          : '',
      )
    );
  }
  function paymentTable(rows) {
    return table(
      ['Payment / account', 'Date / method', 'Purpose', '£Amount', 'Status', ''],
      rows.map(
        (p) =>
          `<tr><td>${listLink(p.reference || 'Payment', accountName(p.accountId), 'payment-open', p.id)}</td><td>${escape(date(p.paidOn))}<span class="cell-sub">${escape(label(p.method))}</span></td><td>${badge(p.purpose)}</td>${moneyCell(p.amountCents)}<td>${badge(p.status)}</td><td>${button('View', 'payment-open', p.id, 'small ghost', 'arrow')}</td></tr>`,
      ),
    );
  }
  function paymentsPage() {
    const rows = state.payments.filter(
      (p) =>
        match(`${p.reference} ${accountName(p.accountId)}`, filters.search) &&
        (!filters.status || p.status === filters.status) &&
        (!filters.purpose || p.purpose === filters.purpose),
    );
    return (
      title(
        'Payments & receipts',
        'Record reported funds, verify receipt and apply confirmed fee payments to invoices.',
        canWrite() ? button('Record payment', 'payment-new', '', 'primary', 'plus') : '',
      ) +
      `<div class="notice-box">A reported payment awaits finance verification. Confirmation creates a numbered receipt. Bonds are held separately and cannot be used to settle fee invoices.</div>` +
      toolbar(
        'Search payment reference or account',
        [
          ['status', 'All payment states', ['pending', 'confirmed', 'rejected', 'reversed']],
          ['purpose', 'All purposes', ['fees', 'bond']],
        ],
        `${rows.length} payments`,
      ) +
      panel(
        'Payment register',
        rows.length
          ? paymentTable(rows)
          : empty(
              'No payments found',
              'Record already received funds or a transfer report to begin the verification workflow.',
            ),
      )
    );
  }
  function paymentPage() {
    const p = find('payments', recordId);
    if (!p) return empty('Payment unavailable', 'Refresh and select another payment.');
    const receipt =
        find('receipts', p.receiptId) || state.receipts.find((r) => r.paymentId === p.id),
      active = state.allocations.filter((a) => a.paymentId === p.id && !a.releasedAt),
      released = state.allocations.filter((a) => a.paymentId === p.id && a.releasedAt),
      refunds = state.refunds.filter((r) => r.paymentId === p.id);
    const actions =
      (receipt ? button('Receipt PDF', 'receipt-download', receipt.id, '', 'download') : '') +
      (canFinance() && p.status === 'pending'
        ? button('Reject', 'payment-reject', p.id, 'danger') +
          button('Verify payment', 'payment-confirm', p.id, 'primary', 'check')
        : '');
    const controls =
      canFinance() && p.status === 'confirmed'
        ? (p.purpose === 'fees' && p.unallocatedCents > 0
            ? button('Allocate funds', 'payment-allocate', p.id, '', 'plus')
            : '') +
          (p.unallocatedCents > 0 ? button('Record refund', 'payment-refund', p.id, '') : '') +
          (!refunds.length ? button('Reverse payment', 'payment-reverse', p.id, 'danger') : '')
        : '';
    return (
      breadcrumb('payments', 'Payments & receipts') +
      title(
        p.reference || 'Payment record',
        `${accountName(p.accountId)} · ${label(p.purpose)}`,
        actions,
        'Payment detail',
      ) +
      (p.status === 'pending'
        ? `<div class="notice-box warning">This report has not been verified. It has no receipt and does not reduce the account’s outstanding fees.</div>`
        : p.status === 'reversed'
          ? `<div class="notice-box error">This payment has been reversed. Its original receipt and allocation history are retained.</div>`
          : '') +
      panel(
        'Payment record',
        `<div class="panel-body"><div class="action-strip section-space">${badge(p.status)}${badge(p.purpose)}</div><dl class="detail-grid">${detailField('Amount reported', money(p.amountCents))}${detailField('Payment date', date(p.paidOn))}${detailField('Method', label(p.method))}${detailField('Transaction reference', p.reference)}${detailField('Verification evidence', p.evidence)}${detailField('Receipt', receipt?.number)}${detailField('Allocated to fees', money(p.allocatedCents))}${detailField(p.purpose === 'bond' ? 'Bond remaining' : 'Available to allocate', money(p.unallocatedCents))}${detailField('Refunds recorded', money(p.refundedCents))}</dl>${controls ? `<div class="form-section action-strip">${controls}</div>` : ''}</div>`,
      ) +
      panel(
        'Invoice allocations',
        active.length
          ? table(
              ['Invoice', '£Amount', ''],
              active.map(
                (a) =>
                  `<tr><td>${listLink(invoiceName(a.invoiceId), '', 'invoice-open', a.invoiceId)}</td>${moneyCell(a.amountCents)}<td>${canFinance() ? `<button type="button" class="button small" data-action="payment-release" data-id="${escape(p.id)}" data-allocation-id="${escape(a.id)}">Release allocation</button>` : ''}</td></tr>`,
              ),
            )
          : empty(
              p.purpose === 'bond' ? 'Bond funds stay separate' : 'No active allocations',
              p.purpose === 'bond'
                ? 'Held bonds are not applied to tuition. Record a completed refund when funds are returned.'
                : 'A confirmed payment may remain unallocated until staff select an invoice.',
            ),
      ) +
      (released.length
        ? panel(
            'Released allocations',
            table(
              ['Invoice', '£Amount', 'Released', 'Reason'],
              released.map(
                (a) =>
                  `<tr><td>${escape(invoiceName(a.invoiceId))}</td>${moneyCell(a.amountCents)}<td>${escape(date(a.releasedAt))}</td><td class="wrap">${escape(a.reason)}</td></tr>`,
              ),
            ),
          )
        : '') +
      panel(
        'Refund history',
        refunds.length
          ? table(
              ['Date', 'Reference', 'Reason', '£Amount'],
              refunds.map(
                (r) =>
                  `<tr><td>${escape(date(r.paidOn))}</td><td>${escape(r.reference)}</td><td class="wrap">${escape(r.reason)}</td>${moneyCell(r.amountCents)}</tr>`,
              ),
            )
          : empty(
              'No refunds recorded',
              'Refunds record money already returned; this workspace does not initiate a bank transfer.',
            ),
      )
    );
  }
  function planDetail(p) {
    return `<div><div class="action-strip small-space">${button(invoiceName(p.invoiceId), 'invoice-open', p.invoiceId, 'small ghost', 'invoices')}${badge(p.status || 'active')}</div><div class="plan-instalments">${(p.instalments || []).map((part, index) => `<div class="plan-instalment"><span><strong>${index + 1}.</strong> ${escape(date(part.dueDate))}</span><span class="money">${escape(money(part.paidCents))} / ${escape(money(part.amountCents))}</span>${badge(part.status)}</div>`).join('')}</div></div>`;
  }
  function plansPage() {
    return (
      title(
        'Payment plans',
        'Agreed instalments, with progress derived from actual invoice allocations.',
        canWrite() ? button('Create plan', 'plan-new', '', 'primary', 'plus') : '',
      ) +
      `<div class="notice-box">Plans track an agreement to pay. Progress includes allocated payments and credits. Plans do not schedule bank debits, send reminders or change the invoice’s original due date.</div>` +
      (state.plans.length
        ? `<div class="layout-equal">${state.plans.map((p) => panel(accountName(find('invoices', p.invoiceId)?.accountId), `<div class="panel-body">${planDetail(p)}</div>`, '', `Created ${date(p.createdAt)}`)).join('')}</div>`
        : panel(
            'Arrangements',
            empty(
              'No plans yet',
              'Issue an invoice, then create an agreed schedule for its original total. Existing payments and credits are reflected in progress.',
            ),
          ))
    );
  }
  function batchesPage() {
    return (
      title(
        'Billing runs',
        'Preview cohort fees, check every amount and create a reviewed set of drafts.',
        canWrite() ? button('Preview a run', 'batch-new', '', 'primary', 'plus') : '',
      ) +
      panel(
        'Billing run history',
        state.batches.length
          ? table(
              ['Run', 'Period', 'Invoices', '£Total', 'Status', ''],
              state.batches.map(
                (b) =>
                  `<tr><td>${listLink(b.label, date(b.createdAt), 'batch-open', b.id)}</td><td>${escape(b.year)} · ${escape(b.term)}</td><td>${escape(b.invoiceCount || 0)}</td>${moneyCell(b.totalCents)}<td>${badge(b.status)}</td><td>${button('Review', 'batch-open', b.id, 'small ghost', 'arrow')}</td></tr>`,
              ),
            )
          : empty(
              'No billing runs yet',
              'Choose students and fee items to preview a batch. Creating drafts does not issue or email invoices.',
            ),
      )
    );
  }
  function batchPage() {
    const b = find('batches', recordId);
    if (!b) return empty('Run unavailable', 'Refresh and select a billing run.');
    const invoices = state.invoices.filter((i) => (b.invoiceIds || []).includes(i.id));
    const preview = b.snapshot?.accounts || b.preview || b.invoices || b.drafts || [];
    return (
      breadcrumb('batches', 'Billing runs') +
      title(
        b.label,
        `${b.year} · ${b.term || 'School fees'} · ${b.invoiceCount || invoices.length} invoices`,
        canWrite() && b.status === 'preview'
          ? button('Create reviewed drafts', 'batch-commit', b.id, 'primary', 'check')
          : '',
        'Billing run',
      ) +
      `<div class="notice-box">${b.status === 'preview' ? 'This preview holds a snapshot of selected students, prices and dates. Review it before creating drafts; invoices must then be issued individually.' : 'This run has created its drafts. Review and issue each invoice from the invoice register.'}</div>` +
      panel(
        'Run summary',
        `<div class="panel-body"><dl class="detail-grid">${detailField('Total', money(b.totalCents))}${detailField('Invoice count', b.invoiceCount || invoices.length)}${detailField('Status', label(b.status))}${detailField('Invoice date', date(b.issueDate))}${detailField('Due date', date(b.dueDate))}${detailField('Created', date(b.createdAt))}</dl></div>`,
      ) +
      panel(
        b.status === 'preview' ? 'Preview details' : 'Created invoices',
        invoices.length
          ? invoiceTable(invoices)
          : Array.isArray(preview) && preview.length
            ? table(
                ['Account', 'Items', '£Total'],
                preview.map(
                  (i) =>
                    `<tr><td>${escape(i.accountSnapshot?.name || i.accountName || accountName(i.accountId))}</td><td>${escape((i.lines || []).map((l) => `${l.studentName || ''} ${l.description}`).join('; '))}</td>${moneyCell(i.totalCents)}</tr>`,
                ),
              )
            : `<div class="panel-body"><p class="small muted">${b.status === 'preview' ? 'The priced batch is stored on the server. Summary totals are shown above.' : 'Refresh to see generated invoice details.'}</p>${b.studentIds ? `<p class="small">Students: ${escape(b.studentIds.map((id) => find('students', id)?.name || id).join(', '))}</p>` : ''}${b.feeIds ? `<p class="small">Fees: ${escape(b.feeIds.map((id) => find('fees', id)?.description || id).join(', '))}</p>` : ''}</div>`,
      )
    );
  }
  const taxLabel = (code) =>
    ({ GST_FREE: 'GST-free', GST_10: 'GST 10%', NO_GST: 'No GST' })[code] || code || '—';
  function feesPage() {
    const rows = state.fees.filter(
      (f) =>
        match(`${f.code} ${f.description} ${f.accountCode}`, filters.search) &&
        (!filters.status || String(f.active) === filters.status),
    );
    return (
      title(
        'Fee catalogue',
        'Reusable fee items for future invoices. Changes leave issued documents intact.',
        canWrite() ? button('New fee item', 'fee-new', '', 'primary', 'plus') : '',
      ) +
      toolbar(
        'Search fees or accounting codes',
        [
          [
            'status',
            'All fee items',
            [
              ['true', 'Active'],
              ['false', 'Inactive'],
            ],
          ],
        ],
        `${rows.length} items`,
      ) +
      panel(
        'Fee items',
        rows.length
          ? table(
              [
                'Code / description',
                'Category',
                '£Unit price',
                'Tax',
                'Account code',
                'Status',
                '',
              ],
              rows.map(
                (f) =>
                  `<tr><td><span class="cell-title">${escape(f.description)}</span><span class="cell-sub mono">${escape(f.code)}</span></td><td>${escape(label(f.category))}</td>${moneyCell(f.unitCents)}<td>${escape(taxLabel(f.taxCode))}</td><td class="mono">${escape(f.accountCode || '—')}</td><td>${badge(f.active ? 'active' : 'inactive')}</td><td>${canWrite() ? button('Edit', 'fee-edit', f.id, 'small', 'edit') : ''}</td></tr>`,
              ),
            )
          : empty(
              'No fee items found',
              'Create tuition, levy or other fee items. Refundable bonds are recorded separately as payments.',
            ),
      )
    );
  }
  function reportsPage() {
    return (
      title(
        'Reports & exports',
        'Review balances and keep a traceable record of accounting exports.',
      ) +
      `<div class="layout-equal"><section class="panel report-card">${icon('reports')}<h2>Aged receivables</h2><p>Download current invoice balances for review and follow-up. The report is prepared with safe spreadsheet values.</p>${canFinance() ? button('Download CSV', 'export-receivables', '', 'primary', 'download') : '<span class="badge">Finance access required</span>'}</section><section class="panel report-card">${icon('invoices')}<h2>Accounting invoice export</h2><p>Export mapped issued invoices for a reviewed manual import as drafts. This is an export, not a live accounting connection.</p>${canFinance() ? button('Export invoice CSV', 'export-xero', '', 'primary', 'download') : '<span class="badge">Finance access required</span>'}</section></div><div class="notice-box warning">Accounting exports exclude drafts, voids and invoices with credits. Review exclusions and totals in the manifest. Later corrections need separate accounting review. Recording import evidence does not confirm external reconciliation.</div>` +
      panel(
        'Export history',
        state.exports.length
          ? table(
              ['Export / date', 'Rows / totals', 'Status', 'Import evidence', ''],
              state.exports.map(
                (e) =>
                  `<tr><td><span class="cell-title">${escape(label(e.kind))}</span><span class="cell-sub">${escape(time(e.createdAt))}</span></td><td><span class="cell-title">${escape(e.metadata?.rowCount ?? e.metadata?.documentCount ?? '—')} rows · ${escape(money(e.metadata?.grossTotalCents ?? e.metadata?.grossCents ?? e.metadata?.totalCents))}</span><span class="cell-sub">${escape(e.metadata?.exclusions?.length || 0)} exclusions</span></td><td>${badge(e.status)}</td><td class="wrap">${escape(e.importReference || 'Not recorded')}</td><td><div class="row-actions">${button('Manifest', 'export-detail', e.id, 'small')}${canFinance() && e.kind === 'xero' && !e.importedAt ? button('Record import', 'export-import', e.id, 'small') : ''}</div></td></tr>`,
              ),
            )
          : empty(
              'No exports yet',
              'Each generated export records its file hash, totals and the invoices included.',
            ),
      )
    );
  }
  function auditList(rows) {
    return rows.length
      ? `<div class="panel-body"><ol class="timeline">${rows.map((e) => `<li><strong>${escape(label(e.action))}</strong><p>${escape(e.actorName || e.actorId || 'Staff')} · ${escape(time(e.createdAt))}</p>${e.reason ? `<p>${escape(e.reason)}</p>` : ''}</li>`).join('')}</ol></div>`
      : empty('No activity yet', 'Attributable financial activity will appear here.');
  }
  function auditPage() {
    const rows = state.audit.filter((e) =>
      match(`${e.action} ${e.actorName} ${e.entityType} ${e.entityId} ${e.reason}`, filters.search),
    );
    return (
      title(
        'Activity log',
        'A record of who changed, verified or downloaded billing information.',
      ) +
      toolbar('Search actions, staff or reasons', [], `${rows.length} recent events`) +
      panel(
        'Recent activity',
        rows.length
          ? table(
              ['When', 'Staff', 'Action', 'Record', 'Reason'],
              rows.map(
                (e) =>
                  `<tr><td class="nowrap">${escape(time(e.createdAt))}</td><td>${escape(e.actorName || e.actorId)}</td><td>${escape(label(e.action))}</td><td><span class="cell-title">${escape(label(e.entityType))}</span><span class="cell-sub mono truncated" title="${escape(e.entityId)}">${escape(e.entityId)}</span></td><td class="wrap">${escape(e.reason || '—')}</td></tr>`,
              ),
            )
          : empty('No matching activity', 'Try another search or clear the filter.'),
        '',
        'Latest up to 200 events. The complete audit history remains stored on the server.',
      )
    );
  }
  function settingsPage() {
    if (!canAdmin())
      return empty(
        'Administrator access required',
        'Your current role cannot change school billing settings.',
      );
    const s = state.settings;
    return (
      title(
        'School settings',
        'School identity, payment instructions and the defaults used for new documents.',
        button('Edit settings', 'settings-edit', '', 'primary', 'edit'),
      ) +
      panel(
        'School and invoice identity',
        `<div class="panel-body"><dl class="detail-grid">${detailField('Display name', s.schoolName)}${detailField('Legal name', s.legalName)}${detailField('ABN', s.abn)}${detailField('Postal address', s.address)}${detailField('Billing email', s.email)}${detailField('Phone', s.phone)}${detailField('GST registration', s.gstRegistered ? 'Configured as registered' : 'Not configured as registered')}${detailField('Tax policy', s.taxPolicyApproved ? 'Approved by school finance' : 'Awaiting approval')}${detailField('Default due interval', `${s.defaultDueDays || 0} days`)}</dl><div class="form-section"><h3>Payment instructions</h3><p class="small wrap">${escape(s.paymentInstructions || 'Not configured')}</p></div></div>`,
        '',
        'Updated settings apply to future issued documents; historical snapshots are retained.',
      ) +
      panel(
        'Accounting tax mappings',
        `<div class="panel-body"><dl class="detail-grid">${['GST_FREE', 'GST_10', 'NO_GST'].map((code) => detailField(taxLabel(code), s.xeroTaxMappings?.[code])).join('')}</dl></div>`,
        '',
        'Exact tax type labels must be checked against the selected accounting organisation before import.',
      ) +
      panel(
        'Staff access',
        `<div class="panel-body"><p class="small muted">Named staff accounts and roles are managed by the school administrator through the restricted server operator tools. This portal does not share enrolment credentials or grant access to families.</p></div>`,
      )
    );
  }

  // Form helpers return HTML only from escaped values and fixed markup.
  function field(name, text, type = 'text', value = '', options = {}) {
    const id = `field-${name}`,
      attrs = `${options.required ? ' required' : ''}${options.min != null ? ` min="${escape(options.min)}"` : ''}${options.max != null ? ` max="${escape(options.max)}"` : ''}${options.step != null ? ` step="${escape(options.step)}"` : ''}${options.autocomplete ? ` autocomplete="${escape(options.autocomplete)}"` : ''}${options.placeholder ? ` placeholder="${escape(options.placeholder)}"` : ''}${options.disabled ? ' disabled' : ''}${options.maxlength ? ` maxlength="${escape(options.maxlength)}"` : ''}`;
    const input =
      type === 'textarea'
        ? `<textarea id="${id}" name="${escape(name)}"${attrs}>${escape(value)}</textarea>`
        : type === 'select'
          ? `<select id="${id}" name="${escape(name)}"${attrs}>${(options.options || [])
              .map((o) => {
                const [v, t] = Array.isArray(o) ? o : [o, label(o)];
                return `<option value="${escape(v)}"${String(v) === String(value) ? ' selected' : ''}>${escape(t)}</option>`;
              })
              .join('')}</select>`
          : `<input id="${id}" name="${escape(name)}" type="${escape(type)}" value="${escape(value)}"${attrs}>`;
    return `<div class="field${options.full ? ' full' : ''}"><label for="${id}">${escape(text)}${options.required ? ' <span class="required" aria-hidden="true">*</span>' : ''}</label>${input}${options.help ? `<p class="field-help">${escape(options.help)}</p>` : ''}</div>`;
  }
  const checkField = (name, text, checked = false, help = '') =>
    `<div class="field full"><label class="check-field"><input type="checkbox" name="${escape(name)}"${checked ? ' checked' : ''}><span>${escape(text)}${help ? `<span class="field-help block">${escape(help)}</span>` : ''}</span></label></div>`;
  const accountOptions = () => [
    ['', 'Select a billing account'],
    ...state.accounts
      .filter((a) => a.status !== 'archived')
      .map((a) => [a.id, `${a.name} · ${a.code}`]),
  ];
  const invoiceOptions = (eligible) => [
    ['', 'Select an issued invoice'],
    ...state.invoices
      .filter(eligible || ((i) => i.status === 'issued' && i.balanceCents > 0))
      .map((i) => [i.id, `${i.number} · ${accountName(i.accountId)} · ${money(i.balanceCents)}`]),
  ];
  const today = () => state.today;
  function addDays(value, days) {
    const d = new Date(`${value}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + Number(days));
    return d.toISOString().slice(0, 10);
  }
  const number = (form, name) => Number(form.elements[name]?.value || 0);
  const value = (form, name) => String(form.elements[name]?.value || '').trim();
  function cents(raw) {
    const text = String(raw ?? '').trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(text))
      throw new Error('Enter an amount with no more than two decimal places.');
    const [whole, fraction = ''] = text.split('.'),
      result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(result)) throw new Error('This amount is too large.');
    return result;
  }
  function openDialog({
    title: titleText,
    description = '',
    body,
    submit = 'Save',
    onSubmit,
    wide = false,
    setup,
  }) {
    previousFocus = document.activeElement;
    modal = { onSubmit, setup, commandFingerprints: new Set() };
    dialog.className = wide ? 'wide' : '';
    $('#dialog-content').innerHTML =
      `<form id="dialog-form"><header class="dialog-header"><div><h2 id="dialog-title">${escape(titleText)}</h2>${description ? `<p>${escape(description)}</p>` : ''}</div><button class="dialog-close" type="button" data-action="dialog-close" aria-label="Close dialog">${icon('close')}</button></header><div class="dialog-body"><div id="dialog-error" class="form-error" role="alert" tabindex="-1" hidden></div>${body}</div><footer class="dialog-footer">${button('Cancel', 'dialog-close')}${onSubmit ? `<button class="button primary" id="dialog-submit" type="submit">${escape(submit)}</button>` : ''}</footer></form>`;
    $('#dialog-form').addEventListener('submit', submitDialog);
    if (!dialog.open) dialog.showModal();
    setup?.($('#dialog-form'));
    const first =
      $('input:not([type=hidden]),select,textarea', dialog) || $('.dialog-close', dialog);
    first?.focus();
  }
  function closeDialog() {
    if (modal?.saving) return;
    if (dialog.open) dialog.close();
    modal = null;
    previousFocus?.isConnected && previousFocus.focus({ preventScroll: true });
  }
  async function submitDialog(event) {
    event.preventDefault();
    if (!modal?.onSubmit) return;
    const currentModal = modal,
      form = event.currentTarget;
    if (!currentModal.acknowledged && !currentModal.uncertain && !form.reportValidity()) return;
    const submit = $('#dialog-submit');
    if (submit?.disabled) return;
    currentModal.saving = true;
    currentModal.requestStarted = false;
    currentModal.originalDisabled ||= new Map();
    const editable = $$('input,select,textarea,button', form).filter(
      (control) => control.id !== 'dialog-submit' && control.dataset.action !== 'dialog-close',
    );
    editable.forEach((control) => {
      if (!currentModal.originalDisabled.has(control))
        currentModal.originalDisabled.set(control, control.disabled);
      control.disabled = true;
    });
    const oldText = submit?.textContent;
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Saving…';
    }
    $('#dialog-error').hidden = true;
    try {
      if (!currentModal.acknowledged) {
        currentModal.response = await currentModal.onSubmit(form);
        currentModal.acknowledged = true;
        // The command has succeeded. A failed refresh must never execute it again.
        $$('input,select,textarea,button', form).forEach((control) => {
          if (control.id !== 'dialog-submit' && control.dataset.action !== 'dialog-close')
            control.disabled = true;
        });
      }
      const response = currentModal.response;
      await loadState();
      currentModal.commandFingerprints.forEach((key) => retryKeys.delete(key));
      currentModal.saving = false;
      closeDialog();
      if (response?.navigate) {
        screen = response.navigate;
        recordId = response.id;
        filters = {};
      }
      render();
      toast(response?.message || 'Changes saved.');
    } catch (error) {
      if (error.status === 401) {
        currentModal.saving = false;
        return handleError(error);
      }
      const output = $('#dialog-error');
      currentModal.stale = error.code === 'STALE_REVISION';
      currentModal.uncertain =
        !currentModal.acknowledged &&
        currentModal.requestStarted &&
        (!error.status || error.status >= 500);
      if (output && form.isConnected) {
        output.textContent = currentModal.acknowledged
          ? `Saved successfully, but the refreshed records could not be loaded. Retry refresh to continue. ${error.message}`
          : currentModal.uncertain
            ? `The save result could not be confirmed. Retry save to safely check the same operation. Its inputs are preserved. ${error.message}`
            : currentModal.stale
              ? `${error.message} Close and reopen this form to review the current record before saving.`
              : error.message;
        output.hidden = false;
        output.focus();
      }
      if (!currentModal.acknowledged && error.status === 409) {
        try {
          await loadState();
        } catch {
          /* Keep actionable error visible. */
        }
      }
    } finally {
      currentModal.saving = false;
      if (!currentModal.acknowledged && !currentModal.uncertain)
        currentModal.originalDisabled.forEach((disabled, control) => {
          control.disabled = disabled;
        });
      if (submit?.isConnected) {
        submit.disabled = !!currentModal.stale;
        submit.textContent = currentModal.acknowledged
          ? 'Retry refresh'
          : currentModal.uncertain
            ? 'Retry save'
            : oldText;
      }
    }
  }
  function reasonDialog(titleText, description, type, payload, success) {
    openDialog({
      title: titleText,
      description,
      body: field('reason', 'Reason', 'textarea', '', {
        required: true,
        full: true,
        maxlength: 1000,
      }),
      submit: titleText,
      onSubmit: async (form) => {
        await command(type, { ...payload, reason: value(form, 'reason') });
        return { message: success || 'Action recorded.' };
      },
    });
  }
  function accountDialog(id = '') {
    const a = find('accounts', id) || { contactAllowed: false, status: 'active' };
    openDialog({
      title: id ? 'Edit billing account' : 'Create billing account',
      description:
        'A billing account identifies the responsible payer. Students can be added afterwards.',
      body: `<div class="field-grid">${field('name', 'Account name', 'text', a.name, { required: true, full: true, maxlength: 160 })}${field('billingName', 'Name on invoices', 'text', a.billingName, { required: true, full: true, maxlength: 160 })}${field('email', 'Billing email', 'email', a.email, { maxlength: 254 })}${id ? field('status', 'Account status', 'select', a.status, { options: ['active', 'archived'] }) : ''}${field('address', 'Billing address', 'textarea', a.address, { full: true, maxlength: 1000 })}${field('xeroContactName', 'Xero contact name (optional)', 'text', a.xeroContactName, { full: true, maxlength: 160, help: 'Exact Xero contact name for reviewed exports; leave blank until confirmed.' })}${checkField('contactAllowed', 'School has permission to contact this payer about billing', a.contactAllowed)}</div>`,
      submit: id ? 'Save account' : 'Create account',
      onSubmit: async (form) => {
        const payload = {
          name: value(form, 'name'),
          billingName: value(form, 'billingName'),
          email: value(form, 'email'),
          address: value(form, 'address'),
          contactAllowed: form.elements.contactAllowed.checked,
        };
        payload.xeroContactName = value(form, 'xeroContactName');
        if (id)
          Object.assign(payload, {
            id,
            expectedRevision: a.revision,
            status: value(form, 'status'),
          });
        const result = await command(id ? 'account.update' : 'account.create', payload);
        return {
          navigate: 'account',
          id: id || result.id,
          message: id ? 'Account updated.' : 'Billing account created.',
        };
      },
    });
  }
  function studentDialog(id = '', accountId = '') {
    if (!id && !state.accounts.some((a) => a.status === 'active'))
      return toast('Create a billing account before adding a student.', true);
    const s = find('students', id) || {
      accountId,
      entryYear: Number(today().slice(0, 4)) + 1,
      status: 'prospective',
    };
    openDialog({
      title: id ? 'Edit student' : 'Add a student',
      description: 'This creates a billing record only. No enrolment application is changed.',
      body: `<div class="field-grid">${field('accountId', 'Billing account', 'select', s.accountId, { required: true, full: true, options: accountOptions(), disabled: !!id, help: id ? 'Account transfers are not available in this release.' : '' })}${field('name', 'Student name', 'text', s.name, { required: true, full: true, maxlength: 160 })}${field('yearLevel', 'Intended year level', 'text', s.yearLevel, { required: true, placeholder: 'For example, Year 7', maxlength: 60 })}${field('entryYear', 'Entry year', 'number', s.entryYear, { required: true, min: 2000, max: 2200, step: 1 })}${field('status', 'Billing student status', 'select', s.status, { options: ['prospective', 'active', 'inactive'] })}</div>`,
      onSubmit: async (form) => {
        const payload = {
          name: value(form, 'name'),
          yearLevel: value(form, 'yearLevel'),
          entryYear: number(form, 'entryYear'),
          status: value(form, 'status'),
        };
        if (id) Object.assign(payload, { id, expectedRevision: s.revision });
        else payload.accountId = value(form, 'accountId');
        await command(id ? 'student.update' : 'student.create', payload);
        return {
          message: id ? 'Student billing record updated.' : 'Student added to the billing account.',
        };
      },
    });
  }
  function studentLink(id) {
    const s = find('students', id);
    openDialog({
      title: 'Link enrolment reference',
      description: `${s.name} · This reference remains unverified and does not change enrolment.`,
      body: `<div class="field-grid">${field('enrolmentReference', 'Application / enrolment reference', 'text', s.enrolmentReference, { full: true, maxlength: 120, help: 'Use the record reference only, without a URL or access token. Leave empty to remove the unique link.' })}${field('reason', 'Reason for link or change', 'textarea', '', { required: true, full: true, maxlength: 1000 })}</div>`,
      submit: 'Save reference',
      onSubmit: async (form) => {
        await command('student.link', {
          id,
          expectedRevision: s.revision,
          enrolmentReference: value(form, 'enrolmentReference'),
          reason: value(form, 'reason'),
        });
        return { message: 'Unverified enrolment reference saved.' };
      },
    });
  }
  function feeDialog(id = '') {
    const f = find('fees', id) || {
      active: true,
      taxCode: 'NO_GST',
      category: 'tuition',
      unitCents: 0,
    };
    openDialog({
      title: id ? 'Edit fee item' : 'Create fee item',
      description:
        'Catalogue prices apply to future drafts. Refundable bonds are not invoice items.',
      body: `<div class="field-grid">${field('code', 'Fee code', 'text', f.code, { required: true, maxlength: 40 })}${field('category', 'Category', 'select', f.category, { options: ['tuition', 'levy', 'other'] })}${field('description', 'Description', 'text', f.description, { required: true, full: true, maxlength: 300 })}${field('unitAmount', 'Unit price, before GST (AUD)', 'number', amount(f.unitCents), { required: true, min: 0, step: '0.01' })}${field(
        'taxCode',
        'Tax classification',
        'select',
        f.taxCode,
        {
          options: [
            ['NO_GST', 'No GST'],
            ['GST_FREE', 'GST-free'],
            ['GST_10', 'GST 10%'],
          ],
        },
      )}${field('accountCode', 'Accounting revenue code', 'text', f.accountCode, { full: true, maxlength: 100, help: 'Required for an accounting invoice export. Confirm the mapping with finance.' })}${checkField('active', 'Active fee item', f.active)}</div>`,
      onSubmit: async (form) => {
        const payload = {
          code: value(form, 'code'),
          description: value(form, 'description'),
          unitCents: cents(value(form, 'unitAmount')),
          taxCode: value(form, 'taxCode'),
          category: value(form, 'category'),
          accountCode: value(form, 'accountCode'),
          active: form.elements.active.checked,
        };
        if (id) Object.assign(payload, { id, expectedRevision: f.revision });
        await command(id ? 'fee.update' : 'fee.create', payload);
        return { message: 'Fee catalogue updated.' };
      },
    });
  }

  function lineTotals(line) {
    const subtotalCents = Number(line.quantity || 0) * Number(line.unitCents || 0),
      discountCents = Number(line.discountCents || 0),
      netCents = subtotalCents - discountCents;
    const taxCents = line.taxCode === 'GST_10' ? Math.round(netCents / 10) : 0;
    return { subtotalCents, discountCents, netCents, taxCents, totalCents: netCents + taxCents };
  }
  function invoiceDialog(id = '', accountId = '') {
    if (!id && !state.accounts.some((a) => a.status === 'active'))
      return toast('Create a billing account before composing an invoice.', true);
    const i = find('invoices', id) || {
      accountId,
      issueDate: today(),
      dueDate: addDays(today(), state.settings.defaultDueDays || 14),
      year: Number(today().slice(0, 4)),
      term: '',
      description: '',
      lines: [],
    };
    let lines = (i.lines || []).map((l) => ({ ...l }));
    if (!lines.length) lines.push(blankLine());
    const body = `<div class="field-grid">${field('accountId', 'Billing account', 'select', i.accountId, { required: true, full: true, options: accountOptions(), disabled: !!id, help: id ? 'The payer of an existing draft cannot be changed.' : '' })}${field('issueDate', 'Invoice date', 'date', i.issueDate, { required: true })}${field('dueDate', 'Due date', 'date', i.dueDate, { required: true })}${field('year', 'School year', 'number', i.year, { required: true, min: 2000, max: 2200, step: 1 })}${field('term', 'Term / period', 'text', i.term, { required: true, maxlength: 60, placeholder: 'For example, Term 1' })}${field('description', 'Invoice description', 'text', i.description, { full: true, maxlength: 300, placeholder: 'For example, 2027 Term 1 school fees' })}</div><section class="form-section"><div class="line-head"><h3>Invoice items</h3>${button('Add line', 'composer-add', '', 'small', 'plus')}</div><div id="invoice-lines" class="editor-lines"></div><div id="invoice-totals"></div></section><p class="field-help">Preview only. The server validates every amount, student and tax setting before saving. Discounts apply to the whole line, not each unit.</p>`;
    function readLines(form) {
      return $$('.editor-line', form).map((row) => ({
        studentId: $('[data-line=studentId]', row).value || undefined,
        description: $('[data-line=description]', row).value.trim(),
        quantity: Number($('[data-line=quantity]', row).value),
        unitCents: cents($('[data-line=unitAmount]', row).value),
        discountCents: cents($('[data-line=discountAmount]', row).value || '0'),
        taxCode: $('[data-line=taxCode]', row).value,
        category: $('[data-line=category]', row).value,
        accountCode: $('[data-line=accountCode]', row).value.trim(),
      }));
    }
    function displayLines(form) {
      const account = value(form, 'accountId'),
        students = state.students.filter((s) => s.accountId === account),
        fees = state.fees.filter((f) => f.active);
      $('#invoice-lines').innerHTML = lines
        .map(
          (l, index) =>
            `<div class="editor-line" data-line-index="${index}"><div class="line-head"><span>Item ${index + 1}</span><button type="button" class="icon-button" data-action="composer-remove" data-id="${index}" aria-label="Remove item ${index + 1}">${icon('trash')}</button></div><div class="line-grid"><div class="field span2"><label for="line-${index}-template">Fee template</label><select id="line-${index}-template" data-line="template"><option value="">Custom line</option>${fees.map((f) => `<option value="${escape(f.id)}">${escape(f.description)} · ${escape(money(f.unitCents))}</option>`).join('')}</select></div><div class="field span2"><label for="line-${index}-student">Student</label><select id="line-${index}-student" data-line="studentId"><option value="">Account-level charge</option>${students.map((s) => `<option value="${escape(s.id)}"${s.id === l.studentId ? ' selected' : ''}>${escape(s.name)}</option>`).join('')}</select></div><div class="field span4"><label for="line-${index}-description">Description</label><input id="line-${index}-description" data-line="description" required maxlength="300" value="${escape(l.description)}"></div><div class="field"><label for="line-${index}-quantity">Quantity</label><input id="line-${index}-quantity" data-line="quantity" type="number" min="1" step="1" required value="${escape(l.quantity)}"></div><div class="field"><label for="line-${index}-unit">Unit AUD</label><input id="line-${index}-unit" data-line="unitAmount" type="number" min="0" step="0.01" required value="${escape(amount(l.unitCents))}"></div><div class="field"><label for="line-${index}-discount">Discount AUD</label><input id="line-${index}-discount" data-line="discountAmount" type="number" min="0" step="0.01" required value="${escape(amount(l.discountCents))}"></div><div class="field"><label for="line-${index}-tax">Tax</label><select id="line-${index}-tax" data-line="taxCode">${['NO_GST', 'GST_FREE', 'GST_10'].map((t) => `<option value="${t}"${l.taxCode === t ? ' selected' : ''}>${escape(taxLabel(t))}</option>`).join('')}</select></div><div class="field span2"><label for="line-${index}-category">Category</label><select id="line-${index}-category" data-line="category">${['tuition', 'levy', 'other'].map((c) => `<option value="${c}"${l.category === c ? ' selected' : ''}>${escape(label(c))}</option>`).join('')}</select></div><div class="field span2"><label for="line-${index}-code">Accounting code</label><input id="line-${index}-code" data-line="accountCode" maxlength="100" value="${escape(l.accountCode)}"></div></div><div class="line-total" data-line-total>Line total <strong>${escape(money(lineTotals(l).totalCents))}</strong></div></div>`,
        )
        .join('');
      $$('[data-line=template]', form).forEach((select) =>
        select.addEventListener('change', (event) => {
          const f = find('fees', event.target.value);
          if (!f) return;
          const row = event.target.closest('.editor-line');
          for (const [key, val] of Object.entries({
            description: f.description,
            unitAmount: amount(f.unitCents),
            discountAmount: '0.00',
            taxCode: f.taxCode,
            category: f.category,
            accountCode: f.accountCode || '',
          }))
            $(`[data-line=${key}]`, row).value = val;
          updateTotals(form);
        }),
      );
      updateTotals(form);
    }
    function updateTotals(form) {
      try {
        lines = readLines(form);
        const totals = lines.map(lineTotals);
        $$('.editor-line', form).forEach((row, index) => {
          $('[data-line-total]', row).innerHTML =
            `Line total <strong>${escape(money(totals[index].totalCents))}</strong>`;
        });
        $('#invoice-totals').innerHTML =
          `<div class="total-list"><div><span>Subtotal</span><span>${escape(money(sum(totals, 'subtotalCents')))}</span></div><div><span>Discounts</span><span>−${escape(money(sum(totals, 'discountCents')))}</span></div><div><span>GST</span><span>${escape(money(sum(totals, 'taxCents')))}</span></div><div class="grand"><span>Invoice total</span><span>${escape(money(sum(totals, 'totalCents')))}</span></div></div>`;
      } catch {
        $('#invoice-totals').innerHTML =
          '<p class="field-help">Complete valid amounts to update the preview.</p>';
      }
    }
    openDialog({
      title: id ? 'Edit draft invoice' : 'New invoice',
      description:
        id && i.batchId
          ? 'Saving refreshes this draft’s payer and school details from current settings. Review the updated draft before issuing.'
          : 'Prepare the details now. An invoice number is assigned only when you issue it.',
      wide: true,
      body,
      submit: 'Save draft',
      setup: (form) => {
        displayLines(form);
        form.addEventListener('input', (event) => {
          if (event.target.closest('#invoice-lines')) updateTotals(form);
        });
        form.elements.accountId.addEventListener('change', () => {
          const students = state.students.filter((s) => s.accountId === value(form, 'accountId'));
          $$('[data-line=studentId]', form).forEach((select) => {
            select.innerHTML =
              '<option value="">Account-level charge</option>' +
              students
                .map((s) => `<option value="${escape(s.id)}">${escape(s.name)}</option>`)
                .join('');
          });
          updateTotals(form);
        });
        modal.addLine = () => {
          lines = readLines(form);
          lines.push(blankLine());
          displayLines(form);
          $$('.editor-line', form).at(-1)?.scrollIntoView({ block: 'nearest' });
        };
        modal.removeLine = (index) => {
          if (lines.length <= 1) return toast('An invoice needs at least one item.', true);
          lines = readLines(form);
          lines.splice(index, 1);
          displayLines(form);
        };
      },
      onSubmit: async (form) => {
        const payload = {
          accountId: value(form, 'accountId'),
          issueDate: value(form, 'issueDate'),
          dueDate: value(form, 'dueDate'),
          year: number(form, 'year'),
          term: value(form, 'term'),
          description: value(form, 'description'),
          lines: readLines(form),
        };
        if (id) Object.assign(payload, { id, expectedRevision: i.revision });
        const result = await command(id ? 'invoice.update' : 'invoice.create', payload);
        return {
          navigate: 'invoice',
          id: id || result.id,
          message: 'Draft invoice saved. Review it before issuing.',
        };
      },
    });
  }
  function blankLine() {
    return {
      description: '',
      quantity: 1,
      unitCents: 0,
      discountCents: 0,
      taxCode: 'NO_GST',
      category: 'tuition',
      accountCode: '',
    };
  }
  function issueInvoice(id) {
    const i = find('invoices', id);
    openDialog({
      title: 'Issue this invoice',
      description: 'Issuing assigns a permanent invoice number and preserves the document details.',
      body: `<div class="notice-box"><strong>${escape(accountName(i.accountId))}</strong><br>${escape(i.description || 'School fees')}<br>${escape(money(i.totalCents))} · due ${escape(date(i.dueDate))}</div><p class="small muted">Check the payer, items, tax and payment instructions. This action does not email the invoice or send it to an accounting system.</p>`,
      submit: 'Issue invoice',
      onSubmit: async () => {
        await command('invoice.issue', { id, expectedRevision: i.revision });
        return { message: 'Invoice issued. Its PDF is ready to download.' };
      },
    });
  }
  function paymentDialog(accountId = '') {
    if (!state.accounts.some((a) => a.status === 'active'))
      return toast('Create a billing account before reporting a payment.', true);
    openDialog({
      title: 'Record a reported payment',
      description:
        'Finance must verify the funds before a receipt is generated or fees are reduced.',
      body: `<div class="field-grid">${field('accountId', 'Billing account', 'select', accountId, { required: true, full: true, options: accountOptions() })}${field(
        'purpose',
        'Payment purpose',
        'select',
        'fees',
        {
          options: [
            ['fees', 'School fees / prepayment'],
            ['bond', 'Refundable bond'],
          ],
        },
      )}${field('amount', 'Amount received (AUD)', 'number', '', { required: true, min: '0.01', step: '0.01' })}${field('paidOn', 'Payment date', 'date', today(), { required: true, max: today() })}${field(
        'method',
        'Method',
        'select',
        'bank_transfer',
        {
          options: [
            ['bank_transfer', 'Bank transfer'],
            ['cash', 'Cash'],
            ['eftpos', 'EFTPOS'],
            ['other', 'Other'],
          ],
        },
      )}${field('reference', 'Unique transaction reference', 'text', '', { required: true, full: true, maxlength: 200, help: 'Use the actual bank/terminal transaction identifier, not a generic family reference.' })}</div>`,
      submit: 'Record for verification',
      onSubmit: async (form) => {
        const result = await command('payment.record', {
          accountId: value(form, 'accountId'),
          purpose: value(form, 'purpose'),
          amountCents: cents(value(form, 'amount')),
          paidOn: value(form, 'paidOn'),
          method: value(form, 'method'),
          reference: value(form, 'reference'),
        });
        return {
          navigate: 'payment',
          id: result.id,
          message: 'Payment recorded. Finance verification is still required.',
        };
      },
    });
  }
  function allocationFields(p, confirming) {
    const invoices = state.invoices.filter(
        (i) => i.accountId === p.accountId && i.status === 'issued' && i.balanceCents > 0,
      ),
      available = confirming ? p.amountCents : p.unallocatedCents;
    if (p.purpose === 'bond')
      return `<div class="notice-box">${escape(money(available))} will be held as a refundable bond. Bonds cannot settle a fee invoice.</div>`;
    return `<div class="notice-box">Available to allocate: <strong>${escape(money(available))}</strong>. Leave amounts at zero to keep funds unallocated.</div>${invoices.length ? `<div id="allocation-fields">${invoices.map((i) => `<div class="allocation-row"><label for="allocate-${escape(i.id)}"><span class="cell-title">${escape(i.number)}</span><span class="cell-sub">Due ${escape(date(i.dueDate))} · outstanding ${escape(money(i.balanceCents))}</span></label><input id="allocate-${escape(i.id)}" data-invoice-allocation="${escape(i.id)}" aria-label="Amount for ${escape(i.number)} in AUD" type="number" step="0.01" min="0" max="${escape(amount(Math.min(available, i.balanceCents)))}" value="0.00"></div>`).join('')}</div>` : '<p class="small muted">No outstanding issued invoices are available for this account.</p>'}`;
  }
  const readAllocations = (form) =>
    $$('[data-invoice-allocation]', form)
      .map((input) => ({
        invoiceId: input.dataset.invoiceAllocation,
        amountCents: cents(input.value || '0'),
      }))
      .filter((a) => a.amountCents > 0);
  function allocateDialog(id, confirming = false) {
    const p = find('payments', id);
    openDialog({
      title: confirming ? 'Verify received payment' : 'Allocate confirmed funds',
      description: `${accountName(p.accountId)} · ${p.reference}`,
      body: `${confirming ? `<div class="notice-box warning">Confirm only after checking independent evidence that ${escape(money(p.amountCents))} was received by the school. A receipt will be created.</div>${field('evidence', 'Verification evidence', 'textarea', '', { required: true, full: true, maxlength: 2000, help: 'Record the statement/settlement reference and the verification performed. Do not enter card or bank account credentials.' })}<section class="form-section"><h3>Apply funds</h3>` : ''}${allocationFields(p, confirming)}${confirming ? '</section>' : ''}`,
      submit: confirming ? 'Confirm receipt of funds' : 'Save allocations',
      onSubmit: async (form) => {
        const allocations = readAllocations(form);
        if (!confirming && !allocations.length)
          throw new Error('Enter an amount for at least one invoice.');
        const payload = { id, allocations };
        if (confirming) payload.evidence = value(form, 'evidence');
        await command(confirming ? 'payment.confirm' : 'payment.allocate', payload);
        return {
          message: confirming
            ? 'Payment verified and receipt generated.'
            : 'Payment allocations saved.',
        };
      },
    });
  }
  function refundDialog(id) {
    const p = find('payments', id);
    openDialog({
      title: 'Record a completed refund',
      description:
        'Record evidence of money already returned. This action does not make a bank transfer.',
      body: `<div class="notice-box">${escape(accountName(p.accountId))} · ${escape(p.reference)}<br>Available unapplied / held funds: <strong>${escape(money(p.unallocatedCents))}</strong></div><div class="field-grid">${field('amount', 'Refund amount (AUD)', 'number', '', { required: true, min: '0.01', max: amount(p.unallocatedCents), step: '0.01' })}${field('paidOn', 'Date returned', 'date', today(), { required: true, max: today() })}${field('reference', 'Refund transaction reference', 'text', '', { required: true, full: true, maxlength: 200 })}${field('reason', 'Reason and completed-refund evidence', 'textarea', '', { required: true, full: true, maxlength: 1000 })}</div>`,
      submit: 'Record completed refund',
      onSubmit: async (form) => {
        await command('payment.refund', {
          id,
          amountCents: cents(value(form, 'amount')),
          paidOn: value(form, 'paidOn'),
          reference: value(form, 'reference'),
          reason: value(form, 'reason'),
        });
        return { message: 'Completed refund recorded.' };
      },
    });
  }
  function creditDialog(id) {
    const i = find('invoices', id),
      previous = state.credits.filter((c) => c.invoiceId === id).flatMap((c) => c.lines || []);
    openDialog({
      title: 'Create a credit note',
      description: `${i.number} · Credits reduce the amount owed; they do not return money.`,
      body: `<div class="notice-box">Invoice outstanding: <strong>${escape(money(i.balanceCents))}</strong>. To adjust a paid amount, release its payment allocation first. Enter positive gross amounts including any original GST.</div>${(
        i.lines || []
      )
        .map((l) => {
          const total = l.totalCents ?? lineTotals(l).totalCents,
            used = sum(
              previous.filter((c) => c.invoiceLineId === l.id),
              'amountCents',
            ),
            capacity = Math.max(0, Math.min(total - used, i.balanceCents));
          return `<div class="allocation-row"><label for="credit-${escape(l.id)}"><span class="cell-title">${escape(l.description)}</span><span class="cell-sub">${escape(l.studentName || 'Account charge')} · original ${escape(money(total))} · ${escape(taxLabel(l.taxCode))}</span></label><input id="credit-${escape(l.id)}" data-credit-line="${escape(l.id)}" aria-label="Gross credit for ${escape(l.description)} in AUD" type="number" min="0" max="${escape(amount(capacity))}" step="0.01" value="0.00"></div>`;
        })
        .join(
          '',
        )}<div class="form-section">${field('reason', 'Reason for credit', 'textarea', '', { required: true, maxlength: 1000 })}</div>`,
      submit: 'Issue credit note',
      onSubmit: async (form) => {
        const lines = $$('[data-credit-line]', form)
          .map((input) => ({
            invoiceLineId: input.dataset.creditLine,
            amountCents: cents(input.value || '0'),
          }))
          .filter((l) => l.amountCents > 0);
        if (!lines.length) throw new Error('Enter a credit amount for at least one invoice line.');
        await command('credit.create', { invoiceId: id, lines, reason: value(form, 'reason') });
        return { message: 'Credit note issued; original invoice preserved.' };
      },
    });
  }
  function planDialog(invoiceId = '') {
    const availableInvoices = (i) =>
      i.status === 'issued' && i.balanceCents > 0 && !state.plans.some((p) => p.invoiceId === i.id);
    if (!state.invoices.some(availableInvoices))
      return toast(
        'A payment plan requires an issued invoice with an outstanding balance and no existing plan.',
        true,
      );
    let instalments = [
      { dueDate: today(), amountCents: find('invoices', invoiceId)?.totalCents || 0 },
    ];
    function read(form) {
      return $$('.schedule-row', form).map((row) => ({
        dueDate: $('[data-part=date]', row).value,
        amountCents: cents($('[data-part=amount]', row).value || '0'),
      }));
    }
    function draw(form) {
      $('#schedule-rows').innerHTML = instalments
        .map(
          (part, index) =>
            `<div class="schedule-row"><div><label for="part-date-${index}">Instalment ${index + 1} date</label><input id="part-date-${index}" data-part="date" type="date" value="${escape(part.dueDate)}" required></div><div><label for="part-amount-${index}">Amount (AUD)</label><input id="part-amount-${index}" data-part="amount" type="number" min="0.01" step="0.01" value="${escape(amount(part.amountCents))}" required></div><button type="button" class="icon-button" data-action="plan-remove" data-id="${index}" aria-label="Remove instalment ${index + 1}">${icon('close')}</button></div>`,
        )
        .join('');
      update(form);
    }
    function update(form) {
      try {
        const target = find('invoices', value(form, 'invoiceId'))?.totalCents || 0;
        $('#schedule-total').textContent =
          `Scheduled ${money(sum(read(form), 'amountCents'))} · original invoice total ${money(target)}`;
      } catch {
        $('#schedule-total').textContent = 'Complete all instalment amounts.';
      }
    }
    openDialog({
      title: 'Create an agreed payment plan',
      description:
        'Dates must be ordered and amounts must exactly cover the original invoice total. Existing payments and credits count towards progress. No debit will be scheduled.',
      body: `${field('invoiceId', 'Invoice', 'select', invoiceId, { required: true, options: invoiceOptions(availableInvoices) })}<div class="form-section"><div class="line-head"><h3>Instalments</h3>${button('Add instalment', 'plan-add', '', 'small', 'plus')}</div><div id="schedule-rows"></div><p id="schedule-total" class="field-help"></p></div>`,
      submit: 'Save payment plan',
      setup: (form) => {
        draw(form);
        form.addEventListener('input', () => update(form));
        form.elements.invoiceId.addEventListener('change', () => {
          instalments = [
            {
              dueDate: today(),
              amountCents: find('invoices', value(form, 'invoiceId'))?.totalCents || 0,
            },
          ];
          draw(form);
        });
        modal.planAdd = () => {
          instalments = read(form);
          instalments.push({
            dueDate: addDays(instalments.at(-1)?.dueDate || today(), 30),
            amountCents: 0,
          });
          draw(form);
        };
        modal.planRemove = (index) => {
          if (instalments.length <= 1) return toast('A plan needs at least one instalment.', true);
          instalments = read(form);
          instalments.splice(index, 1);
          draw(form);
        };
      },
      onSubmit: async (form) => {
        await command('plan.create', {
          invoiceId: value(form, 'invoiceId'),
          instalments: read(form),
        });
        return { message: 'Agreed payment plan saved.' };
      },
    });
  }
  function batchDialog() {
    const students = state.students.filter(
        (s) => s.status !== 'inactive' && find('accounts', s.accountId)?.status === 'active',
      ),
      fees = state.fees.filter((f) => f.active);
    if (!students.length || !fees.length)
      return toast(
        'A billing run requires at least one active fee item and a prospective or active student.',
        true,
      );
    openDialog({
      title: 'Preview a billing run',
      description:
        'Each selected fee is applied to each selected student, grouped into an account invoice. Review before creating drafts.',
      wide: true,
      body: `<div class="field-grid">${field('label', 'Run name', 'text', '', { required: true, full: true, maxlength: 160, placeholder: 'For example, 2027 Term 1 tuition' })}${field('year', 'School year', 'number', today().slice(0, 4), { required: true, min: 2000, max: 2200 })}${field('term', 'Term / period', 'text', '', { required: true, maxlength: 60 })}${field('issueDate', 'Invoice date', 'date', today(), { required: true })}${field('dueDate', 'Due date', 'date', addDays(today(), state.settings.defaultDueDays || 14), { required: true })}</div><div class="field-grid form-section"><div><h3>Students</h3><div class="selection-list">${students.map((s) => `<label><input type="checkbox" name="studentIds" value="${escape(s.id)}"><span>${escape(s.name)}<span class="cell-sub">${escape(accountName(s.accountId))} · ${escape(s.yearLevel)}</span></span></label>`).join('')}</div></div><div><h3>Fee items</h3><div class="selection-list">${fees.map((f) => `<label><input type="checkbox" name="feeIds" value="${escape(f.id)}"><span>${escape(f.description)}<span class="cell-sub">${escape(money(f.unitCents))} before GST · ${escape(taxLabel(f.taxCode))}</span></span></label>`).join('')}</div><p class="field-help">A family-only levy should be added once to its account invoice separately; this run charges per student.</p></div></div>`,
      submit: 'Create priced preview',
      onSubmit: async (form) => {
        const studentIds = $$('input[name=studentIds]:checked', form).map((input) => input.value),
          feeIds = $$('input[name=feeIds]:checked', form).map((input) => input.value);
        if (!studentIds.length || !feeIds.length)
          throw new Error('Select at least one student and one fee item.');
        const result = await command('batch.preview', {
          label: value(form, 'label'),
          studentIds,
          feeIds,
          year: number(form, 'year'),
          term: value(form, 'term'),
          issueDate: value(form, 'issueDate'),
          dueDate: value(form, 'dueDate'),
        });
        return {
          navigate: 'batch',
          id: result.id,
          message: 'Priced preview created. Review it before generating drafts.',
        };
      },
    });
  }
  function commitBatch(id) {
    const b = find('batches', id);
    openDialog({
      title: 'Create drafts from this preview',
      description: 'This reviewed batch can create its drafts only once.',
      body: `<div class="notice-box"><strong>${escape(b.label)}</strong><br>${escape(b.invoiceCount)} invoices · ${escape(money(b.totalCents))}<br>Due ${escape(date(b.dueDate))}</div><p class="small muted">Drafts retain the reviewed amounts. No invoices will be issued, emailed or exported automatically.</p>`,
      submit: 'Create invoice drafts',
      onSubmit: async () => {
        await command('batch.commit', { id });
        return { message: 'Invoice drafts created. Open each invoice to review and issue.' };
      },
    });
  }
  function settingsDialog() {
    const s = state.settings;
    openDialog({
      title: 'Edit school billing settings',
      description: 'Use approved school details. Issued documents retain their original snapshots.',
      wide: true,
      body: `<div class="field-grid">${field('schoolName', 'Display name', 'text', s.schoolName, { required: true, maxlength: 160 })}${field('legalName', 'Legal issuing entity', 'text', s.legalName, { maxlength: 160 })}${field('abn', 'ABN', 'text', s.abn, { maxlength: 30 })}${field('defaultDueDays', 'Default due interval (days)', 'number', s.defaultDueDays, { required: true, min: 0, max: 365, step: 1 })}${field('email', 'Billing email', 'email', s.email, { maxlength: 254 })}${field('phone', 'Billing phone', 'text', s.phone, { maxlength: 60 })}${field('address', 'School postal address', 'textarea', s.address, { full: true, maxlength: 1000 })}${field('paymentInstructions', 'Payment instructions on invoices', 'textarea', s.paymentInstructions, { full: true, maxlength: 3000 })}${checkField('gstRegistered', 'School is registered for GST', s.gstRegistered, 'This is an authorised operator assertion, not an ABN lookup.')}${checkField('taxPolicyApproved', 'School finance has approved the fee tax classifications', s.taxPolicyApproved, 'Required before issuing live invoices. Confirm the actual supplies and school policy.')}</div><div class="form-section"><h3>Accounting tax mappings</h3><p class="field-help">Exact tax type names from the intended accounting organisation. Leave empty until confirmed.</p><div class="field-grid">${['GST_FREE', 'GST_10', 'NO_GST'].map((code) => field(`mapping_${code}`, taxLabel(code), 'text', s.xeroTaxMappings?.[code], { maxlength: 100 })).join('')}</div></div>`,
      onSubmit: async (form) => {
        const payload = { ...s, expectedRevision: s.revision };
        for (const key of [
          'schoolName',
          'legalName',
          'abn',
          'address',
          'email',
          'phone',
          'paymentInstructions',
        ])
          payload[key] = value(form, key);
        payload.defaultDueDays = number(form, 'defaultDueDays');
        payload.gstRegistered = form.elements.gstRegistered.checked;
        payload.taxPolicyApproved = form.elements.taxPolicyApproved.checked;
        payload.xeroTaxMappings = Object.fromEntries(
          ['GST_FREE', 'GST_10', 'NO_GST'].map((code) => [code, value(form, `mapping_${code}`)]),
        );
        delete payload.demoMode;
        await command('settings.update', payload);
        return { message: 'School billing settings updated.' };
      },
    });
  }
  function exportDetail(id) {
    const e = find('exports', id),
      m = e.metadata || {};
    openDialog({
      title: 'Export manifest',
      description: `${label(e.kind)} · ${time(e.createdAt)}`,
      body: `<dl class="detail-grid">${detailField('Export ID', e.id)}${detailField('Status', label(e.status))}${detailField('Rows', m.rowCount ?? m.documentCount)}${detailField('Net total', money(m.netTotalCents ?? m.netCents))}${detailField('Tax total', money(m.taxTotalCents ?? m.taxCents))}${detailField('Gross total', money(m.grossTotalCents ?? m.grossCents ?? m.totalCents))}${detailField('Mapping revision', m.mappingRevision)}${detailField('Imported reference', e.importReference)}</dl><div class="form-section"><h3>File SHA-256</h3><p class="mono small wrap">${escape(m.sha256 || m.hash || 'Not supplied')}</p></div><div class="form-section"><h3>Complete recorded metadata</h3><pre class="small wrap pre-wrap">${escape(JSON.stringify(m, null, 2))}</pre></div>`,
    });
  }
  function importDialog(id) {
    openDialog({
      title: 'Record external import evidence',
      description:
        'Use the reference from a completed, reviewed accounting import. This does not confirm reconciliation.',
      body: `<div class="field-grid">${field('importReference', 'External import / batch reference', 'text', '', { required: true, full: true, maxlength: 200 })}${field('reason', 'Import notes and evidence', 'textarea', '', { required: true, full: true, maxlength: 1000 })}</div>`,
      submit: 'Record import evidence',
      onSubmit: async (form) => {
        await command('export.recordImport', {
          id,
          importReference: value(form, 'importReference'),
          reason: value(form, 'reason'),
        });
        return { message: 'Manual import evidence recorded.' };
      },
    });
  }
  async function download(path, filename) {
    try {
      const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) {
        let body;
        try {
          body = await response.json();
        } catch {
          body = {};
        }
        const error = new Error(body.message || 'The download could not be prepared.');
        error.status = response.status;
        throw error;
      }
      const blob = await response.blob(),
        url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      await loadState();
      render();
      toast('Download prepared. This does not send the document to the payer.');
    } catch (error) {
      handleError(error);
    }
  }

  document.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const action = target.dataset.action,
      id = target.dataset.id || '';
    try {
      switch (action) {
        case 'navigate':
          navigate(id);
          break;
        case 'menu':
          menuOpen = !menuOpen;
          render();
          break;
        case 'refresh':
          await refresh();
          break;
        case 'logout':
          await request('/api/logout', {
            method: 'POST',
            headers: { 'X-CSRF-Token': session.csrfToken },
          });
          session = null;
          state = null;
          closeDialog();
          renderLogin();
          break;
        case 'dialog-close':
          closeDialog();
          break;
        case 'account-open':
          navigate('account', id);
          break;
        case 'account-new':
          accountDialog();
          break;
        case 'account-edit':
          accountDialog(id);
          break;
        case 'student-new':
          studentDialog('', id);
          break;
        case 'student-edit':
          studentDialog(id);
          break;
        case 'student-link':
          studentLink(id);
          break;
        case 'fee-new':
          feeDialog();
          break;
        case 'fee-edit':
          feeDialog(id);
          break;
        case 'invoice-open':
          navigate('invoice', id);
          break;
        case 'invoice-new':
          invoiceDialog('', id);
          break;
        case 'invoice-edit':
          invoiceDialog(id);
          break;
        case 'invoice-issue':
          issueInvoice(id);
          break;
        case 'invoice-void':
          reasonDialog(
            'Void invoice',
            'Only an issued invoice with no payment or credit history can be voided. Its number and original document remain recorded.',
            'invoice.void',
            { id },
            'Invoice voided.',
          );
          break;
        case 'composer-add':
          modal?.addLine?.();
          break;
        case 'composer-remove':
          modal?.removeLine?.(Number(id));
          break;
        case 'payment-open':
          navigate('payment', id);
          break;
        case 'payment-new':
          paymentDialog(id);
          break;
        case 'payment-confirm':
          allocateDialog(id, true);
          break;
        case 'payment-allocate':
          allocateDialog(id);
          break;
        case 'payment-reject':
          reasonDialog(
            'Reject payment report',
            'Use when independent verification shows the reported payment was not received. No receipt will be created.',
            'payment.reject',
            { id },
            'Payment report rejected.',
          );
          break;
        case 'payment-reverse':
          reasonDialog(
            'Reverse confirmed payment',
            'This restores invoice balances by releasing allocations and marks the receipt reversed. It does not return money.',
            'payment.reverse',
            { id },
            'Payment reversed; original history retained.',
          );
          break;
        case 'payment-release':
          reasonDialog(
            'Release allocation',
            'This removes the entire selected allocation and returns the money to unapplied funds. You can then allocate it correctly.',
            'payment.release',
            { id, allocationId: target.dataset.allocationId },
            'Allocation released.',
          );
          break;
        case 'payment-refund':
          refundDialog(id);
          break;
        case 'credit-new':
          creditDialog(id);
          break;
        case 'plan-new':
          planDialog(id);
          break;
        case 'plan-add':
          modal?.planAdd?.();
          break;
        case 'plan-remove':
          modal?.planRemove?.(Number(id));
          break;
        case 'batch-new':
          batchDialog();
          break;
        case 'batch-open':
          navigate('batch', id);
          break;
        case 'batch-commit':
          commitBatch(id);
          break;
        case 'settings-edit':
          settingsDialog();
          break;
        case 'export-detail':
          exportDetail(id);
          break;
        case 'export-import':
          importDialog(id);
          break;
        case 'invoice-download':
          await download(
            `/api/documents/invoice/${encodeURIComponent(id)}.pdf`,
            `${find('invoices', id)?.number || 'draft-invoice'}.pdf`,
          );
          break;
        case 'receipt-download':
          await download(
            `/api/documents/receipt/${encodeURIComponent(id)}.pdf`,
            `${find('receipts', id)?.number || 'receipt'}.pdf`,
          );
          break;
        case 'credit-download':
          await download(
            `/api/documents/credit/${encodeURIComponent(id)}.pdf`,
            `${find('credits', id)?.number || 'credit-note'}.pdf`,
          );
          break;
        case 'statement-download':
          await download(
            `/api/documents/statement/${encodeURIComponent(id)}.pdf`,
            `${find('accounts', id)?.code || 'account'}-statement.pdf`,
          );
          break;
        case 'export-receivables':
          await download('/api/exports/receivables.csv', 'rosewood-receivables.csv');
          break;
        case 'export-xero':
          await download('/api/exports/xero.csv', 'rosewood-accounting-invoices.csv');
          break;
      }
    } catch (error) {
      handleError(error);
    }
  });
  dialog.addEventListener('cancel', (event) => {
    if (modal?.saving) event.preventDefault();
    else modal = null;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuOpen) {
      menuOpen = false;
      render();
    }
  });
  (async () => {
    try {
      session = await request('/api/session');
      await loadState();
      render();
    } catch (error) {
      if (error.status === 401) renderLogin();
      else
        renderLogin(
          'The billing service could not be reached. Check your connection and try signing in again.',
        );
    }
  })();
})();
