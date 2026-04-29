// API Client for Foodics Organisation Domain
const API_BASE = '/api/v1';

const api = {
    async get(path) {
        const res = await fetch(`${API_BASE}${path}`);
        if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
        return res.json();
    },
    async post(path, body) {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
        return res.json();
    },
    async put(path, body) {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
        return res.json();
    },
    async del(path) {
        const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
        return res.json();
    },

    // ── Hierarchy ──
    listOrgs:       ()       => api.get('/hierarchy/organisations'),
    getOrg:         (id)     => api.get(`/hierarchy/organisations/${id}`),
    createOrg:      (data)   => api.post('/hierarchy/organisations', data),
    updateOrg:      (id, d)  => api.put(`/hierarchy/organisations/${id}`, d),
    getTree:        (orgId)  => api.get(`/hierarchy/organisations/${orgId}/tree`),

    listGroups:     (orgId)  => api.get(`/hierarchy/organisations/${orgId}/groups`),
    createGroup:    (data)   => api.post('/hierarchy/groups', data),
    updateGroup:    (id, d)  => api.put(`/hierarchy/groups/${id}`, d),

    listBrands:     (orgId)  => api.get(`/hierarchy/organisations/${orgId}/brands`),
    getBrand:       (id)     => api.get(`/hierarchy/brands/${id}`),
    createBrand:    (data)   => api.post('/hierarchy/brands', data),
    updateBrand:    (id, d)  => api.put(`/hierarchy/brands/${id}`, d),
    deleteBrand:    (id)     => api.del(`/hierarchy/brands/${id}`),

    listCountries:  (brandId) => api.get(`/hierarchy/brands/${brandId}/countries`),
    createCountry:  (data)   => api.post('/hierarchy/countries', data),
    updateCountry:  (id, d)  => api.put(`/hierarchy/countries/${id}`, d),

    listLEsByOrg:   (orgId)  => api.get(`/hierarchy/organisations/${orgId}/legal-entities`),
    listLEsByBrand: (bId)    => api.get(`/hierarchy/brands/${bId}/legal-entities`),
    getLE:          (id)     => api.get(`/hierarchy/legal-entities/${id}`),
    createLE:       (data)   => api.post('/hierarchy/legal-entities', data),
    updateLE:       (id, d)  => api.put(`/hierarchy/legal-entities/${id}`, d),
    deleteLE:       (id)     => api.del(`/hierarchy/legal-entities/${id}`),
    getLEBrands:    (leId)   => api.get(`/hierarchy/legal-entities/${leId}/brands`),
    linkBrandLE:    (bId, leId) => api.post('/hierarchy/legal-entities/link-brand', { brand_id: bId, legal_entity_id: leId }),
    unlinkBrandLE:  (bId, leId) => api.post('/hierarchy/legal-entities/unlink-brand', { brand_id: bId, legal_entity_id: leId }),

    listBUs:        (leId)   => api.get(`/hierarchy/legal-entities/${leId}/business-units`),
    createBU:       (data)   => api.post('/hierarchy/business-units', data),
    updateBU:       (id, d)  => api.put(`/hierarchy/business-units/${id}`, d),

    listLGs:        (leId)   => api.get(`/hierarchy/legal-entities/${leId}/location-groups`),
    getLG:          (id)     => api.get(`/hierarchy/location-groups/${id}`),
    createLG:       (data)   => api.post('/hierarchy/location-groups', data),
    updateLG:       (id, d)  => api.put(`/hierarchy/location-groups/${id}`, d),

    listLocations:  (params) => api.get(`/hierarchy/locations${params ? '?' + new URLSearchParams(params) : ''}`),
    getLocation:    (id)     => api.get(`/hierarchy/locations/${id}`),
    createLocation: (data)   => api.post('/hierarchy/locations', data),
    updateLocation: (id, d)  => api.put(`/hierarchy/locations/${id}`, d),
    deleteLocation: (id)     => api.del(`/hierarchy/locations/${id}`),

    getAncestors:          (type, id) => api.get(`/hierarchy/nodes/${type}/${id}/ancestors`),
    getDescendantLocations:(type, id) => api.get(`/hierarchy/nodes/${type}/${id}/locations`),

    // ── Config ──
    setConfig:      (data)         => api.post('/config/settings', data),
    listSettings:   (type, id)     => api.get(`/config/settings/${type}/${id}`),
    resolveConfig:  (type, id)     => api.get(`/config/resolve/${type}/${id}`),
    resolveSetting: (type, id, key)=> api.get(`/config/resolve/${type}/${id}/${key}`),

    // ── Users ──
    listUsers:      (orgId) => api.get(`/users/organisations/${orgId}/users`),
    getUser:        (id)    => api.get(`/users/${id}`),
    inviteUser:     (orgId, data) => api.post(`/users/organisations/${orgId}/invite`, data),
    activateUser:   (mobile, otp) => api.post(`/users/activate?mobile_number=${encodeURIComponent(mobile)}&otp=${otp}`),
    offboardUser:   (id)    => api.post(`/users/${id}/offboard`),
    getUserAssignments:    (id) => api.get(`/users/${id}/assignments`),
    getAccessibleLocations:(id) => api.get(`/users/${id}/accessible-locations`),

    // ── Roles ──
    listRoles:      (orgId) => api.get(`/users/roles${orgId ? '?organisation_id=' + orgId : ''}`),
    createRole:     (data)  => api.post('/users/roles', data),
    assignRole:     (data)  => api.post('/users/role-assignments', data),

    // ── Delegations ──
    createDelegation:    (data)  => api.post('/delegations/', data),
    listDelegationsOut:  (orgId) => api.get(`/delegations/delegator/${orgId}`),
    listDelegationsIn:   (orgId) => api.get(`/delegations/receiver/${orgId}`),
    revokeDelegation:    (id, userId) => api.post(`/delegations/${id}/revoke?revoked_by=${userId}`),

    // ── Manage (generic CRUD per entity-key) ──
    manageList:   (key, orgId)   => api.get(`/manage/organisations/${orgId}/${key}`),
    manageGet:    (key, id)      => api.get(`/manage/${key}/${id}`),
    manageCreate: (key, data)    => api.post(`/manage/${key}`, data),
    manageUpdate: (key, id, d)   => api.put(`/manage/${key}/${id}`, d),
    manageDelete: (key, id)      => api.del(`/manage/${key}/${id}`),

    // ── Settings (8-tab JSON blob per category) ──
    listSettingsCategories: ()                   => api.get('/manage/settings/categories'),
    listOrgSettings:        (orgId)              => api.get(`/manage/organisations/${orgId}/settings`),
    getOrgSettings:         (orgId, category)    => api.get(`/manage/organisations/${orgId}/settings/${category}`),
    saveOrgSettings:        (orgId, category, settings) =>
        api.put(`/manage/organisations/${orgId}/settings/${category}`, {
            organisation_id: orgId, category, settings,
        }),
};

