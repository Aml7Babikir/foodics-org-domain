/**
 * Admin / Config view — the catalog. Editable price matrix per currency.
 */
const AdminView = (() => {
  const state = { tab: "plans" };

  function render(root) {
    root.innerHTML = `
      <div class="card">
        <div class="card-title">Catalog configuration
          <span class="chip pill-accent">Product / Admin</span>
        </div>
        <div class="card-subtitle">Define plans, add-ons, devices, and separate products. Prices propagate to Sales and the merchant portal instantly.</div>
        <div class="persona-tabs" style="width: fit-content;">
          <button class="persona-btn ${state.tab === "plans" ? "active" : ""}" data-tab="plans">Plans (4)</button>
          <button class="persona-btn ${state.tab === "addons" ? "active" : ""}" data-tab="addons">Add-ons (15)</button>
          <button class="persona-btn ${state.tab === "devices" ? "active" : ""}" data-tab="devices">Device SKUs (5)</button>
          <button class="persona-btn ${state.tab === "separate" ? "active" : ""}" data-tab="separate">Separate products (3)</button>
          <button class="persona-btn ${state.tab === "currencies" ? "active" : ""}" data-tab="currencies">Currencies (7)</button>
        </div>
      </div>
      <div id="ad-body"></div>
    `;

    root.querySelectorAll(".persona-btn[data-tab]").forEach((b) => {
      b.addEventListener("click", () => { state.tab = b.dataset.tab; render(root); });
    });
    renderBody();
  }

  function renderBody() {
    const body = document.getElementById("ad-body");
    if (state.tab === "plans") return renderPriceMatrix(body, Store.catalog.plans, "plans");
    if (state.tab === "addons") return renderPriceMatrix(body, Store.catalog.addons, "addons", true);
    if (state.tab === "devices") return renderPriceMatrix(body, Store.catalog.devices, "devices");
    if (state.tab === "separate") return renderSeparate(body);
    if (state.tab === "currencies") return renderCurrencies(body);
  }

  function renderPriceMatrix(root, rows, kind, showTier = false) {
    const currencies = Store.catalog.currencies;
    const updater = {
      plans: (id, cur, price) => API.updatePlanPrice(id, cur, price),
      addons: (id, cur, price) => API.updateAddonPrice(id, cur, price),
      devices: (id, cur, price) => API.updateDevicePrice(id, cur, price),
    }[kind];

    root.innerHTML = `
      <div class="card">
        <div class="card-title">${titleForKind(kind)} — price matrix</div>
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

    root.querySelectorAll("tr[data-id]").forEach((tr) => {
      const id = parseInt(tr.dataset.id, 10);
      tr.querySelectorAll("input[data-cur]").forEach((inp) => {
        inp.addEventListener("change", async () => {
          const price = parseFloat(inp.value);
          try {
            await updater(id, inp.dataset.cur, price);
            toast("Price updated");
            await Store.load();
          } catch (e) { toast("Update failed"); }
        });
      });
    });
  }

  function renderSeparate(root) {
    const currencies = Store.catalog.currencies;
    root.innerHTML = Store.catalog.separate.map((sp) => `
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
    `).join("");

    root.querySelectorAll("tr[data-tier]").forEach((tr) => {
      const tid = parseInt(tr.dataset.tier, 10);
      tr.querySelectorAll("input[data-cur]").forEach((inp) => {
        inp.addEventListener("change", async () => {
          const price = parseFloat(inp.value);
          try {
            await API.updateSeparatePrice(tid, inp.dataset.cur, price);
            toast("Price updated"); await Store.load();
          } catch (e) { toast("Update failed"); }
        });
      });
    });
  }

  function renderCurrencies(root) {
    root.innerHTML = `
      <div class="card">
        <div class="card-title">Regional price points</div>
        <div class="card-subtitle">Seven price points, matching the Foodics market footprint.</div>
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
  }

  function titleForKind(kind) {
    return { plans: "RMS Plans", addons: "Feature Add-ons", devices: "Device Licences", separate: "Separate Products" }[kind] || kind;
  }
  function tierName(order) {
    const p = Store.catalog.plans.find((x) => x.tier_order === order);
    return p ? p.name : `Tier ${order}`;
  }

  return { render };
})();
