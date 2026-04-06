registerPage('config', async (container) => {
    const tree = await loadTree();
    if (!tree) { container.innerHTML = '<div class="empty-state"><h4>No organisation selected</h4></div>'; return; }

    // Build a flat list of all nodes for the picker
    const allNodes = [
        { type: 'organisation', id: tree.organisation.id, name: tree.organisation.name, level: 'L0' },
        ...tree.groups.map(g => ({ type: 'group', id: g.id, name: g.name, level: 'L1' })),
        ...tree.brands.map(b => ({ type: 'brand', id: b.id, name: b.name, level: 'L2' })),
        ...tree.countries.map(c => ({ type: 'country', id: c.id, name: c.name, level: 'L3' })),
        ...tree.legal_entities.map(le => ({ type: 'legal_entity', id: le.id, name: le.name, level: 'L4' })),
        ...tree.business_units.map(bu => ({ type: 'business_unit', id: bu.id, name: bu.name, level: 'L5' })),
        ...tree.location_groups.map(lg => ({ type: 'location_group', id: lg.id, name: lg.name, level: 'L6' })),
        ...tree.locations.map(l => ({ type: 'location', id: l.id, name: l.name, level: 'L7' })),
    ];

    container.innerHTML = `
        <div class="grid-2">
            <!-- Node picker & resolved config -->
            <div class="card" style="grid-column: 1 / -1;">
                <div class="card-header">
                    <h3>Configuration Inheritance Explorer</h3>
                    <button class="btn btn-sm btn-primary" onclick="showSetConfigModal()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Set Config
                    </button>
                </div>
                <div class="card-body">
                    <p class="text-sm text-muted mb-4">Select a node to see its effective configuration. Settings flow down: Organisation → Group → Brand → Country → Legal Entity → Business Unit → Location Group → Location. Each level can <span class="badge badge-gray">inherit</span>, <span class="badge badge-blue">override</span>, or <span class="badge badge-red">lock</span>.</p>

                    <div class="form-group">
                        <label class="form-label">Select Hierarchy Node</label>
                        <select class="form-select" id="configNodePicker" onchange="loadNodeConfig()">
                            ${allNodes.map(n => `<option value="${n.type}::${n.id}">${n.level} ${n.type} — ${n.name}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Ancestor chain visualization -->
                    <div id="configAncestorChain" class="config-chain mb-4"></div>

                    <!-- Resolved settings -->
                    <div id="configResolvedSettings"></div>
                </div>
            </div>
        </div>

        <!-- Direct settings at node -->
        <div class="card mt-4">
            <div class="card-header">
                <h3>Settings Set Directly at This Node</h3>
            </div>
            <div class="card-body" id="configDirectSettings">
                <p class="text-muted text-sm">Select a node above to see its direct settings.</p>
            </div>
        </div>
    `;

    // Auto-load first node
    loadNodeConfig();
});

async function loadNodeConfig() {
    const picker = document.getElementById('configNodePicker');
    const [nodeType, nodeId] = picker.value.split('::');

    // Load ancestor chain
    try {
        const ancestors = await api.getAncestors(nodeType, nodeId);
        const chainEl = document.getElementById('configAncestorChain');
        chainEl.innerHTML = ancestors.map((a, i) => `
            ${i > 0 ? '<span class="config-chain-arrow">→</span>' : ''}
            <span class="config-chain-node ${a.node_type === nodeType && a.node_id === nodeId ? 'active' : ''}">${a.node_type}</span>
        `).join('');
    } catch(e) {}

    // Load resolved config
    try {
        const resolved = await api.resolveConfig(nodeType, nodeId);
        const el = document.getElementById('configResolvedSettings');

        if (resolved.length === 0) {
            el.innerHTML = '<p class="text-muted">No configuration settings found in the inheritance chain for this node.</p>';
        } else {
            el.innerHTML = `
                <h4 style="margin-bottom:12px;font-size:14px;color:#64748B;">Effective Configuration (${resolved.length} settings)</h4>
                ${resolved.map(c => `
                    <div class="config-row">
                        <div class="config-key">${c.setting_key}</div>
                        <div class="config-value">${truncateValue(c.effective_value)}</div>
                        <span class="badge ${c.mode === 'lock' ? 'badge-red' : c.mode === 'override' ? 'badge-blue' : 'badge-gray'}">
                            ${c.is_locked ? '🔒 ' : ''}${c.mode}
                        </span>
                        <div class="config-source">from <strong>${c.source_node_type}</strong></div>
                    </div>
                `).join('')}
            `;
        }
    } catch(e) {
        document.getElementById('configResolvedSettings').innerHTML = `<p class="text-muted">Error: ${e.message}</p>`;
    }

    // Load direct settings
    try {
        const direct = await api.listSettings(nodeType, nodeId);
        const el = document.getElementById('configDirectSettings');

        if (direct.length === 0) {
            el.innerHTML = '<p class="text-muted text-sm">No settings set directly at this node. All values are inherited from ancestors.</p>';
        } else {
            el.innerHTML = `
                <table class="data-table">
                    <thead><tr><th>Key</th><th>Value</th><th>Mode</th><th>Locked by Ancestor</th></tr></thead>
                    <tbody>
                        ${direct.map(s => `
                            <tr>
                                <td><strong>${s.setting_key}</strong></td>
                                <td class="font-mono text-sm">${truncateValue(s.setting_value)}</td>
                                <td><span class="badge ${s.mode === 'lock' ? 'badge-red' : s.mode === 'override' ? 'badge-blue' : 'badge-gray'}">${s.mode}</span></td>
                                <td>${s.is_locked_by_ancestor ? '<span class="badge badge-amber">Yes — ' + s.locked_by_node_type + '</span>' : '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch(e) {}
}

function truncateValue(val) {
    if (!val) return '—';
    if (val.length > 60) return val.substring(0, 60) + '...';
    return val;
}

function showSetConfigModal() {
    const tree = state.tree;
    const allNodes = [
        { type: 'organisation', id: tree.organisation.id, name: tree.organisation.name },
        ...tree.brands.map(b => ({ type: 'brand', id: b.id, name: b.name })),
        ...tree.countries.map(c => ({ type: 'country', id: c.id, name: c.name })),
        ...tree.legal_entities.map(le => ({ type: 'legal_entity', id: le.id, name: le.name })),
        ...tree.location_groups.map(lg => ({ type: 'location_group', id: lg.id, name: lg.name })),
        ...tree.locations.map(l => ({ type: 'location', id: l.id, name: l.name })),
    ];

    openModal(`
        <div class="modal-header">
            <h3>Set Configuration</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label class="form-label">Target Node</label>
                <select class="form-select" id="cfgNode">
                    ${allNodes.map(n => `<option value="${n.type}::${n.id}">${n.type} — ${n.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Setting Key</label>
                <input class="form-input" id="cfgKey" placeholder="e.g. receipt.footer, delivery.charge, operating_hours">
                <div class="form-hint">Use dot notation for namespacing (e.g. brand.logo, compliance.zatca)</div>
            </div>
            <div class="form-group">
                <label class="form-label">Value</label>
                <input class="form-input" id="cfgValue" placeholder='e.g. "Thank you for visiting!" or {"open":"09:00","close":"23:00"}'>
            </div>
            <div class="form-group">
                <label class="form-label">Mode</label>
                <select class="form-select" id="cfgMode">
                    <option value="override">Override — local value takes precedence over parent</option>
                    <option value="lock">Lock — set value and prevent any level below from changing it</option>
                    <option value="inherit">Inherit — use the parent level's value</option>
                </select>
                <div class="form-hint">
                    <strong>Override:</strong> Sets a local value. <strong>Lock:</strong> Sets a value and prevents descendants from changing it (use for compliance).
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="submitSetConfig()">Save Setting</button>
        </div>
    `);
}

async function submitSetConfig() {
    const [nodeType, nodeId] = document.getElementById('cfgNode').value.split('::');
    const key = document.getElementById('cfgKey').value;
    const value = document.getElementById('cfgValue').value;
    const mode = document.getElementById('cfgMode').value;

    if (!key) { toast('Setting key is required', 'error'); return; }

    try {
        await api.setConfig({
            node_type: nodeType, node_id: nodeId,
            setting_key: key, setting_value: value, mode: mode,
        });
        closeModal();
        toast(`Setting "${key}" saved as ${mode}`);
        loadNodeConfig();
    } catch (e) {
        toast(e.message, 'error');
    }
}
