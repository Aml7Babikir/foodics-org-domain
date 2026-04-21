const API = (() => {
  async function req(method, url, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    if (!r.ok) {
      let payload = null;
      try { payload = await r.json(); } catch (_) { payload = { message: await r.text() }; }
      const err = new Error(payload?.detail?.message || payload?.message || `${r.status}`);
      err.status = r.status; err.payload = payload;
      throw err;
    }
    if (r.status === 204) return null;
    return r.json();
  }
  return {
    get: (u) => req("GET", u),
    post: (u, b) => req("POST", u, b ?? {}),
    put: (u, b) => req("PUT", u, b ?? {}),
    del: (u) => req("DELETE", u),

    catalog: () => req("GET", "api/catalog"),
    merchants: () => req("GET", "api/merchants"),
    createMerchant: (b) => req("POST", "api/merchants", b),
    merchant: (id) => req("GET", `api/merchants/${id}`),
    quote: (b) => req("POST", "api/quote", b),
    createSubscription: (b) => req("POST", "api/subscriptions", b),
    subscription: (id) => req("GET", `api/subscriptions/${id}`),
    subscriptions: () => req("GET", "api/subscriptions"),
    setStage: (id, stage) => req("POST", `api/subscriptions/${id}/stage`, { stage }),
    editSubscription: (id, b) => req("PUT", `api/subscriptions/${id}`, b),
    createInvoice: (subId) => req("POST", `api/subscriptions/${subId}/invoices`),
    payInvoice: (invId) => req("POST", `api/invoices/${invId}/pay`),

    sfLookup: (accountNumber) => req("GET", `api/sf/account/${encodeURIComponent(accountNumber)}`),
    sfImport: (body) => req("POST", "api/sf/import", body),
    patchMerchant: (id, body) => req("PATCH", `api/sf/merchants/${id}`, body),

    updatePlanPrice:   (id, currency, price) => req("PUT", `api/catalog/plans/${id}/price`, { currency, price }),
    updateAddonPrice:  (id, currency, price) => req("PUT", `api/catalog/addons/${id}/price`, { currency, price }),
    updateDevicePrice: (id, currency, price) => req("PUT", `api/catalog/devices/${id}/price`, { currency, price }),
    updateSeparatePrice: (id, currency, price) => req("PUT", `api/catalog/separate-tiers/${id}/price`, { currency, price }),
  };
})();

function money(amount, currency) {
  const n = Number(amount || 0);
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency || ""}`.trim();
}
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove("show"), 2000);
}
function statusLabel(s) {
  return ({ processing: "Processing", pending_payment: "Pending Payment", completed: "Completed", cancelled: "Cancelled" })[s] || s;
}
function stageLabel(s) {
  return ({
    discovery: "Discovery", evaluation: "Evaluation", proposal: "Proposal",
    contracting: "Contracting", collection: "Collection",
    closed_won: "Closed Won", closed_lost: "Closed Lost",
  })[s] || s;
}
const STAGES_FORWARD = ["discovery", "evaluation", "proposal", "contracting", "collection", "closed_won"];
