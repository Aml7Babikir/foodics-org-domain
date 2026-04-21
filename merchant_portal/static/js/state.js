const Store = {
  merchant: null,
  catalog: null,
  subscription: null,     // current sub detail (or null if no subscription)
  route: "signin",        // signin | home | checkout | manage | payment

  async loadCatalog() {
    this.catalog = await API.catalog();
    return this.catalog;
  },
  async loadSubscription() {
    if (!this.merchant) return null;
    this.subscription = await API.subscription(this.merchant.id);
    return this.subscription;
  },
  setMerchant(m) {
    this.merchant = m;
    localStorage.setItem("foodics_merchant_id", String(m.id));
  },
  async restoreSession() {
    const id = localStorage.getItem("foodics_merchant_id");
    if (!id) return null;
    try {
      const m = await API.me(parseInt(id, 10));
      this.merchant = m;
      return m;
    } catch (_) {
      localStorage.removeItem("foodics_merchant_id");
      return null;
    }
  },
  signOut() {
    this.merchant = null;
    this.subscription = null;
    localStorage.removeItem("foodics_merchant_id");
  },

  planById(id) { return this.catalog.plans.find((p) => p.id === id); },
  addonById(id) { return this.catalog.addons.find((a) => a.id === id); },
  deviceById(id) { return this.catalog.devices.find((d) => d.id === id); },
  separateTierById(tid) {
    for (const sp of this.catalog.separate) {
      for (const t of sp.tiers) if (t.id === tid) return { product: sp, tier: t };
    }
    return null;
  },
};
