// Settings page (Manage → More → Settings) — 8 tabs, JSON blob per tab.
//
// Each tab declares the fields it shows. Values round-trip via the backend
// /manage/organisations/{org}/settings/{category} endpoint as a JSON blob.

const SETTINGS_FIELDS = {
    // Business — moved here from Account → Business Details → Settings.
    // Stored directly on the Organisation row (not a JSON blob).
    business: [
        { name: 'time_zone',                            label: 'Time Zone',                                 type: 'text',     placeholder: 'Asia/Riyadh' },
        { name: 'tax_inclusive_pricing',                label: 'Tax Inclusive Pricing',                     type: 'checkbox', default: true },
        { name: 'enable_localization',                  label: 'Enable Localization',                       type: 'checkbox' },
        { name: 'restrict_purchased_items_to_supplier', label: 'Restrict Purchased Items To Supplier',      type: 'checkbox' },
        { name: 'enable_insurance_products',            label: 'Enable Insurance Products (Non-Revenue)',   type: 'checkbox' },
        { name: 'two_factor_enabled',                   label: 'Two-Factor Authentication (Google Auth.)',  type: 'checkbox' },
    ],
    receipt: [
        { name: 'logo_url',          label: 'Logo URL',         type: 'text' },
        { name: 'print_language',    label: 'Print Language',   type: 'select', options: ['main','localized','both'], default: 'main' },
        { name: 'main_language',     label: 'Main Language',    type: 'text', placeholder: 'en' },
        { name: 'localized_language',label: 'Localized Language', type: 'text', placeholder: 'ar' },
        { name: 'header_text',       label: 'Header Text',      type: 'textarea' },
        { name: 'footer_text',       label: 'Footer Text',      type: 'textarea' },
    ],
    call_center: [
        { name: 'enabled',                 label: 'Call Center Enabled', type: 'checkbox', default: false },
        { name: 'default_order_type',      label: 'Default Order Type',  type: 'select', options: ['pickup','delivery','dine_in'] },
        { name: 'order_routing',           label: 'Order Routing',       type: 'select', options: ['nearest_branch','manual','round_robin'] },
        { name: 'auto_accept',             label: 'Auto-accept calls',   type: 'checkbox' },
    ],
    cashier_app: [
        { name: 'allow_tipping',           label: 'Allow tipping',       type: 'checkbox', default: true },
        { name: 'default_tip_percentages', label: 'Default Tip %',       type: 'text', placeholder: '5,10,15' },
        { name: 'show_change',             label: 'Show change calc',    type: 'checkbox', default: true },
        { name: 'prompt_customer',         label: 'Prompt customer info',type: 'checkbox' },
        { name: 'order_flow',              label: 'Order Flow',          type: 'select', options: ['standard','quick_serve','table_service'] },
    ],
    display_app: [
        { name: 'show_items',              label: 'Show items on customer display', type: 'checkbox', default: true },
        { name: 'show_totals',             label: 'Show totals',         type: 'checkbox', default: true },
        { name: 'show_branding',           label: 'Show branding',       type: 'checkbox', default: true },
        { name: 'promotional_url',         label: 'Promotional content URL', type: 'text' },
    ],
    kitchen: [
        { name: 'kds_enabled',             label: 'KDS Enabled',         type: 'checkbox' },
        { name: 'group_items',             label: 'Group identical items', type: 'checkbox', default: true },
        { name: 'course_timing',           label: 'Course timing (sec)', type: 'number' },
        { name: 'station_routing',         label: 'Station Routing',     type: 'select', options: ['by_category','by_modifier','manual'] },
    ],
    payment_integrations: [
        { name: 'terminal_provider',       label: 'Terminal Provider',   type: 'select', options: ['none','geidea','network_intl','ingenico'] },
        { name: 'gateway_provider',        label: 'Gateway Provider',    type: 'select', options: ['none','stripe','hyperpay','checkout','tap'] },
        { name: 'connection_mode',         label: 'Connection Mode',     type: 'select', options: ['cloud','local'] },
        { name: 'merchant_id',             label: 'Merchant ID',         type: 'text' },
    ],
    sms_providers: [
        { name: 'provider',                label: 'Provider',            type: 'select', options: ['none','unifonic','msg91','twilio','msegat'] },
        { name: 'sender_id',               label: 'Sender ID',           type: 'text' },
        { name: 'api_key',                 label: 'API Key',             type: 'text' },
        { name: 'use_for_otp',             label: 'Use for OTP',         type: 'checkbox', default: true },
        { name: 'use_for_order_confirm',   label: 'Use for order confirmations', type: 'checkbox', default: true },
    ],
    inventory_transactions: [
        { name: 'transfer_requires_approval',     label: 'Transfers require approval',  type: 'checkbox', default: true },
        { name: 'po_requires_approval',           label: 'POs require approval',        type: 'checkbox', default: true },
        { name: 'production_requires_approval',   label: 'Production requires approval',type: 'checkbox' },
        { name: 'waste_requires_approval',        label: 'Waste requires approval',     type: 'checkbox', default: true },
        { name: 'auto_post_on_approval',          label: 'Auto-post on approval',       type: 'checkbox', default: true },
    ],
};