// Manage entity registry — single source of truth for the Manage UI.
// `key` matches the backend route segment, `singular` is used in modal titles.
const MANAGE_ENTITIES = {
    drivers: {
        key: 'drivers', label: 'Drivers', singular: 'Driver', section: 'sidebar',
        fields: [
            { name: 'name',           label: 'Name',           type: 'text',   required: true },
            { name: 'mobile_number',  label: 'Mobile Number',  type: 'text' },
            { name: 'vehicle_type',   label: 'Vehicle',        type: 'select', options: ['car','motorcycle','bicycle','van'] },
            { name: 'license_plate',  label: 'License Plate',  type: 'text' },
            { name: 'is_active',      label: 'Active',         type: 'checkbox', default: true },
        ],
    },
    devices: {
        key: 'devices', label: 'Devices', singular: 'Device', section: 'sidebar',
        fields: [
            { name: 'name',           label: 'Name',           type: 'text',   required: true },
            { name: 'device_type',    label: 'Type',           type: 'select', options: ['pos','printer','kds','customer_display'] },
            { name: 'serial_number',  label: 'Serial Number',  type: 'text' },
            { name: 'model',          label: 'Model',          type: 'text' },
        ],
    },
    taxes: {
        key: 'taxes', label: 'Taxes', singular: 'Tax', section: 'more', group: 'Fiscal',
        fields: [
            { name: 'name',     label: 'Name',     type: 'text',   required: true },
            { name: 'rate',     label: 'Rate (%)', type: 'number', step: '0.01' },
            { name: 'tax_type', label: 'Type',     type: 'select', options: ['vat','excise','other'] },
            { name: 'is_active',label: 'Active',   type: 'checkbox', default: true },
        ],
    },
    'payment-methods': {
        key: 'payment-methods', label: 'Payment Methods', singular: 'Payment Method', section: 'more', group: 'Payments',
        fields: [
            { name: 'name',        label: 'Name',     type: 'text',   required: true },
            { name: 'method_type', label: 'Type',     type: 'select', options: ['cash','card','wallet','online','voucher'] },
            { name: 'is_default',  label: 'Default',  type: 'checkbox' },
            { name: 'is_active',   label: 'Active',   type: 'checkbox', default: true },
        ],
    },
    charges: {
        key: 'charges', label: 'Charges', singular: 'Charge', section: 'more', group: 'Fiscal',
        fields: [
            { name: 'name',        label: 'Name',        type: 'text',   required: true },
            { name: 'charge_type', label: 'Type',        type: 'select', options: ['service','extra'] },
            { name: 'amount_type', label: 'Amount Type', type: 'select', options: ['percent','fixed'] },
            { name: 'amount',      label: 'Amount',      type: 'number', step: '0.01' },
            { name: 'applies_to',  label: 'Applies To',  type: 'select', options: ['order','item'] },
        ],
    },
    'delivery-zones': {
        key: 'delivery-zones', label: 'Delivery Zones', singular: 'Delivery Zone', section: 'more', group: 'Delivery',
        fields: [
            { name: 'name',          label: 'Name',          type: 'text',   required: true },
            { name: 'delivery_fee',  label: 'Delivery Fee',  type: 'number', step: '0.01' },
            { name: 'minimum_order', label: 'Minimum Order', type: 'number', step: '0.01' },
            { name: 'polygon',       label: 'Polygon (GeoJSON)', type: 'textarea' },
        ],
    },
    tags: {
        key: 'tags', label: 'Tags', singular: 'Tag', section: 'more', group: 'Catalog',
        fields: [
            { name: 'name',       label: 'Name',       type: 'text',   required: true },
            { name: 'color',      label: 'Color',      type: 'color',  default: '#6366F1' },
            // Spec §9: tags are scoped per entity type to avoid cross-entity pollution.
            { name: 'applies_to', label: 'Applies To', type: 'select', options: ['branch','customer','inventory_item','supplier','user','order','product'] },
        ],
    },
    reasons: {
        key: 'reasons', label: 'Reasons', singular: 'Reason', section: 'more', group: 'Catalog',
        fields: [
            { name: 'name',        label: 'Name',     type: 'text',   required: true },
            // Spec §10: 5 categories (void, return, quantity_adjustment, drawer_operation, customer_blacklist).
            { name: 'reason_type', label: 'Type',     type: 'select', options: ['void','return','quantity_adjustment','drawer_operation','customer_blacklist'] },
            { name: 'is_active',   label: 'Active',   type: 'checkbox', default: true },
        ],
    },
    'kitchen-flows': {
        key: 'kitchen-flows', label: 'Kitchen Flows', singular: 'Kitchen Flow', section: 'more', group: 'Operations',
        fields: [
            { name: 'name',           label: 'Name',           type: 'text',     required: true },
            { name: 'routing_rules',  label: 'Routing Rules (JSON)', type: 'textarea' },
        ],
    },
    'reservation-settings': {
        key: 'reservation-settings', label: 'Reservations', singular: 'Reservation Setting', section: 'more', group: 'Operations',
        fields: [
            { name: 'name',                  label: 'Name',                  type: 'text',     required: true },
            { name: 'is_enabled',            label: 'Enabled',               type: 'checkbox' },
            // Spec §12: minimum 30 minutes — enforced server-side.
            { name: 'slot_duration_minutes', label: 'Slot Duration (min, ≥30)', type: 'number' },
            { name: 'max_party_size',        label: 'Max Party Size',        type: 'number' },
            { name: 'opening_time',          label: 'Opening Time',          type: 'text', placeholder: 'HH:MM' },
            { name: 'closing_time',          label: 'Closing Time',          type: 'text', placeholder: 'HH:MM' },
            { name: 'days_of_week',          label: 'Days of Week',          type: 'text', placeholder: 'mon,tue,...' },
            { name: 'auto_accept_online',    label: 'Auto-accept online',    type: 'checkbox' },
            { name: 'table_ids',             label: 'Reservable Tables',     type: 'text', placeholder: 'comma-sep table IDs' },
        ],
    },
    'online-ordering': {
        key: 'online-ordering', label: 'Online Ordering', singular: 'Online Ordering Channel', section: 'more', group: 'Channels',
        fields: [
            { name: 'name',               label: 'Name',                type: 'text',     required: true },
            { name: 'is_enabled',         label: 'Enabled',             type: 'checkbox' },
            { name: 'storefront_url',     label: 'Storefront URL',      type: 'text' },
            { name: 'auto_accept_orders', label: 'Auto-accept orders',  type: 'checkbox' },
        ],
    },
    'pay-at-table': {
        key: 'pay-at-table', label: 'Pay at Table', singular: 'Pay at Table Config', section: 'more', group: 'Channels',
        fields: [
            { name: 'name',             label: 'Name',             type: 'text',     required: true },
            { name: 'is_enabled',       label: 'Enabled',          type: 'checkbox' },
            { name: 'qr_code_url',      label: 'QR Code URL',      type: 'text' },
            { name: 'accepted_methods', label: 'Accepted Methods', type: 'text', placeholder: 'card,wallet' },
        ],
    },
    notifications: {
        key: 'notifications', label: 'Notifications', singular: 'Notification Rule', section: 'more', group: 'Operations',
        fields: [
            { name: 'name',       label: 'Rule Name',  type: 'text', required: true },
            { name: 'event_type', label: 'Trigger',    type: 'select', options: ['order_received','order_voided','order_returned','low_stock','transfer_approved','po_approved','daily_summary','system_update'] },
            // Spec §14: email is the default channel; in_app/SMS/push are open questions per the doc.
            { name: 'channel',    label: 'Channel',    type: 'select', options: ['email','in_app','sms','push'] },
            { name: 'frequency',  label: 'Frequency',  type: 'select', options: ['immediate','hourly','daily','weekly'] },
            { name: 'apply_on',   label: 'Apply-on (JSON)', type: 'textarea', placeholder: '[{"branch_id":"..."}]' },
            { name: 'is_enabled', label: 'Enabled',    type: 'checkbox', default: true },
            { name: 'recipients', label: 'Recipients', type: 'text', placeholder: 'comma-separated emails / user IDs' },
        ],
    },
    'online-payments': {
        key: 'online-payments', label: 'Online Payments', singular: 'Online Payment Gateway', section: 'more', group: 'Payments',
        fields: [
            { name: 'name',          label: 'Name',          type: 'text', required: true },
            { name: 'provider',      label: 'Provider',      type: 'select', options: ['stripe','hyperpay','checkout','tap','tabby','tamara'] },
            { name: 'api_key',       label: 'API Key',       type: 'text' },
            { name: 'public_key',    label: 'Public Key',    type: 'text' },
            { name: 'is_test_mode',  label: 'Test Mode',     type: 'checkbox', default: true },
            { name: 'is_active',     label: 'Active',        type: 'checkbox', default: true },
        ],
    },
    'delivery-charges': {
        key: 'delivery-charges', label: 'Delivery Charges', singular: 'Delivery Charge', section: 'more', group: 'Delivery',
        fields: [
            { name: 'name',                 label: 'Name',                  type: 'text', required: true },
            { name: 'amount',               label: 'Amount',                type: 'number', step: '0.01' },
            { name: 'min_order_threshold',  label: 'Free above threshold (min order)', type: 'number', step: '0.01' },
            { name: 'free_above_threshold', label: 'Free above threshold', type: 'checkbox' },
        ],
    },
    // ───── New entities from Spec §3 / §5 / §8 / §11 ────────────────────
    sections: {
        key: 'sections', label: 'Sections', singular: 'Section', section: 'more', group: 'Floor',
        fields: [
            { name: 'name',       label: 'Name',       type: 'text', required: true },
            { name: 'sort_order', label: 'Sort Order', type: 'number' },
        ],
    },
    tables: {
        key: 'tables', label: 'Tables', singular: 'Table', section: 'more', group: 'Floor',
        fields: [
            { name: 'name',       label: 'Name',       type: 'text', required: true },
            { name: 'capacity',   label: 'Capacity',   type: 'number' },
            { name: 'section_id', label: 'Section ID', type: 'text', placeholder: 'optional' },
        ],
    },
    'revenue-centers': {
        key: 'revenue-centers', label: 'Revenue Centers', singular: 'Revenue Center', section: 'more', group: 'Operations',
        fields: [
            { name: 'name',         label: 'Name',                  type: 'text', required: true },
            { name: 'section_ids',  label: 'Section IDs (csv)',     type: 'text' },
            { name: 'table_ids',    label: 'Table IDs (csv)',       type: 'text' },
            { name: 'device_ids',   label: 'Device IDs (csv)',      type: 'text' },
        ],
    },
    'timed-events': {
        key: 'timed-events', label: 'Timed Events', singular: 'Timed Event', section: 'more', group: 'Catalog',
        fields: [
            { name: 'name',       label: 'Name',       type: 'text', required: true },
            { name: 'event_type', label: 'Type',       type: 'select', options: ['reduce_price_percent','reduce_price_fixed','increase_price_percent','increase_price_fixed','activate_products','promotion'] },
            { name: 'value',      label: 'Value',      type: 'number', step: '0.01' },
            { name: 'is_active',  label: 'Active',     type: 'checkbox', default: true },
        ],
    },
    courses: {
        key: 'courses', label: 'Courses', singular: 'Course', section: 'more', group: 'Operations',
        fields: [
            { name: 'name',       label: 'Name',       type: 'text', required: true },
            { name: 'sort_order', label: 'Sort Order', type: 'number' },
        ],
    },
};

// Settings tabs (Manage → More → Settings) — stable order matching the doc.
const SETTINGS_TABS = [
    { key: 'receipt',                label: 'Receipt' },
    { key: 'call_center',            label: 'Call Center' },
    { key: 'cashier_app',            label: 'Cashier App' },
    { key: 'display_app',            label: 'Display App' },
    { key: 'kitchen',                label: 'Kitchen' },
    { key: 'payment_integrations',   label: 'Payment Integrations' },
    { key: 'sms_providers',          label: 'SMS Providers' },
    { key: 'inventory_transactions', label: 'Inventory Transactions' },
];
