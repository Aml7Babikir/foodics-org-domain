const Store = {
  catalog: null,
  currency: "SAR",
  async load() {
    this.catalog = await API.catalog();
    return this.catalog;
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
