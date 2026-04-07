registerPage('groups', async (container) => {
    if (!state.currentOrg) {
        container.innerHTML = '<div class="empty-state"><h4>No organisation selected</h4></div>';
        return;
    }

    const tree = await loadTree();
    const groups = tree ? tree.groups.filter(g => !g.is_default) : [];
    const allBrands = tree ? tree.brands : [];
    const countries = tree ? tree.countries : [];
    const les = tree ? tree.legal_entities : [];

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3>Groups (${groups.length})</h3>
            <button class="btn btn-primary" onclick="window._grpShowAdd()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Group
            </button>
        </div>
        ${groups.length === 0 ? '<div class="card"><div class="card-body"><div class="empty-state"><h4>No groups yet</h4></div></div></div>' :
        groups.map(g => {
            const gBrands = allBrands.filter(b => b.group_id === g.id);
            return `
            <div class="card" style="margin-bottom:16px;">
                <div class="card-header">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <h3>${g.name}</h3>
                        <span class="badge badge-green">${g.status || 'active'}</span>
                    </div>
                    <div class="flex gap-3">
                        <button class="btn btn-sm btn-outline" onclick="window._grpAddBrand('${g.id}')">+ Add Brand</button>
                        <button class="btn btn-sm btn-primary" onclick="window._grpEdit('${g.id}')">Edit</button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px;">
                        <div>
                            <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Tax Number</label>
                            <div>${g.tax_number || '<span class="text-muted">--</span>'}</div>
                        </div>
                        <div>
                            <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Address</label>
                            <div>${g.address || '<span class="text-muted">--</span>'}</div>
                        </div>
                        <div>
                            <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Owner Names</label>
                            <div>${g.owner_names || '<span class="text-muted">--</span>'}</div>
                        </div>
                    </div>
                    <div style="border-top:1px solid #E2E8F0;padding-top:12px;">
                        <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Brands (${gBrands.length})</label>
                        ${gBrands.length === 0 ? '<p class="text-muted text-sm">No brands assigned to this group</p>' : `
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
                            ${gBrands.map(b => `
                                <span class="badge badge-blue" style="padding:6px 12px;display:inline-flex;align-items:center;gap:6px;">
                                    ${b.name}
                                    <span style="cursor:pointer;opacity:0.6;font-size:14px;" onclick="window._grpRemoveBrand('${b.id}','${g.id}','${b.name}')" title="Remove from group">&times;</span>
                                </span>
                            `).join('')}
                        </div>
                        `}
                    </div>
                </div>
            </div>`;
        }).join('')}
    `;

    window._grpAddBrand = (grpId) => {
        const grp = groups.find(g => g.id === grpId);
        const assignedIds = new Set(allBrands.filter(b => b.group_id === grpId).map(b => b.id));
        const unassigned = allBrands.filter(b => !b.group_id || b.group_id === grpId);

        openModal(`
            <div class="modal-header">
                <h3>Add Brands to ${grp.name}</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Select brands to assign</label>
                    <div style="max-height:300px;overflow-y:auto;border:1px solid #E2E8F0;border-radius:8px;padding:8px;">
                        ${allBrands.map(b => {
                            const inThisGroup = b.group_id === grpId;
                            const inOtherGroup = b.group_id && b.group_id !== grpId;
                            const otherGroup = inOtherGroup ? groups.find(g => g.id === b.group_id) : null;
                            return `
                            <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:${inOtherGroup ? 'not-allowed' : 'pointer'};${inOtherGroup ? 'opacity:0.5;' : ''}">
                                <input type="checkbox" class="addBrandToGrpCheck" value="${b.id}" ${inThisGroup ? 'checked' : ''} ${inOtherGroup ? 'disabled' : ''}>
                                ${b.name}
                                ${inOtherGroup ? `<span class="text-muted text-sm">(in ${otherGroup ? otherGroup.name : 'another group'})</span>` : ''}
                            </label>`;
                        }).join('')}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="window._grpSubmitAddBrand('${grpId}')">Save</button>
            </div>
        `);
    };

    window._grpSubmitAddBrand = async (grpId) => {
        const checkedIds = new Set(Array.from(document.querySelectorAll('.addBrandToGrpCheck:checked')).map(cb => cb.value));
        const currentIds = new Set(allBrands.filter(b => b.group_id === grpId).map(b => b.id));

        try {
            // Add newly checked brands
            for (const bId of checkedIds) {
                if (!currentIds.has(bId)) {
                    await api.updateBrand(bId, { group_id: grpId });
                }
            }
            // Remove unchecked brands
            for (const bId of currentIds) {
                if (!checkedIds.has(bId)) {
                    await api.updateBrand(bId, { group_id: null });
                }
            }
            closeModal();
            toast('Brands updated');
            state.tree = null;
            navigate('groups');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    window._grpRemoveBrand = async (brandId, grpId, brandName) => {
        if (!confirm(`Remove "${brandName}" from this group?`)) return;
        try {
            await api.updateBrand(brandId, { group_id: null });
            toast(`"${brandName}" removed from group`);
            state.tree = null;
            navigate('groups');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

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
                <div class="form-group">
                    <label class="form-label">Brands</label>
                    <div style="max-height:150px;overflow-y:auto;border:1px solid #E2E8F0;border-radius:8px;padding:8px;">
                        ${allBrands.filter(b => !b.group_id).length === 0 ? '<p class="text-muted text-sm">All brands are already assigned to groups</p>' :
                        allBrands.filter(b => !b.group_id).map(b => `
                            <label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;">
                                <input type="checkbox" class="addGrpBrandCheck" value="${b.id}"> ${b.name}
                            </label>
                        `).join('')}
                    </div>
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
        const brandChecks = document.querySelectorAll('.addGrpBrandCheck:checked');
        const brandIds = Array.from(brandChecks).map(cb => cb.value);
        try {
            const grp = await api.createGroup({ name, organisation_id: state.currentOrg.id, tax_number, address, owner_names });
            // Assign selected brands to the new group
            for (const bId of brandIds) {
                await api.updateBrand(bId, { group_id: grp.id });
            }
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
