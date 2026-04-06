registerPage('hierarchy', async (container) => {
    const tree = await loadTree();
    if (!tree) { container.innerHTML = '<p>Select an organisation</p>'; return; }

    const org = tree.organisation;
    const groups = tree.groups || [];
    const brands = tree.brands || [];
    const countries = tree.countries || [];
    const les = tree.legal_entities || [];
    const bus = tree.business_units || [];
    const lgs = tree.location_groups || [];
    const locs = tree.locations || [];

    // Build brand→country map and brand→LE map
    const brandCountries = {};
    brands.forEach(b => { brandCountries[b.id] = countries.filter(c => c.brand_id === b.id); });

    // Build LE→locations map
    const leLocations = {};
    les.forEach(le => { leLocations[le.id] = locs.filter(l => l.legal_entity_id === le.id); });
    const leLGs = {};
    les.forEach(le => { leLGs[le.id] = lgs.filter(lg => lg.legal_entity_id === le.id); });
    const leBUs = {};
    les.forEach(le => { leBUs[le.id] = bus.filter(bu => bu.legal_entity_id === le.id); });

    // Get unique country names across all brands
    const allCountryNames = [...new Set(countries.map(c => c.name))];

    container.innerHTML = `
        <!-- Org Header -->
        <div class="hier-org-card">
            <div class="hier-org-icon">O</div>
            <div>
                <h2 class="hier-org-name">${org.name}</h2>
                <p class="hier-org-meta">${brands.length} brands &middot; ${les.length} legal entities &middot; ${locs.length} locations &middot; ${allCountryNames.length} countr${allCountryNames.length !== 1 ? 'ies' : 'y'}</p>
            </div>
        </div>

        ${groups.filter(g => !g.is_default).length > 0 ? `
        <div class="hier-section">
            <h3 class="hier-section-title">Groups</h3>
            <div class="hier-groups">
                ${groups.filter(g => !g.is_default).map(g => `
                    <div class="hier-group-pill"><span class="hier-dot" style="background:#0EA5E9;"></span>${g.name}</div>
                `).join('')}
            </div>
        </div>` : ''}

        <!-- Brand × Country Matrix -->
        <div class="hier-section">
            <h3 class="hier-section-title">Brands & Markets</h3>
            <p class="hier-section-desc">How your brands map to the countries you operate in</p>
            <div class="brand-matrix">
                <div class="brand-matrix-header">
                    <div class="brand-matrix-corner"></div>
                    ${allCountryNames.map(cn => `<div class="brand-matrix-col-head">${cn}</div>`).join('')}
                </div>
                ${brands.map(b => {
                    const bCountries = brandCountries[b.id] || [];
                    const bCountryNames = bCountries.map(c => c.name);
                    return `
                        <div class="brand-matrix-row">
                            <div class="brand-matrix-row-head">
                                <div class="brand-matrix-brand-icon">B</div>
                                <span>${b.name}</span>
                            </div>
                            ${allCountryNames.map(cn => {
                                const active = bCountryNames.includes(cn);
                                const country = bCountries.find(c => c.name === cn);
                                return `<div class="brand-matrix-cell ${active ? 'active' : ''}">
                                    ${active ? `<div class="brand-matrix-dot"></div><span class="brand-matrix-iso">${country.iso_code}</span>` : ''}
                                </div>`;
                            }).join('')}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- Legal Entities -->
        <div class="hier-section">
            <h3 class="hier-section-title">Legal & Financial Structure</h3>
            <p class="hier-section-desc">Companies, their brand relationships, and locations</p>
            <div class="hier-le-grid">
                ${les.map(le => {
                    const myLocs = leLocations[le.id] || [];
                    const myLGs = leLGs[le.id] || [];
                    const myBUs = leBUs[le.id] || [];
                    // Find brands linked to this LE (via locations or via brand_legal_entity)
                    const leBrandIds = [...new Set(myLocs.map(l => l.brand_id))];
                    const leBrands = brands.filter(b => leBrandIds.includes(b.id));
                    return `
                        <div class="hier-le-card ${le.is_franchise ? 'franchise' : ''}">
                            <div class="hier-le-header">
                                <div class="hier-le-icon">LE</div>
                                <div>
                                    <div class="hier-le-name">${le.name}</div>
                                    <div class="hier-le-meta">${le.currency_code} &middot; Tax: ${le.tax_mode}${le.vat_registration_number ? ' &middot; VAT: ' + le.vat_registration_number : ''}</div>
                                </div>
                                ${le.is_franchise ? '<span class="badge badge-warning">Franchise</span>' : ''}
                            </div>
                            ${leBrands.length > 0 ? `
                                <div class="hier-le-brands">
                                    <span class="hier-le-brands-label">Brands:</span>
                                    ${leBrands.map(b => `<span class="badge badge-primary">${b.name}</span>`).join('')}
                                </div>
                            ` : ''}
                            <div class="hier-le-body">
                                ${myBUs.length > 0 ? `
                                    <div class="hier-sub-section">
                                        <div class="hier-sub-label">Business Units</div>
                                        ${myBUs.map(bu => `<div class="hier-sub-item"><span class="hier-dot" style="background:#F97316;"></span>${bu.name}</div>`).join('')}
                                    </div>` : ''}
                                ${myLGs.length > 0 ? `
                                    <div class="hier-sub-section">
                                        <div class="hier-sub-label">Location Groups</div>
                                        ${myLGs.map(lg => `
                                            <div class="hier-sub-item">
                                                <span class="hier-dot" style="background:#EF4444;"></span>
                                                ${lg.name}
                                                <span class="hier-sub-count">${myLocs.filter(l => l.location_group_id === lg.id).length} loc</span>
                                            </div>
                                        `).join('')}
                                    </div>` : ''}
                                <div class="hier-sub-section">
                                    <div class="hier-sub-label">Locations (${myLocs.length})</div>
                                    ${myLocs.length === 0 ? '<div class="text-sm text-muted">No locations yet</div>' :
                                    myLocs.slice(0, 6).map(l => {
                                        const locBrand = brands.find(b => b.id === l.brand_id);
                                        return `<div class="hier-loc-item">
                                            <span class="hier-dot" style="background:#06B6D4;"></span>
                                            <span>${l.name}</span>
                                            ${locBrand ? `<span class="hier-loc-brand">${locBrand.name}</span>` : ''}
                                        </div>`;
                                    }).join('')}
                                    ${myLocs.length > 6 ? `<div class="text-sm text-muted" style="padding-left:20px;">+${myLocs.length - 6} more</div>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
});
