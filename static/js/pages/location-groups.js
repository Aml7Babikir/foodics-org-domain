registerPage('location-groups', async (container) => {
    if (!state.currentOrg) {
        container.innerHTML = '<div class="empty-state"><h4>No organisation selected</h4></div>';
        return;
    }

    const params = state.pageParams || {};

    if (params.lgId || params.id) {
        await renderLGDetail(container, params.lgId || params.id);
    } else {
        await renderLGList(container);
    }
});

async function renderLGList(container) {
    const tree = await loadTree();
    const lgs = tree ? tree.location_groups : [];
    const les = tree ? tree.legal_entities : [];
    const locs = tree ? tree.locations : [];
    const leMap = {};
    les.forEach(le => leMap[le.id] = le.name);

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3>Location Groups (${lgs.length})</h3>
            <button class="btn btn-primary" onclick="window._lgShowAdd()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Location Group
            </button>
        </div>
        <div class="card">
            <div class="card-body" style="padding:0;">
                ${lgs.length === 0 ? '<div class="empty-state"><h4>No location groups yet</h4></div>' : `
                <table class="data-table">
                    <thead><tr><th>Name</th><th>Legal Entity</th><th>Locations</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${lgs.map(lg => {
                            const lgLocs = locs.filter(l => l.location_group_id === lg.id);
                            return `<tr>
                                <td><strong>${lg.name}</strong></td>
                                <td>${leMap[lg.legal_entity_id] || '--'}</td>
                                <td>${lgLocs.length} location${lgLocs.length !== 1 ? 's' : ''}</td>
                                <td><span class="badge badge-green">${lg.status || 'active'}</span></td>
                                <td><button class="btn btn-sm btn-outline" onclick="navigate('location-groups', {lgId: '${lg.id}'})">View</button></td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
                `}
            </div>
        </div>
    `;

    window._lgShowAdd = () => {
        openModal(`
            <div class="modal-header">
                <h3>Add Location Group</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Group Name *</label>
                    <input class="form-input" id="addLGName" placeholder="Location group name">
                </div>
                <div class="form-group">
                    <label class="form-label">Legal Entity *</label>
                    <select class="form-select" id="addLGLE">
                        <option value="">Select legal entity...</option>
                        ${les.map(le => `<option value="${le.id}">${le.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Locations *</label>
                    <div style="max-height:200px;overflow-y:auto;border:1px solid #E2E8F0;border-radius:8px;padding:8px;">
                        ${locs.length === 0 ? '<p class="text-muted text-sm">No locations available</p>' :
                        locs.map(l => `
                            <label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;">
                                <input type="checkbox" class="addLGLocCheck" value="${l.id}"> ${l.name}
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="window._lgSubmitAdd()">Create</button>
            </div>
        `);
    };

    window._lgSubmitAdd = async () => {
        const name = document.getElementById('addLGName').value;
        const leId = document.getElementById('addLGLE').value;
        if (!name) { toast('Name is required', 'error'); return; }
        if (!leId) { toast('Legal Entity is required', 'error'); return; }
        const locChecks = document.querySelectorAll('.addLGLocCheck:checked');
        if (locChecks.length === 0) { toast('At least one location is required', 'error'); return; }
        try {
            const lg = await api.createLG({ name, legal_entity_id: leId });
            const locIds = Array.from(locChecks).map(cb => cb.value);
            for (const locId of locIds) {
                await api.updateLocation(locId, { location_group_id: lg.id });
            }
            closeModal();
            toast(`Location group "${name}" created`);
            state.tree = null;
            navigate('location-groups');
        } catch (e) {
            toast(e.message, 'error');
        }
    };
}

async function renderLGDetail(container, lgId) {
    const tree = await loadTree();
    const les = tree ? tree.legal_entities : [];
    const allLocs = tree ? tree.locations : [];
    const leMap = {};
    les.forEach(le => leMap[le.id] = le.name);

    let lg;
    try {
        lg = await api.getLG(lgId);
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><h4>Error loading location group</h4><p>${e.message}</p></div>`;
        return;
    }

    const lgLocs = allLocs.filter(l => l.location_group_id === lg.id);
    let editing = false;

    function render() {
        if (!editing) {
            container.innerHTML = `
                <div style="margin-bottom:16px;">
                    <button class="btn btn-secondary" onclick="navigate('location-groups')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        Back to Location Groups
                    </button>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <h3>${lg.name}</h3>
                            <span class="badge badge-green">${lg.status || 'active'}</span>
                        </div>
                        <button class="btn btn-sm btn-primary" onclick="window._lgStartEdit()">Edit</button>
                    </div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;">
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Group Name</label>
                                <div style="font-size:16px;font-weight:600;">${lg.name}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Legal Entity</label>
                                <div>${leMap[lg.legal_entity_id] || '--'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Created</label>
                                <div>${fmtDate(lg.created_at)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Locations -->
                <div class="card mt-4">
                    <div class="card-header">
                        <h3>Locations (${lgLocs.length})</h3>
                    </div>
                    <div class="card-body" style="padding:0;">
                        ${lgLocs.length === 0 ? '<div class="empty-state"><p>No locations in this group.</p></div>' : `
                        <table class="data-table">
                            <thead><tr><th>Name</th><th>City</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                ${lgLocs.map(l => `<tr>
                                    <td><strong>${l.name}</strong></td>
                                    <td>${l.city || '--'}</td>
                                    <td>${l.location_type ? `<span class="badge badge-gray">${l.location_type}</span>` : '--'}</td>
                                    <td><span class="badge badge-green">${l.status || 'active'}</span></td>
                                    <td><button class="btn btn-sm btn-outline" onclick="navigate('locations', {locationId: '${l.id}'})">View</button></td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                        `}
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="margin-bottom:16px;">
                    <button class="btn btn-secondary" onclick="window._lgCancelEdit()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        Cancel Edit
                    </button>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3>Edit Location Group</h3>
                        <button class="btn btn-sm btn-primary" onclick="window._lgSaveEdit()">Save Changes</button>
                    </div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
                            <div class="form-group">
                                <label class="form-label">Group Name *</label>
                                <input class="form-input" id="lgEditName" value="${lg.name}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Legal Entity</label>
                                <select class="form-select" id="lgEditLE">
                                    ${les.map(le => `<option value="${le.id}" ${lg.legal_entity_id === le.id ? 'selected' : ''}>${le.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-group" style="margin-top:16px;">
                            <label class="form-label">Locations</label>
                            <div style="max-height:250px;overflow-y:auto;border:1px solid #E2E8F0;border-radius:8px;padding:8px;">
                                ${allLocs.map(l => `
                                    <label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;">
                                        <input type="checkbox" class="editLGLocCheck" value="${l.id}" ${l.location_group_id === lg.id ? 'checked' : ''}> ${l.name}
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    window._lgStartEdit = () => { editing = true; render(); };
    window._lgCancelEdit = () => { editing = false; render(); };

    window._lgSaveEdit = async () => {
        const name = document.getElementById('lgEditName').value;
        if (!name) { toast('Name is required', 'error'); return; }
        const leId = document.getElementById('lgEditLE').value;

        try {
            await api.updateLG(lg.id, { name });

            // Update location assignments
            const checkedIds = new Set(Array.from(document.querySelectorAll('.editLGLocCheck:checked')).map(cb => cb.value));
            const currentIds = new Set(lgLocs.map(l => l.id));

            // Add newly checked locations to this LG
            for (const locId of checkedIds) {
                if (!currentIds.has(locId)) {
                    await api.updateLocation(locId, { location_group_id: lg.id });
                }
            }
            // Remove unchecked locations from this LG
            for (const locId of currentIds) {
                if (!checkedIds.has(locId)) {
                    await api.updateLocation(locId, { location_group_id: null });
                }
            }

            toast('Location group updated');
            state.tree = null;
            navigate('location-groups', { lgId: lg.id });
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    render();
}
