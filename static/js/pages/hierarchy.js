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

    // Build brand→locations and brand→location_groups maps
    const brandLocations = {};
    brands.forEach(b => { brandLocations[b.id] = locs.filter(l => l.brand_id === b.id); });
    const brandLocationGroups = {};
    brands.forEach(b => {
        const brandLocIds = new Set((brandLocations[b.id] || []).map(l => l.location_group_id).filter(Boolean));
        brandLocationGroups[b.id] = lgs.filter(lg => brandLocIds.has(lg.id));
    });

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

        <!-- Groups Hierarchy -->
        ${groups.filter(g => !g.is_default).length > 0 ? `
        <div class="hier-section">
            <h3 class="hier-section-title">Groups Hierarchy</h3>
            <p class="hier-section-desc">Full organisational hierarchy from group level down</p>
            <div class="groups-hier-grid">
                ${groups.filter(g => !g.is_default).map(g => {
                    const gBrands = brands.filter(b => b.group_id === g.id);
                    return `
                    <div class="groups-hier-card">
                        <div class="groups-hier-header">
                            <div class="groups-hier-icon">G</div>
                            <div>
                                <div class="groups-hier-name">${g.name}</div>
                                <div class="groups-hier-meta">${gBrands.length} brand${gBrands.length !== 1 ? 's' : ''}</div>
                            </div>
                        </div>
                        <div class="groups-hier-body">
                            ${gBrands.length === 0 ? '<div class="text-sm text-muted">No brands assigned</div>' :
                            gBrands.map(b => {
                                const bCountries = brandCountries[b.id] || [];
                                const bLocs = brandLocations[b.id] || [];
                                const bLGs = brandLocationGroups[b.id] || [];
                                return `
                                <div class="groups-hier-branch">
                                    <div class="groups-hier-branch-head">
                                        <div class="brand-matrix-brand-icon">B</div>
                                        <span class="groups-hier-branch-name">${b.name}</span>
                                        <span class="hier-sub-count">${bLocs.length} loc</span>
                                    </div>
                                    ${bCountries.length > 0 ? `
                                    <div class="groups-hier-children">
                                        ${bCountries.map(c => {
                                            const cLEs = les.filter(le => le.country_id === c.id);
                                            const cLocs = bLocs.filter(l => {
                                                const le = les.find(le => le.id === l.legal_entity_id);
                                                return le && le.country_id === c.id;
                                            });
                                            return `
                                            <div class="groups-hier-country">
                                                <div class="groups-hier-country-head">
                                                    <span class="hier-dot" style="background:#10B981;"></span>
                                                    <span>${c.name}</span>
                                                    <span class="brand-matrix-iso">${c.iso_code}</span>
                                                </div>
                                                ${cLEs.length > 0 ? `
                                                <div class="groups-hier-les">
                                                    ${cLEs.map(le => {
                                                        const leLocs = cLocs.filter(l => l.legal_entity_id === le.id);
                                                        const leLGsList = lgs.filter(lg => lg.legal_entity_id === le.id);
                                                        return `
                                                        <div class="groups-hier-le">
                                                            <div class="groups-hier-le-head">
                                                                <span class="groups-hier-le-icon">LE</span>
                                                                <span>${le.name}</span>
                                                                ${le.is_franchise ? '<span class="badge badge-warning" style="font-size:10px;">Franchise</span>' : ''}
                                                            </div>
                                                            ${leLGsList.length > 0 ? `
                                                            <div class="groups-hier-leaf-list">
                                                                ${leLGsList.map(lg => {
                                                                    const lgLocs = leLocs.filter(l => l.location_group_id === lg.id);
                                                                    return `
                                                                    <div class="groups-hier-lg">
                                                                        <span class="hier-dot" style="background:#EF4444;"></span>
                                                                        <span>${lg.name}</span>
                                                                        <span class="hier-sub-count">${lgLocs.length} loc</span>
                                                                    </div>
                                                                    ${lgLocs.map(l => `
                                                                        <div class="groups-hier-loc">
                                                                            <span class="hier-dot" style="background:#06B6D4;"></span>
                                                                            <span>${l.name}</span>
                                                                        </div>
                                                                    `).join('')}`;
                                                                }).join('')}
                                                            </div>` : ''}
                                                            ${leLocs.filter(l => !l.location_group_id).length > 0 ? `
                                                            <div class="groups-hier-leaf-list">
                                                                ${leLocs.filter(l => !l.location_group_id).map(l => `
                                                                    <div class="groups-hier-loc">
                                                                        <span class="hier-dot" style="background:#06B6D4;"></span>
                                                                        <span>${l.name}</span>
                                                                    </div>
                                                                `).join('')}
                                                            </div>` : ''}
                                                        </div>`;
                                                    }).join('')}
                                                </div>` : ''}
                                            </div>`;
                                        }).join('')}
                                    </div>` : ''}
                                </div>`;
                            }).join('')}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>` : ''}

        <!-- Legal Entities -->
        <div class="hier-section">
            <h3 class="hier-section-title">Legal & Financial Structure</h3>
            <p class="hier-section-desc">Legal entities, their identity, and what they are assigned to</p>
            <div class="hier-le-grid">
                ${les.map(le => {
                    const myLocs = leLocations[le.id] || [];
                    const myLGs = leLGs[le.id] || [];
                    const myBUs = leBUs[le.id] || [];
                    const leBrandIds = [...new Set(myLocs.map(l => l.brand_id))];
                    const leBrands = brands.filter(b => leBrandIds.includes(b.id));
                    const leCountry = countries.find(c => c.id === le.country_id);
                    const leGroup = groups.find(g => g.id === le.group_id);
                    return `
                        <div class="hier-le-card ${le.is_franchise ? 'franchise' : ''}">
                            <div class="hier-le-header">
                                <div class="hier-le-icon">LE</div>
                                <div>
                                    <div class="hier-le-name">${le.name}</div>
                                    <div class="hier-le-meta">${le.owner_name ? le.owner_name + ' &middot; ' : ''}${leCountry ? leCountry.name : '--'}</div>
                                </div>
                                ${le.is_franchise ? '<span class="badge badge-warning">Franchise</span>' : ''}
                            </div>
                            <!-- Identity Details -->
                            <div class="hier-le-details">
                                <div class="hier-le-detail-row">
                                    <div class="hier-le-detail">
                                        <span class="hier-le-detail-label">Legal Name</span>
                                        <span class="hier-le-detail-value">${le.name}</span>
                                    </div>
                                    <div class="hier-le-detail">
                                        <span class="hier-le-detail-label">Owner</span>
                                        <span class="hier-le-detail-value">${le.owner_name || '--'}</span>
                                    </div>
                                </div>
                                <div class="hier-le-detail-row">
                                    <div class="hier-le-detail">
                                        <span class="hier-le-detail-label">Email</span>
                                        <span class="hier-le-detail-value">${le.email || '--'}</span>
                                    </div>
                                    <div class="hier-le-detail">
                                        <span class="hier-le-detail-label">Country</span>
                                        <span class="hier-le-detail-value">${leCountry ? leCountry.name + ' (' + leCountry.iso_code + ')' : '--'}</span>
                                    </div>
                                </div>
                                <div class="hier-le-detail-row">
                                    <div class="hier-le-detail">
                                        <span class="hier-le-detail-label">VAT Number</span>
                                        <span class="hier-le-detail-value font-mono">${le.vat_registration_number || '--'}</span>
                                    </div>
                                    <div class="hier-le-detail">
                                        <span class="hier-le-detail-label">Commercial Reg.</span>
                                        <span class="hier-le-detail-value font-mono">${le.commercial_registration || '--'}</span>
                                    </div>
                                </div>
                            </div>
                            <!-- Assignments -->
                            <div class="hier-le-body">
                                <div class="hier-sub-label" style="margin-bottom:10px;font-size:12px;color:#64748B;">Assigned To</div>
                                ${leGroup ? `
                                <div class="hier-sub-section">
                                    <div class="hier-sub-label">Group</div>
                                    <div class="hier-sub-item">
                                        <span class="hier-dot" style="background:#0EA5E9;"></span>
                                        ${leGroup.name}
                                    </div>
                                </div>` : ''}
                                ${leBrands.length > 0 ? `
                                <div class="hier-sub-section">
                                    <div class="hier-sub-label">Brands (${leBrands.length})</div>
                                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                        ${leBrands.map(b => `<span class="badge badge-primary">${b.name}</span>`).join('')}
                                    </div>
                                </div>` : ''}
                                ${myLGs.length > 0 ? `
                                <div class="hier-sub-section">
                                    <div class="hier-sub-label">Location Groups (${myLGs.length})</div>
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

        <!-- Brand × Country Matrix -->
        <div class="hier-section">
            <h3 class="hier-section-title">Brands & Markets</h3>
            <p class="hier-section-desc">How your brands map to the countries you operate in</p>
            <div class="brand-matrix">
                ${brands.map(b => {
                    const bCountries = brandCountries[b.id] || [];
                    const bLocs = brandLocations[b.id] || [];
                    return `
                        <div class="brand-matrix-row">
                            <div class="brand-matrix-row-head">
                                <div class="brand-matrix-brand-icon">B</div>
                                <span>${b.name}</span>
                            </div>
                        </div>
                        ${bCountries.length > 0 ? `
                        <div class="brand-matrix-detail">
                            ${bCountries.map(c => {
                                const sameIsoCountryIds = new Set(countries.filter(cc => cc.iso_code === c.iso_code).map(cc => cc.id));
                                const cLEIds = new Set(les.filter(le => sameIsoCountryIds.has(le.country_id)).map(le => le.id));
                                const cLocs = bLocs.filter(l => cLEIds.has(l.legal_entity_id));
                                const cLGIds = new Set(cLocs.map(l => l.location_group_id).filter(Boolean));
                                const cLGs = lgs.filter(lg => cLGIds.has(lg.id));
                                if (cLocs.length === 0 && cLGs.length === 0) return '';
                                return `
                                <div class="brand-matrix-country-section">
                                    <div class="brand-matrix-country-header">
                                        <span class="hier-dot" style="background:#10B981;"></span>
                                        <span>${c.name}</span>
                                        <span class="brand-matrix-iso">${c.iso_code}</span>
                                        <span class="hier-sub-count">${cLocs.length} location${cLocs.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div class="brand-matrix-country-body">
                                        ${cLGs.length > 0 ? `
                                        <div class="brand-matrix-detail-group">
                                            <div class="brand-matrix-detail-label">Location Groups</div>
                                            <div class="brand-matrix-detail-items">
                                                ${cLGs.map(lg => {
                                                    const lgLocs = cLocs.filter(l => l.location_group_id === lg.id);
                                                    return `<div class="brand-matrix-detail-item">
                                                        <span class="hier-dot" style="background:#EF4444;"></span>
                                                        <span>${lg.name}</span>
                                                        <span class="hier-sub-count">${lgLocs.length} location${lgLocs.length !== 1 ? 's' : ''}</span>
                                                    </div>`;
                                                }).join('')}
                                            </div>
                                        </div>` : ''}
                                        <div class="brand-matrix-detail-group">
                                            <div class="brand-matrix-detail-label">Locations (${cLocs.length})</div>
                                            <div class="brand-matrix-detail-items">
                                                ${cLGs.map(lg => {
                                                    const lgLocs = cLocs.filter(l => l.location_group_id === lg.id);
                                                    if (lgLocs.length === 0) return '';
                                                    return `<div class="brand-matrix-loc-group">
                                                        <div class="brand-matrix-loc-group-label">${lg.name}</div>
                                                        ${lgLocs.map(l => `<div class="brand-matrix-detail-item">
                                                            <span class="hier-dot" style="background:#06B6D4;"></span>
                                                            <span>${l.name}</span>
                                                        </div>`).join('')}
                                                    </div>`;
                                                }).join('')}
                                                ${(() => {
                                                    const ungrouped = cLocs.filter(l => !l.location_group_id);
                                                    if (ungrouped.length === 0) return '';
                                                    return `<div class="brand-matrix-loc-group">
                                                        ${ungrouped.map(l => `<div class="brand-matrix-detail-item">
                                                            <span class="hier-dot" style="background:#06B6D4;"></span>
                                                            <span>${l.name}</span>
                                                        </div>`).join('')}
                                                    </div>`;
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>` : ''}
                    `;
                }).join('')}
            </div>
        </div>
    `;
});
