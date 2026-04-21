/**
 * First-time checkout flow.
 * 3 steps: Build → Review → Pay.
 */
const CheckoutView = (() => {
  const state = {
    step: 1,                  // 1 Build, 2 Review+pay details, 3 Paid
    planId: null,
    branches: 1,
    addons: new Set(),
    devices: new Map(),
    separate: new Map(),
    billingFrequency: "monthly",
    lastQuote: null,
    lastInvoiceId: null,
  };

  function render(root) {
    App.renderHeader(root);
    const body = document.createElement("main");
    root.appendChild(body);
    body.innerHTML = shell();
    bind();
    renderStep();
  }

  function shell() {
    return `
      <div class="stepper">
        <div class="step ${state.step === 1 ? "active" : state.step > 1 ? "done" : ""}">1 · Build</div>
        <span class="arrow">→</span>
        <div class="step ${state.step === 2 ? "active" : state.step > 2 ? "done" : ""}">2 · Review</div>
        <span class="arrow">→</span>
        <div class="step ${state.step === 3 ? "active" : ""}">3 · Pay</div>
      </div>
      <div id="co-body"></div>
    `;
  }

  function bind() { /* navigation re-renders shell */ }

  function renderStep() {
    document.querySelector(".stepper").outerHTML = `<div class="stepper">
      <div class="step ${state.step === 1 ? "active" : state.step > 1 ? "done" : ""}">1 · Build</div>
      <span class="arrow">→</span>
      <div class="step ${state.step === 2 ? "active" : state.step > 2 ? "done" : ""}">2 · Review</div>
      <span class="arrow">→</span>
      <div class="step ${state.step === 3 ? "active" : ""}">3 · Pay</div>
    </div>`;
    const body = document.getElementById("co-body");
    if (state.step === 1) renderBuild(body);
    else if (state.step === 2) renderReview(body);
    else renderPay(body);
  }

  // ============================================================
  // Step 1: Build
  // ============================================================
  function renderBuild(body) {
    const m = Store.merchant;
    body.innerHTML = `
      <div class="row">
        <div class="col" style="flex: 2;">
          <div class="card">
            <div class="card-title">Pick your plan</div>
            <div class="card-subtitle">You're subscribing in ${m.currency}. ${m.branches_count} branch(es) on file.</div>
            <div class="row" style="margin-bottom:14px; gap:14px;">
              <div class="col field">
                <label>Branches</label>
                <input type="number" min="1" max="50" id="co-branches" value="${state.branches}"/>
              </div>
              <div class="col field">
                <label>Billing frequency</label>
                <select id="co-billing">
                  <option value="monthly" ${state.billingFrequency === "monthly" ? "selected" : ""}>Monthly</option>
                  <option value="annual" ${state.billingFrequency === "annual" ? "selected" : ""}>Annual</option>
                </select>
              </div>
            </div>
            <div class="plan-grid" id="co-plans"></div>
          </div>

          <div class="card">
            <div class="card-title">Feature add-ons <span class="small muted" id="co-addon-hint"></span></div>
            <div class="feature-grid" id="co-addons"></div>
          </div>

          <div class="card">
            <div class="card-title">Device licences</div>
            <div id="co-devices"></div>
          </div>

          <div class="card">
            <div class="card-title">Standalone products</div>
            <div class="card-subtitle">Optional — Foodics Online (customer-facing ordering), Pay, Accounting.</div>
            <div id="co-separate"></div>
          </div>
        </div>

        <div class="col" style="flex: 1; max-width: 360px;">
          <div class="card order-panel" id="co-panel"></div>
        </div>
      </div>
    `;

    document.getElementById("co-branches").addEventListener("input", (e) => {
      state.branches = Math.max(1, parseInt(e.target.value || "1", 10));
      refreshQuote();
    });
    document.getElementById("co-billing").addEventListener("change", (e) => {
      state.billingFrequency = e.target.value;
      refreshQuote();
    });

    renderPlans();
    renderAddons();
    renderDevices();
    renderSeparate();
    refreshQuote();
  }

  function renderPlans() {
    const g = document.getElementById("co-plans");
    const cur = Store.merchant.currency;
    g.innerHTML = Store.catalog.plans.map((p) => `
      <div class="plan-tile ${state.planId === p.id ? "selected" : ""}" data-id="${p.id}">
        <h3>${p.name}</h3>
        <div class="price">${money(p.prices[cur] ?? 0, cur)} <small>/branch/mo</small></div>
      </div>
    `).join("");
    g.querySelectorAll(".plan-tile").forEach((el) => {
      el.addEventListener("click", () => {
        state.planId = parseInt(el.dataset.id, 10);
        const plan = Store.planById(state.planId);
        state.addons = new Set([...state.addons].filter((aid) => {
          const a = Store.addonById(aid); return a && plan.tier_order >= a.min_tier;
        }));
        renderPlans(); renderAddons(); refreshQuote();
      });
    });
  }

  function renderAddons() {
    const g = document.getElementById("co-addons");
    const plan = Store.planById(state.planId);
    const cur = Store.merchant.currency;
    document.getElementById("co-addon-hint").textContent = plan
      ? `— ${Store.catalog.addons.filter((a) => plan.tier_order >= a.min_tier).length} available on ${plan.name}`
      : "— pick a plan first";

    g.innerHTML = Store.catalog.addons.map((a) => {
      const allowed = plan && plan.tier_order >= a.min_tier;
      const selected = state.addons.has(a.id);
      return `
        <div class="feature-tile ${selected ? "selected" : ""} ${allowed ? "" : "disabled"}" data-id="${a.id}">
          <div>
            <div class="ft-name">${a.name}</div>
            <div class="ft-desc">${a.description || ""}</div>
            ${!allowed ? `<div class="ft-desc" style="color:var(--amber);margin-top:3px;">Requires higher plan</div>` : ""}
          </div>
          <div class="ft-price">${money(a.prices[cur] ?? 0, cur)}/mo</div>
        </div>
      `;
    }).join("");
    g.querySelectorAll(".feature-tile").forEach((el) => {
      el.addEventListener("click", () => {
        if (el.classList.contains("disabled")) return;
        const id = parseInt(el.dataset.id, 10);
        if (state.addons.has(id)) state.addons.delete(id); else state.addons.add(id);
        renderAddons(); refreshQuote();
      });
    });
  }

  function renderDevices() {
    const cur = Store.merchant.currency;
    const c = document.getElementById("co-devices");
    c.innerHTML = Store.catalog.devices.map((d) => {
      const qty = state.devices.get(d.id) || 0;
      return `
        <div class="device-row">
          <div>
            <div class="device-name">${d.name} <span class="device-price">· ${money(d.prices[cur] ?? 0, cur)}/unit/mo</span></div>
            <div class="device-desc">${d.description || ""}</div>
          </div>
          <div class="counter" data-id="${d.id}">
            <button data-op="-">−</button>
            <span class="count">${qty}</span>
            <button data-op="+">+</button>
          </div>
        </div>
      `;
    }).join("");
    c.querySelectorAll(".counter").forEach((el) => {
      const id = parseInt(el.dataset.id, 10);
      el.querySelectorAll("button").forEach((b) => {
        b.addEventListener("click", () => {
          let q = state.devices.get(id) || 0;
          q = b.dataset.op === "+" ? q + 1 : Math.max(0, q - 1);
          if (q === 0) state.devices.delete(id); else state.devices.set(id, q);
          renderDevices(); refreshQuote();
        });
      });
    });
  }

  function renderSeparate() {
    const cur = Store.merchant.currency;
    const c = document.getElementById("co-separate");
    c.innerHTML = Store.catalog.separate.map((sp) => `
      <div style="border: 1px dashed var(--line); border-radius: 10px; padding: 14px; margin-bottom: 10px;">
        <div style="display:flex; justify-content: space-between;">
          <div><b>${sp.name}</b> <span class="chip">${sp.billing_model}</span></div>
        </div>
        <div class="small muted">${sp.description || ""}</div>
        <div style="margin-top:10px;">
          ${sp.tiers.map((t) => {
            const selected = state.separate.has(t.id);
            return `
              <div class="device-row">
                <div>
                  <div class="device-name">${t.name}</div>
                  <div class="device-price">${money(t.prices[cur] ?? 0, cur)}${sp.billing_model === "annual" ? "/yr" : "/mo"}</div>
                </div>
                ${selected
                  ? `<button class="btn small secondary sep-remove" data-tier="${t.id}">Remove</button>`
                  : `<button class="btn small sep-add" data-tier="${t.id}">Add</button>`}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `).join("");

    c.querySelectorAll(".sep-add").forEach((b) => b.addEventListener("click", () => {
      const tid = parseInt(b.dataset.tier, 10);
      const match = Store.separateTierById(tid);
      if (!match) return;
      for (const existingTid of state.separate.keys()) {
        const ex = Store.separateTierById(existingTid);
        if (ex && ex.product.code === match.product.code) state.separate.delete(existingTid);
      }
      state.separate.set(tid, 1);
      renderSeparate(); refreshQuote();
    }));
    c.querySelectorAll(".sep-remove").forEach((b) => b.addEventListener("click", () => {
      state.separate.delete(parseInt(b.dataset.tier, 10));
      renderSeparate(); refreshQuote();
    }));
  }

  async function refreshQuote() {
    const panel = document.getElementById("co-panel");
    if (!state.planId) {
      panel.innerHTML = headerMd() + `<div class="empty-state">Pick a plan to see your order summary.</div>`;
      return;
    }
    const body = buildBody();
    try {
      const q = await API.quote(body);
      state.lastQuote = q;
      panel.innerHTML = headerMd() + renderOrderSummary(q);
      document.getElementById("co-continue").addEventListener("click", () => { state.step = 2; renderStep(); });
    } catch (e) {
      panel.innerHTML = headerMd() + `<div class="alert err">Quote error: ${e.message}</div>`;
    }
  }

  function headerMd() {
    return `<div class="card-title" style="margin-bottom: 2px;">Order summary</div>
            <div class="card-subtitle">${Store.merchant.currency} · ${state.billingFrequency}</div>`;
  }

  function buildBody() {
    return {
      plan_id: state.planId,
      currency: Store.merchant.currency,
      branches: state.branches,
      addons: [...state.addons].map((id) => ({ addon_id: id })),
      devices: [...state.devices.entries()].map(([id, q]) => ({ device_sku_id: id, quantity: q })),
      separate: [...state.separate.entries()].map(([id, q]) => ({ tier_id: id, quantity: q })),
    };
  }

  function renderOrderSummary(q) {
    const t = q.totals;
    const byCat = { plan: [], addon: [], device: [], separate: [] };
    q.lines.forEach((l) => byCat[l.category].push(l));
    const sec = (name, lines) => lines.length ? `
      <div class="section">
        <div class="small muted" style="text-transform:uppercase; letter-spacing:.5px; font-weight:600; margin-bottom:4px;">${name}</div>
        ${lines.map((l) => `<div class="line"><div class="desc">${l.description}</div><div class="amt">${money(l.subtotal, t.currency)}</div></div>`).join("")}
      </div>` : "";
    return `
      ${sec("Plan", byCat.plan)}
      ${sec("Add-ons", byCat.addon)}
      ${sec("Devices", byCat.device)}
      ${sec("Separate", byCat.separate)}
      <div class="total">
        <span>${state.billingFrequency === "annual" ? "Total / year" : "Total / month"}</span>
        <span>${money(t.grand_total, t.currency)}</span>
      </div>
      <button class="btn accent wide" id="co-continue" style="margin-top: 16px;">Continue to review →</button>
    `;
  }

  // ============================================================
  // Step 2: Review
  // ============================================================
  function renderReview(body) {
    if (!state.lastQuote) { state.step = 1; renderStep(); return; }
    body.innerHTML = `
      <div class="row">
        <div class="col" style="flex:2;">
          <div class="card">
            <div class="card-title">Review your subscription</div>
            <div class="invoice">
              <table>
                <thead><tr><th>Item</th><th class="numeric">Qty</th><th class="numeric">Unit</th><th class="numeric">Subtotal</th></tr></thead>
                <tbody>
                  ${state.lastQuote.lines.map((l) => `
                    <tr><td>${l.description}</td>
                      <td class="numeric">${l.quantity}</td>
                      <td class="numeric">${money(l.unit_price, state.lastQuote.totals.currency)}</td>
                      <td class="numeric">${money(l.subtotal, state.lastQuote.totals.currency)}</td></tr>
                  `).join("")}
                </tbody>
              </table>
              <div class="total-row">
                <span>${state.billingFrequency === "annual" ? "Total / year" : "Total / month"}</span>
                <span>${money(state.lastQuote.totals.grand_total, state.lastQuote.totals.currency)}</span>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-title">Billing</div>
            <div class="small muted">Invoice goes to</div>
            <div>${Store.merchant.email}</div>
            <div class="small muted" style="margin-top:10px;">SF account · CR · VAT</div>
            <div>${Store.merchant.sf_account_number || "—"} · ${Store.merchant.cr_number || "—"} · ${Store.merchant.vat_number || "—"}</div>
          </div>
        </div>

        <div class="col" style="flex:1; max-width: 320px;">
          <div class="card">
            <div class="card-title">Total due today</div>
            <div style="font-size: 30px; font-weight: 800;">${money(state.lastQuote.totals.grand_total, state.lastQuote.totals.currency)}</div>
            <div class="small muted">Future invoices will be ${state.billingFrequency}.</div>
            <button class="btn accent wide" style="margin-top:16px;" id="co-tocheckout">Proceed to payment →</button>
            <button class="btn secondary wide" style="margin-top:10px;" id="co-back">← Back to build</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById("co-back").addEventListener("click", () => { state.step = 1; renderStep(); });
    document.getElementById("co-tocheckout").addEventListener("click", onCheckout);
  }

  async function onCheckout() {
    try {
      const body = { ...buildBody(), merchant_id: Store.merchant.id, billing_frequency: state.billingFrequency };
      const res = await API.checkout(body);
      state.lastInvoiceId = res.invoice.id;
      App.goto("payment", { invoiceId: res.invoice.id, returnTo: "home" });
    } catch (e) { toast(e.message); }
  }

  // Step 3 placeholder (we route to PaymentView via App.goto("payment"))
  function renderPay(body) {
    body.innerHTML = `<div class="empty-state">Redirecting to payment…</div>`;
  }

  function reset() {
    state.step = 1; state.planId = null; state.branches = 1;
    state.addons = new Set(); state.devices = new Map(); state.separate = new Map();
    state.billingFrequency = "monthly"; state.lastQuote = null; state.lastInvoiceId = null;
  }

  return { render, reset };
})();
