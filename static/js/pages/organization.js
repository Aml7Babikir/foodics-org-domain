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

    render();
});
