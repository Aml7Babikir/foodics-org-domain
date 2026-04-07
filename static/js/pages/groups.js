registerPage('groups', async (container) => {
    if (!state.currentOrg) {
        container.innerHTML = '<div class="empty-state"><h4>No organisation selected</h4></div>';
        return;
    }

    const tree = await loadTree();
    const groups = tree ? tree.groups.filter(g => !g.is_default) : [];
    const countries = tree ? tree.countries : [];
    const brands = tree ? tree.brands : [];
    const les = tree ? tree.legal_entities : [];

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3>Groups (${groups.length})</h3>
            <button class="btn btn-primary" onclick="window._grpShowAdd()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Group
            </button>
        </div>
        <div class="card">
            <div class="card-body" style="padding:0;">
                ${groups.length === 0 ? '<div class="empty-state"><h4>No groups yet</h4></div>' : `
                <table class="data-table">
                    <thead><tr><th>Name</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${groups.map(g => `<tr>
                            <td><strong>${g.name}</strong></td>
                            <td><span class="badge badge-green">${g.status || 'active'}</span></td>
                            <td>${fmtDate(g.created_at)}</td>
                            <td><button class="btn btn-sm btn-outline" onclick="window._grpEdit('${g.id}')">Edit</button></td>
                        </tr>`).join('')}
                    </tbody>
                </table>
                `}
            </div>
        </div>
    `;

    window._grpShowAdd = () => {
        openModal(`
            <div class="modal-header">
                <h3>Add Group</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Group Name *</label>
                    <input class="form-input" id="addGrpName" placeholder="Group name">
                </div>
                <div class="form-group">
                    <label class="form-label">Countries *</label>
                    <div style="max-height:150px;overflow-y:auto;border:1px solid #E2E8F0;border-radius:8px;padding:8px;">
                        ${countries.length === 0 ? '<p class="text-muted text-sm">No countries available</p>' :
                        countries.map(c => `
                            <label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;">
                                <input type="checkbox" class="addGrpCountryCheck" value="${c.id}"> ${c.name} (${c.iso_code || ''})
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Brands *</label>
                    <div style="max-height:150px;overflow-y:auto;border:1px solid #E2E8F0;border-radius:8px;padding:8px;">
                        ${brands.length === 0 ? '<p class="text-muted text-sm">No brands available</p>' :
                        brands.map(b => `
                            <label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;">
                                <input type="checkbox" class="addGrpBrandCheck" value="${b.id}"> ${b.name}
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Legal Entities</label>
                    <div style="max-height:150px;overflow-y:auto;border:1px solid #E2E8F0;border-radius:8px;padding:8px;">
                        ${les.length === 0 ? '<p class="text-muted text-sm">No legal entities available</p>' :
                        les.map(le => `
                            <label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;">
                                <input type="checkbox" class="addGrpLECheck" value="${le.id}"> ${le.name}
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Tax Number</label>
                    <input class="form-input" id="addGrpTaxNumber" placeholder="Tax number">
                </div>
                <div class="form-group">
                    <label class="form-label">Address</label>
                    <input class="form-input" id="addGrpAddress" placeholder="Address">
                </div>
                <div class="form-group">
                    <label class="form-label">Owner Names</label>
                    <input class="form-input" id="addGrpOwnerNames" placeholder="Owner names">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="window._grpSubmitAdd()">Create</button>
            </div>
        `);
    };

    window._grpSubmitAdd = async () => {
        const name = document.getElementById('addGrpName').value;
        const tax_number = document.getElementById('addGrpTaxNumber').value || null;
        const address = document.getElementById('addGrpAddress').value || null;
        const owner_names = document.getElementById('addGrpOwnerNames').value || null;
        if (!name) { toast('Name is required', 'error'); return; }
        const countryChecks = document.querySelectorAll('.addGrpCountryCheck:checked');
        if (countryChecks.length === 0) { toast('At least one country is required', 'error'); return; }
        const brandChecks = document.querySelectorAll('.addGrpBrandCheck:checked');
        if (brandChecks.length === 0) { toast('At least one brand is required', 'error'); return; }
        try {
            await api.createGroup({ name, organisation_id: state.currentOrg.id, tax_number, address, owner_names });
            closeModal();
            toast(`Group "${name}" created`);
            state.tree = null;
            navigate('groups');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    window._grpEdit = (grpId) => {
        const grp = groups.find(g => g.id === grpId);
        if (!grp) return;
        openModal(`
            <div class="modal-header">
                <h3>Edit Group</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Name</label>
                    <input class="form-input" id="editGrpName" value="${grp.name || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Tax Number</label>
                    <input class="form-input" id="editGrpTaxNumber" value="${grp.tax_number || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Address</label>
                    <input class="form-input" id="editGrpAddress" value="${grp.address || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Owner Names</label>
                    <input class="form-input" id="editGrpOwnerNames" value="${grp.owner_names || ''}">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="window._grpSubmitEdit('${grpId}')">Save</button>
            </div>
        `);
    };

    window._grpSubmitEdit = async (grpId) => {
        const name = document.getElementById('editGrpName').value;
        const tax_number = document.getElementById('editGrpTaxNumber').value || null;
        const address = document.getElementById('editGrpAddress').value || null;
        const owner_names = document.getElementById('editGrpOwnerNames').value || null;
        if (!name) { toast('Name is required', 'error'); return; }
        try {
            await api.updateGroup(grpId, { name, tax_number, address, owner_names });
            closeModal();
            toast('Group updated');
            state.tree = null;
            navigate('groups');
        } catch (e) {
            toast(e.message, 'error');
        }
    };
});
