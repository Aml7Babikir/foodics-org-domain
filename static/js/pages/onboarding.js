let onboardingState = {
    step: 1,
    segment: null,
    orgName: '',
    billingEmail: '',
    brandName: '',
    countryName: '',
    countryISO: '',
    currency: 'SAR',
    legalEntityName: '',
    vatNumber: '',
    taxMode: 'inclusive',
    locationName: '',
    locationCity: '',
};

registerPage('onboarding', async (container) => {
    onboardingState = { step: 1, segment: null, orgName: '', billingEmail: '', brandName: '', countryName: '', countryISO: '', currency: 'SAR', legalEntityName: '', vatNumber: '', taxMode: 'inclusive', locationName: '', locationCity: '' };
    renderOnboarding(container);
});

function renderOnboarding(container) {
    const s = onboardingState;

    container.innerHTML = `
        <!-- Wizard Steps -->
        <div class="wizard-steps">
            <div class="wizard-step ${s.step >= 1 ? (s.step > 1 ? 'completed' : 'active') : ''}">
                <div class="wizard-step-number">${s.step > 1 ? '✓' : '1'}</div>
                <span class="wizard-step-label">Segment</span>
            </div>
            <div class="wizard-step-divider"></div>
            <div class="wizard-step ${s.step >= 2 ? (s.step > 2 ? 'completed' : 'active') : ''}">
                <div class="wizard-step-number">${s.step > 2 ? '✓' : '2'}</div>
                <span class="wizard-step-label">Organisation</span>
            </div>
            <div class="wizard-step-divider"></div>
            <div class="wizard-step ${s.step >= 3 ? (s.step > 3 ? 'completed' : 'active') : ''}">
                <div class="wizard-step-number">${s.step > 3 ? '✓' : '3'}</div>
                <span class="wizard-step-label">Brand & Legal</span>
            </div>
            <div class="wizard-step-divider"></div>
            <div class="wizard-step ${s.step >= 4 ? (s.step > 4 ? 'completed' : 'active') : ''}">
                <div class="wizard-step-number">${s.step > 4 ? '✓' : '4'}</div>
                <span class="wizard-step-label">Location</span>
            </div>
            <div class="wizard-step-divider"></div>
            <div class="wizard-step ${s.step >= 5 ? 'active' : ''}">
                <div class="wizard-step-number">5</div>
                <span class="wizard-step-label">Complete</span>
            </div>
        </div>

        <div class="card" style="max-width:720px;margin:0 auto;">
            <div class="card-body" id="onboardingStepContent">
                ${renderOnboardingStep()}
            </div>
        </div>
    `;
}

