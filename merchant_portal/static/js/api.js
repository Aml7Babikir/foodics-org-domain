const API = (() => {
  async function req(method, url, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    if (!r.ok) {
      let payload = null;
      try { payload = await r.json(); } catch (_) { payload = { message: await r.text() }; }
      const err = new Error(payload?.detail?.message || payload?.detail || payload?.message || `${r.status}`);
      err.status = r.status; err.payload = payload;
      throw err;
    }
    if (r.status === 204) return null;
    return r.json();
  }
  return {
    get: (u) => req("GET", u),
    post: (u, b) => req("POST", u, b ?? {}),

    login: (identifier) => req("POST", "api/auth/login", { identifier }),
    allMerchants: () => req("GET", "api/auth/merchants"),
    me: (id) => req("GET", `api/auth/me/${id}`),
    catalog: () => req("GET", "api/catalog"),
    subscription: (id) => req("GET", `api/me/${id}/subscription`),

    quote: (b) => req("POST", "api/quote", b),
    checkout: (b) => req("POST", "api/checkout", b),
    previewChange: (b) => req("POST", "api/preview-change", b),
    applyChange: (b) => req("POST", "api/apply-change", b),
    cancel: (merchantId) => req("POST", "api/cancel", { merchant_id: merchantId }),
    renew: (merchantId) => req("POST", `api/renew/${merchantId}`),
    pay: (b) => req("POST", "api/payment/pay", b),
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
  toast._timer = setTimeout(() => t.classList.remove("show"), 2200);
}
function initials(name) {
  return (name || "?").split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}
function dateFmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / 86400000);
}
