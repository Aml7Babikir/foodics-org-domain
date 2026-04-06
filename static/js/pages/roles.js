const ROLE_PERMISSIONS = {
    cashier: ['pos:operate', 'orders:create', 'payments:accept'],
    waiter: ['pos:operate', 'orders:create', 'orders:view', 'tables:manage'],
    store_manager: ['pos:operate', 'orders:manage', 'inventory:manage', 'staff:view', 'reports:view', 'settings:location'],
    area_manager: ['locations:manage', 'staff:manage', 'reports:view', 'inventory:manage', 'settings:location_group'],
    brand_ops_manager: ['brands:manage', 'locations:view', 'staff:manage', 'reports:view', 'menu:manage', 'settings:brand'],
    country_manager: ['brands:view', 'locations:manage', 'staff:manage', 'reports:manage', 'compliance:manage', 'settings:country'],
    finance_viewer: ['reports:view', 'financial:view', 'invoices:view', 'tax:view'],
    admin: ['*:*'],
};

const ROLE_LEVELS = {
    cashier: 'location',
    waiter: 'location',
    store_manager: 'location',
    area_manager: 'location_group',
    brand_ops_manager: 'brand',
    country_manager: 'country',
    finance_viewer: 'organisation',
    admin: 'organisation',
};

const ALL_PERMISSIONS = [
    'pos:operate', 'orders:create', 'orders:view', 'orders:manage',
    'payments:accept', 'tables:manage', 'inventory:manage',
    'staff:view', 'staff:manage', 'reports:view', 'reports:manage',
    'locations:view', 'locations:manage', 'brands:view', 'brands:manage',
    'menu:manage', 'settings:location', 'settings:location_group',
    'settings:brand', 'settings:country', 'compliance:manage',
    'financial:view', 'invoices:view', 'tax:view', '*:*',
];

