/**
 * Manage view — upgrade / downgrade / add-ons / devices, with a live proration preview.
 */
const ManageView = (() => {
  const state = {
    planId: null, branches: 1,
    addons: new Set(), devices: new Map(), separate: new Map(),
    preview: null,
  };

  async function render(root) {
    App.renderHeader(root);
    const body = document.createElement("main");
    root.appendChild(body);
    body.innerHTML = `<div class="muted">Loading…</div>`;
    await Store.loadSubscription();
    if (!Store.subscription?.has_subscription) {
      body.innerHTML = `<div class="card empty-state">No active subscription. Start one from the home page.</div>`;
      return;
    }
    initFromCurrent();
    body.innerHTML = pageShell();
    renderPlans(); renderAddons(); renderDevices(); renderSeparate();
    bindInputs();
    refreshPreview();
  }

  function initFromCurrent() {
    const s = Store.subscription.subscription;
    state.planId = s.plan_id;
    state.branches = s.branches;
    state.addons = new Set(s.addons.map((a) => a.id));
    state.devices = new Map(s.devices.map((d) => [d.id, d.quantity]));
    state.separate = new Map(s.separate.map((sp) => [sp.tier_id, sp.quantity]));
  }

  function pageShell() {
    return `
      <div class="row">
        <div class="col" style="flex:2;">
          <div class="card">
            <div class="card-title">Change plan</div>
            <div class="card-subtitle">Upgrading charges a prorated amount now. Downgrades take effect at renewal.</div>
            <div class="row" style="margin-bottom:14px; gap:14px;">
              <div class="col field"><label>Branches</label><input type="number" min="1" max="50" id="mg-branches" value="${state.branches}"/></div>
            </div>
            <div class="plan-grid" id="mg-plans"></div>
          </div>

          <div class="card">
            <div class="card-title">Add-ons</div>
            <div class="feature-grid" id="mg-addons"></div>
          </div>

          <div class="card">
            <div class="card-title">Device licences</div>
            <div id="mg-devices"></div>
          </div>

          <div class="card">
            <div class="card-title">Standalone products</div>
            <div id="mg-separate"></div>
          </div>
        </div>

        <div class="col" style="flex:1; max-width: 360px;">
          <div class="card order-panel" id="mg-preview"></div>
        </div>
      </div>
    `;
  }

  function bindInputs() {
    document.getElementById("mg-branches").addEventListener("input", (e) => {
      state.branches = Math.max(1, parseInt(e.target.value || "1", 10));
      refreshPreview();
    });
  }

  function renderPlans() {
    const g = document.getElementById("mg-plans");
    const cur = Store.subscription.subscription.currency;
    const currentPlanId = Store.subscription.subscription.plan_id;
    g.innerHTML = Store.catalog.plans.map((p) => `
      <div class="plan-tile ${state.planId === p.id ? "selected" : ""} ${currentPlanId === p.id ? "current" : ""}" data-id="${p.id}">
        <h3>${p.name}</h3>
        ${currentPlanId === p.id ? `<span class="current-badge">Current</span>` : ""}
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
        renderPlans(); renderAddons(); refreshPreview();
      });
    });
  }

  function renderAddons() {
    const g = document.getElementById("mg-addons");
    const plan = Store.planById(state.planId);
    const cur = Store.subscription.subscription.currency;
    g.innerHTML = Store.catalog.addons.map((a) => {
      const allowed = plan && plan.tier_order >= a.min_tier;
      const selected = state.addons.has(a.id);
      return `
        <div class="feature-tile ${selected ? "selected" : ""} ${allowed ? "" : "disabled"}" data-id="${a.id}">
          <div>
            <div class="ft-name">${a.name}</div>
            <div class="ft-desc">${a.description || ""}</div>
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
        renderAddons(); refreshPreview();
      });
    });
  }

  function renderDevices() {
    const cur = Store.subscription.subscription.currency;
    const c = document.getElementById("mg-devices");
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
          renderDevices(); refreshPreview();
        });
      });
    });
  }

  function renderSeparate() {
    const cur = Store.subscription.subscription.currency;
    const c = document.getElementById("mg-separate");
    c.innerHTML = Store.catalog.separate.map((sp) => `
      <div style="border:1px dashed var(--line); border-radius:10px; padding:14px; margin-bottom:10px;">
        <div><b>${sp.name}</b> <span class="chip">${sp.billing_model}</span></div>
        <div class="small muted">${sp.description || ""}</div>
        <div style="margin-top:8px;">
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
      renderSeparate(); refreshPreview();
    }));
    c.querySelectorAll(".sep-remove").forEach((b) => b.addEventListener("click", () => {
      state.separate.delete(parseInt(b.dataset.tier, 10));
      renderSeparate(); refreshPreview();
    }));
  }

  async function refreshPreview() {
    const panel = document.getElementById("mg-preview");
    try {
      const p = await API.previewChange({
        merchant_id: Store.merchant.id,
        plan_id: state.planId,
        branches: state.branches,
        addons: [...state.addons].map((id) => ({ addon_id: id })),
        devices: [...state.devices.entries()].map(([id, q]) => ({ device_sku_id: id, quantity: q })),
        separate: [...state.separate.entries()].map(([id, q]) => ({ tier_id: id, quantity: q })),
      });
      state.preview = p;
      renderPreview(p);
    } catch (e) {
      panel.innerHTML = `<div class="alert err">${e.message}</div>`;
    }
  }

  function renderPreview(p) {
    const noChange = Math.abs(p.delta_full_cycle) < 0.01;
    const isDowngrade = p.delta_prorated < -0.01;
    const pct = Math.round(p.proration_factor * 100);
    const label = p.billing_frequency === "annual" ? "per year" : "per month";

    document.getElementById("mg-preview").innerHTML = `
      <div class="card-title" style="margin-bottom:2px;">Change summary</div>
      <div class="card-subtitle">${noChange ? "No changes yet." : `${pct}% of your current cycle remaining.`}</div>

      <div class="line"><div class="desc">Current recurring</div><div class="amt">${money(p.old_total, p.currency)} ${label}</div></div>
      <div class="line"><div class="desc">New recurring</div><div class="amt"><b>${money(p.new_total, p.currency)} ${label}</b></div></div>
      <div class="section">
        <div class="line"><div class="desc">Full-cycle delta</div><div class="amt">${money(p.delta_full_cycle, p.currency)}</div></div>
        <div class="line"><div class="desc">Proration factor</div><div class="amt">${p.proration_factor.toFixed(2)}</div></div>
        <div class="line"><div class="desc">${isDowngrade ? "Credit (applied next bill)" : "Charged now"}</div>
          <div class="amt"><b>${money(isDowngrade ? p.credit : p.charge_now, p.currency)}</b></div></div>
      </div>

      ${noChange ? "" : (isDowngrade
        ? `<div class="alert info" style="margin-top:12px;">This is a downgrade — no charge now. A credit of ${money(p.credit, p.currency)} will offset your next invoice.</div>`
        : `<div class="alert info" style="margin-top:12px;">Upgrading charges ${money(p.charge_now, p.currency)} now for the remaining ${pct}% of the cycle.</div>`
      )}

      <button class="btn accent wide" id="mg-apply" ${noChange ? "disabled" : ""}>${isDowngrade ? "Confirm downgrade" : noChange ? "No changes to apply" : "Apply & charge"}</button>
      <button class="btn secondary wide" style="margin-top:8px;" id="mg-back">Cancel</button>
    `;

    if (!noChange) document.getElementById("mg-apply").addEventListener("click", apply);
    document.getElementById("mg-back").addEventListener("click", () => App.goto("home"));
  }

  async function apply() {
    try {
      const res = await API.applyChange({
        merchant_id: Store.merchant.id,
        plan_id: state.planId,
        branches: state.branches,
        addons: [...state.addons].map((id) => ({ addon_id: id })),
        devices: [...state.devices.entries()].map(([id, q]) => ({ device_sku_id: id, quantity: q })),
        separate: [...state.separate.entries()].map(([id, q]) => ({ tier_id: id, quantity: q })),
      });
      if (res.change_invoice && res.change_invoice.status === "pending") {
        toast("Changes applied — please pay the prorated invoice");
        App.goto("payment", { invoiceId: res.change_invoice.id, returnTo: "home" });
      } else {
        toast("Changes applied");
        App.goto("home");
      }
    } catch (e) { toast(e.message); }
  }

  return { render };
})();
