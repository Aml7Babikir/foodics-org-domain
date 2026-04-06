registerPage('users', async (container) => {
    if (!state.currentOrg) return;

    // Detail view
    if (state.pageParams?.id) {
        return renderUserDetail(container, state.pageParams.id);
    }

    const [users, roles] = await Promise.all([
        api.listUsers(state.currentOrg.id),
        api.listRoles(state.currentOrg.id),
    ]);

    container.innerHTML = `
        <div class="page-header">
            <div><h3>Team Members (${users.length})</h3><p class="text-sm text-muted">Manage users, assign roles, and control access</p></div>
            <button class="btn btn-primary" onclick="window._inviteUser()">+ Invite User</button>
        </div>
        ${users.length === 0 ? '<div class="empty-card"><p>No team members yet. Invite your first user to get started.</p></div>' : `
        <div class="card"><div class="card-body" style="padding:0;">
            <table class="data-table">
                <thead><tr><th>Name</th><th>Mobile</th><th>Status</th><th>Created</th><th></th></tr></thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td><div class="entity-row" style="padding:0;border:0;">
                                <div class="entity-avatar" style="background:#EDE9FE;color:#6D28D9;width:32px;height:32px;font-size:12px;">${(u.full_name||u.mobile_number||'?')[0].toUpperCase()}</div>
                                <div class="entity-info"><div class="entity-name">${u.full_name||'--'}</div><div class="entity-meta">${u.employee_id||''}</div></div>
                            </div></td>
                            <td>${u.mobile_number}</td>
                            <td><span class="badge badge-${u.status==='active'?'success':u.status==='invited'?'primary':'default'}">${u.status}</span></td>
                            <td>${fmtDate(u.created_at)}</td>
                            <td><button class="btn btn-sm btn-secondary" onclick="navigate('users',{id:'${u.id}'})">View</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div></div>`}
    `;

    window._inviteUser = () => {
        openModal(`
            <h3 style="margin-bottom:16px;">Invite User</h3>
            <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="invName" placeholder="e.g. Sara Al-Rashid"></div>
            <div class="form-group"><label class="form-label">Mobile Number *</label><input class="form-input" id="invMobile" placeholder="+966501234567"></div>
            <div class="form-group"><label class="form-label">Employee ID</label><input class="form-input" id="invEmpId" placeholder="Optional"></div>
            <div class="form-group"><label class="form-label">Role</label>
                <select class="form-select" id="invRole">
                    <option value="">-- Select role --</option>
                    ${roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label class="form-label">Scope Level</label>
                <select class="form-select" id="invScopeType">
                    <option value="organisation">Organisation</option>
                    <option value="brand">Brand</option>
                    <option value="legal_entity">Legal Entity</option>
                    <option value="location_group">Location Group</option>
                    <option value="location">Location</option>
                </select>
            </div>
            <div style="display:flex;gap:8px;margin-top:16px;">
                <button class="btn btn-primary" onclick="window._doInvite()">Send Invite</button>
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        `);
    };

    window._doInvite = async () => {
        const mobile = document.getElementById('invMobile').value;
        const name = document.getElementById('invName').value;
        if (!mobile) { toast('Mobile number is required', 'error'); return; }
        try {
            const user = await api.inviteUser(state.currentOrg.id, {
                mobile_number: mobile,
                full_name: name || null,
                employee_id: document.getElementById('invEmpId').value || null,
            });
            // Assign role if selected
            const roleId = document.getElementById('invRole').value;
            const scopeType = document.getElementById('invScopeType').value;
            if (roleId) {
                await api.assignRole({ user_id: user.id, role_id: roleId, node_type: scopeType, node_id: state.currentOrg.id });
            }
            closeModal();
            toast('User invited successfully');
            state.tree = null;
            navigate('users');
        } catch(e) { toast(e.message, 'error'); }
    };
});

async function renderUserDetail(container, userId) {
    const [user, assignments] = await Promise.all([
        api.getUser(userId),
        api.getUserAssignments(userId).catch(() => []),
    ]);
    let accessLocs = [];
    try { const r = await api.getAccessibleLocations(userId); accessLocs = r.location_ids || []; } catch(e) {}

    container.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="navigate('users')" style="margin-bottom:16px;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg> Back to Users
        </button>
        <div class="card">
            <div class="card-header"><h3>User Profile</h3>
                ${user.status==='active' ? `<button class="btn btn-sm" style="background:#FEE2E2;color:#DC2626;" onclick="window._offboard('${user.id}')">Offboard</button>` : ''}
            </div>
            <div class="card-body">
                <div class="detail-grid">
                    <div class="detail-item"><div class="detail-label">Name</div><div class="detail-value">${user.full_name||'--'}</div></div>
                    <div class="detail-item"><div class="detail-label">Mobile</div><div class="detail-value">${user.mobile_number}</div></div>
                    <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value"><span class="badge badge-${user.status==='active'?'success':'default'}">${user.status}</span></div></div>
                    <div class="detail-item"><div class="detail-label">Employee ID</div><div class="detail-value">${user.employee_id||'--'}</div></div>
                    <div class="detail-item"><div class="detail-label">Created</div><div class="detail-value">${fmtDate(user.created_at)}</div></div>
                    <div class="detail-item"><div class="detail-label">Accessible Locations</div><div class="detail-value">${accessLocs.length}</div></div>
                </div>
            </div>
        </div>
        <div class="card" style="margin-top:16px;">
            <div class="card-header"><h3>Role Assignments</h3></div>
            <div class="card-body">
                ${assignments.length === 0 ? '<p class="text-muted text-sm">No role assignments yet</p>' : `
                <table class="data-table">
                    <thead><tr><th>Role</th><th>Scope</th><th>Node ID</th></tr></thead>
                    <tbody>${assignments.map(a => `<tr><td>${a.role_name||a.role_id}</td><td><span class="badge badge-default">${a.node_type}</span></td><td class="text-sm text-muted">${truncId(a.node_id)}</td></tr>`).join('')}</tbody>
                </table>`}
            </div>
        </div>
    `;

    window._offboard = async (uid) => {
        if (!confirm('Are you sure you want to offboard this user?')) return;
        try { await api.offboardUser(uid); toast('User offboarded'); navigate('users'); } catch(e) { toast(e.message,'error'); }
    };
}