registerPage('roles', async (container) => {
    const roles = await api.listRoles(state.currentOrg?.id);
    const systemRoles = roles.filter(r => r.is_system);
    const customRoles = roles.filter(r => !r.is_system);

    // Detail view
    if (state.pageParams?.slug) {
        return renderRoleDetail(container, state.pageParams.slug, roles);
    }

    container.innerHTML = `
        <div class="page-header">
            <div><h3>Roles & Permissions</h3><p class="text-sm text-muted">System roles with pre-configured permissions. Custom roles for your specific needs.</p></div>
            <button class="btn btn-primary" onclick="window._createRole()">+ Create Role</button>
        </div>

        <div class="card">
            <div class="card-header"><h3>System Roles (${systemRoles.length})</h3></div>
            <div class="card-body" style="padding:0;">
                <table class="data-table">
                    <thead><tr><th>Role</th><th>Slug</th><th>Default Level</th><th>Permissions</th><th></th></tr></thead>
                    <tbody>
                        ${systemRoles.map(r => {
                            const perms = ROLE_PERMISSIONS[r.slug] || [];
                            const level = ROLE_LEVELS[r.slug] || 'any';
                            return `<tr>
                                <td><strong>${r.name}</strong></td>
                                <td><code style="background:#F3F4F6;padding:2px 8px;border-radius:4px;font-size:12px;">${r.slug}</code></td>
                                <td><span class="badge badge-default">${level}</span></td>
                                <td><span class="text-sm text-muted">${perms.length} permissions</span></td>
                                <td><button class="btn btn-sm btn-secondary" onclick="navigate('roles',{slug:'${r.slug}'})">View</button></td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        ${customRoles.length > 0 ? `
        <div class="card" style="margin-top:16px;">
            <div class="card-header"><h3>Custom Roles (${customRoles.length})</h3></div>
            <div class="card-body" style="padding:0;">
                <table class="data-table">
                    <thead><tr><th>Role</th><th>Slug</th><th></th></tr></thead>
                    <tbody>
                        ${customRoles.map(r => `<tr>
                            <td><strong>${r.name}</strong></td>
                            <td><code style="background:#F3F4F6;padding:2px 8px;border-radius:4px;font-size:12px;">${r.slug}</code></td>
                            <td><button class="btn btn-sm btn-secondary" onclick="navigate('roles',{slug:'${r.slug}'})">View</button></td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>` : ''}
    `;

    window._createRole = () => {
        openModal(`
            <h3 style="margin-bottom:16px;">Create Custom Role</h3>
            <div class="form-group"><label class="form-label">Role Name</label><input class="form-input" id="crName" placeholder="e.g. Regional Supervisor"></div>
            <div class="form-group"><label class="form-label">Slug</label><input class="form-input" id="crSlug" placeholder="e.g. regional_supervisor"></div>
            <div class="form-group"><label class="form-label">Hierarchy Level</label>
                <select class="form-select" id="crLevel">
                    <option value="organisation">Organisation</option>
                    <option value="brand">Brand</option>
                    <option value="country">Country</option>
                    <option value="legal_entity">Legal Entity</option>
                    <option value="location_group">Location Group</option>
                    <option value="location">Location</option>
                </select>
            </div>
            <div style="display:flex;gap:8px;margin-top:16px;">
                <button class="btn btn-primary" onclick="window._doCreateRole()">Create</button>
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        `);
    };

    window._doCreateRole = async () => {
        const name = document.getElementById('crName').value;
        const slug = document.getElementById('crSlug').value;
        if (!name || !slug) { toast('Name and slug required','error'); return; }
        try {
            await api.createRole({ name, slug, is_system: false, organisation_id: state.currentOrg.id });
            closeModal(); toast('Role created'); navigate('roles');
        } catch(e) { toast(e.message,'error'); }
    };
});

function renderRoleDetail(container, slug, roles) {
    const role = roles.find(r => r.slug === slug);
    if (!role) { container.innerHTML = '<p>Role not found</p>'; return; }

    const perms = ROLE_PERMISSIONS[slug] || [];
    const level = ROLE_LEVELS[slug] || 'any';
    const isAdmin = slug === 'admin';

    container.innerHTML = `
        <button class="btn btn-secondary btn-sm" onclick="navigate('roles')" style="margin-bottom:16px;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg> Back to Roles
        </button>
        <div class="card">
            <div class="card-header">
                <div>
                    <h3>${role.name}</h3>
                    <p class="text-sm text-muted" style="margin-top:4px;">${role.is_system ? 'System role' : 'Custom role'} &middot; Default level: <strong>${level}</strong></p>
                </div>
                <code style="background:#F3F4F6;padding:4px 12px;border-radius:6px;font-size:13px;">${role.slug}</code>
            </div>
            <div class="card-body">
                <h4 style="margin-bottom:12px;">Permissions ${isAdmin ? '<span class="badge badge-warning">Full Access</span>' : ''}</h4>
                <div class="permissions-grid">
                    ${ALL_PERMISSIONS.filter(p => p !== '*:*').map(p => {
                        const has = isAdmin || perms.includes(p);
                        return `<label class="permission-item ${has ? 'active' : ''}">
                            <input type="checkbox" ${has ? 'checked' : ''} disabled>
                            <span>${p}</span>
                        </label>`;
                    }).join('')}
                </div>
            </div>
        </div>
        <div class="card" style="margin-top:16px;">
            <div class="card-header"><h3>Where this role applies</h3></div>
            <div class="card-body">
                <p class="text-sm text-muted">This role is typically assigned at the <strong>${level}</strong> level and grants access to all descendant locations below that node in the hierarchy.</p>
                <div class="level-chain">
                    ${['organisation','group','brand','country','legal_entity','business_unit','location_group','location'].map(l => `
                        <div class="level-chain-item ${l === level ? 'active' : ''}">
                            <div class="level-chain-dot"></div>
                            <span>${l.replace('_',' ')}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}
