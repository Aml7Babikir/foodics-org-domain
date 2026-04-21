/**
 * Sales Rep view — the subscription builder.
 * Hero moment: the right-hand price panel shows the 4 layers stacking into one total.
 */
const SalesView = (() => {
  const state = {
    merchantId: null,
    planId: null,
    branches: 1,
    addons: new Set(),      // addon ids
    devices: new Map(),     // device id -> qty
    separate: new Map(),    // tier id -> qty
    billingFrequency: "monthly",
    lastQuote: null,
    merchants: [],
  };

  function render(root) {
    root.innerHTML = `
      <div class="card">
        <div class="card-title">Build a subscription
          <span class="chip pill-accent">Sales Rep</span>
        </div>
        <div class="card-subtitle">Pick a plan → toggle add-ons → size devices → add separate products. The quote updates live.</div>
        <div class="row" style="margin-top: 4px;">
          <div class="col field">
            <label>Merchant</label>
            <div class="inline">
              <select id="sl-merchant"></select>
              <button class="btn secondary small" id="sl-new-merchant">+ New</button>
            </div>
          </div>
          <div class="col field">
            <label>Currency (7 regional price points)</label>
            <div class="currency-switch" id="sl-currency"></div>
          </div>
          <div class="col field">
            <label>Branches</label>
            <input type="number" min="1" max="50" id="sl-branches" value="1"/>
          </div>
          <div class="col field">
            <label>Billing frequency</label>
            <select id="sl-billing"><option value="monthly">Monthly</option><option value="annual">Annual</option></select>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col" style="flex: 2;">

          <div class="card">
            <div class="card-title">Layer 1 · Plan (RMS tier)</div>
            <div class="plan-grid" id="sl-plans"></div>
          </div>

          <div class="card">
            <div class="card-title">Layer 2 · Add-ons <span class="muted small" id="sl-addon-hint"></span></div>
            <div class="feature-grid" id="sl-addons"></div>
          </div>

          <div class="card">
            <div class="card-title">Layer 3 · Device licences</div>
            <div id="sl-devices"></div>
          </div>

          <div class="card">
            <div class="card-title">Layer 4 · Separate products</div>
            <div class="card-subtitle">Standalone lines with their own contract — Online, Pay, Accounting.</div>
            <div id="sl-separate"></div>
          </div>
        </div>

        <div class="col" style="flex: 1; max-width: 420px;">
          <div class="card price-panel" id="sl-price"></div>
        </div>
      </div>
    `;

    bindHeader();
    renderCurrencies();
    renderPlans();
    renderAddons();
    renderDevices();
    renderSeparate();
    refreshQuote();
  }

  function bindHeader() {
    const sel = document.getElementById("sl-merchant");
    API.merchants().then((list) => {
      state.merchants = list;
      sel.innerHTML = list.map((m) => `<option value="${m.id}">${m.name} (${m.currency})</option>`).join("");
      if (list.length) {
        state.merchantId = list[0].id;
        state.currency = list[0].currency;
        Store.currency = state.currency;
        renderCurrencies();
        renderPlans(); renderAddons(); renderDevices(); renderSeparate();
        refreshQuote();
      }
    });

    sel.addEventListener("change", () => {
      state.merchantId = parseInt(sel.value, 10);
      const m = state.merchants.find((x) => x.id === state.merchantId);
      if (m) {
        state.currency = m.currency;
        Store.currency = m.currency;
        renderCurrencies();
        renderPlans(); renderAddons(); renderDevices(); renderSeparate();
        refreshQuote();
      }
    });

    document.getElementById("sl-branches").addEventListener("input", (e) => {
      state.branches = Math.max(1, parseInt(e.target.value || "1", 10));
      refreshQuote();
    });
    document.getElementById("sl-billing").addEventListener("change", (e) => {
      state.billingFrequency = e.target.value;
    });
    document.getElementById("sl-new-merchant").addEventListener("click", onNewMerchant);
  }

  function renderCurrencies() {
    const box = document.getElementById("sl-currency");
    box.innerHTML = Store.catalog.currencies.map((c) =>
      `<button data-code="${c.code}" class="${c.code === state.currency ? "active" : ""}" title="${c.name} · ${c.region}">${c.code}</button>`
    ).join("");
    box.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => {
        state.currency = b.dataset.code;
        Store.currency = state.currency;
        renderCurrencies(); renderPlans(); renderAddons(); renderDevices(); renderSeparate();
        refreshQuote();
      });
    });
  }

  function renderPlans() {
    const g = document.getElementById("sl-plans");
    g.innerHTML = Store.catalog.plans.map((p) => `
      <div class="plan-tile ${state.planId === p.id ? "selected" : ""}" data-id="${p.id}">
        <h3>${p.name}</h3>
        <div class="price">${money(p.prices[state.currency] ?? 0, state.currency)} <small>/branch/mo</small></div>
      </div>
    `).join("");
    g.querySelectorAll(".plan-tile").forEach((el) => {
      el.addEventListener("click", () => {
        state.planId = parseInt(el.dataset.id, 10);
        // Strip add-ons not allowed by the new tier
        const plan = Store.planById(state.planId);
        state.addons = new Set([...state.addons].filter((aid) => {
          const a = Store.addonById(aid); return a && plan.tier_order >= a.min_tier;
        }));
        renderPlans(); renderAddons(); refreshQuote();
      });
    });
  }

  function renderAddons() {
    const g = document.getElementById("sl-addons");
    const plan = Store.planById(state.planId);
    document.getElementById("sl-addon-hint").textContent = plan
      ? `— ${Store.catalog.addons.filter((a) => plan.tier_order >= a.min_tier).length} available on ${plan.name}`
      : "— pick a plan first to unlock compatible add-ons";

    g.innerHTML = Store.catalog.addons.map((a) => {
      const allowed = plan && plan.tier_order >= a.min_tier;
      const selected = state.addons.has(a.id);
      return `
        <div class="feature-tile ${selected ? "selected" : ""} ${allowed ? "" : "disabled"}" data-id="${a.id}">
          <div>
            <div class="ft-name">${a.name}</div>
            <div class="ft-desc">${a.description || ""}</div>
            ${!allowed ? `<div class="ft-desc" style="color:var(--amber);margin-top:4px;">Requires ${tierName(a.min_tier)} or higher</div>` : ""}
          </div>
          <div class="ft-price">${money(a.prices[state.currency] ?? 0, state.currency)}/mo</div>
        </div>
      `;
    }).join("");

    g.querySelectorAll(".feature-tile").forEach((el) => {
      el.addEventListener("click", () => {
        if (el.classList.contains("disabled")) return;
        const id = parseInt(el.dataset.id, 10);
        if (state.addons.has(id)) state.addons.delete(id);
        else state.addons.add(id);
        renderAddons(); refreshQuote();
      });
    });
  }

  function renderDevices() {
    const c = document.getElementById("sl-devices");
    c.innerHTML = Store.catalog.devices.map((d) => {
      const qty = state.devices.get(d.id) || 0;
      return `
        <div class="device-row">
          <div>
            <div class="device-name">${d.name} <span class="device-price">· ${money(d.prices[state.currency] ?? 0, state.currency)}/unit/mo</span></div>
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
    const c = document.getElementById("sl-separate");
    c.innerHTML = Store.catalog.separate.map((sp) => `
      <div class="card" style="background: var(--bg); border-style: dashed;">
        <div style="display:flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-weight:600;">${sp.name} <span class="chip">${sp.billing_model}</span></div>
            <div class="small muted">${sp.description || ""}</div>
          </div>
        </div>
        <div style="margin-top: 10px;">
          ${sp.tiers.map((t) => {
            const selected = state.separate.has(t.id);
            const qty = state.separate.get(t.id) || 1;
            return `
              <div class="device-row">
                <div>
                  <div class="device-name">${t.name}</div>
                  <div class="device-price">${money(t.prices[state.currency] ?? 0, state.currency)}${sp.billing_model === "annual" ? "/yr" : "/mo"}</div>
                </div>
                <div class="inline" style="width: auto; flex: 0;">
                  ${selected ? `
                    <div class="counter" data-tier="${t.id}">
                      <button data-op="-">−</button>
                      <span class="count">${qty}</span>
                      <button data-op="+">+</button>
                    </div>
                    <button class="btn secondary small sep-remove" data-tier="${t.id}">Remove</button>
                  ` : `
                    <button class="btn small sep-add" data-tier="${t.id}">Add</button>
                  `}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `).join("");

    c.querySelectorAll(".sep-add").forEach((b) => {
      b.addEventListener("click", () => {
        const tid = parseInt(b.dataset.tier, 10);
        // Only one tier per separate-product at a time.
        const match = Store.separateTierById(tid);
        if (!match) return;
        for (const existingTid of state.separate.keys()) {
          const ex = Store.separateTierById(existingTid);
          if (ex && ex.product.code === match.product.code) state.separate.delete(existingTid);
        }
        state.separate.set(tid, 1);
        renderSeparate(); refreshQuote();
      });
    });
    c.querySelectorAll(".sep-remove").forEach((b) => {
      b.addEventListener("click", () => {
        state.separate.delete(parseInt(b.dataset.tier, 10));
        renderSeparate(); refreshQuote();
      });
    });
    c.querySelectorAll(".counter").forEach((el) => {
      const tid = parseInt(el.dataset.tier, 10);
      el.querySelectorAll("button").forEach((b) => {
        b.addEventListener("click", () => {
          let q = state.separate.get(tid) || 1;
          q = b.dataset.op === "+" ? q + 1 : Math.max(1, q - 1);
          state.separate.set(tid, q);
          renderSeparate(); refreshQuote();
        });
      });
    });
  }

  async function refreshQuote() {
    const panel = document.getElementById("sl-price");
    if (!state.planId) {
      panel.innerHTML = priceHeader() + `<div class="empty-state">Pick a plan to start pricing.</div>`;
      state.lastQuote = null;
      return;
    }
    const body = buildQuoteBody();
    try {
      const q = await API.quote(body);
      state.lastQuote = q;
      renderPricePanel(q);
    } catch (e) {
      panel.innerHTML = priceHeader() + `<div class="empty-state">Quote error: ${e.message}</div>`;
    }
  }

  function buildQuoteBody() {
    return {
      plan_id: state.planId,
      currency: state.currency,
      branches: state.branches,
      addons: [...state.addons].map((id) => ({ addon_id: id })),
      devices: [...state.devices.entries()].map(([id, q]) => ({ device_sku_id: id, quantity: q })),
      separate: [...state.separate.entries()].map(([id, q]) => ({ tier_id: id, quantity: q })),
    };
  }

  function priceHeader() {
    return `<div class="card-title" style="margin-bottom: 4px;">Live quote</div>
            <div class="card-subtitle">The 4 layers that stack into one monthly price.</div>`;
  }

  function renderPricePanel(q) {
    const t = q.totals;
    const grand = t.grand_total || 0;
    const pct = (v) => grand > 0 ? ((v / grand) * 100).toFixed(1) + "%" : "0%";

    const addonLines = q.lines.filter((l) => l.category === "addon");
    const deviceLines = q.lines.filter((l) => l.category === "device");
    const sepLines = q.lines.filter((l) => l.category === "separate");

    const panel = document.getElementById("sl-price");
    panel.innerHTML = `
      ${priceHeader()}
      <div class="stack-bar" title="Visual share per layer">
        <div class="stack-plan" style="flex:${t.plan};"></div>
        <div class="stack-addons" style="flex:${t.addons};"></div>
        <div class="stack-devices" style="flex:${t.devices};"></div>
        <div class="stack-separate" style="flex:${t.separate};"></div>
      </div>

      <div class="layer"><div class="layer-name"><span class="legend-dot stack-plan"></span>Layer 1 · Plan</div>
        <div class="layer-sum">${money(t.plan, t.currency)} <span class="small muted">(${pct(t.plan)})</span></div>
        <div class="layer-lines">${state.planId ? `${Store.planById(state.planId).name} × ${state.branches} branch(es)` : ""}</div>
      </div>

      <div class="layer"><div class="layer-name"><span class="legend-dot stack-addons"></span>Layer 2 · Add-ons</div>
        <div class="layer-sum">${money(t.addons, t.currency)} <span class="small muted">(${pct(t.addons)})</span></div>
        <div class="layer-lines">${addonLines.length ? addonLines.map((l) => l.description.replace(" (add-on)", "")).join(" · ") : "— none"}</div>
      </div>

      <div class="layer"><div class="layer-name"><span class="legend-dot stack-devices"></span>Layer 3 · Devices</div>
        <div class="layer-sum">${money(t.devices, t.currency)} <span class="small muted">(${pct(t.devices)})</span></div>
        <div class="layer-lines">${deviceLines.length ? deviceLines.map((l) => l.description).join(" · ") : "— none"}</div>
      </div>

      <div class="layer"><div class="layer-name"><span class="legend-dot stack-separate"></span>Layer 4 · Separate</div>
        <div class="layer-sum">${money(t.separate, t.currency)} <span class="small muted">(${pct(t.separate)})</span></div>
        <div class="layer-lines">${sepLines.length ? sepLines.map((l) => l.description).join(" · ") : "— none"}</div>
      </div>

      <div class="total-row">
        <div class="total-label">${state.billingFrequency === "annual" ? "Total · annual" : "Total · monthly"}</div>
        <div class="total-amount">${money(grand, t.currency)}</div>
      </div>

      <button class="btn accent mt-16" style="width:100%;" id="sl-commit">Create subscription & push to Sales</button>
      <div class="small muted mt-8" style="text-align:center;">Creates a deal at stage <b>Discovery</b>. Advance stages in CS Console.</div>
    `;
    document.getElementById("sl-commit").addEventListener("click", commit);
  }

  async function commit() {
    if (!state.merchantId) return toast("Pick a merchant first");
    if (!state.planId) return toast("Pick a plan first");
    const body = { merchant_id: state.merchantId, billing_frequency: state.billingFrequency, ...buildQuoteBody() };
    const sub = await API.createSubscription(body);
    toast(`Subscription #${sub.id} created — Processing`);
    // Keep the builder populated — user can refine and create another.
  }

  function onNewMerchant() {
    MerchantModal.open(async (merchant) => {
      const list = await API.merchants();
      state.merchants = list;
      const sel = document.getElementById("sl-merchant");
      sel.innerHTML = list.map((m) => `<option value="${m.id}" ${m.id === merchant.id ? "selected" : ""}>${m.name} (${m.currency})</option>`).join("");
      const full = list.find((x) => x.id === merchant.id);
      state.merchantId = merchant.id;
      state.currency = full ? full.currency : state.currency;
      Store.currency = state.currency;
      renderCurrencies(); renderPlans(); renderAddons(); renderDevices(); renderSeparate();
      refreshQuote();
    });
  }

  function tierName(order) {
    const p = Store.catalog.plans.find((x) => x.tier_order === order);
    return p ? p.name : `Tier ${order}`;
  }

  return { render };
})();
