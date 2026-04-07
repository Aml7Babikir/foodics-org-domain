registerPage('locations', async (container) => {
    if (!state.currentOrg) {
        container.innerHTML = '<div class="empty-state"><h4>No organisation selected</h4></div>';
        return;
    }

    const params = state.pageParams || {};

    if (params.locationId || params.id) {
        await renderLocationDetail(container, params.locationId || params.id);
    } else {
        await renderLocationList(container);
    }
});

async function renderLocationList(container) {
    const tree = await loadTree();
    const brands = tree ? tree.brands : [];
    const legalEntities = tree ? tree.legal_entities : [];

    // Build lookup maps
    const brandMap = {};
    brands.forEach(b => brandMap[b.id] = b.name);
    const leMap = {};
    legalEntities.forEach(le => leMap[le.id] = le.name);
    const lgMap = {};
    if (tree) tree.location_groups.forEach(lg => lgMap[lg.id] = lg.name);

    let filterBrand = '';
    let filterLE = '';

    async function loadAndRender() {
        const queryParams = {};
        if (filterBrand) queryParams.brand_id = filterBrand;
        if (filterLE) queryParams.legal_entity_id = filterLE;
        // Always scope to current org
        queryParams.organisation_id = state.currentOrg.id;

        let locations;
        try {
            locations = await api.listLocations(queryParams);
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><h4>Error loading locations</h4><p>${e.message}</p></div>`;
            return;
        }

        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3>Locations (${locations.length})</h3>
                <button class="btn btn-primary" onclick="window._locShowAddModal()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Location
                </button>
            </div>

            <!-- Filters -->
            <div class="card" style="margin-bottom:16px;">
                <div class="card-body" style="padding:12px 16px;">
                    <div style="display:flex;gap:16px;align-items:center;">
                        <span style="font-size:13px;color:#64748B;font-weight:600;">Filters:</span>
                        <div class="form-group" style="margin:0;">
                            <select class="form-select" id="locFilterBrand" style="min-width:180px;" onchange="window._locApplyFilter()">
                                <option value="">All Brands</option>
                                ${brands.map(b => `<option value="${b.id}" ${filterBrand === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="margin:0;">
                            <select class="form-select" id="locFilterLE" style="min-width:180px;" onchange="window._locApplyFilter()">
                                <option value="">All Legal Entities</option>
                                ${legalEntities.map(le => `<option value="${le.id}" ${filterLE === le.id ? 'selected' : ''}>${le.name}</option>`).join('')}
                            </select>
                        </div>
                        ${(filterBrand || filterLE) ? '<button class="btn btn-sm btn-secondary" onclick="window._locClearFilters()">Clear</button>' : ''}
                    </div>
                </div>
            </div>

            <!-- Locations Table -->
            <div class="card">
                <div class="card-body" style="padding:0;">
                    ${locations.length === 0 ? '<div class="empty-state"><h4>No locations found</h4><p>Try adjusting filters or add a new location.</p></div>' : `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Brand</th>
                                <th>Legal Entity</th>
                                <th>Location Group</th>
                                <th>City</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${locations.map(loc => {
                                const statusClass = loc.status === 'active' ? 'badge-green' : loc.status === 'suspended' ? 'badge-red' : 'badge-amber';
                                return `
                                <tr>
                                    <td><strong>${loc.name}</strong></td>
                                    <td>${loc.brand_name || brandMap[loc.brand_id] || '<span class="text-muted">--</span>'}</td>
                                    <td>${loc.legal_entity_name || leMap[loc.legal_entity_id] || '<span class="text-muted">--</span>'}</td>
                                    <td>${loc.location_group_name || lgMap[loc.location_group_id] || '<span class="text-muted">--</span>'}</td>
                                    <td>${loc.city || '--'}</td>
                                    <td>${loc.location_type ? `<span class="badge badge-gray">${loc.location_type}</span>` : '--'}</td>
                                    <td><span class="badge ${statusClass}">${loc.status || 'active'}</span></td>
                                    <td>
                                        <button class="btn btn-sm btn-outline" onclick="navigate('locations', {locationId: '${loc.id}'})">View</button>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                    `}
                </div>
            </div>

            <!-- Location Groups Section -->
            <div class="card mt-4">
                <div class="card-header">
                    <h3>Location Groups (${tree ? tree.location_groups.length : 0})</h3>
                    <button class="btn btn-sm btn-primary" onclick="window._locShowAddLGModal()">+ Add Location Group</button>
                </div>
                <div class="card-body" style="padding:0;">
                    ${!tree || tree.location_groups.length === 0 ? '<div class="empty-state"><p>No location groups.</p></div>' : `
                    <table class="data-table">
                        <thead><tr><th>Name</th><th>Legal Entity</th><th>ID</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${tree.location_groups.map(lg => `
                                <tr>
                                    <td><strong>${lg.name}</strong></td>
                                    <td>${leMap[lg.legal_entity_id] || '--'}</td>
                                    <td class="font-mono text-sm text-muted">${truncId(lg.id)}</td>
                                    <td><button class="btn btn-sm btn-outline" onclick="window._locEditLG('${lg.id}', '${lg.name.replace(/'/g, "\\'")}', '${lg.legal_entity_id}')">Edit</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    `}
                </div>
            </div>
        `;
    }

    window._locApplyFilter = () => {
        filterBrand = document.getElementById('locFilterBrand').value;
        filterLE = document.getElementById('locFilterLE').value;
        loadAndRender();
    };

    window._locClearFilters = () => {
        filterBrand = '';
        filterLE = '';
        loadAndRender();
    };

    window._locShowAddModal = () => {
        openModal(`
            <div class="modal-header">
                <h3>Add Location</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="margin-top:16px;margin-bottom:8px;font-weight:600;font-size:14px;color:#1E293B;">Basic Info</div>
                <div class="form-group">
                    <label class="form-label">Name *</label>
                    <input class="form-input" id="addLocName" placeholder="e.g. Riyadh Park Branch">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div class="form-group">
                        <label class="form-label">Legal Entity *</label>
                        <select class="form-select" id="addLocLE">
                            <option value="">Select legal entity...</option>
                            ${legalEntities.map(le => `<option value="${le.id}">${le.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Brand *</label>
                        <select class="form-select" id="addLocBrand">
                            <option value="">Select brand...</option>
                            ${brands.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div class="form-group">
                        <label class="form-label">Reference</label>
                        <input class="form-input" id="addLocReference" placeholder="Unique branch reference/code">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Phone</label>
                        <input class="form-input" id="addLocPhone" placeholder="Contact number">
                    </div>
                </div>

                <div style="margin-top:16px;margin-bottom:8px;font-weight:600;font-size:14px;color:#1E293B;">Address</div>
                <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;">
                    <div class="form-group">
                        <label class="form-label">Address</label>
                        <input class="form-input" id="addLocAddress" placeholder="Street address">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Street Number</label>
                        <input class="form-input" id="addLocStreetNumber" placeholder="">
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div class="form-group">
                        <label class="form-label">City</label>
                        <input class="form-input" id="addLocCity" placeholder="City">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Country</label>
                        <input class="form-input" id="addLocCountry" placeholder="Country">
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div class="form-group">
                        <label class="form-label">Latitude</label>
                        <input class="form-input" id="addLocLat" type="number" step="any" placeholder="24.7136">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Longitude</label>
                        <input class="form-input" id="addLocLng" type="number" step="any" placeholder="46.6753">
                    </div>
                </div>

                <div style="margin-top:16px;margin-bottom:8px;font-weight:600;font-size:14px;color:#1E293B;">Location Group & Type</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div class="form-group">
                        <label class="form-label">Location Group</label>
                        <select class="form-select" id="addLocLG">
                            <option value="">None</option>
                            ${tree ? tree.location_groups.map(lg => `<option value="${lg.id}">${lg.name}</option>`).join('') : ''}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Location Type</label>
                        <select class="form-select" id="addLocType">
                            <option value="">Not specified</option>
                            <option value="dine_in">Dine In</option>
                            <option value="takeaway">Takeaway</option>
                            <option value="delivery">Delivery</option>
                            <option value="drive_through">Drive Through</option>
                            <option value="cloud_kitchen">Cloud Kitchen</option>
                            <option value="kiosk">Kiosk</option>
                        </select>
                    </div>
                </div>

                <div style="margin-top:16px;margin-bottom:8px;font-weight:600;font-size:14px;color:#1E293B;">Operating Hours</div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
                    <div class="form-group">
                        <label class="form-label">Opening From</label>
                        <input class="form-input" id="addLocOpeningFrom" type="time">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Opening To</label>
                        <input class="form-input" id="addLocOpeningTo" type="time">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Inventory End of Day Time</label>
                        <input class="form-input" id="addLocInventoryEod" type="time">
                    </div>
                </div>

                <div style="margin-top:16px;margin-bottom:8px;font-weight:600;font-size:14px;color:#1E293B;">Online & Reservations</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div class="form-group">
                        <label class="form-label">Receives Online Orders</label>
                        <select class="form-select" id="addLocOnlineOrders">
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Accepts Reservations</label>
                        <select class="form-select" id="addLocReservations">
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                        </select>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div class="form-group">
                        <label class="form-label">Reservation Duration</label>
                        <input class="form-input" id="addLocResDuration" type="number" placeholder="minutes">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Reservation Times</label>
                        <input class="form-input" id="addLocResTimes" placeholder="e.g. 12:00, 13:00, 18:00, 19:00">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="window._locSubmitAdd()">Create</button>
            </div>
        `);
    };

    window._locSubmitAdd = async () => {
        const name = document.getElementById('addLocName').value;
        const brandId = document.getElementById('addLocBrand').value;
        const leId = document.getElementById('addLocLE').value;
        if (!name) { toast('Name is required', 'error'); return; }
        if (!brandId) { toast('Brand is required', 'error'); return; }
        if (!leId) { toast('Legal Entity is required', 'error'); return; }

        const resDurationVal = document.getElementById('addLocResDuration').value;

        const data = {
            name,
            brand_id: brandId,
            legal_entity_id: leId,
            location_group_id: document.getElementById('addLocLG').value || null,
            reference: document.getElementById('addLocReference').value || null,
            phone: document.getElementById('addLocPhone').value || null,
            address: document.getElementById('addLocAddress').value || null,
            street_number: document.getElementById('addLocStreetNumber').value || null,
            city: document.getElementById('addLocCity').value || null,
            country: document.getElementById('addLocCountry').value || null,
            latitude: document.getElementById('addLocLat').value ? parseFloat(document.getElementById('addLocLat').value) : null,
            longitude: document.getElementById('addLocLng').value ? parseFloat(document.getElementById('addLocLng').value) : null,
            location_type: document.getElementById('addLocType').value || null,
            opening_from: document.getElementById('addLocOpeningFrom').value || null,
            opening_to: document.getElementById('addLocOpeningTo').value || null,
            inventory_eod_time: document.getElementById('addLocInventoryEod').value || null,
            receives_online_orders: document.getElementById('addLocOnlineOrders').value === 'true',
            accepts_reservations: document.getElementById('addLocReservations').value === 'true',
            reservation_duration: resDurationVal ? parseInt(resDurationVal, 10) : null,
            reservation_times: document.getElementById('addLocResTimes').value || null,
        };

        try {
            await api.createLocation(data);
            closeModal();
            toast(`Location "${name}" created`);
            state.tree = null;
            navigate('locations');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    window._locShowAddLGModal = () => {
        openModal(`
            <div class="modal-header">
                <h3>Add Location Group</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Name</label>
                    <input class="form-input" id="addLGName" placeholder="Location group name">
                </div>
                <div class="form-group">
                    <label class="form-label">Legal Entity</label>
                    <select class="form-select" id="addLGLE">
                        ${legalEntities.map(le => `<option value="${le.id}">${le.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="window._locSubmitAddLG()">Create</button>
            </div>
        `);
    };

    window._locSubmitAddLG = async () => {
        const name = document.getElementById('addLGName').value;
        const leId = document.getElementById('addLGLE').value;
        if (!name) { toast('Name is required', 'error'); return; }
        if (!leId) { toast('Legal Entity is required', 'error'); return; }
        try {
            await api.createLG({ name, legal_entity_id: leId });
            closeModal();
            toast(`Location group "${name}" created`);
            state.tree = null;
            navigate('locations');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    window._locEditLG = (lgId, lgName, lgLeId) => {
        openModal(`
            <div class="modal-header">
                <h3>Edit Location Group</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Name</label>
                    <input class="form-input" id="editLGName" value="${lgName}">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="window._locSubmitEditLG('${lgId}')">Save</button>
            </div>
        `);
    };

    window._locSubmitEditLG = async (lgId) => {
        const name = document.getElementById('editLGName').value;
        if (!name) { toast('Name is required', 'error'); return; }
        try {
            await api.updateLG(lgId, { name });
            closeModal();
            toast('Location group updated');
            state.tree = null;
            navigate('locations');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    await loadAndRender();
}

async function renderLocationDetail(container, locationId) {
    let loc, config;
    try {
        loc = await api.getLocation(locationId);
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><h4>Error loading location</h4><p>${e.message}</p></div>`;
        return;
    }

    try {
        config = await api.resolveConfig('location', locationId);
    } catch (e) {
        config = [];
    }

    const tree = await loadTree();
    const brandMap = {};
    const leMap = {};
    const lgMap = {};
    if (tree) {
        tree.brands.forEach(b => brandMap[b.id] = b.name);
        tree.legal_entities.forEach(le => leMap[le.id] = le.name);
        tree.location_groups.forEach(lg => lgMap[lg.id] = lg.name);
    }

    let editing = false;

    function render() {
        const statusClass = loc.status === 'active' ? 'badge-green' : loc.status === 'suspended' ? 'badge-red' : 'badge-amber';

        if (!editing) {
            container.innerHTML = `
                <div style="margin-bottom:16px;">
                    <button class="btn btn-secondary" onclick="navigate('locations')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        Back to Locations
                    </button>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <h3>${loc.name}</h3>
                            <span class="badge ${statusClass}">${loc.status || 'active'}</span>
                            ${loc.location_type ? `<span class="badge badge-gray">${loc.location_type}</span>` : ''}
                        </div>
                        <div class="flex gap-3">
                            <button class="btn btn-sm btn-primary" onclick="window._locStartEdit()">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="window._locDelete()">Delete</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;">
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Location ID</label>
                                <div class="font-mono text-sm">${loc.id}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Brand</label>
                                <div>${loc.brand_name || brandMap[loc.brand_id] || '--'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Legal Entity</label>
                                <div>${loc.legal_entity_name || leMap[loc.legal_entity_id] || '--'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Location Group</label>
                                <div>${loc.location_group_name || lgMap[loc.location_group_id] || '<span class="text-muted">None</span>'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Address</label>
                                <div>${loc.address || '<span class="text-muted">Not set</span>'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">City</label>
                                <div>${loc.city || '<span class="text-muted">Not set</span>'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Coordinates</label>
                                <div class="font-mono text-sm">${loc.latitude != null && loc.longitude != null ? `${loc.latitude}, ${loc.longitude}` : '<span class="text-muted">Not set</span>'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Location Type</label>
                                <div>${loc.location_type || '<span class="text-muted">Not specified</span>'}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Created</label>
                                <div>${fmtDate(loc.created_at)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Resolved Config -->
                <div class="card mt-4">
                    <div class="card-header">
                        <h3>Resolved Configuration (${config.length})</h3>
                    </div>
                    <div class="card-body">
                        ${config.length === 0 ? '<p class="text-muted">No configuration settings resolved for this location.</p>' : `
                        <table class="data-table">
                            <thead><tr><th>Setting Key</th><th>Effective Value</th><th>Mode</th><th>Source</th></tr></thead>
                            <tbody>
                                ${config.map(c => `
                                    <tr>
                                        <td class="font-mono text-sm">${c.setting_key}</td>
                                        <td><strong>${c.effective_value || '--'}</strong></td>
                                        <td>
                                            <span class="badge ${c.mode === 'lock' ? 'badge-red' : c.mode === 'override' ? 'badge-blue' : 'badge-gray'}">
                                                ${c.is_locked ? 'Locked ' : ''}${c.mode}
                                            </span>
                                        </td>
                                        <td class="text-sm text-muted">${c.source_node_type || '--'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        `}
                    </div>
                </div>
            `;
        } else {
            const brands = tree ? tree.brands : [];
            const les = tree ? tree.legal_entities : [];
            const lgs = tree ? tree.location_groups : [];

            container.innerHTML = `
                <div style="margin-bottom:16px;">
                    <button class="btn btn-secondary" onclick="window._locCancelEdit()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        Cancel Edit
                    </button>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3>Edit Location</h3>
                        <button class="btn btn-sm btn-primary" onclick="window._locSaveEdit()">Save Changes</button>
                    </div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
                            <div class="form-group">
                                <label class="form-label">Name</label>
                                <input class="form-input" id="locEditName" value="${loc.name || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Status</label>
                                <select class="form-select" id="locEditStatus">
                                    <option value="active" ${loc.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="suspended" ${loc.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                                    <option value="inactive" ${loc.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Brand</label>
                                <select class="form-select" id="locEditBrand">
                                    ${brands.map(b => `<option value="${b.id}" ${loc.brand_id === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Legal Entity</label>
                                <select class="form-select" id="locEditLE">
                                    ${les.map(le => `<option value="${le.id}" ${loc.legal_entity_id === le.id ? 'selected' : ''}>${le.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Location Group</label>
                                <select class="form-select" id="locEditLG">
                                    <option value="">None</option>
                                    ${lgs.map(lg => `<option value="${lg.id}" ${loc.location_group_id === lg.id ? 'selected' : ''}>${lg.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Location Type</label>
                                <select class="form-select" id="locEditType">
                                    <option value="" ${!loc.location_type ? 'selected' : ''}>Not specified</option>
                                    <option value="dine_in" ${loc.location_type === 'dine_in' ? 'selected' : ''}>Dine In</option>
                                    <option value="takeaway" ${loc.location_type === 'takeaway' ? 'selected' : ''}>Takeaway</option>
                                    <option value="delivery" ${loc.location_type === 'delivery' ? 'selected' : ''}>Delivery</option>
                                    <option value="drive_through" ${loc.location_type === 'drive_through' ? 'selected' : ''}>Drive Through</option>
                                    <option value="cloud_kitchen" ${loc.location_type === 'cloud_kitchen' ? 'selected' : ''}>Cloud Kitchen</option>
                                    <option value="kiosk" ${loc.location_type === 'kiosk' ? 'selected' : ''}>Kiosk</option>
                                </select>
                            </div>
                            <div class="form-group" style="grid-column:1/-1;">
                                <label class="form-label">Address</label>
                                <input class="form-input" id="locEditAddress" value="${loc.address || ''}" placeholder="Street address">
                            </div>
                            <div class="form-group">
                                <label class="form-label">City</label>
                                <input class="form-input" id="locEditCity" value="${loc.city || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Latitude</label>
                                <input class="form-input" id="locEditLat" type="number" step="any" value="${loc.latitude != null ? loc.latitude : ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Longitude</label>
                                <input class="form-input" id="locEditLng" type="number" step="any" value="${loc.longitude != null ? loc.longitude : ''}">
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    window._locStartEdit = () => { editing = true; render(); };
    window._locCancelEdit = () => { editing = false; render(); };

    window._locSaveEdit = async () => {
        const data = {
            name: document.getElementById('locEditName').value,
            status: document.getElementById('locEditStatus').value,
            brand_id: document.getElementById('locEditBrand').value,
            legal_entity_id: document.getElementById('locEditLE').value,
            location_group_id: document.getElementById('locEditLG').value || null,
            location_type: document.getElementById('locEditType').value || null,
            address: document.getElementById('locEditAddress').value || null,
            city: document.getElementById('locEditCity').value || null,
            latitude: document.getElementById('locEditLat').value ? parseFloat(document.getElementById('locEditLat').value) : null,
            longitude: document.getElementById('locEditLng').value ? parseFloat(document.getElementById('locEditLng').value) : null,
        };
        if (!data.name) { toast('Name is required', 'error'); return; }
        try {
            loc = await api.updateLocation(loc.id, data);
            editing = false;
            state.tree = null;
            render();
            toast('Location updated');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    window._locDelete = async () => {
        if (!confirm(`Are you sure you want to delete location "${loc.name}"?`)) return;
        try {
            await api.deleteLocation(loc.id);
            toast(`Location "${loc.name}" deleted`);
            state.tree = null;
            navigate('locations');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    render();
}
