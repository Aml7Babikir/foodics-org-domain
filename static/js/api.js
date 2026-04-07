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
};
