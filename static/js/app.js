// Global application state and navigation
let state = {
    currentOrg: null,
    orgs: [],
    currentPage: 'dashboard',
    tree: null,
};

// Page registry
const pages = {};
function registerPage(name, renderFn) { pages[name] = renderFn; }

// Navigation
function navigate(page, params) {
    state.currentPage = page;
    state.pageParams = params || null;
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    document.getElementById('pageTitle').textContent = getPageTitle(page);
    renderPage();
}

function getPageTitle(page) {
    const titles = {
        dashboard: 'Dashboard',
        hierarchy: 'Hierarchy',
        organization: 'Organisation',
        brands: 'Brands',
        'legal-entities': 'Legal Entities',
        locations: 'Locations',
        'location-groups': 'Location Groups',
        groups: 'Groups',
        users: 'Users',
        roles: 'Roles & Permissions',
        // Manage section
        drivers: 'Drivers',
        devices: 'Devices',
        more: 'More',
        settings: 'Settings',
        taxes: 'Taxes',
        'payment-methods': 'Payment Methods',
        charges: 'Charges',
        'delivery-zones': 'Delivery Zones',
        tags: 'Tags',
        reasons: 'Reasons',
        'kitchen-flows': 'Kitchen Flows',
        'reservation-settings': 'Reservations',
        'online-ordering': 'Online Ordering',
        'pay-at-table': 'Pay at Table',
        notifications: 'Notifications',
        'online-payments': 'Online Payments',
        'delivery-charges': 'Delivery Charges',
        sections: 'Sections',
        tables: 'Tables',
        'revenue-centers': 'Revenue Centers',
        'timed-events': 'Timed Events',
        courses: 'Courses',
        account: 'Account',
        'support-tickets': 'Support Tickets',
    };
    return titles[page] || page;
}

async function renderPage() {
    const container = document.getElementById('pageContainer');
    const renderer = pages[state.currentPage];
    if (renderer) {
        container.innerHTML = '<div style="text-align:center;padding:60px;color:#94A3B8;">Loading...</div>';
        try { await renderer(container); }
        catch (e) { container.innerHTML = `<div style="padding:40px;text-align:center;"><h4 style="color:#DC2626;">Error</h4><p style="color:#6B7280;">${e.message}</p></div>`; }
    }
}

// Org switcher
async function loadOrgs() {
    state.orgs = await api.listOrgs();
    const select = document.getElementById('orgSwitcher');
    select.innerHTML = state.orgs.map(o => `<option value="${o.id}">${o.name}</option>`).join('');

    // Check if redirected from signup with a specific org
    const urlParams = new URLSearchParams(window.location.search);
    const targetOrgId = urlParams.get('org');

    if (state.orgs.length > 0) {
        if (targetOrgId) {
            state.currentOrg = state.orgs.find(o => o.id === targetOrgId) || state.orgs[0];
        } else {
            const enterprise = state.orgs.find(o => o.name.includes('Gulf'));
            state.currentOrg = enterprise || state.orgs[state.orgs.length - 1];
        }
        select.value = state.currentOrg.id;
        document.getElementById('currentOrgName').textContent = state.currentOrg.name;
    }
}

async function switchOrg(orgId) {
    state.currentOrg = state.orgs.find(o => o.id === orgId);
    state.tree = null;
    document.getElementById('currentOrgName').textContent = state.currentOrg.name;
    renderPage();
}

async function loadTree() {
    if (!state.currentOrg) return null;
    if (!state.tree || state.tree._orgId !== state.currentOrg.id) {
        state.tree = await api.getTree(state.currentOrg.id);
        state.tree._orgId = state.currentOrg.id;
    }
    return state.tree;
}

// Modal helpers
function openModal(html) {
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').classList.add('active');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }

// Toast
function toast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = type === 'success' ? '&#10003;' : type === 'error' ? '&#10005;' : '&#8505;';
    el.innerHTML = `<strong>${icon}</strong> ${message}`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

// Helpers
function fmtDate(d) {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function truncId(id) { return id ? id.substring(0, 8) + '...' : '--'; }

// Logout
function logout() {
    localStorage.removeItem('foodics_setup');
    state.currentOrg = null;
    state.orgs = [];
    state.tree = null;
    state.currentPage = 'dashboard';
    state.pageParams = null;
    window.location.href = '/signup';
}

// Boot
document.addEventListener('DOMContentLoaded', async () => {
    await loadOrgs();
    navigate('dashboard');
});
