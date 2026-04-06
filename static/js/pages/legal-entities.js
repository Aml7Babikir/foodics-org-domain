registerPage('legal-entities', async (container) => {
    if (!state.currentOrg) {
        container.innerHTML = '<div class="empty-state"><h4>No organisation selected</h4></div>';
        return;
    }

    const orgId = state.currentOrg.id;
    const params = state.pageParams || {};

    if (params.leId || params.id) {
        await renderLEDetail(container, params.leId || params.id);
    } else {
        await renderLEList(container, orgId);
    }
});

async function renderLEList(container, orgId) {
    let entities;
    try {
        entities = await api.listLEsByOrg(orgId);
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><h4>Error loading legal entities</h4><p>${e.message}</p></div>`;
        return;
    }

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3>Legal Entities (${entities.length})</h3>
            <button class="btn btn-primary" onclick="window._leShowAddModal()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Legal Entity
            </button>
        </div>
        <div class="card">
            <div class="card-body" style="padding:0;">
                ${entities.length === 0 ? '<div class="empty-state"><h4>No legal entities yet</h4><p>Create your first legal entity.</p></div>' : `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Currency</th>
                            <th>Tax Mode</th>
                            <th>Franchise</th>
                            <th>VAT Number</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entities.map(le => {
                            const statusClass = le.status === 'active' ? 'badge-green' : le.status === 'suspended' ? 'badge-red' : 'badge-amber';
                            return `
                            <tr>
                                <td><strong>${le.name}</strong></td>
                                <td><span class="badge badge-blue">${le.currency_code || '--'}</span></td>
                                <td>${le.tax_mode || '--'}</td>
                                <td>${le.is_franchise ? '<span class="badge badge-amber">Yes</span>' : '<span class="badge badge-gray">No</span>'}</td>
                                <td class="font-mono text-sm">${le.vat_registration_number || '--'}</td>
                                <td><span class="badge ${statusClass}">${le.status || 'active'}</span></td>
                                <td>
                                    <button class="btn btn-sm btn-outline" onclick="navigate('legal-entities', {leId: '${le.id}'})">View</button>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
                `}
            </div>
        </div>
    `;

    window._leShowAddModal = async () => {
        const tree = await loadTree();
        const countries = tree ? tree.countries : [];
        const brands = tree ? tree.brands : [];

        openModal(`
            <div class="modal-header">
                <h3>Add Legal Entity</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Name</label>
                    <input class="form-input" id="addLEName" placeholder="Legal entity name">
                </div>
                <div class="form-group">
                    <label class="form-label">Country</label>
                    <select class="form-select" id="addLECountry">
                        <option value="">Select country...</option>
                        ${countries.map(c => `<option value="${c.id}">${c.name} (${c.iso_code})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Brands (select one or more)</label>
                    <div id="addLEBrandsContainer" style="max-height:150px;overflow-y:auto;border:1px solid #E2E8F0;border-radius:8px;padding:8px;">
                        ${brands.map(b => `
                            <label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;">
                                <input type="checkbox" class="addLEBrandCheck" value="${b.id}"> ${b.name}
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div class="form-group">
                        <label class="form-label">Currency Code</label>
                        <input class="form-input" id="addLECurrency" placeholder="SAR" value="SAR">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tax Mode</label>
                        <select class="form-select" id="addLETaxMode">
                            <option value="inclusive">Inclusive</option>
                            <option value="exclusive">Exclusive</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">VAT Registration Number</label>
                    <input class="form-input" id="addLEVAT" placeholder="310200000000003">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div class="form-group">
                        <label class="form-label">Franchise?</label>
                        <select class="form-select" id="addLEFranchise">
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Owner Name (if franchise)</label>
                        <input class="form-input" id="addLEOwner" placeholder="e.g. Al-Nakheel Group">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="window._leSubmitAdd()">Create</button>
            </div>
        `);
    };

    window._leSubmitAdd = async () => {
        const name = document.getElementById('addLEName').value;
        const countryId = document.getElementById('addLECountry').value;
        if (!name) { toast('Name is required', 'error'); return; }
        if (!countryId) { toast('Country is required', 'error'); return; }

        const brandChecks = document.querySelectorAll('.addLEBrandCheck:checked');
        const brandIds = Array.from(brandChecks).map(cb => cb.value);

        const data = {
            name,
            organisation_id: orgId,
            country_id: countryId,
            brand_ids: brandIds,
            currency_code: document.getElementById('addLECurrency').value || 'SAR',
            tax_mode: document.getElementById('addLETaxMode').value,
            vat_registration_number: document.getElementById('addLEVAT').value || null,
            is_franchise: document.getElementById('addLEFranchise').value === 'true',
            owner_name: document.getElementById('addLEOwner').value || null,
        };

        try {
            await api.createLE(data);
            closeModal();
            toast(`Legal entity "${name}" created`);
            state.tree = null;
            navigate('legal-entities');
        } catch (e) {
            toast(e.message, 'error');
        }
    };
}

async function renderLEDetail(container, leId) {
    let le, brands, bus, lgs;
    try {
        le = await api.getLE(leId);
        brands = await api.getLEBrands(leId);
        bus = await api.listBUs(leId);
        lgs = await api.listLGs(leId);
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><h4>Error loading legal entity</h4><p>${e.message}</p></div>`;
        return;
    }

    let editing = false;

    function render() {
        const statusClass = le.status === 'active' ? 'badge-green' : le.status === 'suspended' ? 'badge-red' : 'badge-amber';

        if (!editing) {
            container.innerHTML = `
                <div style="margin-bottom:16px;">
                    <button class="btn btn-secondary" onclick="navigate('legal-entities')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        Back to Legal Entities
                    </button>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <h3>${le.name}</h3>
                            <span class="badge ${statusClass}">${le.status || 'active'}</span>
                            ${le.is_franchise ? '<span class="badge badge-amber">Franchise</span>' : ''}
                        </div>
                        <div class="flex gap-3">
                            <button class="btn btn-sm btn-primary" onclick="window._leStartEdit()">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="window._leDelete()">Delete</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;">
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">LE ID</label>
                                <div class="font-mono text-sm">${le.id}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Country</label>
                                <div>${le.country_name || le.country_id || '--'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Currency</label>
                                <div><span class="badge badge-blue">${le.currency_code || '--'}</span></div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Tax Mode</label>
                                <div>${le.tax_mode || '--'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">VAT Registration Number</label>
                                <div class="font-mono">${le.vat_registration_number || '<span class="text-muted">Not set</span>'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Owner Name</label>
                                <div>${le.owner_name || '<span class="text-muted">N/A</span>'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Created</label>
                                <div>${fmtDate(le.created_at)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Linked Brands -->
                <div class="card mt-4">
                    <div class="card-header">
                        <h3>Linked Brands (${brands.length})</h3>
                    </div>
                    <div class="card-body">
                        ${brands.length === 0 ? '<p class="text-muted">No brands linked.</p>' : `
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            ${brands.map(b => `
                                <span class="badge badge-blue" style="cursor:pointer;padding:6px 12px;" onclick="navigate('brands', {brandId: '${b.id}'})">
                                    ${b.name}
                                </span>
                            `).join('')}
                        </div>
                        `}
                    </div>
                </div>

                <!-- Business Units -->
                <div class="card mt-4">
                    <div class="card-header">
                        <h3>Business Units (${bus.length})</h3>
                    </div>
                    <div class="card-body" style="padding:0;">
                        ${bus.length === 0 ? '<div class="empty-state"><p>No business units.</p></div>' : `
                        <table class="data-table">
                            <thead><tr><th>Name</th><th>ID</th><th>Created</th></tr></thead>
                            <tbody>
                                ${bus.map(bu => `
                                    <tr>
                                        <td><strong>${bu.name}</strong></td>
                                        <td class="font-mono text-sm text-muted">${truncId(bu.id)}</td>
                                        <td class="text-sm text-muted">${fmtDate(bu.created_at)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        `}
                    </div>
                </div>

                <!-- Location Groups -->
                <div class="card mt-4">
                    <div class="card-header">
                        <h3>Location Groups (${lgs.length})</h3>
                    </div>
                    <div class="card-body" style="padding:0;">
                        ${lgs.length === 0 ? '<div class="empty-state"><p>No location groups.</p></div>' : `
                        <table class="data-table">
                            <thead><tr><th>Name</th><th>ID</th><th>Created</th></tr></thead>
                            <tbody>
                                ${lgs.map(lg => `
                                    <tr>
                                        <td><strong>${lg.name}</strong></td>
                                        <td class="font-mono text-sm text-muted">${truncId(lg.id)}</td>
                                        <td class="text-sm text-muted">${fmtDate(lg.created_at)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        `}
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="margin-bottom:16px;">
                    <button class="btn btn-secondary" onclick="window._leCancelEdit()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        Cancel Edit
                    </button>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3>Edit Legal Entity</h3>
                        <button class="btn btn-sm btn-primary" onclick="window._leSaveEdit()">Save Changes</button>
                    </div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
                            <div class="form-group">
                                <label class="form-label">Name</label>
                                <input class="form-input" id="leEditName" value="${le.name || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Status</label>
                                <select class="form-select" id="leEditStatus">
                                    <option value="active" ${le.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="suspended" ${le.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                                    <option value="inactive" ${le.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Currency Code</label>
                                <input class="form-input" id="leEditCurrency" value="${le.currency_code || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Tax Mode</label>
                                <select class="form-select" id="leEditTaxMode">
                                    <option value="inclusive" ${le.tax_mode === 'inclusive' ? 'selected' : ''}>Inclusive</option>
                                    <option value="exclusive" ${le.tax_mode === 'exclusive' ? 'selected' : ''}>Exclusive</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">VAT Registration Number</label>
                                <input class="form-input" id="leEditVAT" value="${le.vat_registration_number || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Franchise?</label>
                                <select class="form-select" id="leEditFranchise">
                                    <option value="false" ${!le.is_franchise ? 'selected' : ''}>No</option>
                                    <option value="true" ${le.is_franchise ? 'selected' : ''}>Yes</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Owner Name</label>
                                <input class="form-input" id="leEditOwner" value="${le.owner_name || ''}" placeholder="e.g. Al-Nakheel Group">
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    window._leStartEdit = () => { editing = true; render(); };
    window._leCancelEdit = () => { editing = false; render(); };

    window._leSaveEdit = async () => {
        const data = {
            name: document.getElementById('leEditName').value,
            status: document.getElementById('leEditStatus').value,
            currency_code: document.getElementById('leEditCurrency').value || null,
            tax_mode: document.getElementById('leEditTaxMode').value,
            vat_registration_number: document.getElementById('leEditVAT').value || null,
            is_franchise: document.getElementById('leEditFranchise').value === 'true',
            owner_name: document.getElementById('leEditOwner').value || null,
        };
        if (!data.name) { toast('Name is required', 'error'); return; }
        try {
            le = await api.updateLE(le.id, data);
            editing = false;
            state.tree = null;
            render();
            toast('Legal entity updated');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    window._leDelete = async () => {
        if (!confirm(`Are you sure you want to delete legal entity "${le.name}"?`)) return;
        try {
            await api.deleteLE(le.id);
            toast(`Legal entity "${le.name}" deleted`);
            state.tree = null;
            navigate('legal-entities');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    render();
}
