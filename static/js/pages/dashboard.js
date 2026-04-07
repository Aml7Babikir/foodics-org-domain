registerPage('dashboard', async (container) => {
    const tree = await loadTree();
    if (!tree) { container.innerHTML = '<p>Select an organisation</p>'; return; }

    const org = tree.organisation;
    const brands = tree.brands || [];
    const locs = tree.locations || [];
    const les = tree.legal_entities || [];
    const countriesRaw = tree.countries || [];
    const countries = countriesRaw.filter((c, i, arr) => arr.findIndex(x => x.iso_code === c.iso_code) === i);
    const lgs = tree.location_groups || [];
    const bus = tree.business_units || [];

    // Check setup context from signup
    const setupRaw = localStorage.getItem('foodics_setup');
    let setup = null;
    if (setupRaw) {
        try { setup = JSON.parse(setupRaw); } catch(e) {}
        if (setup && setup.orgId !== state.currentOrg.id) setup = null;
    }

    const tasks = buildSetupTasks(setup, { brands, locs, les, countries, lgs, bus });

    container.innerHTML = `
        <div class="dash-header">
            <div>
                <h2 class="dash-title">${org.name}</h2>
                <p class="dash-subtitle">${setup ? getSegmentLabel(setup.segment) + ' &middot; ' : ''}${brands.length} brand${brands.length !== 1 ? 's' : ''} &middot; ${locs.length} location${locs.length !== 1 ? 's' : ''} &middot; ${les.length} legal entit${les.length !== 1 ? 'ies' : 'y'}</p>
            </div>
            ${setup ? '<span class="badge badge-primary" style="font-size:12px;padding:6px 14px;">Free Trial</span>' : ''}
        </div>

        <div class="stats-row">
            ${statCard('Brands', brands.length, '#8B5CF6', 'B')}
            ${statCard('Legal Entities', les.length, '#10B981', 'LE')}
            ${statCard('Locations', locs.length, '#3B82F6', 'L')}
            ${statCard('Countries', countries.length, '#F59E0B', 'C')}
        </div>

        <div class="dash-grid">
            <div class="card">
                <div class="card-header">
                    <h3>Setup Guide</h3>
                    <span class="text-sm text-muted">${tasks.filter(t=>t.done).length}/${tasks.length} completed</span>
                </div>
                <div class="card-body">
                    <div class="setup-progress"><div class="setup-progress-bar" style="width:${tasks.length>0?(tasks.filter(t=>t.done).length/tasks.length*100):0}%"></div></div>
                    <div class="setup-tasks">
                        ${tasks.map(t => `
                            <div class="setup-task ${t.done ? 'done' : ''}" ${!t.done && t.action ? `onclick="${t.action}" style="cursor:pointer;"` : ''}>
                                <div class="setup-task-icon">${t.done ? '<svg width="16" height="16" fill="none" stroke="#059669" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>' : '<div class="setup-task-num">'+t.num+'</div>'}</div>
                                <div class="setup-task-content">
                                    <div class="setup-task-title">${t.title}</div>
                                    <div class="setup-task-desc">${t.desc}</div>
                                </div>
                                ${!t.done ? '<svg width="16" height="16" fill="none" stroke="#9CA3AF" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;"><path d="M9 18l6-6-6-6"/></svg>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Hierarchy Overview</h3>
                    <button class="btn btn-sm btn-secondary" onclick="navigate('hierarchy')">View Full</button>
                </div>
                <div class="card-body">
                    <div class="glance-levels">
                        ${glanceRow('Organisation', 1, '#6D28D9')}
                        ${glanceRow('Groups', (tree.groups||[]).length, '#0EA5E9')}
                        ${glanceRow('Brands', brands.length, '#8B5CF6')}
                        ${glanceRow('Countries', countries.length, '#F59E0B')}
                        ${glanceRow('Legal Entities', les.length, '#10B981')}
                        ${glanceRow('Business Units', bus.length, '#F97316')}
                        ${glanceRow('Location Groups', lgs.length, '#EF4444')}
                        ${glanceRow('Locations', locs.length, '#06B6D4')}
                    </div>
                </div>
            </div>
        </div>

        <div class="dash-grid">
            <div class="card">
                <div class="card-header"><h3>Brands</h3><button class="btn btn-sm btn-primary" onclick="navigate('brands')">Manage</button></div>
                <div class="card-body">
                    ${brands.length === 0 ? '<p class="text-muted text-sm">No brands yet.</p>' :
                    brands.slice(0,5).map(b => `
                        <div class="entity-row" onclick="navigate('brands',{id:'${b.id}'})">
                            <div class="entity-avatar" style="background:#EDE9FE;color:#6D28D9;">B</div>
                            <div class="entity-info"><div class="entity-name">${b.name}</div><div class="entity-meta">Brand</div></div>
                            <span class="badge badge-success">${b.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>Legal Entities</h3><button class="btn btn-sm btn-primary" onclick="navigate('legal-entities')">Manage</button></div>
                <div class="card-body">
                    ${les.length === 0 ? '<p class="text-muted text-sm">No legal entities yet.</p>' :
                    les.slice(0,5).map(le => `
                        <div class="entity-row" onclick="navigate('legal-entities',{id:'${le.id}'})">
                            <div class="entity-avatar" style="background:#D1FAE5;color:#059669;">LE</div>
                            <div class="entity-info"><div class="entity-name">${le.name}</div><div class="entity-meta">${le.currency_code} &middot; ${le.tax_mode}${le.is_franchise?' &middot; Franchise':''}</div></div>
                            <span class="badge badge-success">${le.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
});

function statCard(label, count, color, letter) {
    return `<div class="stat-card"><div class="stat-icon" style="background:${color}15;color:${color};">${letter}</div><div class="stat-value">${count}</div><div class="stat-label">${label}</div></div>`;
}
function glanceRow(label, count, color) {
    return `<div class="glance-row"><div class="glance-dot" style="background:${color};"></div><span class="glance-label">${label}</span><span class="glance-count">${count}</span></div>`;
}
function getSegmentLabel(seg) {
    return {micro:'Micro',sme:'Growing Chain',midmarket:'Mid-Market',enterprise:'Enterprise'}[seg]||'';
}
function buildSetupTasks(setup, data) {
    const structure = setup?.structure || 'single';
    const tasks = [];
    let n = 1;
    tasks.push({num:n++, title:'Create organisation', desc:'Your top-level account', done:true});
    tasks.push({num:n++, title:'Set up your brands', desc:'Restaurant concepts you operate', done:data.brands.length>0, action:"navigate('brands')"});
    tasks.push({num:n++, title:'Add legal entities', desc:'Companies with VAT & tax identity', done:data.les.length>0, action:"navigate('legal-entities')"});
    tasks.push({num:n++, title:'Add countries of operation', desc:'Markets where you operate', done:data.countries.length>0, action:"navigate('brands')"});
    tasks.push({num:n++, title:'Add your locations', desc:'Physical or virtual outlets', done:data.locs.length>0, action:"navigate('locations')"});
    if (structure==='multi_le_one_brand'||structure==='multi_brand_multi_le') {
        tasks.push({num:n++, title:'Link brands to legal entities', desc:'Define which companies serve which brands', done:data.les.length>0&&data.brands.length>0, action:"navigate('legal-entities')"});
    }
    if (structure==='franchise') {
        tasks.push({num:n++, title:'Set up franchise entities', desc:'Add franchisee legal entities', done:data.les.some(le=>le.is_franchise), action:"navigate('legal-entities')"});
    }
    tasks.push({num:n++, title:'Invite your team', desc:'Add users and assign roles', done:false, action:"navigate('users')"});
    return tasks;
}
