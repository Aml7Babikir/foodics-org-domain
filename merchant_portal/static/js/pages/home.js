/**
 * Home / dashboard — shows the merchant's active subscription,
 * pending invoice if any, upcoming renewal, and quick actions.
 */
const HomeView = (() => {
  async function render(root) {
    App.renderHeader(root);
    const body = document.createElement("main");
    root.appendChild(body);
    body.innerHTML = `<div class="muted">Loading your subscription…</div>`;
    await Store.loadSubscription();
    if (!Store.subscription?.has_subscription) {
      renderEmpty(body);
    } else {
      renderActive(body);
    }
  }

  function renderEmpty(body) {
    const m = Store.merchant;
    body.innerHTML = `
      <div class="card" style="text-align:center; padding: 48px 20px;">
        <h2 style="margin: 0 0 8px;">Welcome, ${m.name}.</h2>
        <p class="muted" style="margin: 0 0 24px;">You don't have an active subscription yet. Let's set one up.</p>
        <button class="btn accent" id="start-checkout">Start my subscription</button>
      </div>
    `;
    document.getElementById("start-checkout").addEventListener("click", () => App.goto("checkout"));
  }

  function renderActive(body) {
    const d = Store.subscription;
    const s = d.subscription;
    const pending = d.pending_invoice;
    const renewalDays = daysUntil(s.next_renewal_at);

    body.innerHTML = `
      <div class="sub-summary">
        <div><div class="col-label">Plan</div><div class="col-val">${s.plan_name}</div><div class="col-sub">${s.branches} branch(es) · ${s.billing_frequency === "annual" ? "annual" : "monthly"}</div></div>
        <div><div class="col-label">Status</div><div class="col-val" style="text-transform:capitalize;">${s.status.replace("_", " ")}</div><div class="col-sub">${s.currency}</div></div>
        <div><div class="col-label">Recurring</div><div class="col-val">${money(d.quote.totals.grand_total, s.currency)}</div><div class="col-sub">${s.billing_frequency === "annual" ? "per year" : "per month"}</div></div>
        <div><div class="col-label">Next renewal</div><div class="col-val">${dateFmt(s.next_renewal_at)}</div><div class="col-sub">${renewalDays != null ? `in ${renewalDays} day(s)` : "—"}</div></div>
      </div>

      ${pending ? `
        <div class="alert warn">
          <b>Payment due:</b> Invoice ${pending.number} · ${money(pending.total, pending.currency)}.
          <button class="btn small accent" style="margin-left:12px;" id="pay-pending">Pay now</button>
        </div>
      ` : ""}

      <div class="row">
        <div class="col">
          <div class="card">
            <div class="card-title">What you're getting</div>
            ${renderLines(d.quote)}
            <div style="border-top:2px solid var(--ink); padding-top: 12px; margin-top: 10px; display: flex; justify-content: space-between;">
              <b>${s.billing_frequency === "annual" ? "Yearly total" : "Monthly total"}</b>
              <b>${money(d.quote.totals.grand_total, s.currency)}</b>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Recent invoices</div>
            ${d.invoices.length ? `
              <table class="simple">
                <thead><tr><th>Number</th><th>Issued</th><th class="numeric">Total</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  ${d.invoices.map((i) => `
                    <tr>
                      <td><b>${i.number}</b></td>
                      <td>${dateFmt(i.issued_at)}</td>
                      <td class="numeric">${money(i.total, i.currency)}</td>
                      <td><span class="chip ${i.status === "paid" ? "status-completed" : "status-pending_payment"}">${i.status}</span></td>
                      <td>${i.status === "pending" ? `<button class="btn small accent" data-pay-inv="${i.id}">Pay</button>` : ""}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            ` : `<div class="empty-state">No invoices yet.</div>`}
          </div>
        </div>

        <div class="col" style="max-width: 280px;">
          <div class="card">
            <div class="card-title">Actions</div>
            <button class="btn wide" id="act-manage">Change plan / add-ons</button>
            <div style="height: 10px;"></div>
            <button class="btn wide secondary" id="act-renew">Simulate renewal</button>
            <div style="height: 10px;"></div>
            <button class="btn wide secondary" id="act-cancel" style="color: var(--red); border-color: #fecdca;">Cancel subscription</button>
          </div>

          <div class="card">
            <div class="card-title">Billing contact</div>
            <div class="small muted">Email</div>
            <div>${Store.merchant.email}</div>
            <div class="small muted" style="margin-top:10px;">SF account</div>
            <div>${Store.merchant.sf_account_number || "—"}</div>
            <div class="small muted" style="margin-top:10px;">Currency</div>
            <div>${s.currency}</div>
          </div>
        </div>
      </div>
    `;

    document.getElementById("act-manage").addEventListener("click", () => App.goto("manage"));
    document.getElementById("act-renew").addEventListener("click", onRenew);
    document.getElementById("act-cancel").addEventListener("click", onCancel);
    if (pending) {
      document.getElementById("pay-pending").addEventListener("click", () => App.goto("payment", { invoiceId: pending.id }));
    }
    document.querySelectorAll("[data-pay-inv]").forEach((b) => {
      b.addEventListener("click", () => App.goto("payment", { invoiceId: parseInt(b.dataset.payInv, 10) }));
    });
  }

  function renderLines(quote) {
    const byCat = { plan: [], addon: [], device: [], separate: [] };
    quote.lines.forEach((l) => (byCat[l.category] || (byCat[l.category] = [])).push(l));
    const header = (label) => `<div class="small muted" style="margin: 12px 0 4px; text-transform: uppercase; letter-spacing:.4px; font-weight:600;">${label}</div>`;
    let html = "";
    if (byCat.plan.length) html += header("Plan") + byCat.plan.map(lineHtml).join("");
    if (byCat.addon.length) html += header("Add-ons") + byCat.addon.map(lineHtml).join("");
    if (byCat.device.length) html += header("Devices") + byCat.device.map(lineHtml).join("");
    if (byCat.separate.length) html += header("Separate products") + byCat.separate.map(lineHtml).join("");
    return html || `<div class="empty-state">No lines.</div>`;
  }

  function lineHtml(ln) {
    return `<div class="line" style="display:flex; justify-content: space-between; padding: 3px 0;">
      <div>${ln.description}</div>
      <div class="numeric">${money(ln.subtotal, Store.subscription.subscription.currency)}</div>
    </div>`;
  }

  async function onRenew() {
    try {
      const r = await API.renew(Store.merchant.id);
      toast(`Renewal invoice ${r.invoice.number} generated`);
      App.goto("payment", { invoiceId: r.invoice.id });
    } catch (e) { toast(e.message); }
  }

  async function onCancel() {
    if (!confirm("Cancel your subscription?\n\nYou'll lose access at the end of the current cycle.")) return;
    try {
      await API.cancel(Store.merchant.id);
      toast("Subscription cancelled");
      App.goto("home");
    } catch (e) { toast(e.message); }
  }

  return { render };
})();