function renderOnboardingStep() {
    const s = onboardingState;

    if (s.step === 1) {
        return `
            <h3 style="text-align:center;margin-bottom:8px;">What type of merchant are you onboarding?</h3>
            <p style="text-align:center;color:#64748B;margin-bottom:24px;">This determines which hierarchy levels will be pre-configured.</p>
            <div class="segment-cards">
                <div class="segment-card ${s.segment === 'micro' ? 'selected' : ''}" onclick="selectSegment('micro')">
                    <div class="segment-icon" style="background:#EDE9FE;color:#6D28D9;">☕</div>
                    <h4>Micro</h4>
                    <p>1–2 outlets, single owner</p>
                </div>
                <div class="segment-card ${s.segment === 'sme' ? 'selected' : ''}" onclick="selectSegment('sme')">
                    <div class="segment-icon" style="background:#DBEAFE;color:#2563EB;">🍔</div>
                    <h4>Growing Chain</h4>
                    <p>3–15 outlets, one brand</p>
                </div>
                <div class="segment-card ${s.segment === 'midmarket' ? 'selected' : ''}" onclick="selectSegment('midmarket')">
                    <div class="segment-icon" style="background:#D1FAE5;color:#059669;">🏢</div>
                    <h4>Mid-Market</h4>
                    <p>16–100 outlets, multi-brand</p>
                </div>
                <div class="segment-card ${s.segment === 'enterprise' ? 'selected' : ''}" onclick="selectSegment('enterprise')">
                    <div class="segment-icon" style="background:#FEF3C7;color:#D97706;">🌍</div>
                    <h4>Enterprise</h4>
                    <p>100+ outlets, multi-country</p>
                </div>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:24px;">
                <button class="btn btn-primary" onclick="nextOnboardingStep()" ${!s.segment ? 'disabled style="opacity:0.5"' : ''}>Next</button>
            </div>
        `;
    }

    if (s.step === 2) {
        return `
            <h3 style="margin-bottom:20px;">Organisation Details</h3>
            <p class="text-sm text-muted mb-4">This is the top-level account. It owns the Foodics contract and billing relationship.</p>
            <div class="form-group">
                <label class="form-label">Organisation Name</label>
                <input class="form-input" id="obOrgName" value="${s.orgName}" placeholder="e.g. Gulf Restaurant Holdings">
            </div>
            <div class="form-group">
                <label class="form-label">Billing Email</label>
                <input class="form-input" id="obBillingEmail" value="${s.billingEmail}" placeholder="finance@company.com" type="email">
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:24px;">
                <button class="btn btn-secondary" onclick="prevOnboardingStep()">Back</button>
                <button class="btn btn-primary" onclick="nextOnboardingStep()">Next</button>
            </div>
        `;
    }

    if (s.step === 3) {
        return `
            <h3 style="margin-bottom:20px;">Brand & Legal Entity</h3>
            <p class="text-sm text-muted mb-4">Set up your first brand (restaurant concept) and legal entity (registered company).</p>
            <div class="form-group">
                <label class="form-label">Brand Name</label>
                <input class="form-input" id="obBrandName" value="${s.brandName}" placeholder="e.g. BurgerX">
                <div class="form-hint">The customer-facing identity of your restaurant concept</div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Country</label>
                    <input class="form-input" id="obCountryName" value="${s.countryName || 'KSA'}" placeholder="e.g. KSA">
                </div>
                <div class="form-group">
                    <label class="form-label">Country ISO Code</label>
                    <input class="form-input" id="obCountryISO" value="${s.countryISO || 'SAU'}" placeholder="e.g. SAU">
                </div>
            </div>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #E2E8F0;">
            <div class="form-group">
                <label class="form-label">Legal Entity Name</label>
                <input class="form-input" id="obLEName" value="${s.legalEntityName}" placeholder="e.g. BurgerX KSA LLC">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Currency</label>
                    <select class="form-select" id="obCurrency">
                        <option value="SAR" ${s.currency==='SAR'?'selected':''}>SAR — Saudi Riyal</option>
                        <option value="AED" ${s.currency==='AED'?'selected':''}>AED — UAE Dirham</option>
                        <option value="EGP" ${s.currency==='EGP'?'selected':''}>EGP — Egyptian Pound</option>
                        <option value="USD" ${s.currency==='USD'?'selected':''}>USD — US Dollar</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Tax Mode</label>
                    <select class="form-select" id="obTaxMode">
                        <option value="inclusive" ${s.taxMode==='inclusive'?'selected':''}>Inclusive</option>
                        <option value="exclusive" ${s.taxMode==='exclusive'?'selected':''}>Exclusive</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">VAT Registration Number</label>
                <input class="form-input" id="obVAT" value="${s.vatNumber}" placeholder="e.g. 3102XXXXXX">
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:24px;">
                <button class="btn btn-secondary" onclick="prevOnboardingStep()">Back</button>
                <button class="btn btn-primary" onclick="nextOnboardingStep()">Next</button>
            </div>
        `;
    }

    if (s.step === 4) {
        return `
            <h3 style="margin-bottom:20px;">First Location</h3>
            <p class="text-sm text-muted mb-4">Set up your first outlet. You can add more locations later.</p>
            <div class="form-group">
                <label class="form-label">Location Name</label>
                <input class="form-input" id="obLocName" value="${s.locationName}" placeholder="e.g. BurgerX — Riyadh Park Mall">
            </div>
            <div class="form-group">
                <label class="form-label">City</label>
                <input class="form-input" id="obLocCity" value="${s.locationCity}" placeholder="e.g. Riyadh">
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:24px;">
                <button class="btn btn-secondary" onclick="prevOnboardingStep()">Back</button>
                <button class="btn btn-success" onclick="submitOnboarding()">Create Organisation</button>
            </div>
        `;
    }

    if (s.step === 5) {
        return `
            <div style="text-align:center;padding:40px 0;">
                <div style="width:64px;height:64px;border-radius:50%;background:#D1FAE5;color:#059669;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;">✓</div>
                <h3 style="margin-bottom:8px;">Organisation Created!</h3>
                <p class="text-muted" style="margin-bottom:24px;">
                    <strong>${s.orgName}</strong> has been set up with brand <strong>${s.brandName}</strong> and location <strong>${s.locationName}</strong>.
                </p>
                <div class="flow-timeline" style="text-align:left;max-width:400px;margin:0 auto 24px;">
                    <div class="flow-step">
                        <div class="flow-step-dot done">✓</div>
                        <h4>Organisation created</h4>
                        <p>${s.orgName} — ${s.segment} segment</p>
                    </div>
                    <div class="flow-step">
                        <div class="flow-step-dot done">✓</div>
                        <h4>Brand & Legal Entity configured</h4>
                        <p>${s.brandName} — ${s.legalEntityName}</p>
                    </div>
                    <div class="flow-step">
                        <div class="flow-step-dot done">✓</div>
                        <h4>First location added</h4>
                        <p>${s.locationName}, ${s.locationCity}</p>
                    </div>
                    <div class="flow-step">
                        <div class="flow-step-dot active">→</div>
                        <h4>Next: Invite your team</h4>
                        <p>Add users and assign roles</p>
                    </div>
                </div>
                <div class="flex gap-3" style="justify-content:center;">
                    <button class="btn btn-primary" onclick="loadOrgs().then(()=>{navigate('users')})">Invite Users</button>
                    <button class="btn btn-secondary" onclick="loadOrgs().then(()=>{navigate('hierarchy')})">View Hierarchy</button>
                </div>
            </div>
        `;
    }
}

