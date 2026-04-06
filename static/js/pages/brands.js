registerPage('brands', async (container) => {
    if (!state.currentOrg) {
        container.innerHTML = '<div class="empty-state"><h4>No organisation selected</h4></div>';
        return;
    }

    const orgId = state.currentOrg.id;
    const params = state.pageParams || {};

    // If we have a brand ID param, show detail view
    if (params.brandId || params.id) {
        await renderBrandDetail(container, params.brandId || params.id);
    } else {
        await renderBrandList(container, orgId);
    }
});

async function renderBrandList(container, orgId) {
    let brands;
    try {
        brands = await api.listBrands(orgId);
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><h4>Error loading brands</h4><p>${e.message}</p></div>`;
        return;
    }

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3>Brands (${brands.length})</h3>
            <button class="btn btn-primary" onclick="window._brandsShowAddModal()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Brand
            </button>
        </div>
        ${brands.length === 0 ? `
            <div class="empty-state">
                <h4>No brands yet</h4>
                <p>Create your first brand to get started.</p>
                <button class="btn btn-primary" onclick="window._brandsShowAddModal()">Add Brand</button>
            </div>
        ` : `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;">
            ${brands.map(b => {
                const statusClass = b.status === 'active' ? 'badge-green' : b.status === 'suspended' ? 'badge-red' : 'badge-amber';
                return `
                <div class="card">
                    <div class="card-body">
                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                            ${b.logo_url ? `<img src="${b.logo_url}" alt="${b.name}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;">` : `<div style="width:40px;height:40px;border-radius:8px;background:#E2E8F0;display:flex;align-items:center;justify-content:center;font-weight:600;color:#64748B;">${b.name.charAt(0)}</div>`}
                            <div style="flex:1;">
                                <div style="font-weight:600;font-size:16px;">${b.name}</div>
                                <div class="text-sm text-muted">${b.group_name || 'No group'}</div>
                            </div>
                            <span class="badge ${statusClass}">${b.status || 'active'}</span>
                        </div>
                        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">
                            <span class="badge ${b.loyalty_programme_enabled ? 'badge-green' : 'badge-gray'}">
                                ${b.loyalty_programme_enabled ? 'Loyalty ON' : 'Loyalty OFF'}
                            </span>
                        </div>
                        <button class="btn btn-sm btn-outline" style="width:100%;" onclick="navigate('brands', {brandId: '${b.id}'})">View Details</button>
                    </div>
                </div>`;
            }).join('')}
        </div>
        `}
    `;

    window._brandsShowAddModal = () => {
        const tree = state.tree;
        const groups = tree ? tree.groups : [];
        openModal(`
            <div class="modal-header">
                <h3>Add Brand</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Name</label>
                    <input class="form-input" id="addBrandName" placeholder="Brand name">
                </div>
                <div class="form-group">
                    <label class="form-label">Group (optional)</label>
                    <select class="form-select" id="addBrandGroup">
                        <option value="">None</option>
                        ${groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Logo URL (optional)</label>
                    <input class="form-input" id="addBrandLogo" placeholder="https://...">
                </div>
                <div class="form-group">
                    <label class="form-label">Loyalty Programme</label>
                    <select class="form-select" id="addBrandLoyalty">
                        <option value="false">Disabled</option>
                        <option value="true">Enabled</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="window._brandsSubmitAdd()">Create</button>
            </div>
        `);
    };

    window._brandsSubmitAdd = async () => {
        const name = document.getElementById('addBrandName').value;
        if (!name) { toast('Name is required', 'error'); return; }
        const data = {
            name,
            organisation_id: orgId,
            group_id: document.getElementById('addBrandGroup').value || null,
            logo_url: document.getElementById('addBrandLogo').value || null,
            loyalty_programme_enabled: document.getElementById('addBrandLoyalty').value === 'true',
        };
        try {
            await api.createBrand(data);
            closeModal();
            toast(`Brand "${name}" created`);
            state.tree = null;
            navigate('brands');
        } catch (e) {
            toast(e.message, 'error');
        }
    };
}

async function renderBrandDetail(container, brandId) {
    let brand, countries, legalEntities;
    try {
        brand = await api.getBrand(brandId);
        countries = await api.listCountries(brandId);
        legalEntities = await api.listLEsByBrand(brandId);
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><h4>Error loading brand</h4><p>${e.message}</p></div>`;
        return;
    }

    let editing = false;

    function render() {
        const statusClass = brand.status === 'active' ? 'badge-green' : brand.status === 'suspended' ? 'badge-red' : 'badge-amber';

        if (!editing) {
            container.innerHTML = `
                <div style="margin-bottom:16px;">
                    <button class="btn btn-secondary" onclick="navigate('brands')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        Back to Brands
                    </button>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div style="display:flex;align-items:center;gap:12px;">
                            ${brand.logo_url ? `<img src="${brand.logo_url}" alt="${brand.name}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;">` : ''}
                            <h3>${brand.name}</h3>
                            <span class="badge ${statusClass}">${brand.status || 'active'}</span>
                        </div>
                        <div class="flex gap-3">
                            <button class="btn btn-sm btn-primary" onclick="window._brandStartEdit()">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="window._brandDelete()">Delete</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;">
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Brand ID</label>
                                <div class="font-mono text-sm">${brand.id}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Group</label>
                                <div>${brand.group_name || brand.group_id || '<span class="text-muted">None</span>'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Logo URL</label>
                                <div class="text-sm">${brand.logo_url || '<span class="text-muted">Not set</span>'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Loyalty Programme</label>
                                <div><span class="badge ${brand.loyalty_programme_enabled ? 'badge-green' : 'badge-gray'}">${brand.loyalty_programme_enabled ? 'Enabled' : 'Disabled'}</span></div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Created</label>
                                <div>${fmtDate(brand.created_at)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Countries -->
                <div class="card mt-4">
                    <div class="card-header">
                        <h3>Countries (${countries.length})</h3>
                        <button class="btn btn-sm btn-primary" onclick="window._brandAddCountry()">+ Add Country</button>
                    </div>
                    <div class="card-body" style="padding:0;">
                        ${countries.length === 0 ? '<div class="empty-state"><p>No countries under this brand.</p></div>' : `
                        <table class="data-table">
                            <thead><tr><th>Name</th><th>ISO Code</th><th>Currency</th><th>Created</th></tr></thead>
                            <tbody>
                                ${countries.map(c => `
                                    <tr>
                                        <td><strong>${c.name}</strong></td>
                                        <td><span class="badge badge-blue">${c.iso_code}</span></td>
                                        <td>${c.currency_code || '--'}</td>
                                        <td class="text-sm text-muted">${fmtDate(c.created_at)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        `}
                    </div>
                </div>

                <!-- Legal Entities -->
                <div class="card mt-4">
                    <div class="card-header">
                        <h3>Linked Legal Entities (${legalEntities.length})</h3>
                    </div>
                    <div class="card-body">
                        ${legalEntities.length === 0 ? '<p class="text-muted">No legal entities linked to this brand.</p>' : `
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            ${legalEntities.map(le => `
                                <span class="badge badge-purple" style="cursor:pointer;padding:6px 12px;" onclick="navigate('legal-entities', {leId: '${le.id}'})">
                                    ${le.name} ${le.is_franchise ? '(Franchise)' : ''}
                                </span>
                            `).join('')}
                        </div>
                        `}
                    </div>
                </div>
            `;
        } else {
            const tree = state.tree;
            const groups = tree ? tree.groups : [];
            container.innerHTML = `
                <div style="margin-bottom:16px;">
                    <button class="btn btn-secondary" onclick="window._brandCancelEdit()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        Cancel Edit
                    </button>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3>Edit Brand</h3>
                        <button class="btn btn-sm btn-primary" onclick="window._brandSaveEdit()">Save Changes</button>
                    </div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
                            <div class="form-group">
                                <label class="form-label">Name</label>
                                <input class="form-input" id="brandEditName" value="${brand.name || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Group</label>
                                <select class="form-select" id="brandEditGroup">
                                    <option value="">None</option>
                                    ${groups.map(g => `<option value="${g.id}" ${brand.group_id === g.id ? 'selected' : ''}>${g.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Logo URL</label>
                                <input class="form-input" id="brandEditLogo" value="${brand.logo_url || ''}" placeholder="https://...">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Loyalty Programme</label>
                                <select class="form-select" id="brandEditLoyalty">
                                    <option value="true" ${brand.loyalty_programme_enabled ? 'selected' : ''}>Enabled</option>
                                    <option value="false" ${!brand.loyalty_programme_enabled ? 'selected' : ''}>Disabled</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Status</label>
                                <select class="form-select" id="brandEditStatus">
                                    <option value="active" ${brand.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="suspended" ${brand.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                                    <option value="inactive" ${brand.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    window._brandStartEdit = () => { editing = true; render(); };
    window._brandCancelEdit = () => { editing = false; render(); };

    window._brandSaveEdit = async () => {
        const data = {
            name: document.getElementById('brandEditName').value,
            group_id: document.getElementById('brandEditGroup').value || null,
            logo_url: document.getElementById('brandEditLogo').value || null,
            loyalty_programme_enabled: document.getElementById('brandEditLoyalty').value === 'true',
            status: document.getElementById('brandEditStatus').value,
        };
        if (!data.name) { toast('Name is required', 'error'); return; }
        try {
            brand = await api.updateBrand(brand.id, data);
            editing = false;
            state.tree = null;
            render();
            toast('Brand updated');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    window._brandDelete = async () => {
        if (!confirm(`Are you sure you want to delete brand "${brand.name}"?`)) return;
        try {
            await api.deleteBrand(brand.id);
            toast(`Brand "${brand.name}" deleted`);
            state.tree = null;
            navigate('brands');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    window._brandAddCountry = () => {
        openModal(`
            <div class="modal-header">
                <h3>Add Country to ${brand.name}</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Country Name</label>
                    <input class="form-input" id="addCountryName" placeholder="e.g. Saudi Arabia">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div class="form-group">
                        <label class="form-label">ISO Code</label>
                        <input class="form-input" id="addCountryISO" placeholder="SAU" maxlength="3">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Currency Code</label>
                        <input class="form-input" id="addCountryCurrency" placeholder="SAR" maxlength="3">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="window._brandSubmitCountry()">Create</button>
            </div>
        `);
    };

    window._brandSubmitCountry = async () => {
        const name = document.getElementById('addCountryName').value;
        const iso_code = document.getElementById('addCountryISO').value;
        if (!name || !iso_code) { toast('Name and ISO code are required', 'error'); return; }
        try {
            await api.createCountry({
                name,
                brand_id: brand.id,
                iso_code,
                currency_code: document.getElementById('addCountryCurrency').value || null,
            });
            closeModal();
            toast(`Country "${name}" added`);
            state.tree = null;
            countries = await api.listCountries(brand.id);
            render();
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    render();
}
