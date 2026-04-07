registerPage('organization', async (container) => {
    if (!state.currentOrg) {
        container.innerHTML = '<div class="empty-state"><h4>No organisation selected</h4></div>';
        return;
    }

    let org;
    try {
        org = await api.getOrg(state.currentOrg.id);
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><h4>Error loading organisation</h4><p>${e.message}</p></div>`;
        return;
    }

    const tree = await loadTree();
    const countries = tree ? tree.countries : [];
    const brands = tree ? tree.brands : [];
    const groups = tree ? tree.groups.filter(g => !g.is_default) : [];
    const brandMap = {};
    brands.forEach(b => brandMap[b.id] = b.name);

    let editing = false;

    function render() {
        const statusClass = org.status === 'active' ? 'badge-green' : org.status === 'suspended' ? 'badge-red' : 'badge-amber';

        if (!editing) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3>Organisation Details</h3>
                        <button class="btn btn-sm btn-primary" onclick="window._orgStartEdit()">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                        </button>
                    </div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Name</label>
                                <div style="font-size:16px;font-weight:600;">${org.name}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Status</label>
                                <div><span class="badge ${statusClass}">${org.status || 'active'}</span></div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Billing Email</label>
                                <div>${org.billing_email || '<span class="text-muted">Not set</span>'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">SSO Enabled</label>
                                <div><span class="badge ${org.sso_enabled ? 'badge-green' : 'badge-gray'}">${org.sso_enabled ? 'Yes' : 'No'}</span></div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Data Residency Region</label>
                                <div>${org.data_residency_region || '<span class="text-muted">Default</span>'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Created</label>
                                <div>${fmtDate(org.created_at)}</div>
                            </div>
                        </div>
                        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E2E8F0;">
                            <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Organisation ID</label>
                            <div class="font-mono text-sm text-muted">${org.id}</div>
                        </div>
                    </div>
                </div>

                <!-- Countries -->
                <div class="card mt-4" style="margin-top:24px;">
                    <div class="card-header">
                        <h3>Countries</h3>
                        <button class="btn btn-sm btn-primary" onclick="window._orgAddCountry()">+ Add Country</button>
                    </div>
                    <div class="card-body" style="padding:0;">
                        ${countries.length === 0 ? '<div class="empty-state"><h4>No countries yet</h4></div>' : `
                        <table class="data-table">
                            <thead><tr><th>Name</th><th>ISO Code</th><th>Currency</th></tr></thead>
                            <tbody>
                                ${(() => {
                                    const seen = new Set();
                                    return countries.filter(c => {
                                        if (seen.has(c.iso_code)) return false;
                                        seen.add(c.iso_code);
                                        return true;
                                    }).map(c => `<tr>
                                        <td><strong>${c.name}</strong></td>
                                        <td>${c.iso_code || '--'}</td>
                                        <td>${c.currency_code || '--'}</td>
                                    </tr>`).join('');
                                })()}
                            </tbody>
                        </table>
                        `}
                    </div>
                </div>

                <!-- Groups -->
                <div class="card mt-4" style="margin-top:24px;">
                    <div class="card-header">
                        <h3>Groups</h3>
                        <button class="btn btn-sm btn-primary" onclick="window._orgAddGroup()">+ Add Group</button>
                    </div>
                    <div class="card-body" style="padding:0;">
                        ${groups.length === 0 ? '<div class="empty-state"><h4>No groups yet</h4></div>' : `
                        <table class="data-table">
                            <thead><tr><th>Name</th><th>Status</th><th>Created</th></tr></thead>
                            <tbody>
                                ${groups.map(g => `<tr>
                                    <td><strong>${g.name}</strong></td>
                                    <td><span class="badge badge-green">${g.status || 'active'}</span></td>
                                    <td class="text-sm text-muted">${fmtDate(g.created_at)}</td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                        `}
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3>Edit Organisation</h3>
                        <div class="flex gap-3">
                            <button class="btn btn-sm btn-secondary" onclick="window._orgCancelEdit()">Cancel</button>
                            <button class="btn btn-sm btn-primary" onclick="window._orgSaveEdit()">Save Changes</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
                            <div class="form-group">
                                <label class="form-label">Name</label>
                                <input class="form-input" id="orgEditName" value="${org.name || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Status</label>
                                <select class="form-select" id="orgEditStatus">
                                    <option value="active" ${org.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="suspended" ${org.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                                    <option value="inactive" ${org.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Billing Email</label>
                                <input class="form-input" id="orgEditEmail" type="email" value="${org.billing_email || ''}" placeholder="billing@company.com">
                            </div>
                            <div class="form-group">
                                <label class="form-label">SSO Enabled</label>
                                <select class="form-select" id="orgEditSSO">
                                    <option value="true" ${org.sso_enabled ? 'selected' : ''}>Yes</option>
                                    <option value="false" ${!org.sso_enabled ? 'selected' : ''}>No</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Data Residency Region</label>
                                <select class="form-select" id="orgEditRegion">
                                    <option value="" ${!org.data_residency_region ? 'selected' : ''}>Default</option>
                                    <option value="me" ${org.data_residency_region === 'me' ? 'selected' : ''}>Middle East</option>
                                    <option value="eu" ${org.data_residency_region === 'eu' ? 'selected' : ''}>Europe</option>
                                    <option value="us" ${org.data_residency_region === 'us' ? 'selected' : ''}>United States</option>
                                    <option value="apac" ${org.data_residency_region === 'apac' ? 'selected' : ''}>Asia Pacific</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Created</label>
                                <div style="padding:8px 0;">${fmtDate(org.created_at)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    window._orgStartEdit = () => { editing = true; render(); };
    window._orgCancelEdit = () => { editing = false; render(); };

    window._orgSaveEdit = async () => {
        const data = {
            name: document.getElementById('orgEditName').value,
            billing_email: document.getElementById('orgEditEmail').value || null,
            sso_enabled: document.getElementById('orgEditSSO').value === 'true',
            data_residency_region: document.getElementById('orgEditRegion').value || null,
            status: document.getElementById('orgEditStatus').value,
        };
        if (!data.name) { toast('Name is required', 'error'); return; }
        try {
            org = await api.updateOrg(org.id, data);
            state.currentOrg.name = org.name;
            document.getElementById('currentOrgName').textContent = org.name;
            editing = false;
            render();
            toast('Organisation updated');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    window._orgAddCountry = () => {
        openModal(`
            <div class="modal-header">
                <h3>Add Country</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Name *</label>
                    <input class="form-input" id="addCountryName" placeholder="Country name">
                </div>
                <div class="form-group">
                    <label class="form-label">ISO Code *</label>
                    <input class="form-input" id="addCountryISO" maxlength="3" placeholder="SAU">
                </div>
                <div class="form-group">
                    <label class="form-label">Currency Code</label>
                    <input class="form-input" id="addCountryCurrency" placeholder="SAR">
                </div>
                <div class="form-group">
                    <label class="form-label">Brand *</label>
                    <select class="form-select" id="addCountryBrand">
                        <option value="">Select brand...</option>
                        ${brands.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="window._orgSubmitCountry()">Create</button>
            </div>
        `);
    };

    window._orgSubmitCountry = async () => {
        const name = document.getElementById('addCountryName').value;
        const iso_code = document.getElementById('addCountryISO').value;
        const currency_code = document.getElementById('addCountryCurrency').value || null;
        const brand_id = document.getElementById('addCountryBrand').value;
        if (!name) { toast('Name is required', 'error'); return; }
        if (!iso_code) { toast('ISO Code is required', 'error'); return; }
        if (!brand_id) { toast('Brand is required', 'error'); return; }
        try {
            await api.createCountry({ name, iso_code, brand_id, currency_code });
            closeModal();
            toast(`Country "${name}" created`);
            state.tree = null;
            navigate('organization');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    window._orgAddGroup = () => {
        openModal(`
            <div class="modal-header">
                <h3>Add Group</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Group Name *</label>
                    <input class="form-input" id="addOrgGroupName" placeholder="Group name">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="window._orgSubmitGroup()">Create</button>
            </div>
        `);
    };

    window._orgSubmitGroup = async () => {
        const name = document.getElementById('addOrgGroupName').value;
        if (!name) { toast('Name is required', 'error'); return; }
        try {
            await api.createGroup({ name, organisation_id: state.currentOrg.id });
            closeModal();
            toast(`Group "${name}" created`);
            state.tree = null;
            navigate('organization');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    render();
});