(function () {
    function renderInput(f, val) {
        const v = val !== undefined && val !== null ? val : (f.default !== undefined ? f.default : '');
        const id = `set_${f.name}`;
        const placeholder = f.placeholder ? `placeholder="${f.placeholder}"` : '';
        switch (f.type) {
            case 'select':
                return `<select class="form-select" id="${id}">
                    ${f.options.map(o => `<option value="${o}" ${o === v ? 'selected' : ''}>${o}</option>`).join('')}
                </select>`;
            case 'checkbox':
                return `<label style="display:inline-flex;align-items:center;gap:8px;">
                    <input type="checkbox" id="${id}" ${v ? 'checked' : ''}> Yes
                </label>`;
            case 'number':
                return `<input class="form-input" id="${id}" type="number" ${placeholder} value="${v ?? ''}">`;
            case 'textarea':
                return `<textarea class="form-input" id="${id}" rows="3" ${placeholder}>${v || ''}</textarea>`;
            default:
                return `<input class="form-input" id="${id}" type="text" ${placeholder} value="${v ?? ''}">`;
        }
    }

    function readInput(f) {
        const el = document.getElementById(`set_${f.name}`);
        if (!el) return undefined;
        if (f.type === 'checkbox') return el.checked;
        if (f.type === 'number') return el.value === '' ? null : Number(el.value);
        return el.value;
    }

    let activeTab = 'business';

    async function loadStoredForTab(tab) {
        // Returns the {fieldName: value} dict for the tab's current values.
        if (tab.kind === 'org-fields') {
            const org = await api.getOrg(state.currentOrg.id);
            return org;
        }
        if (tab.kind === 'user-prefs') {
            const users = await api.listUsers(state.currentOrg.id);
            const me = users[0];
            return { _user: me, ...(me && me.notification_preferences ? me.notification_preferences : {}) };
        }
        // blob
        try {
            const res = await api.getOrgSettings(state.currentOrg.id, tab.key);
            return res.settings || {};
        } catch (e) { return {}; }
    }

    function renderNotificationsTab(container, tabKey, stored) {
        const me = stored._user;
        if (!me) {
            container.innerHTML = '<div class="empty-state"><p>No users in this organisation.</p></div>';
            return;
        }
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Notifications — ${me.name}</h3>
                    <div style="display:flex;align-items:center;gap:16px;">
                        <label style="display:inline-flex;align-items:center;gap:8px;">
                            <input type="checkbox" id="set_toggle_all" onclick="window._settingsToggleAll(this.checked)">
                            <span class="text-sm">Toggle All</span>
                        </label>
                        <button class="btn btn-primary btn-sm" onclick="window._settingsSaveNotifPrefs('${me.id}')">Save Changes</button>
                    </div>
                </div>
                <div class="card-body">
                    <p class="text-sm text-muted" style="margin-bottom:12px;">Subscribe to inventory event alerts. Notifications are sent via email.</p>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        ${INVENTORY_NOTIFICATION_EVENTS.map(ev => `
                            <label style="display:flex;align-items:center;gap:8px;padding:6px;border-radius:6px;">
                                <input type="checkbox" data-pref="${ev.key}" ${stored[ev.key] ? 'checked' : ''}>
                                <span class="text-sm">${ev.label}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        window._settingsToggleAll = (checked) => {
            document.querySelectorAll('[data-pref]').forEach(el => { el.checked = checked; });
        };
        window._settingsSaveNotifPrefs = async (userId) => {
            const prefs = {};
            document.querySelectorAll('[data-pref]').forEach(el => { prefs[el.dataset.pref] = el.checked; });
            try {
                await api.updateProfile(userId, { notification_preferences: prefs });
                toast('Notification preferences saved');
            } catch (e) { toast(e.message, 'error'); }
        };
    }

    async function renderTab(container, tabKey) {
        activeTab = tabKey;
        const tab = SETTINGS_TABS.find(t => t.key === tabKey);
        const fields = SETTINGS_FIELDS[tabKey] || [];
        const stored = await loadStoredForTab(tab);

        const tabBar = SETTINGS_TABS.map(t => `
            <button class="settings-tab ${t.key === tabKey ? 'active' : ''}"
                    style="padding:8px 14px;border:1px solid var(--border);background:${t.key === tabKey ? '#1F2937' : 'white'};color:${t.key === tabKey ? 'white' : 'inherit'};border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;"
                    onclick="window._settingsSwitchTab('${t.key}')">${t.label}</button>
        `).join('');

        container.innerHTML = `
            <div style="margin-bottom:16px;">
                <h3 style="margin:0;">Settings</h3>
                <p class="text-sm text-muted" style="margin-top:4px;">Business profile, notifications, and POS / kitchen / back-office behaviour.</p>
            </div>

            <div class="nav-section-title" style="margin:0 0 8px;">Device Management</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:24px;">
                <div class="card" style="cursor:pointer;" onclick="navigate('devices')">
                    <div class="card-body">
                        <div style="font-weight:600;">Devices</div>
                        <div class="text-sm text-muted" style="margin-top:4px;">POS, printers, KDS, customer display</div>
                    </div>
                </div>
                <div class="card" style="cursor:pointer;" onclick="navigate('kitchen-flows')">
                    <div class="card-body">
                        <div style="font-weight:600;">Kitchen Flows</div>
                        <div class="text-sm text-muted" style="margin-top:4px;">Routing rules per station / printer</div>
                    </div>
                </div>
                <div class="card" style="cursor:pointer;" onclick="navigate('notifications')">
                    <div class="card-body">
                        <div style="font-weight:600;">Notification Rules</div>
                        <div class="text-sm text-muted" style="margin-top:4px;">Org-wide email alerts (Spec §14)</div>
                    </div>
                </div>
            </div>

            <div class="nav-section-title" style="margin:0 0 8px;">Configuration</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">${tabBar}</div>

            <div id="settingsTabBody"></div>
        `;

        const body = document.getElementById('settingsTabBody');
        if (tab.kind === 'user-prefs') {
            renderNotificationsTab(body, tabKey, stored);
            return;
        }

        // Both 'org-fields' and 'blob' use the same field-rendering form.
        body.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>${tab.label}</h3>
                    <button class="btn btn-primary btn-sm" onclick="window._settingsSave('${tabKey}')">Save Changes</button>
                </div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                        ${fields.map(f => `
                            <div class="form-group">
                                <label class="form-label">${f.label}</label>
                                ${renderInput(f, stored[f.name])}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    window._settingsSwitchTab = (tabKey) => {
        renderTab(document.getElementById('pageContainer'), tabKey);
    };

    window._settingsSave = async (tabKey) => {
        const tab = SETTINGS_TABS.find(t => t.key === tabKey);
        const fields = SETTINGS_FIELDS[tabKey] || [];
        const data = {};
        for (const f of fields) {
            const v = readInput(f);
            if (v !== undefined) data[f.name] = v;
        }
        try {
            if (tab.kind === 'org-fields') {
                await api.updateOrg(state.currentOrg.id, data);
            } else {
                await api.saveOrgSettings(state.currentOrg.id, tabKey, data);
            }
            toast('Settings saved');
        } catch (e) {
            toast(e.message, 'error');
        }
    };

    registerPage('settings', async (container) => {
        if (!state.currentOrg) {
            container.innerHTML = '<div class="empty-state"><h4>No organisation selected</h4></div>';
            return;
        }
        await renderTab(container, activeTab);
    });
})();