function selectSegment(seg) {
    onboardingState.segment = seg;
    renderOnboarding(document.getElementById('pageContainer'));
}

function nextOnboardingStep() {
    const s = onboardingState;
    if (s.step === 1 && !s.segment) return;
    if (s.step === 2) {
        s.orgName = document.getElementById('obOrgName').value;
        s.billingEmail = document.getElementById('obBillingEmail').value;
        if (!s.orgName) { toast('Organisation name is required', 'error'); return; }
    }
    if (s.step === 3) {
        s.brandName = document.getElementById('obBrandName').value;
        s.legalEntityName = document.getElementById('obLEName').value;
        s.currency = document.getElementById('obCurrency').value;
        s.taxMode = document.getElementById('obTaxMode').value;
        s.vatNumber = document.getElementById('obVAT').value;
        if (document.getElementById('obCountryName')) {
            s.countryName = document.getElementById('obCountryName').value;
            s.countryISO = document.getElementById('obCountryISO').value;
        }
        if (!s.brandName) { toast('Brand name is required', 'error'); return; }
        if (!s.legalEntityName) { toast('Legal entity name is required', 'error'); return; }
    }
    s.step++;
    renderOnboarding(document.getElementById('pageContainer'));
}

function prevOnboardingStep() {
    onboardingState.step--;
    renderOnboarding(document.getElementById('pageContainer'));
}

async function submitOnboarding() {
    const s = onboardingState;
    s.locationName = document.getElementById('obLocName').value;
    s.locationCity = document.getElementById('obLocCity').value;
    if (!s.locationName) { toast('Location name is required', 'error'); return; }

    try {
        // 1. Create org
        const org = await api.createOrg({ name: s.orgName, billing_email: s.billingEmail });

        // 2. Create brand
        const brand = await api.createBrand({ name: s.brandName, organisation_id: org.id });

        // 3. Create country (always required for LE)
        const countryName = s.countryName || 'KSA';
        const countryISO = s.countryISO || 'SAU';
        const country = await api.createCountry({
            name: countryName, iso_code: countryISO,
            brand_id: brand.id, currency_code: s.currency,
        });

        // 4. Create legal entity (first-class node with organisation_id, country_id required)
        const le = await api.createLegalEntity({
            name: s.legalEntityName,
            organisation_id: org.id,
            country_id: country.id,
            brand_ids: [brand.id],
            currency_code: s.currency,
            tax_mode: s.taxMode,
            vat_registration_number: s.vatNumber,
        });

        // 5. Create location (requires both legal_entity_id and brand_id)
        await api.createLocation({
            name: s.locationName,
            legal_entity_id: le.id,
            brand_id: brand.id,
            city: s.locationCity,
        });

        state.tree = null;
        s.step = 5;
        renderOnboarding(document.getElementById('pageContainer'));
        toast('Organisation created successfully!');

    } catch (e) {
        toast(e.message, 'error');
    }
}
