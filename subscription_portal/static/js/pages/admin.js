/**
 * Admin / Config view — the catalog.
 * Editable price matrix + "+ New" creation modals for every entity type.
 */
const AdminView = (() => {
  const state = { tab: "plans" };

  function render(root) {
    const counts = {
      plans:      Store.catalog.plans.length,
      addons:     Store.catalog.addons.length,
      devices:    Store.catalog.devices.length,
      separate:   Store.catalog.separate.length,
      currencies: Store.catalog.currencies.length,
    };
    root.innerHTML = `
      <div class="card">
        <div class="card-title">Catalog configuration
          <span class="chip pill-accent">Product / Admin</span>
        </div>
        <div class="card-subtitle">Define plans, add-ons, devices, and separate products. Prices propagate to Sales and the merchant portal instantly.</div>
        <div class="persona-tabs" style="width: fit-content;">
          <button class="persona-btn ${state.tab === "plans"      ? "active" : ""}" data-tab="plans">Plans (${counts.plans})</button>
          <button class="persona-btn ${state.tab === "addons"     ? "active" : ""}" data-tab="addons">Add-ons (${counts.addons})</button>
          <button class="persona-btn ${state.tab === "devices"    ? "active" : ""}" data-tab="devices">Device Licences (${counts.devices})</button>
          <button class="persona-btn ${state.tab === "separate"   ? "active" : ""}" data-tab="separate">Separate products (${counts.separate})</button>
          <button class="persona-btn ${state.tab === "currencies" ? "active" : ""}" data-tab="currencies">Currencies (${counts.currencies})</button>
        </div>
      </div>
      <div id="ad-body"></div>
    `;

    root.querySelectorAll(".persona-btn[data-tab]").forEach((b) => {
      b.addEventListener("click", () => { state.tab = b.dataset.tab; render(root); });
    });
    renderBody(root);
  }

  function renderBody(root) {
    const body = document.getElementById("ad-body");
    if (state.tab === "plans") return renderPriceMatrix(body, Store.catalog.plans, "plans", false, root);
    if (state.tab === "addons") return renderPriceMatrix(body, Store.catalog.addons, "addons", true, root);
    if (state.tab === "devices") return renderPriceMatrix(body, Store.catalog.devices, "devices", false, root);
    if (state.tab === "separate") return renderSeparate(body, root);
    if (state.tab === "currencies") return renderCurrencies(body, root);
  }

  // ============================================================
  // Price matrix (plans / addons / devices)
  // ============================================================
  function renderPriceMatrix(body, rows, kind, showTier, root) {
    const currencies = Store.catalog.currencies;
    const updater = {
      plans:   (id, cur, price) => API.updatePlanPrice(id, cur, price),
      addons:  (id, cur, price) => API.updateAddonPrice(id, cur, price),
      devices: (id, cur, price) => API.updateDevicePrice(id, cur, price),
    }[kind];
    const openCreate = {
      plans:   () => openPlanModal(root),
      addons:  () => openAddonModal(root),
      devices: () => openDeviceModal(root),
    }[kind];

    body.innerHTML = `
      <div class="card">
        <div class="card-title">${titleForKind(kind)} — price matrix
          <button class="btn small accent" id="ad-create">+ New ${singularForKind(kind)}</button>
        </div>
        <div class="card-subtitle">Edit any cell to update pricing for that currency. Sales and Merchant Portal read the same table.</div>
        <div class="matrix-wrap">
          <table>
            <thead>
              <tr>
                <th class="row-name">Item</th>
                ${showTier ? `<th>Min tier</th>` : ""}
                ${currencies.map((c) => `<th class="numeric" title="${c.name} · ${c.region}">${c.code}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rows.length === 0 ? `<tr><td colspan="${currencies.length + 1 + (showTier ? 1 : 0)}" class="empty-state">No items yet. Click "+ New" to create one.</td></tr>` : ""}
              ${rows.map((r) => `
                <tr data-id="${r.id}">
                  <td class="row-name">
                    <div style="font-weight:600;">${r.name}</div>
                    <div class="small muted">${r.description || ""}</div>
                  </td>
                  ${showTier ? `<td>${tierName(r.min_tier)}</td>` : ""}
                  ${currencies.map((c) => `
                    <td class="editable numeric">
                      <input type="number" step="0.01" value="${r.prices[c.code] ?? 0}" data-cur="${c.code}"/>
                    </td>
                  `).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    body.querySelector("#ad-create")?.addEventListener("click", openCreate);
    body.querySelectorAll("tr[data-id]").forEach((tr) => {
      const id = parseInt(tr.dataset.id, 10);
      tr.querySelectorAll("input[data-cur]").forEach((inp) => {
        inp.addEventListener("change", async () => {
          const price = parseFloat(inp.value);
          try {
            await updater(id, inp.dataset.cur, price);
            toast("Price updated");
            await Store.load();
          } catch (e) { toast("Update failed: " + e.message); }
        });
      });
    });
  }

  function renderSeparate(body, root) {
    const currencies = Store.catalog.currencies;
    body.innerHTML = `
      <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-weight:600;">Separate products</div>
          <div class="small muted">Standalone lines with their own contract — Online, Pay, Accounting, etc.</div>
        </div>
        <button class="btn small accent" id="ad-create-sep">+ New separate product</button>
      </div>
      ${Store.catalog.separate.length === 0 ? `<div class="card empty-state">No separate products yet. Click "+ New" above.</div>` : ""}
      ${Store.catalog.separate.map((sp) => `
        <div class="card">
          <div class="card-title">${sp.name} <span class="chip">${sp.billing_model}</span></div>
          <div class="card-subtitle">${sp.description || ""}</div>
          <div class="matrix-wrap">
            <table>
              <thead><tr><th class="row-name">Tier</th>${currencies.map((c) => `<th class="numeric">${c.code}</th>`).join("")}</tr></thead>
              <tbody>
                ${sp.tiers.map((t) => `
                  <tr data-tier="${t.id}">
                    <td class="row-name"><b>${t.name}</b></td>
                    ${currencies.map((c) => `<td class="editable numeric"><input type="number" step="0.01" value="${t.prices[c.code] ?? 0}" data-cur="${c.code}"/></td>`).join("")}
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `).join("")}
    `;

    body.querySelector("#ad-create-sep")?.addEventListener("click", () => openSeparateModal(root));
    body.querySelectorAll("tr[data-tier]").forEach((tr) => {
      const tid = parseInt(tr.dataset.tier, 10);
      tr.querySelectorAll("input[data-cur]").forEach((inp) => {
        inp.addEventListener("change", async () => {
          const price = parseFloat(inp.value);
          try {
            await API.updateSeparatePrice(tid, inp.dataset.cur, price);
            toast("Price updated"); await Store.load();
          } catch (e) { toast("Update failed: " + e.message); }
        });
      });
    });
  }

  function renderCurrencies(body, root) {
    body.innerHTML = `
      <div class="card">
        <div class="card-title">Regional price points
          <button class="btn small accent" id="ad-create-cur">+ New currency</button>
        </div>
        <div class="card-subtitle">Add a new currency to enable pricing across a new region. Plans, add-ons, and devices will accept prices in this currency once created.</div>
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Symbol</th><th>Region</th></tr></thead>
          <tbody>
            ${Store.catalog.currencies.map((c) => `
              <tr><td><b>${c.code}</b></td><td>${c.name}</td><td>${c.symbol}</td><td>${c.region}</td></tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    body.querySelector("#ad-create-cur").addEventListener("click", () => openCurrencyModal(root));
  }

  // ============================================================
  // Generic modal helpers
  // ============================================================
  function openModal({ title, subtitle, body, submitLabel, onSubmit }) {
    const overlay = document.createElement("div");
    overlay.className = "mm-overlay";
    overlay.innerHTML = `
      <div class="mm-dialog">
        <div class="mm-header">
          <div>
            <div class="mm-title">${title}</div>
            <div class="mm-sub">${subtitle || ""}</div>
          </div>
          <button class="mm-close" aria-label="Close">×</button>
        </div>
        <div class="mm-body">
          ${body}
          <div class="mm-actions">
            <button class="btn secondary" data-role="cancel">Cancel</button>
            <button class="btn accent" data-role="submit">${submitLabel || "Create"}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector(".mm-close").addEventListener("click", close);
    overlay.querySelector("[data-role='cancel']").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector("[data-role='submit']").addEventListener("click", async () => {
      try { await onSubmit(overlay, close); } catch (e) { toast("Failed: " + e.message); }
    });
    return overlay;
  }

  function priceInputsHtml(prefix = "price-") {
    return `<div class="section-title" style="margin-top:0;">Prices per currency</div>
      <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
      ${Store.catalog.currencies.map((c) => `
        <div class="field" style="margin-bottom:4px;">
          <label>${c.code} <span class="small muted">· ${c.region}</span></label>
          <input type="number" step="0.01" min="0" name="${prefix}${c.code}" value="0"/>
        </div>
      `).join("")}
      </div>`;
  }

  function readPricesFromModal(overlay, prefix = "price-") {
    const prices = {};
    overlay.querySelectorAll(`input[name^="${prefix}"]`).forEach((inp) => {
      const code = inp.name.slice(prefix.length);
      const v = parseFloat(inp.value);
      if (!isNaN(v)) prices[code] = v;
    });
    return prices;
  }

  // ============================================================
  // Create modals (one per entity)
  // ============================================================
  function openPlanModal(root) {
    openModal({
      title: "Create plan",
      subtitle: "Define a new RMS tier. Prices are per branch per month.",
      submitLabel: "Create plan",
      body: `
        <div class="row">
          <div class="col field"><label>Name *</label><input name="name" placeholder="e.g. Pro"/></div>
          <div class="col field"><label>Code *</label><input name="code" placeholder="e.g. pro (snake_case)"/></div>
          <div class="col field"><label>Tier order *</label><input name="tier_order" type="number" min="1" value="${Store.catalog.plans.length + 1}"/></div>
        </div>
        <div class="field"><label>Tagline</label><input name="tagline" placeholder="One-line summary"/></div>
        <div class="field"><label>Description</label><textarea name="description" rows="2"></textarea></div>
        ${priceInputsHtml()}
      `,
      onSubmit: async (overlay, close) => {
        const form = formValues(overlay);
        if (!form.name || !form.code) { toast("Name and code are required"); return; }
        const body = {
          code: form.code.trim(), name: form.name.trim(),
          tier_order: parseInt(form.tier_order || "1", 10),
          tagline: form.tagline || null, description: form.description || null,
          prices: readPricesFromModal(overlay),
        };
        await API.createPlan(body);
        toast(`Plan "${body.name}" created`);
        await Store.load();
        close();
        render(root);
      },
    });
  }

  function openAddonModal(root) {
    openModal({
      title: "Create add-on",
      subtitle: "A feature toggle merchants can buy on top of their plan.",
      submitLabel: "Create add-on",
      body: `
        <div class="row">
          <div class="col field"><label>Name *</label><input name="name" placeholder="e.g. Inventory Audit"/></div>
          <div class="col field"><label>Code *</label><input name="code" placeholder="e.g. inventory_audit"/></div>
        </div>
        <div class="row">
          <div class="col field"><label>Minimum plan tier</label>
            <select name="min_tier">
              ${Store.catalog.plans.map((p) => `<option value="${p.tier_order}">${p.tier_order} — ${p.name} or higher</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field"><label>Description</label><textarea name="description" rows="2"></textarea></div>
        ${priceInputsHtml()}
      `,
      onSubmit: async (overlay, close) => {
        const form = formValues(overlay);
        if (!form.name || !form.code) { toast("Name and code are required"); return; }
        await API.createAddon({
          code: form.code.trim(), name: form.name.trim(),
          description: form.description || null,
          min_tier: parseInt(form.min_tier || "1", 10),
          prices: readPricesFromModal(overlay),
        });
        toast(`Add-on "${form.name}" created`);
        await Store.load();
        close();
        render(root);
      },
    });
  }

  function openDeviceModal(root) {
    openModal({
      title: "Create device licence",
      subtitle: "A per-unit licence (e.g. Sub-Cashier, KDS, Kiosk). Priced monthly per unit.",
      submitLabel: "Create device licence",
      body: `
        <div class="row">
          <div class="col field"><label>Name *</label><input name="name" placeholder="e.g. Extra Printer"/></div>
          <div class="col field"><label>Code *</label><input name="code" placeholder="e.g. extra_printer"/></div>
        </div>
        <div class="field"><label>Description</label><textarea name="description" rows="2"></textarea></div>
        ${priceInputsHtml()}
      `,
      onSubmit: async (overlay, close) => {
        const form = formValues(overlay);
        if (!form.name || !form.code) { toast("Name and code are required"); return; }
        await API.createDevice({
          code: form.code.trim(), name: form.name.trim(),
          description: form.description || null,
          prices: readPricesFromModal(overlay),
        });
        toast(`Device licence "${form.name}" created`);
        await Store.load();
        close();
        render(root);
      },
    });
  }

  function openSeparateModal(root) {
    const overlay = openModal({
      title: "Create separate product",
      subtitle: "A standalone product line with its own contract and tiers (Foodics Online, Pay, Accounting, etc.).",
      submitLabel: "Create product",
      body: `
        <div class="row">
          <div class="col field"><label>Name *</label><input name="name" placeholder="e.g. Foodics Loyalty+"/></div>
          <div class="col field"><label>Code *</label><input name="code" placeholder="e.g. loyalty_plus"/></div>
          <div class="col field"><label>Billing model *</label>
            <select name="billing_model">
              <option value="monthly">monthly</option>
              <option value="annual">annual</option>
              <option value="transactional">transactional</option>
            </select>
          </div>
        </div>
        <div class="field"><label>Description</label><textarea name="description" rows="2"></textarea></div>

        <div class="section-title">Tiers</div>
        <div id="sep-tiers"></div>
        <button class="btn secondary small" id="sep-add-tier">+ Add tier</button>
      `,
      onSubmit: async (overlay, close) => {
        const form = formValues(overlay);
        if (!form.name || !form.code) { toast("Name and code are required"); return; }
        const tiers = readTiers(overlay);
        if (tiers.length === 0) { toast("Add at least one tier"); return; }
        await API.createSeparate({
          code: form.code.trim(), name: form.name.trim(),
          billing_model: form.billing_model || "monthly",
          description: form.description || null,
          tiers,
        });
        toast(`Separate product "${form.name}" created`);
        await Store.load();
        close();
        render(root);
      },
    });

    // Tier builder state inside the modal
    const tiersEl = overlay.querySelector("#sep-tiers");
    let tierCount = 0;
    function addTierRow() {
      tierCount++;
      const tid = `t${tierCount}`;
      const row = document.createElement("div");
      row.className = "card";
      row.style.cssText = "background: var(--bg); padding: 12px; margin-bottom: 8px; border-style: dashed;";
      row.dataset.tier = tid;
      row.innerHTML = `
        <div class="row">
          <div class="col field" style="margin-bottom:0;"><label>Tier name</label><input data-role="t-name" placeholder="e.g. Standard"/></div>
          <div class="col field" style="margin-bottom:0;"><label>Code</label><input data-role="t-code" placeholder="e.g. standard"/></div>
          <div class="col field" style="margin-bottom:0;"><label>Order</label><input data-role="t-order" type="number" min="1" value="${tierCount}"/></div>
        </div>
        <div style="margin-top:10px;">
          ${Store.catalog.currencies.map((c) =>
            `<span class="small muted" style="margin-right:4px;">${c.code}</span><input data-role="t-price" data-cur="${c.code}" type="number" step="0.01" min="0" value="0" style="width:80px; margin-right:10px;"/>`
          ).join("")}
          <button class="btn small secondary" data-role="t-remove" style="float:right;">Remove</button>
        </div>
      `;
      tiersEl.appendChild(row);
      row.querySelector("[data-role='t-remove']").addEventListener("click", () => row.remove());
    }
    overlay.querySelector("#sep-add-tier").addEventListener("click", (e) => { e.preventDefault(); addTierRow(); });
    addTierRow(); // start with one

    function readTiers(overlay) {
      const rows = overlay.querySelectorAll("#sep-tiers [data-tier]");
      const out = [];
      rows.forEach((row) => {
        const name = row.querySelector("[data-role='t-name']").value.trim();
        const code = row.querySelector("[data-role='t-code']").value.trim();
        if (!name || !code) return;
        const order = parseInt(row.querySelector("[data-role='t-order']").value || "1", 10);
        const prices = {};
        row.querySelectorAll("[data-role='t-price']").forEach((inp) => {
          const v = parseFloat(inp.value);
          if (!isNaN(v)) prices[inp.dataset.cur] = v;
        });
        out.push({ code, name, tier_order: order, prices });
      });
      return out;
    }
  }

  function openCurrencyModal(root) {
    openModal({
      title: "Create currency",
      subtitle: "Add a regional price point. Once added, plans/add-ons/devices will accept prices in this currency.",
      submitLabel: "Create currency",
      body: `
        <div class="row">
          <div class="col field"><label>Code * (3 letters)</label><input name="code" placeholder="e.g. QAR" maxlength="3" style="text-transform: uppercase;"/></div>
          <div class="col field"><label>Symbol *</label><input name="symbol" placeholder="e.g. QAR"/></div>
        </div>
        <div class="field"><label>Name *</label><input name="name" placeholder="e.g. Qatari Riyal"/></div>
        <div class="field"><label>Region *</label><input name="region" placeholder="e.g. Qatar"/></div>
      `,
      onSubmit: async (overlay, close) => {
        const form = formValues(overlay);
        if (!form.code || !form.symbol || !form.name || !form.region) { toast("All fields are required"); return; }
        await API.createCurrency({
          code: form.code.trim().toUpperCase(),
          symbol: form.symbol.trim(),
          name: form.name.trim(),
          region: form.region.trim(),
        });
        toast(`Currency "${form.code}" created`);
        await Store.load();
        close();
        render(root);
      },
    });
  }

  // ============================================================
  // Helpers
  // ============================================================
  function formValues(overlay) {
    const out = {};
    overlay.querySelectorAll(".mm-body input[name], .mm-body select[name], .mm-body textarea[name]").forEach((el) => {
      out[el.name] = el.value;
    });
    return out;
  }

  function titleForKind(kind) {
    return { plans: "RMS Plans", addons: "Feature Add-ons", devices: "Device Licences", separate: "Separate Products" }[kind] || kind;
  }
  function singularForKind(kind) {
    return { plans: "plan", addons: "add-on", devices: "device licence", separate: "separate product" }[kind] || kind;
  }
  function tierName(order) {
    const p = Store.catalog.plans.find((x) => x.tier_order === order);
    return p ? p.name : `Tier ${order}`;
  }

  return { render };
})();
