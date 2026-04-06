registerPage('templates', async (container) => {
    if (!state.currentOrg) { container.innerHTML = '<div class="empty-state"><h4>No organisation selected</h4></div>'; return; }

    let templates = [];
    try { templates = await api.listTemplates(state.currentOrg.id); } catch(e) {}

    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>Location Templates (${templates.length})</h3>
                <div class="flex gap-3">
                    <button class="btn btn-sm btn-secondary" onclick="showCreateTemplateFromNodeModal()">Create from Existing</button>
                    <button class="btn btn-sm btn-primary" onclick="showCreateTemplateModal()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        New Template
                    </button>
                </div>
            </div>
            <div class="card-body">
                <p class="text-sm text-muted mb-4">Templates capture a complete, validated set of configuration values. When opening a new location, select a template and the outlet opens pre-configured, fully compliant with group policies, and ready to trade.</p>

                ${templates.length === 0 ? `
                    <div class="empty-state">
                        <h4>No templates yet</h4>
                        <p>Create a template from an existing location or define one manually.</p>
                    </div>
                ` : `
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;">
                    ${templates.map(t => `
                        <div class="card">
                            <div class="card-body">
                                <h4 style="margin-bottom:8px;">${t.name}</h4>
                                ${t.description ? `<p class="text-sm text-muted" style="margin-bottom:12px;">${t.description}</p>` : ''}
                                <div style="margin-bottom:12px;">
                                    ${t.source_node_type ? `<span class="badge badge-purple">Source: ${t.source_node_type}</span>` : ''}
                                    <span class="badge badge-gray">${Object.keys(t.config_snapshot || {}).length} settings</span>
                                </div>
                                <div style="max-height:200px;overflow-y:auto;">
                                    ${Object.entries(t.config_snapshot || {}).map(([k, v]) => `
                                        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #F1F5F9;font-size:12px;">
                                            <span style="font-weight:500;">${k}</span>
                                            <span class="text-muted font-mono">${v ? (typeof v === 'string' ? v.substring(0, 30) : JSON.stringify(v).substring(0, 30)) : '—'}</span>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="mt-4">
                                    <span class="text-sm text-muted">Created ${fmtDate(t.created_at)}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                `}
            </div>
        </div>
    `;
});

function showCreateTemplateModal() {
    openModal(`
        <div class="modal-header">
            <h3>Create Location Template</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label class="form-label">Template Name</label>
                <input class="form-input" id="tplName" placeholder="e.g. Standard Dine-In Outlet">
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <input class="form-input" id="tplDesc" placeholder="Template for new standard dine-in locations">
            </div>
            <div class="form-group">
                <label class="form-label">Configuration (JSON)</label>
                <textarea class="form-input" id="tplConfig" rows="8" style="font-family:monospace;font-size:13px;" placeholder='{
    "operating_hours": "{\"open\": \"09:00\", \"close\": \"23:00\"}",
    "receipt.footer": "\"Thank you for visiting!\"",
    "delivery.charge": "\"12.00\"",
    "payment_methods": "[\"cash\", \"card\", \"apple_pay\"]"
}'></textarea>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="submitCreateTemplate()">Create Template</button>
        </div>
    `);
}

async function submitCreateTemplate() {
    const name = document.getElementById('tplName').value;
    const desc = document.getElementById('tplDesc').value;
    const configRaw = document.getElementById('tplConfig').value;

    if (!name) { toast('Template name is required', 'error'); return; }

    let config = {};
    try {
        config = JSON.parse(configRaw || '{}');
    } catch(e) {
        toast('Invalid JSON configuration', 'error');
        return;
    }

    try {
        await api.createTemplate({
            name, description: desc || null,
            organisation_id: state.currentOrg.id,
            config_snapshot: config,
        });
        closeModal();
        toast(`Template "${name}" created`);
        navigate('templates');
    } catch(e) {
        toast(e.message, 'error');
    }
}

async function showCreateTemplateFromNodeModal() {
    const tree = await loadTree();
    const sourceNodes = [
        ...tree.location_groups.map(lg => ({ type: 'location_group', id: lg.id, name: `Location Group: ${lg.name}` })),
        ...tree.locations.map(l => ({ type: 'location', id: l.id, name: `Location: ${l.name}` })),
    ];

    openModal(`
        <div class="modal-header">
            <h3>Create Template from Existing Node</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <p class="text-sm text-muted mb-4">Snapshot all resolved configuration from an existing location or location group to create a reusable template.</p>
            <div class="form-group">
                <label class="form-label">Template Name</label>
                <input class="form-input" id="tplFnName" placeholder="e.g. Copy of Riyadh Park Config">
            </div>
            <div class="form-group">
                <label class="form-label">Source Node</label>
                <select class="form-select" id="tplFnSource">
                    ${sourceNodes.map(n => `<option value="${n.type}::${n.id}">${n.name}</option>`).join('')}
                </select>
                <div class="form-hint">All resolved configuration (including inherited values) will be captured.</div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="submitCreateFromNode()">Create Snapshot</button>
        </div>
    `);
}

async function submitCreateFromNode() {
    const name = document.getElementById('tplFnName').value;
    const [sourceType, sourceId] = document.getElementById('tplFnSource').value.split('::');

    if (!name) { toast('Template name is required', 'error'); return; }

    try {
        await api.createTemplateFromNode(name, state.currentOrg.id, sourceType, sourceId);
        closeModal();
        toast(`Template "${name}" created from ${sourceType} snapshot`);
        navigate('templates');
    } catch(e) {
        toast(e.message, 'error');
    }
}
