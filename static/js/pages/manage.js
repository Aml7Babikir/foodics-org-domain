// Generic Manage entity pages.
//
// Each entry in MANAGE_ENTITIES (defined in api.js) gets a page with the same
// route key — e.g. `navigate('drivers')` renders the Drivers list using the
// declared field schema. This keeps the 17 manage CRUD screens from each
// needing their own bespoke page file.

(function () {
    function fieldInput(field, value) {
        const v = value !== undefined && value !== null ? value : (field.default !== undefined ? field.default : '');
        const id = `mf_${field.name}`;
        const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
        const step = field.step ? `step="${field.step}"` : '';

        switch (field.type) {
            case 'select':
                return `
                    <select class="form-select" id="${id}">
                        ${field.options.map(o => `<option value="${o}" ${o === v ? 'selected' : ''}>${o}</option>`).join('')}
                    </select>`;
            case 'checkbox':
                return `<label style="display:inline-flex;gap:8px;align-items:center;">
                    <input type="checkbox" id="${id}" ${v ? 'checked' : ''}> Yes
                </label>`;
            case 'number':
                return `<input class="form-input" id="${id}" type="number" ${step} ${placeholder} value="${v ?? ''}">`;
            case 'color':
                return `<input class="form-input" id="${id}" type="color" value="${v || '#6366F1'}" style="height:40px;padding:4px;">`;
            case 'textarea':
                return `<textarea class="form-input" id="${id}" rows="4" ${placeholder}>${v || ''}</textarea>`;
            case 'text':
            default:
                return `<input class="form-input" id="${id}" type="text" ${placeholder} value="${v ?? ''}">`;
        }
    }

    function readField(field) {
        const el = document.getElementById(`mf_${field.name}`);
        if (!el) return undefined;
        if (field.type === 'checkbox') return el.checked;
        if (field.type === 'number') return el.value === '' ? null : Number(el.value);
        return el.value === '' ? null : el.value;
    }

    function renderRowCell(field, item) {
        const v = item[field.name];
        if (v === null || v === undefined || v === '') return '<span class="text-muted">--</span>';
        if (field.type === 'checkbox') return v ? '<span class="badge badge-green">Yes</span>' : '<span class="badge">No</span>';
        if (field.type === 'color') return `<span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:${v};margin-right:6px;vertical-align:middle;"></span>${v}`;
        if (field.type === 'textarea') return `<span class="text-sm text-muted" title="${String(v).replace(/"/g, '&quot;')}">${String(v).slice(0, 40)}${String(v).length > 40 ? '…' : ''}</span>`;
        return String(v);
    }

    function makeRenderer(entityKey) {
        return async function (container) {
            if (!state.currentOrg) {
                container.innerHTML = '<div class="empty-state"><h4>No organisation selected</h4></div>';
                return;
            }
            const def = MANAGE_ENTITIES[entityKey];
            if (!def) {
                container.innerHTML = `<div class="empty-state"><h4>Unknown manage entity: ${entityKey}</h4></div>`;
                return;
            }

            let items = [];
            try {
                items = await api.manageList(entityKey, state.currentOrg.id);
            } catch (e) {
                container.innerHTML = `<div class="empty-state"><h4>Error loading ${def.label}</h4><p>${e.message}</p></div>`;
                return;
            }

            const cols = def.fields.slice(0, 4);

            container.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <div>
                        <h3 style="margin:0;">${def.label} (${items.length})</h3>
                    </div>
                    <button class="btn btn-primary" onclick="window._manageOpenAdd('${entityKey}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add ${def.singular}
                    </button>
                </div>

                ${items.length === 0 ? `
                    <div class="empty-state">
                        <h4>No ${def.label.toLowerCase()} yet</h4>
                        <p>Create your first ${def.singular.toLowerCase()} to get started.</p>
                        <button class="btn btn-primary" onclick="window._manageOpenAdd('${entityKey}')">Add ${def.singular}</button>
                    </div>
                ` : `
                    <div class="card">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    ${cols.map(c => `<th>${c.label}</th>`).join('')}
                                    <th>Status</th>
                                    <th style="text-align:right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(it => `
                                    <tr>
                                        ${cols.map(c => `<td>${renderRowCell(c, it)}</td>`).join('')}
                                        <td><span class="badge ${it.status === 'active' ? 'badge-green' : 'badge-amber'}">${it.status || 'active'}</span></td>
                                        <td style="text-align:right;">
                                            <button class="btn btn-sm btn-outline" onclick="window._manageOpenEdit('${entityKey}','${it.id}')">Edit</button>
                                            <button class="btn btn-sm btn-danger" onclick="window._manageDelete('${entityKey}','${it.id}')">Delete</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            `;
        };
    }

    // Modal helpers exposed on window so onclick handlers in inline HTML can reach them.
    window._manageOpenAdd = (entityKey) => {
        const def = MANAGE_ENTITIES[entityKey];
        openModal(`
            <div class="modal-header">
                <h3>Add ${def.singular}</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                ${def.fields.map(f => `
                    <div class="form-group">
                        <label class="form-label">${f.label}${f.required ? ' *' : ''}</label>
                        ${fieldInput(f)}
                    </div>
                `).join('')}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="window._manageSubmitAdd('${entityKey}')">Create</button>
            </div>
        `);
    };

    window._manageSubmitAdd = async (entityKey) => {
        const def = MANAGE_ENTITIES[entityKey];
        const data = { organisation_id: state.currentOrg.id };
        for (const f of def.fields) {
            const v = readField(f);
            if (v !== undefined) data[f.name] = v;
            if (f.required && !data[f.name]) { toast(`${f.label} is required`, 'error'); return; }
        }
        try {
            await api.manageCreate(entityKey, data);
            closeModal();
            toast(`${def.singular} created`);
            navigate(entityKey);
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    window._manageOpenEdit = async (entityKey, id) => {
        const def = MANAGE_ENTITIES[entityKey];
        let item;
        try { item = await api.manageGet(entityKey, id); }
        catch (e) { toast(e.message, 'error'); return; }
        openModal(`
            <div class="modal-header">
                <h3>Edit ${def.singular}</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                ${def.fields.map(f => `
                    <div class="form-group">
                        <label class="form-label">${f.label}</label>
                        ${fieldInput(f, item[f.name])}
                    </div>
                `).join('')}
                <div class="form-group">
                    <label class="form-label">Status</label>
                    <select class="form-select" id="mf_status">
                        <option value="active" ${item.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="inactive" ${item.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="window._manageSubmitEdit('${entityKey}','${id}')">Save</button>
            </div>
        `);
    };

    window._manageSubmitEdit = async (entityKey, id) => {
        const def = MANAGE_ENTITIES[entityKey];
        const data = {};
        for (const f of def.fields) {
            const v = readField(f);
            if (v !== undefined) data[f.name] = v;
        }
        const statusEl = document.getElementById('mf_status');
        if (statusEl) data.status = statusEl.value;
        try {
            await api.manageUpdate(entityKey, id, data);
            closeModal();
            toast(`${def.singular} updated`);
            navigate(entityKey);
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    window._manageDelete = async (entityKey, id) => {
        const def = MANAGE_ENTITIES[entityKey];
        if (!confirm(`Delete this ${def.singular.toLowerCase()}?`)) return;
        try {
            await api.manageDelete(entityKey, id);
            toast(`${def.singular} deleted`);
            navigate(entityKey);
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    // Register a page for every manage entity.
    Object.keys(MANAGE_ENTITIES).forEach(k => registerPage(k, makeRenderer(k)));
})();
