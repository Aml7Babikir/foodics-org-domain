/**
 * CS Agent view — the "one screen that replaces Salesforce + getsolo".
 * Shows merchant subscriptions with deal stage, status, invoices, and controls.
 */
const CSView = (() => {
  const state = { merchants: [], selectedMerchantId: null, merchantDetail: null };

  function render(root) {
    root.innerHTML = `
      <div class="card">
        <div class="card-title">CS Console
          <span class="chip pill-accent">CS Agent</span>
        </div>
        <div class="card-subtitle">One screen: plan, add-ons, devices, separate products, deal stage, invoices. No more toggling between Salesforce and getsolo.</div>
      </div>

      <div class="split">
        <div class="card merchant-list" id="cs-merchants"></div>
        <div id="cs-detail"></div>
      </div>
    `;
    loadMerchants();
  }

  async function loadMerchants() {
    state.merchants = await API.merchants();
    const list = document.getElementById("cs-merchants");
    list.innerHTML = state.merchants.length
      ? state.merchants.map((m) => `
        <div class="merchant-row ${state.selectedMerchantId === m.id ? "selected" : ""}" data-id="${m.id}">
          <div class="mname">${m.name}</div>
          <div class="mmeta">${m.country || "—"} · ${m.currency} · ${m.branches_count} branch(es)</div>
        </div>
      `).join("")
      : `<div class="empty-state">No merchants yet. Create one in the Sales view.</div>`;
    list.querySelectorAll(".merchant-row").forEach((el) => {
      el.addEventListener("click", () => selectMerchant(parseInt(el.dataset.id, 10)));
    });
    if (!state.selectedMerchantId && state.merchants.length) {
      selectMerchant(state.merchants[0].id);
    } else if (state.selectedMerchantId) {
      selectMerchant(state.selectedMerchantId);
    }
  }

  async function selectMerchant(id) {
    state.selectedMerchantId = id;
    document.querySelectorAll(".merchant-row").forEach((r) => r.classList.toggle("selected", parseInt(r.dataset.id, 10) === id));
    state.merchantDetail = await API.merchant(id);
    renderDetail();
  }

  function renderDetail() {
    const m = state.merchantDetail;
    const root = document.getElementById("cs-detail");
    if (!m) { root.innerHTML = ""; return; }

    const subsHtml = m.subscriptions.length
      ? m.subscriptions.map((s) => renderSubscriptionCard(s)).join("")
      : `<div class="card"><div class="empty-state">No subscriptions for ${m.name} yet. Use the Sales view to create one.</div></div>`;

    const missing = m.missing_fields || [];
    const compliance = missing.length
      ? `<span class="chip status-pending_payment">Incomplete · ${missing.length} missing</span>`
      : `<span class="chip status-completed">Complete — ready to invoice</span>`;

    root.innerHTML = `
      <div class="card">
        <div class="card-title">
          <div>${m.name} ${compliance}</div>
          ${missing.length ? `<button class="btn small accent" id="cs-complete-merchant">Complete merchant record</button>` : ""}
        </div>
        <div class="small muted">${m.email || "—"} · ${m.country || "—"} · ${m.currency}</div>
        <div class="sf-grid mt-12">
          <div><span class="sf-lbl">SF account #</span><div class="sf-val">${m.sf_account_number || "—"}</div></div>
          <div><span class="sf-lbl">Commercial Registration</span><div class="sf-val">${m.cr_number || missingPlaceholder("cr_number", missing)}</div></div>
          <div><span class="sf-lbl">VAT / Tax #</span><div class="sf-val">${m.vat_number || missingPlaceholder("vat_number", missing)}</div></div>
          <div><span class="sf-lbl">Legal identifier</span><div class="sf-val">${m.legal_identifier || missingPlaceholder("legal_identifier", missing)}</div></div>
          <div><span class="sf-lbl">SF sync</span><div class="sf-val">${m.sf_synced_at ? new Date(m.sf_synced_at).toLocaleDateString() : "—"}</div></div>
        </div>
      </div>
      ${subsHtml}
    `;
    const btn = document.getElementById("cs-complete-merchant");
    if (btn) btn.addEventListener("click", () => {
      MerchantModal.openComplete(m, () => selectMerchant(state.selectedMerchantId));
    });
    hydrateStageActions();
  }

  function missingPlaceholder(field, missing) {
    return missing.includes(field)
      ? `<span class="chip status-pending_payment">missing — needed for invoicing</span>`
      : "—";
  }

  function renderSubscriptionCard(s) {
    const stageIdx = STAGES_FORWARD.indexOf(s.deal_stage);
    const stagesHtml = STAGES_FORWARD.map((st, i) => {
      let cls = "stage-pill";
      if (s.deal_stage === "closed_lost") cls += (st === "closed_won" ? " cancelled" : "");
      else if (i < stageIdx) cls += " past";
      else if (i === stageIdx) cls += " active";
      const label = st === "closed_won" ? "Closed Won" : stageLabel(st);
      return `<div class="${cls}">${label}</div>`;
    }).join("");

    return `
      <div class="card" data-sub="${s.id}">
        <div class="card-title">Subscription #${s.id} · ${s.plan_name}
          <span class="chip status-${s.status}">${statusLabel(s.status)}</span>
        </div>

        <div class="row" style="gap: 12px;">
          <div class="col"><div class="small muted">Branches</div><div><b>${s.branches}</b></div></div>
          <div class="col"><div class="small muted">Billing</div><div><b>${s.billing_frequency === "annual" ? "Annual" : "Monthly"}</b></div></div>
          <div class="col"><div class="small muted">Currency</div><div><b>${s.currency}</b></div></div>
          <div class="col"><div class="small muted">Activated</div><div><b>${s.activated_at ? new Date(s.activated_at).toLocaleDateString() : "—"}</b></div></div>
          <div class="col"><div class="small muted">Next renewal</div><div><b>${s.next_renewal_at ? new Date(s.next_renewal_at).toLocaleDateString() : "—"}</b></div></div>
        </div>

        <div class="section-title">Salesforce deal stage → Merchant status</div>
        <div class="stages">${stagesHtml}</div>
        <div class="inline" style="gap: 6px;">
          ${s.deal_stage !== "closed_won" && s.deal_stage !== "closed_lost" ? `
            <button class="btn small secondary" data-next="${s.id}">Advance stage →</button>
            <button class="btn small secondary" data-lose="${s.id}" style="color: var(--red); border-color: var(--red-soft);">Mark Closed Lost</button>
          ` : ""}
          <button class="btn small secondary" data-newinvoice="${s.id}">Generate invoice</button>
        </div>

        <div class="section-title">Configuration (live)</div>
        <div class="invoice-box">
          <table>
            <thead><tr><th>Layer</th><th>Line</th><th class="numeric">Qty</th><th class="numeric">Unit</th><th class="numeric">Subtotal</th></tr></thead>
            <tbody>
              ${s.quote.lines.map((l) => `
                <tr><td><span class="chip">${layerName(l.category)}</span></td>
                    <td>${l.description}</td>
                    <td class="numeric">${l.quantity}</td>
                    <td class="numeric">${money(l.unit_price, s.currency)}</td>
                    <td class="numeric">${money(l.subtotal, s.currency)}</td></tr>
              `).join("")}
            </tbody>
          </table>
          <div class="invoice-total">Recurring: ${money(s.quote.totals.grand_total, s.currency)}${s.billing_frequency === "annual" ? "/yr" : "/mo"}</div>
        </div>

        <div class="section-title">Invoices</div>
        ${s.invoices.length ? `
          <table>
            <thead><tr><th>Number</th><th>Issued</th><th class="numeric">Total</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${s.invoices.map((i) => `
                <tr>
                  <td><b>${i.number}</b></td>
                  <td>${new Date(i.issued_at).toLocaleString()}</td>
                  <td class="numeric">${money(i.total, i.currency)}</td>
                  <td><span class="chip ${i.status === "paid" ? "status-completed" : "status-pending_payment"}">${i.status}</span></td>
                  <td>${i.status === "pending" ? `<button class="btn small" data-pay="${i.id}">Capture payment</button>` : ""}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : `<div class="small muted">No invoices yet. Advance to "Collection" to auto-generate one.</div>`}
      </div>
    `;
  }

  function hydrateStageActions() {
    document.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", async () => {
      const subId = parseInt(b.dataset.next, 10);
      const sub = state.merchantDetail.subscriptions.find((s) => s.id === subId);
      const idx = STAGES_FORWARD.indexOf(sub.deal_stage);
      const next = STAGES_FORWARD[idx + 1];
      if (!next) return;
      try {
        await API.setStage(subId, next);
        toast(`Stage → ${stageLabel(next)}`);
        selectMerchant(state.selectedMerchantId);
      } catch (e) {
        if (e.status === 409 && e.payload?.detail?.error === "merchant_incomplete") {
          toast("Complete the merchant record to proceed to Collection");
          MerchantModal.openComplete(state.merchantDetail, () => selectMerchant(state.selectedMerchantId));
        } else { toast("Error: " + e.message); }
      }
    }));
    document.querySelectorAll("[data-lose]").forEach((b) => b.addEventListener("click", async () => {
      const subId = parseInt(b.dataset.lose, 10);
      await API.setStage(subId, "closed_lost");
      toast("Deal marked Closed Lost");
      selectMerchant(state.selectedMerchantId);
    }));
    document.querySelectorAll("[data-newinvoice]").forEach((b) => b.addEventListener("click", async () => {
      const subId = parseInt(b.dataset.newinvoice, 10);
      try {
        await API.createInvoice(subId);
        toast("Invoice generated");
        selectMerchant(state.selectedMerchantId);
      } catch (e) {
        if (e.status === 409 && e.payload?.detail?.error === "merchant_incomplete") {
          toast("Complete the merchant record before invoicing");
          MerchantModal.openComplete(state.merchantDetail, () => selectMerchant(state.selectedMerchantId));
        } else { toast("Error: " + e.message); }
      }
    }));
    document.querySelectorAll("[data-pay]").forEach((b) => b.addEventListener("click", async () => {
      const invId = parseInt(b.dataset.pay, 10);
      await API.payInvoice(invId);
      toast("Payment captured (mock: always succeeds)");
      selectMerchant(state.selectedMerchantId);
    }));
  }

  function layerName(cat) {
    return { plan: "Plan", addon: "Add-on", device: "Device", separate: "Separate", proration: "Proration" }[cat] || cat;
  }

  return { render };
})();
