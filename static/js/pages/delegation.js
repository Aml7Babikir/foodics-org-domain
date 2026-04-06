registerPage('delegation', async (container) => {
    if (!state.currentOrg) { container.innerHTML = '<div class="empty-state"><h4>No organisation selected</h4></div>'; return; }

    let outgoing = [], incoming = [];
    try { outgoing = await api.listDelegationsByDelegator(state.currentOrg.id); } catch(e) {}
    try { incoming = await api.listDelegationsByReceiver(state.currentOrg.id); } catch(e) {}

    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>Outgoing Delegations (${outgoing.length})</h3>
                <button class="btn btn-sm btn-primary" onclick="showCreateDelegationModal()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New Delegation
                </button>
            </div>
            <div class="card-body">
                <p class="text-sm text-muted mb-4">Delegations where <strong>${state.currentOrg.name}</strong> grants access to another organisation. You always retain full visibility and policy control.</p>

                ${outgoing.length === 0 ? '<div class="empty-state"><h4>No outgoing delegations</h4><p>Create a delegation to grant a franchisee or partner controlled access.</p></div>' :
                outgoing.map(d => renderDelegationCard(d, 'outgoing')).join('')}
            </div>
        </div>

        <div class="card mt-4">
            <div class="card-header">
                <h3>Incoming Delegations (${incoming.length})</h3>
            </div>
            <div class="card-body">
                <p class="text-sm text-muted mb-4">Delegations where another organisation grants <strong>${state.currentOrg.name}</strong> operational access.</p>

                ${incoming.length === 0 ? '<div class="empty-state"><h4>No incoming delegations</h4><p>No other organisations have delegated access to you yet.</p></div>' :
                incoming.map(d => renderDelegationCard(d, 'incoming')).join('')}
            </div>
        </div>
    `;
});

function renderDelegationCard(d, direction) {
    const typeLabels = {
        'brand_franchise': 'Brand Franchise',
        'management_contract': 'Management Contract',
        'regional_partner': 'Regional Partner',
    };

    return `
        <div class="delegation-card">
            <div class="delegation-parties">
                <div class="delegation-party">
                    <label>Delegating Party (Owner)</label>
                    <strong>${d.delegating_org_id.substring(0, 8)}...</strong>
                </div>
                <div class="delegation-arrow">→</div>
                <div class="delegation-party">
                    <label>Receiving Party (Operator)</label>
                    <strong>${d.receiving_org_id.substring(0, 8)}...</strong>
                </div>
            </div>

            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
                <span class="badge badge-purple">${typeLabels[d.delegation_type] || d.delegation_type}</span>
                <span class="badge ${d.status === 'active' ? 'badge-green' : d.status === 'revoked' ? 'badge-red' : 'badge-amber'}">${d.status}</span>
                <span class="badge badge-gray">${d.delegated_node_type} scope</span>
                ${d.expires_at ? `<span class="badge badge-amber">Expires ${fmtDate(d.expires_at)}</span>` : ''}
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:13px;">
                <div>
                    <label class="form-label">Granted Permissions</label>
                    <div>${(d.granted_permissions || []).map(p => `<span class="badge badge-blue" style="margin:2px;">${p}</span>`).join('') || '—'}</div>
                </div>
                <div>
                    <label class="form-label">Locked Settings (cannot override)</label>
                    <div>${(d.locked_setting_keys || []).map(k => `<span class="badge badge-red" style="margin:2px;">${k}</span>`).join('') || '—'}</div>
                </div>
            </div>

            ${d.notes ? `<div class="mt-4 text-sm text-muted"><strong>Notes:</strong> ${d.notes}</div>` : ''}

            ${direction === 'outgoing' && d.status === 'active' ? `
                <div class="mt-4">
                    <button class="btn btn-sm btn-danger" onclick="confirmRevoke('${d.id}')">Revoke Delegation</button>
                </div>
            ` : ''}
        </div>
    `;
}

async function showCreateDelegationModal() {
    const tree = await loadTree();
    const orgs = state.orgs;

    const delegatableNodes = [
        ...tree.brands.map(b => ({ type: 'brand', id: b.id, name: `Brand: ${b.name}` })),
        ...tree.countries.map(c => ({ type: 'country', id: c.id, name: `Country: ${c.name}` })),
        ...tree.legal_entities.map(le => ({ type: 'legal_entity', id: le.id, name: `Legal Entity: ${le.name}` })),
        ...tree.location_groups.map(lg => ({ type: 'location_group', id: lg.id, name: `Location Group: ${lg.name}` })),
        ...tree.locations.map(l => ({ type: 'location', id: l.id, name: `Location: ${l.name}` })),
    ];

    const otherOrgs = orgs.filter(o => o.id !== state.currentOrg.id);

    openModal(`
        <div class="modal-header">
            <h3>Create Delegation</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <p class="text-sm text-muted mb-4">Grant another organisation controlled operational access to a portion of your hierarchy. You retain full visibility and policy control at all times.</p>

            <div class="form-group">
                <label class="form-label">Delegation Type</label>
                <select class="form-select" id="delType">
                    <option value="brand_franchise">Brand Franchise — grant franchisee operational control</option>
                    <option value="management_contract">Management Contract — hotel/property operator</option>
                    <option value="regional_partner">Regional Partner — JV or regional operations</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Receiving Organisation (Franchisee/Operator)</label>
                <select class="form-select" id="delReceiver">
                    ${otherOrgs.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}
                </select>
                ${otherOrgs.length === 0 ? '<div class="form-hint" style="color:#DC2626;">No other organisations available. Create the franchisee org first.</div>' : ''}
            </div>

            <div class="form-group">
                <label class="form-label">Delegated Scope (what you are granting access to)</label>
                <select class="form-select" id="delScope">
                    ${delegatableNodes.map(n => `<option value="${n.type}::${n.id}">${n.name}</option>`).join('')}
                </select>
                <div class="form-hint">All locations below this node will be accessible to the receiving party.</div>
            </div>

            <div class="form-group">
                <label class="form-label">Granted Permissions (comma-separated)</label>
                <input class="form-input" id="delPerms" value="locations:manage, staff:manage, reports:view, inventory:manage, pos:manage">
            </div>

            <div class="form-group">
                <label class="form-label">Locked Settings (cannot be overridden by receiver)</label>
                <input class="form-input" id="delLocked" value="brand.logo, brand.identity, menu.core_items, compliance.tax_mode" placeholder="comma-separated setting keys">
            </div>

            <div class="form-group">
                <label class="form-label">Notes</label>
                <input class="form-input" id="delNotes" placeholder="e.g. 5-year franchise agreement, UAE market">
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="submitDelegation()">Create Delegation</button>
        </div>
    `);
}

async function submitDelegation() {
    const type = document.getElementById('delType').value;
    const receiver = document.getElementById('delReceiver').value;
    const [scopeType, scopeId] = document.getElementById('delScope').value.split('::');
    const perms = document.getElementById('delPerms').value.split(',').map(p => p.trim()).filter(Boolean);
    const locked = document.getElementById('delLocked').value.split(',').map(k => k.trim()).filter(Boolean);
    const notes = document.getElementById('delNotes').value;

    if (!receiver) { toast('Select a receiving organisation', 'error'); return; }

    try {
        await api.createDelegation({
            delegation_type: type,
            delegating_org_id: state.currentOrg.id,
            receiving_org_id: receiver,
            delegated_node_type: scopeType,
            delegated_node_id: scopeId,
            granted_permissions: perms,
            locked_setting_keys: locked,
            notes: notes || null,
        });
        closeModal();
        toast('Delegation created successfully!');
        navigate('delegation');
    } catch(e) {
        toast(e.message, 'error');
    }
}

function confirmRevoke(delegationId) {
    openModal(`
        <div class="modal-header">
            <h3>Revoke Delegation</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div style="text-align:center;padding:20px 0;">
                <div style="width:56px;height:56px;border-radius:50%;background:#FEE2E2;color:#DC2626;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:16px;">!</div>
                <h4>Revoke this delegation?</h4>
                <p class="text-muted" style="margin-top:8px;">This will immediately:</p>
                <ul style="text-align:left;max-width:400px;margin:12px auto;font-size:14px;color:#475569;">
                    <li>Terminate all sessions of the receiving party within 60 seconds</li>
                    <li>Remove all operational access granted under this delegation</li>
                    <li>Preserve full audit log of all actions taken during the delegation</li>
                </ul>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-danger" onclick="submitRevoke('${delegationId}')">Revoke Now</button>
        </div>
    `);
}

async function submitRevoke(delegationId) {
    try {
        await api.revokeDelegation(delegationId, 'system');
        closeModal();
        toast('Delegation revoked. All receiver sessions terminated.');
        navigate('delegation');
    } catch(e) {
        toast(e.message, 'error');
    }
}
