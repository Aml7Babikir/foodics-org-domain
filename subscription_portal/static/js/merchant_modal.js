/**
 * Modal: add a merchant by Salesforce account number.
 * Flow: sales rep enters SF account # → system fetches SF record →
 * form pre-fills → rep tops up any missing compliance fields → save.
 */
const MerchantModal = (() => {
  const REQUIRED = ["email", "country", "cr_number", "vat_number", "legal_identifier"];

  const LABEL = {
    name: "Company name",
    email: "Billing email",
    country: "Country",
    currency: "Currency",
    cr_number: "Commercial Registration (CR)",
    vat_number: "Tax / VAT number",
    legal_identifier: "Legal entity identifier",
  };

  function open(onImported) {
    const wrap = document.createElement("div");
    wrap.className = "mm-overlay";
    wrap.innerHTML = `
      <div class="mm-dialog">
        <div class="mm-header">
          <div>
            <div class="mm-title">Add merchant from Salesforce</div>
            <div class="mm-sub">Enter the SF account number. We'll pull the record and pre-fill it.</div>
          </div>
          <button class="mm-close" aria-label="Close">×</button>
        </div>

        <div class="mm-body">
          <div class="field">
            <label>Salesforce account number</label>
            <div class="inline">
              <input id="mm-sf" placeholder="e.g. ACC-20001" autofocus />
              <button id="mm-lookup" class="btn">Look up</button>
            </div>
            <div class="small muted mt-8">Try a known account: <code>ACC-20001</code> (complete) or <code>ACC-20010</code> (missing VAT).</div>
          </div>

          <div id="mm-result" class="mm-result hidden"></div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    wrap.querySelector(".mm-close").addEventListener("click", close);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
    document.getElementById("mm-sf").addEventListener("keydown", (e) => {
      if (e.key === "Enter") document.getElementById("mm-lookup").click();
    });
    document.getElementById("mm-lookup").addEventListener("click", () => lookup(onImported, close));
  }

  async function lookup(onImported, close) {
    const acc = document.getElementById("mm-sf").value.trim();
    if (!acc) { toast("Enter an SF account number"); return; }
    const result = document.getElementById("mm-result");
    result.classList.remove("hidden");
    result.innerHTML = `<div class="small muted">Contacting Salesforce…</div>`;

    try {
      const lookup = await API.sfLookup(acc);
      if (lookup.already_imported) {
        result.innerHTML = `
          <div class="mm-alert info">
            Already imported as merchant #${lookup.merchant_id}.
            ${lookup.missing.length ? `<div class="mt-8 small">Missing fields: <b>${lookup.missing.join(", ")}</b></div>` : ""}
          </div>
          <button class="btn mt-12" id="mm-reuse">Use existing merchant</button>
        `;
        document.getElementById("mm-reuse").addEventListener("click", async () => {
          onImported && onImported({ id: lookup.merchant_id });
          close();
        });
        return;
      }
      renderForm(acc, lookup.record, lookup.missing, onImported, close);
    } catch (e) {
      result.innerHTML = `<div class="mm-alert err">Lookup failed: ${e.message}</div>`;
    }
  }

  function renderForm(accountNumber, rec, missing, onImported, close) {
    const result = document.getElementById("mm-result");
    const currencies = (Store.catalog.currencies || []).map((c) => c.code);
    const fieldRow = (k, val, type = "text") => `
      <div class="field">
        <label>${LABEL[k]} ${REQUIRED.includes(k) ? '<span class="req">*</span>' : ""}
          ${missing.includes(k) ? '<span class="chip status-pending_payment">missing</span>' : '<span class="chip status-completed">from SF</span>'}
        </label>
        ${k === "currency" ? `
          <select name="${k}">
            ${currencies.map((c) => `<option value="${c}" ${val === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
        ` : `
          <input name="${k}" type="${type}" value="${val ?? ""}" placeholder="${missing.includes(k) ? "Sales rep: please complete" : ""}" />
        `}
      </div>
    `;
    result.innerHTML = `
      <div class="mm-alert ${missing.length ? "warn" : "ok"}">
        Found SF account <b>${accountNumber}</b>.
        ${missing.length
          ? `Required fields missing from Salesforce: <b>${missing.join(", ")}</b>. Complete them below to import.`
          : `All required fields present — ready to import.`}
      </div>

      <div class="mm-form">
        ${fieldRow("name", rec.name)}
        <div class="row">
          <div class="col">${fieldRow("email", rec.email)}</div>
          <div class="col">${fieldRow("country", rec.country)}</div>
          <div class="col">${fieldRow("currency", rec.currency || "SAR")}</div>
        </div>
        <div class="row">
          <div class="col">${fieldRow("cr_number", rec.cr_number)}</div>
          <div class="col">${fieldRow("vat_number", rec.vat_number)}</div>
        </div>
        ${fieldRow("legal_identifier", rec.legal_identifier)}
      </div>

      <div class="mm-actions">
        <button class="btn secondary" id="mm-cancel">Cancel</button>
        <button class="btn accent" id="mm-save">Import merchant</button>
      </div>
    `;

    document.getElementById("mm-cancel").addEventListener("click", close);
    document.getElementById("mm-save").addEventListener("click", async () => {
      const form = result.querySelector(".mm-form");
      const data = { sf_account_number: accountNumber };
      form.querySelectorAll("input, select").forEach((el) => {
        data[el.name] = el.value.trim();
      });
      // Client-side required-check
      const missingNow = REQUIRED.filter((k) => !data[k]);
      if (missingNow.length) {
        toast(`Please fill: ${missingNow.join(", ")}`);
        return;
      }
      try {
        const merchant = await API.sfImport(data);
        toast(`Imported ${merchant.name} (SF #${accountNumber})`);
        onImported && onImported(merchant);
        close();
      } catch (e) { toast("Import failed: " + e.message); }
    });
  }

  /**
   * Top up missing fields on an EXISTING merchant (used by CS console when invoicing is blocked).
   */
  function openComplete(merchant, onPatched) {
    const missing = merchant.missing_fields || [];
    const wrap = document.createElement("div");
    wrap.className = "mm-overlay";
    wrap.innerHTML = `
      <div class="mm-dialog">
        <div class="mm-header">
          <div>
            <div class="mm-title">Complete merchant record</div>
            <div class="mm-sub">${merchant.name} · SF #${merchant.sf_account_number || "—"}. These fields are required before invoicing.</div>
          </div>
          <button class="mm-close" aria-label="Close">×</button>
        </div>
        <div class="mm-body">
          <div class="mm-form">
            ${missing.map((k) => `
              <div class="field">
                <label>${LABEL[k]} <span class="req">*</span></label>
                <input name="${k}" value="${merchant[k] ?? ""}" placeholder="Sales rep: please complete" />
              </div>
            `).join("")}
            ${missing.length === 0 ? `<div class="mm-alert ok">No missing fields — you're good to invoice.</div>` : ""}
          </div>
          <div class="mm-actions">
            <button class="btn secondary" id="mm-cancel2">Close</button>
            ${missing.length ? `<button class="btn accent" id="mm-save2">Save & unblock invoicing</button>` : ""}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.querySelector(".mm-close").addEventListener("click", close);
    wrap.querySelector("#mm-cancel2").addEventListener("click", close);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
    const save = wrap.querySelector("#mm-save2");
    if (save) save.addEventListener("click", async () => {
      const data = {};
      wrap.querySelectorAll(".mm-form input").forEach((el) => { data[el.name] = el.value.trim(); });
      const missingNow = missing.filter((k) => !data[k]);
      if (missingNow.length) { toast(`Still missing: ${missingNow.join(", ")}`); return; }
      try {
        const updated = await API.patchMerchant(merchant.id, data);
        toast("Merchant updated — invoicing unblocked");
        onPatched && onPatched(updated);
        close();
      } catch (e) { toast("Update failed: " + e.message); }
    });
  }

  return { open, openComplete };
})();
