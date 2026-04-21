/**
 * Payment view — mock card form, always succeeds. Shows a card visual, then a receipt.
 */
const PaymentView = (() => {
  const state = { invoiceId: null, returnTo: "home", invoice: null, paid: null };

  async function render(root, params = {}) {
    state.invoiceId = params.invoiceId;
    state.returnTo = params.returnTo || "home";
    state.paid = null;
    App.renderHeader(root);
    const body = document.createElement("main");
    root.appendChild(body);
    body.innerHTML = `<div class="muted">Loading invoice…</div>`;
    await Store.loadSubscription();
    state.invoice = Store.subscription?.invoices?.find((i) => i.id === state.invoiceId)
                 || Store.subscription?.pending_invoice && Store.subscription.pending_invoice.id === state.invoiceId
                    ? Store.subscription.pending_invoice
                    : null;
    // Fallback: find from full invoice list
    if (!state.invoice && Store.subscription?.invoices) {
      state.invoice = Store.subscription.invoices.find((i) => i.id === state.invoiceId);
    }
    if (!state.invoice) {
      body.innerHTML = `<div class="alert err">Invoice not found. It may have been paid already.</div>
        <button class="btn" onclick="App.goto('home')">Back to home</button>`;
      return;
    }
    renderForm(body);
  }

  function renderForm(body) {
    const i = state.invoice;
    body.innerHTML = `
      <div class="row">
        <div class="col" style="flex:1;">
          <div class="card">
            <div class="card-title">Pay invoice ${i.number}</div>
            <div class="card-subtitle">Demo mode — any card number succeeds.</div>
            <div class="card-form">
              <div class="visual">
                <div class="bank">Foodics Demo Card</div>
                <div class="num" id="pm-visual-num">•••• •••• •••• 4242</div>
                <div class="meta">
                  <div><span style="opacity:.6;">NAME</span><br><span id="pm-visual-name">CARDHOLDER</span></div>
                  <div><span style="opacity:.6;">EXP</span><br><span id="pm-visual-exp">12/30</span></div>
                </div>
              </div>
              <div class="field">
                <label>Card number</label>
                <input id="pm-num" value="4242 4242 4242 4242" maxlength="19"/>
              </div>
              <div class="field">
                <label>Cardholder name</label>
                <input id="pm-name" value="${(Store.merchant?.name || "").toUpperCase()}"/>
              </div>
              <div class="row">
                <div class="col field"><label>Expires MM/YY</label><input id="pm-exp" value="12/30" maxlength="5"/></div>
                <div class="col field"><label>CVV</label><input id="pm-cvv" value="123" maxlength="4"/></div>
              </div>
              <button class="btn accent wide" id="pm-pay">Pay ${money(i.total, i.currency)}</button>
              <button class="btn secondary wide" style="margin-top:8px;" id="pm-back">Cancel</button>
              <div class="small muted" style="margin-top:12px; text-align:center;">Secured by Foodics · Demo processor</div>
            </div>
          </div>
        </div>
        <div class="col" style="flex:1; max-width: 380px;">
          <div class="card">
            <div class="card-title">Invoice ${i.number}</div>
            <div class="invoice">
              <table>
                <thead><tr><th>Item</th><th class="numeric">Qty</th><th class="numeric">Amount</th></tr></thead>
                <tbody>
                  ${i.lines.map((l) => `<tr><td>${l.description}</td><td class="numeric">${l.quantity}</td><td class="numeric">${money(l.subtotal, i.currency)}</td></tr>`).join("")}
                </tbody>
              </table>
              <div class="total-row"><span>Total due</span><span>${money(i.total, i.currency)}</span></div>
            </div>
            ${i.notes ? `<div class="small muted" style="margin-top:10px;">${i.notes}</div>` : ""}
          </div>
        </div>
      </div>
    `;

    // Live card visual updates
    const num = document.getElementById("pm-num");
    const name = document.getElementById("pm-name");
    const exp = document.getElementById("pm-exp");
    num.addEventListener("input", () => {
      let v = num.value.replace(/\D/g, "").slice(0, 16);
      num.value = v.replace(/(.{4})/g, "$1 ").trim();
      document.getElementById("pm-visual-num").textContent = num.value.padEnd(19, "•");
    });
    name.addEventListener("input", () => {
      document.getElementById("pm-visual-name").textContent = name.value.toUpperCase() || "CARDHOLDER";
    });
    exp.addEventListener("input", () => {
      let v = exp.value.replace(/\D/g, "").slice(0, 4);
      if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
      exp.value = v;
      document.getElementById("pm-visual-exp").textContent = v || "MM/YY";
    });

    document.getElementById("pm-back").addEventListener("click", () => App.goto(state.returnTo));
    document.getElementById("pm-pay").addEventListener("click", onPay);
  }

  async function onPay() {
    const btn = document.getElementById("pm-pay");
    btn.disabled = true;
    btn.textContent = "Processing…";
    // Small delay so "processing" is visible
    await new Promise((r) => setTimeout(r, 700));
    try {
      const res = await API.pay({ invoice_id: state.invoiceId });
      state.paid = res;
      renderReceipt();
    } catch (e) {
      toast(e.message);
      btn.disabled = false;
      btn.textContent = "Retry payment";
    }
  }

  function renderReceipt() {
    const res = state.paid;
    const i = state.invoice;
    document.querySelector("main").innerHTML = `
      <div class="card" style="text-align:center; padding: 48px 24px; max-width: 520px; margin: 40px auto 0;">
        <div style="width:64px; height:64px; border-radius: 50%; background: var(--green-soft); color: var(--green); display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 18px;">✓</div>
        <h2 style="margin: 0 0 8px;">Payment successful</h2>
        <p class="muted" style="margin: 0 0 24px;">${money(res.amount, res.currency)} charged to card ending in ${lastFour()}</p>

        <div style="text-align: left; background: var(--bg); border-radius: 10px; padding: 16px; margin-bottom: 24px; font-size: 13px;">
          <div class="row" style="gap:12px;">
            <div class="col"><span class="small muted">Invoice</span><div><b>${res.invoice_number}</b></div></div>
            <div class="col"><span class="small muted">Receipt</span><div>${res.receipt_reference}</div></div>
            <div class="col"><span class="small muted">Paid at</span><div>${new Date(res.paid_at).toLocaleString()}</div></div>
          </div>
        </div>

        <button class="btn accent wide" id="pm-back-home">Back to my subscription</button>
      </div>
    `;
    document.getElementById("pm-back-home").addEventListener("click", () => App.goto("home"));
  }

  function lastFour() {
    const n = document.getElementById("pm-num")?.value || "4242 4242 4242 4242";
    return n.replace(/\D/g, "").slice(-4) || "4242";
  }

  return { render };
})();
