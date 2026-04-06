/* ═══════════════════════════════════════════════════════════════
   Foodics — Signup & Onboarding Prototype
   ═══════════════════════════════════════════════════════════════ */

const API_BASE = '/api/v1';

// ── Country data ──
const COUNTRIES = [
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', phone: '+966', currency: 'SAR' },
    { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', phone: '+971', currency: 'AED' },
    { code: 'BH', name: 'Bahrain', flag: '🇧🇭', phone: '+973', currency: 'BHD' },
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼', phone: '+965', currency: 'KWD' },
    { code: 'OM', name: 'Oman', flag: '🇴🇲', phone: '+968', currency: 'OMR' },
    { code: 'QA', name: 'Qatar', flag: '🇶🇦', phone: '+974', currency: 'QAR' },
    { code: 'EG', name: 'Egypt', flag: '🇪🇬', phone: '+20', currency: 'EGP' },
    { code: 'JO', name: 'Jordan', flag: '🇯🇴', phone: '+962', currency: 'JOD' },
    { code: 'LB', name: 'Lebanon', flag: '🇱🇧', phone: '+961', currency: 'LBP' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', phone: '+44', currency: 'GBP' },
    { code: 'US', name: 'United States', flag: '🇺🇸', phone: '+1', currency: 'USD' },
    { code: 'PK', name: 'Pakistan', flag: '🇵🇰', phone: '+92', currency: 'PKR' },
    { code: 'IN', name: 'India', flag: '🇮🇳', phone: '+91', currency: 'INR' },
    { code: 'TR', name: 'Turkey', flag: '🇹🇷', phone: '+90', currency: 'TRY' },
    { code: 'MA', name: 'Morocco', flag: '🇲🇦', phone: '+212', currency: 'MAD' },
];

// ── State ──
const state = {
    // Signup
    email: '',
    phone: '',
    phoneCountry: COUNTRIES[0],
    password: '',
    otp: ['', '', '', '', '', ''],
    otpSent: false,
    otpVerified: false,
    otpTimer: 60,
    otpTimerInterval: null,
    otpError: '',

    // Onboarding
    segment: null,           // micro | sme | midmarket | enterprise
    businessName: '',
    countries: [],           // selected countries
    structure: null,

    // UI
    currentScreen: 'signup', // signup | otp | onboarding-1 | onboarding-2 | onboarding-3 | onboarding-4 | summary | complete
    loading: false,
    passwordVisible: false,
};

// ── Helpers ──
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const container = () => document.getElementById('formContainer');

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPasswordStrength(pw) {
    let score = 0;
    const rules = {
        length: pw.length >= 8,
        upper: /[A-Z]/.test(pw),
        lower: /[a-z]/.test(pw),
        number: /[0-9]/.test(pw),
        special: /[^A-Za-z0-9]/.test(pw),
    };
    score = Object.values(rules).filter(Boolean).length;
    let label = 'Too weak';
    let cls = 'weak';
    if (score >= 5) { label = 'Strong'; cls = 'strong'; }
    else if (score >= 4) { label = 'Good'; cls = 'good'; }
    else if (score >= 3) { label = 'Fair'; cls = 'fair'; }
    return { score, label, cls, rules };
}

function formatPhone() {
    return `${state.phoneCountry.phone} ${state.phone}`;
}

// ── Brand panel updates ──
function updateBrandPanel(headline, subtext) {
    const h = document.getElementById('brandHeadline');
    const s = document.getElementById('brandSubtext');
    if (h) h.textContent = headline;
    if (s) s.textContent = subtext;
}

// ═══════════════════════════════════════════
//  SCREEN: Signup
// ═══════════════════════════════════════════

function renderSignup() {
    state.currentScreen = 'signup';
    updateBrandPanel('Start your free trial', 'The all-in-one restaurant management platform trusted by 40,000+ businesses across 35+ countries.');

    container().innerHTML = `
        <div class="screen" id="screen">
            <div class="screen-header">
                <div class="screen-header-badge">Free 14-day trial</div>
                <h2 class="screen-title">Create your account</h2>
                <p class="screen-subtitle">Get started in minutes. No credit card required.</p>
            </div>

            <div class="field">
                <label class="field-label">Work email <span class="required">*</span></label>
                <div class="input-wrapper">
                    <input class="input" type="email" id="signupEmail" placeholder="you@company.com"
                           value="${state.email}" autocomplete="email">
                    <span class="input-icon" id="emailIcon"></span>
                </div>
                <div id="emailError" class="field-error" style="display:none"></div>
                <div class="field-hint">We'll use this for your account and billing</div>
            </div>

            <div class="field">
                <label class="field-label">Phone number <span class="required">*</span></label>
                <div class="phone-input-group">
                    <select class="input phone-prefix" id="phonePrefix">
                        ${COUNTRIES.map(c => `<option value="${c.code}" ${c.code === state.phoneCountry.code ? 'selected' : ''}>${c.flag} ${c.phone}</option>`).join('')}
                    </select>
                    <div class="input-wrapper phone-number">
                        <input class="input" type="tel" id="signupPhone" placeholder="5XXXXXXXX"
                               value="${state.phone}" autocomplete="tel">
                    </div>
                </div>
                <div id="phoneError" class="field-error" style="display:none"></div>
                <div class="field-hint">We'll send a verification code to this number</div>
            </div>

            <div class="field">
                <label class="field-label">Password <span class="required">*</span></label>
                <div class="input-wrapper">
                    <input class="input" type="${state.passwordVisible ? 'text' : 'password'}" id="signupPassword"
                           placeholder="Create a strong password" value="${state.password}" autocomplete="new-password">
                    <button type="button" class="password-toggle" id="pwToggle" title="Toggle password visibility">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            ${state.passwordVisible
                                ? '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
                                : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'}
                        </svg>
                    </button>
                </div>
                <div id="passwordStrength"></div>
                <div class="password-rules" id="passwordRules">
                    <div class="password-rule" data-rule="length"><span class="password-rule-icon">○</span> 8+ characters</div>
                    <div class="password-rule" data-rule="upper"><span class="password-rule-icon">○</span> Uppercase letter</div>
                    <div class="password-rule" data-rule="lower"><span class="password-rule-icon">○</span> Lowercase letter</div>
                    <div class="password-rule" data-rule="number"><span class="password-rule-icon">○</span> Number</div>
                    <div class="password-rule" data-rule="special"><span class="password-rule-icon">○</span> Special character</div>
                </div>
            </div>

            <button class="btn btn-primary btn-full btn-lg" id="signupBtn" disabled>
                <span class="btn-text">Continue</span>
                <span class="btn-spinner"></span>
            </button>

            <p class="login-prompt">Already have an account? <a href="#">Sign in</a></p>
        </div>
    `;

    // ── Event listeners ──
    const emailInput = $('#signupEmail');
    const phoneInput = $('#signupPhone');
    const pwInput = $('#signupPassword');
    const btn = $('#signupBtn');

    emailInput.addEventListener('input', () => {
        state.email = emailInput.value.trim();
        validateSignupField('email');
        updateSignupButton();
    });

    emailInput.addEventListener('blur', () => validateSignupField('email'));

    $('#phonePrefix').addEventListener('change', (e) => {
        state.phoneCountry = COUNTRIES.find(c => c.code === e.target.value) || COUNTRIES[0];
    });

    phoneInput.addEventListener('input', () => {
        state.phone = phoneInput.value.replace(/[^0-9]/g, '');
        phoneInput.value = state.phone;
        validateSignupField('phone');
        updateSignupButton();
    });

    pwInput.addEventListener('input', () => {
        state.password = pwInput.value;
        updatePasswordStrength();
        updateSignupButton();
    });

    $('#pwToggle').addEventListener('click', () => {
        state.passwordVisible = !state.passwordVisible;
        pwInput.type = state.passwordVisible ? 'text' : 'password';
        renderSignup(); // re-render to update icon
        $('#signupPassword').focus();
    });

    btn.addEventListener('click', () => handleSignupSubmit());

    // Focus first field
    emailInput.focus();
}

function validateSignupField(field) {
    if (field === 'email') {
        const err = $('#emailError');
        const icon = $('#emailIcon');
        const input = $('#signupEmail');
        if (!state.email) { err.style.display = 'none'; input.classList.remove('error', 'success'); icon.innerHTML = ''; return; }
        if (!validateEmail(state.email)) {
            err.textContent = 'Please enter a valid work email address';
            err.style.display = 'flex';
            input.classList.add('error');
            input.classList.remove('success');
            icon.innerHTML = '<svg width="18" height="18" fill="none" stroke="#DC2626" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6m0-6l6 6"/></svg>';
            icon.className = 'input-icon error';
        } else {
            err.style.display = 'none';
            input.classList.remove('error');
            input.classList.add('success');
            icon.innerHTML = '<svg width="18" height="18" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>';
            icon.className = 'input-icon success';
        }
    }
    if (field === 'phone') {
        const err = $('#phoneError');
        const input = $('#signupPhone');
        if (!state.phone) { err.style.display = 'none'; input.classList.remove('error'); return; }
        if (state.phone.length < 5) {
            err.textContent = 'Please enter a valid phone number';
            err.style.display = 'flex';
            input.classList.add('error');
        } else {
            err.style.display = 'none';
            input.classList.remove('error');
        }
    }
}

function updatePasswordStrength() {
    const pw = state.password;
    const container = $('#passwordStrength');
    const rulesContainer = $('#passwordRules');
    if (!pw) {
        container.innerHTML = '';
        rulesContainer.querySelectorAll('.password-rule').forEach(r => {
            r.classList.remove('met');
            r.querySelector('.password-rule-icon').textContent = '○';
        });
        return;
    }
    const s = getPasswordStrength(pw);
    container.innerHTML = `
        <div class="password-strength">
            ${[1,2,3,4,5].map(i => `<div class="password-strength-bar ${i <= s.score ? s.cls : ''}"></div>`).join('')}
        </div>
        <div class="password-strength-label ${s.cls}">${s.label}</div>
    `;

    Object.entries(s.rules).forEach(([key, met]) => {
        const el = rulesContainer.querySelector(`[data-rule="${key}"]`);
        if (el) {
            el.classList.toggle('met', met);
            el.querySelector('.password-rule-icon').textContent = met ? '✓' : '○';
        }
    });
}

function updateSignupButton() {
    const btn = $('#signupBtn');
    const valid = validateEmail(state.email) && state.phone.length >= 5 && getPasswordStrength(state.password).score >= 3;
    btn.disabled = !valid;
}

async function handleSignupSubmit() {
    const btn = $('#signupBtn');
    btn.classList.add('btn-loading');
    btn.disabled = true;

    // Simulate sending OTP
    await new Promise(r => setTimeout(r, 1200));

    state.otpSent = true;
    btn.classList.remove('btn-loading');

    renderOTP();
}


// ═══════════════════════════════════════════
//  SCREEN: OTP Verification
// ═══════════════════════════════════════════

function renderOTP() {
    state.currentScreen = 'otp';
    state.otp = ['', '', '', '', '', ''];
    state.otpError = '';
    state.otpTimer = 60;

    updateBrandPanel('Verify your phone', 'We need to confirm your identity before creating your account.');

    container().innerHTML = `
        <div class="screen" id="screen">
            <div class="screen-header text-center">
                <h2 class="screen-title">Enter verification code</h2>
                <p class="screen-subtitle">We sent a 6-digit code to</p>
                <p class="otp-phone">${state.phoneCountry.flag} ${state.phoneCountry.phone} ${state.phone}</p>
            </div>

            <div class="otp-group" id="otpGroup">
                ${[0,1,2,3,4,5].map(i => `<input class="otp-input" type="text" inputmode="numeric" maxlength="1" data-idx="${i}" id="otp${i}" autocomplete="one-time-code">`).join('')}
            </div>

            <div id="otpError" class="field-error text-center" style="display:none;justify-content:center;"></div>

            <div class="otp-timer" id="otpTimerText">
                Resend code in <strong id="otpCountdown">60s</strong>
            </div>

            <button class="btn btn-primary btn-full btn-lg mt-6" id="verifyBtn" disabled>
                <span class="btn-text">Verify & Continue</span>
                <span class="btn-spinner"></span>
            </button>

            <div class="text-center mt-4">
                <button class="resend-link" id="resendBtn" disabled>Resend code</button>
            </div>

            <div class="text-center mt-4">
                <button class="btn-ghost btn" onclick="renderSignup()" style="font-size:13px;">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg>
                    Change phone number
                </button>
            </div>
        </div>
    `;

    // Start countdown
    startOTPTimer();

    // OTP input handling
    const inputs = $$('.otp-input');
    inputs.forEach((inp, idx) => {
        inp.addEventListener('input', (e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = val;
            state.otp[idx] = val;

            if (val && idx < 5) {
                inputs[idx + 1].focus();
            }

            // Update visual states
            inputs.forEach((i, j) => {
                i.classList.toggle('filled', state.otp[j] !== '');
                i.classList.remove('error', 'success');
            });

            // Check if all filled
            const filled = state.otp.every(d => d !== '');
            $('#verifyBtn').disabled = !filled;
        });

        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !inp.value && idx > 0) {
                inputs[idx - 1].focus();
                inputs[idx - 1].select();
            }
        });

        inp.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
            pasted.split('').forEach((d, i) => {
                if (inputs[i]) {
                    inputs[i].value = d;
                    state.otp[i] = d;
                    inputs[i].classList.add('filled');
                }
            });
            if (pasted.length === 6) {
                inputs[5].focus();
                $('#verifyBtn').disabled = false;
            }
        });
    });

    inputs[0].focus();

    // Verify button
    $('#verifyBtn').addEventListener('click', handleOTPVerify);

    // Resend
    $('#resendBtn').addEventListener('click', () => {
        state.otpTimer = 60;
        state.otp = ['', '', '', '', '', ''];
        inputs.forEach(i => { i.value = ''; i.classList.remove('filled', 'error', 'success'); });
        inputs[0].focus();
        $('#verifyBtn').disabled = true;
        $('#resendBtn').disabled = true;
        startOTPTimer();
    });
}

function startOTPTimer() {
    clearInterval(state.otpTimerInterval);
    const timerText = $('#otpTimerText');
    const countdown = $('#otpCountdown');
    const resendBtn = $('#resendBtn');

    state.otpTimerInterval = setInterval(() => {
        state.otpTimer--;
        if (state.otpTimer <= 0) {
            clearInterval(state.otpTimerInterval);
            timerText.innerHTML = 'Didn\'t receive the code?';
            if (resendBtn) resendBtn.disabled = false;
        } else {
            if (countdown) countdown.textContent = `${state.otpTimer}s`;
        }
    }, 1000);
}

async function handleOTPVerify() {
    const btn = $('#verifyBtn');
    const inputs = $$('.otp-input');
    const errEl = $('#otpError');

    btn.classList.add('btn-loading');
    btn.disabled = true;

    await new Promise(r => setTimeout(r, 1000));

    const code = state.otp.join('');

    // Wildcard: any 6-digit code is accepted (prototype mode)
    // Success
    clearInterval(state.otpTimerInterval);
    errEl.style.display = 'none';
    inputs.forEach(i => { i.classList.remove('error'); i.classList.add('success'); });

    await new Promise(r => setTimeout(r, 400));

    state.otpVerified = true;
    btn.classList.remove('btn-loading');

    // Transition to onboarding
    renderOnboarding1();
}


// ═══════════════════════════════════════════
//  ONBOARDING STEP 1: Business Segment
// ═══════════════════════════════════════════

function renderOnboardingProgress(step, total = 4) {
    const steps = ['Business Type', 'Business Name', 'Countries', 'Structure'];
    const pct = ((step - 1) / total) * 100;

    return `
        <div class="progress-bar-container">
            <div class="progress-steps">
                ${steps.map((label, i) => {
                    const num = i + 1;
                    let cls = '';
                    if (num < step) cls = 'completed';
                    else if (num === step) cls = 'active';
                    return `
                        <div class="progress-step ${cls}">
                            <div class="progress-step-dot">${num < step ? '✓' : num}</div>
                            <span class="progress-step-label">${label}</span>
                        </div>
                        ${num < steps.length ? `<div class="progress-step-line ${num < step ? 'filled' : ''}"></div>` : ''}
                    `;
                }).join('')}
            </div>
            <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width:${pct}%"></div>
            </div>
        </div>
    `;
}

function renderOnboarding1() {
    state.currentScreen = 'onboarding-1';
    updateBrandPanel('Tell us about your business', 'We\'ll tailor the setup experience to match your needs.');

    container().innerHTML = `
        <div class="screen" id="screen">
            ${renderOnboardingProgress(1)}

            <div class="screen-header">
                <h2 class="screen-title">Which best describes your business?</h2>
                <p class="screen-subtitle">This helps us set up the right structure for you. You can always adjust later.</p>
            </div>

            <div class="segment-grid">
                <div class="segment-card ${state.segment === 'micro' ? 'selected' : ''}" data-seg="micro">
                    <div class="segment-card-check">✓</div>
                    <div class="segment-card-emoji">☕</div>
                    <div class="segment-card-title">Micro</div>
                    <div class="segment-card-desc">1-2 outlets, single owner</div>
                </div>
                <div class="segment-card ${state.segment === 'sme' ? 'selected' : ''}" data-seg="sme">
                    <div class="segment-card-check">✓</div>
                    <div class="segment-card-emoji">🍔</div>
                    <div class="segment-card-title">Growing Chain</div>
                    <div class="segment-card-desc">3-15 outlets, one brand</div>
                </div>
                <div class="segment-card ${state.segment === 'midmarket' ? 'selected' : ''}" data-seg="midmarket">
                    <div class="segment-card-check">✓</div>
                    <div class="segment-card-emoji">🏢</div>
                    <div class="segment-card-title">Mid-Market</div>
                    <div class="segment-card-desc">16-100 outlets, multi-brand or multi-region</div>
                </div>
                <div class="segment-card ${state.segment === 'enterprise' ? 'selected' : ''}" data-seg="enterprise">
                    <div class="segment-card-check">✓</div>
                    <div class="segment-card-emoji">🌍</div>
                    <div class="segment-card-title">Enterprise</div>
                    <div class="segment-card-desc">100+ outlets, multi-country or franchise</div>
                </div>
            </div>
            <div class="field-hint text-center mt-2">Not sure? Pick the closest match — you can change this later.</div>

            <div class="btn-row">
                <button class="btn btn-primary btn-full btn-lg" id="nextBtn" ${!state.segment ? 'disabled' : ''}>
                    <span class="btn-text">Continue</span>
                </button>
            </div>
        </div>
    `;

    $$('.segment-card').forEach(card => {
        card.addEventListener('click', () => {
            state.segment = card.dataset.seg;
            $$('.segment-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            $('#nextBtn').disabled = false;
        });
    });

    $('#nextBtn').addEventListener('click', () => renderOnboarding2());
}


// ═══════════════════════════════════════════
//  ONBOARDING STEP 2: Business Name
// ═══════════════════════════════════════════

function renderOnboarding2() {
    state.currentScreen = 'onboarding-2';
    updateBrandPanel('Name your business', 'This will be the top-level identity in your Foodics account.');

    container().innerHTML = `
        <div class="screen" id="screen">
            ${renderOnboardingProgress(2)}

            <div class="screen-header">
                <h2 class="screen-title">What is your business name?</h2>
                <p class="screen-subtitle">This is the company or group name that appears on your Foodics account${state.segment === 'micro' ? '.' : ' and will be your organisation\'s identity.'}</p>
            </div>

            <div class="field">
                <label class="field-label">Business / Company name <span class="required">*</span></label>
                <input class="input" type="text" id="bizName" placeholder="${getNamePlaceholder()}" value="${state.businessName}" autocomplete="organization">
                <div class="field-hint">${getNameHint()}</div>
                <div id="bizNameError" class="field-error" style="display:none"></div>
            </div>

            <div class="btn-row">
                <button class="btn btn-secondary" onclick="renderOnboarding1()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg>
                    Back
                </button>
                <button class="btn btn-primary btn-lg" id="nextBtn" ${!state.businessName ? 'disabled' : ''}>Continue</button>
            </div>
        </div>
    `;

    const input = $('#bizName');
    input.focus();

    input.addEventListener('input', () => {
        state.businessName = input.value.trim();
        $('#nextBtn').disabled = !state.businessName;
        const err = $('#bizNameError');
        if (state.businessName.length > 0 && state.businessName.length < 2) {
            err.textContent = 'Business name must be at least 2 characters';
            err.style.display = 'flex';
            input.classList.add('error');
        } else {
            err.style.display = 'none';
            input.classList.remove('error');
        }
    });

    $('#nextBtn').addEventListener('click', () => renderOnboarding3());
}

function getNamePlaceholder() {
    if (state.segment === 'micro') return 'e.g. Shawarm & Co.';
    if (state.segment === 'sme') return 'e.g. Burger Lab';
    if (state.segment === 'midmarket') return 'e.g. Tasty Ventures Group';
    return 'e.g. Gulf Restaurant Holdings';
}

function getNameHint() {
    if (state.segment === 'micro') return 'This will also be used as your default brand and legal entity name.';
    if (state.segment === 'sme') return 'This becomes your organisation name. Your brand name can be added separately.';
    return 'This is the top-level organisation that owns brands, legal entities, and locations.';
}


// ═══════════════════════════════════════════
//  ONBOARDING STEP 3: Countries
// ═══════════════════════════════════════════

function renderOnboarding3() {
    state.currentScreen = 'onboarding-3';
    const isMulti = state.segment === 'midmarket' || state.segment === 'enterprise';
    updateBrandPanel(isMulti ? 'Where do you operate?' : 'Where is your business?', isMulti ? 'Select all countries where you have or plan to have outlets.' : 'This sets your default currency, tax, and compliance rules.');

    container().innerHTML = `
        <div class="screen" id="screen">
            ${renderOnboardingProgress(3)}

            <div class="screen-header">
                <h2 class="screen-title">${isMulti ? 'Countries of operation' : 'Where is your business located?'}</h2>
                <p class="screen-subtitle">${isMulti ? 'Select all countries where you currently operate or plan to expand.' : 'We\'ll configure currency, tax settings, and compliance based on this.'}</p>
            </div>

            <div class="field">
                <label class="field-label">${isMulti ? 'Countries' : 'Country'} <span class="required">*</span></label>
                ${isMulti ? renderMultiCountrySelect() : renderSingleCountrySelect()}
                <div class="field-hint">${isMulti ? 'You can add more countries later as your business grows.' : 'This sets your default currency and regulatory requirements.'}</div>
            </div>

            <div class="btn-row">
                <button class="btn btn-secondary" onclick="renderOnboarding2()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg>
                    Back
                </button>
                <button class="btn btn-primary btn-lg" id="nextBtn" ${state.countries.length === 0 ? 'disabled' : ''}>Continue</button>
            </div>
        </div>
    `;

    if (isMulti) {
        setupMultiCountry();
    } else {
        const select = $('#countrySelect');
        if (state.countries.length > 0) {
            select.value = state.countries[0].code;
        }
        select.addEventListener('change', () => {
            const c = COUNTRIES.find(x => x.code === select.value);
            if (c) {
                state.countries = [c];
                $('#nextBtn').disabled = false;
            }
        });
    }

    // Conditional: skip structure for micro — go straight to creation
    $('#nextBtn').addEventListener('click', () => {
        if (state.segment === 'micro') {
            state.structure = 'single';
            handleLaunch();
        } else {
            renderOnboarding4();
        }
    });
}

function renderSingleCountrySelect() {
    return `
        <select class="country-select" id="countrySelect">
            <option value="" disabled ${state.countries.length === 0 ? 'selected' : ''}>Select a country...</option>
            ${COUNTRIES.map(c => `<option value="${c.code}" ${state.countries.some(x => x.code === c.code) ? 'selected' : ''}>${c.flag}  ${c.name}</option>`).join('')}
        </select>
    `;
}

function renderMultiCountrySelect() {
    return `
        <div style="position:relative;">
            <div class="country-multi-container" id="multiContainer">
                ${state.countries.map(c => `<span class="country-pill" data-code="${c.code}">${c.flag} ${c.name} <button class="country-pill-remove" data-code="${c.code}">&times;</button></span>`).join('')}
                <input class="country-multi-input" id="countrySearch" placeholder="${state.countries.length ? 'Add another...' : 'Type to search countries...'}" autocomplete="off">
            </div>
            <div class="country-dropdown" id="countryDropdown"></div>
        </div>
    `;
}

function setupMultiCountry() {
    const searchInput = $('#countrySearch');
    const dropdown = $('#countryDropdown');
    const containerEl = $('#multiContainer');

    function renderDropdown(query = '') {
        const filtered = COUNTRIES.filter(c =>
            c.name.toLowerCase().includes(query.toLowerCase()) &&
            !state.countries.some(s => s.code === c.code)
        );
        if (filtered.length === 0 && query) {
            dropdown.innerHTML = '<div style="padding:12px 16px;color:#9CA3AF;font-size:13px;">No countries found</div>';
        } else {
            dropdown.innerHTML = filtered.map(c => `
                <div class="country-dropdown-item" data-code="${c.code}">
                    <span class="country-dropdown-item-flag">${c.flag}</span>
                    ${c.name}
                </div>
            `).join('');
        }
        dropdown.classList.toggle('visible', filtered.length > 0 || query.length > 0);
    }

    searchInput.addEventListener('focus', () => renderDropdown(searchInput.value));
    searchInput.addEventListener('input', () => renderDropdown(searchInput.value));

    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.country-dropdown-item');
        if (!item) return;
        const c = COUNTRIES.find(x => x.code === item.dataset.code);
        if (c) {
            state.countries.push(c);
            searchInput.value = '';
            renderOnboarding3(); // re-render to update pills
        }
    });

    containerEl.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.country-pill-remove');
        if (removeBtn) {
            state.countries = state.countries.filter(c => c.code !== removeBtn.dataset.code);
            renderOnboarding3();
            return;
        }
        searchInput.focus();
    });

    document.addEventListener('click', (e) => {
        if (!containerEl.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('visible');
        }
    });
}


// ═══════════════════════════════════════════
//  ONBOARDING STEP 4: Business Structure
// ═══════════════════════════════════════════

function renderOnboarding4() {
    state.currentScreen = 'onboarding-4';
    updateBrandPanel('Business structure', 'Understanding your structure helps us set up the right hierarchy from day one.');

    const structures = getStructureOptions();

    container().innerHTML = `
        <div class="screen" id="screen">
            ${renderOnboardingProgress(4)}

            <div class="screen-header">
                <h2 class="screen-title">How is your business structured?</h2>
                <p class="screen-subtitle">This determines how we organise your brands, companies, and locations.</p>
            </div>

            <div class="structure-grid">
                ${structures.map(s => `
                    <div class="structure-card ${state.structure === s.value ? 'selected' : ''}" data-val="${s.value}">
                        <div class="structure-card-radio"><div class="structure-card-radio-dot"></div></div>
                        <div class="structure-card-content">
                            <div class="structure-card-title">${s.title}</div>
                            <div class="structure-card-desc">${s.desc}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="field-hint mt-2">
                <strong>Why this matters:</strong> Legal entities handle VAT, commercial registration, and tax identity. Each location must belong to exactly one legal entity.
            </div>

            <div class="btn-row">
                <button class="btn btn-secondary" onclick="renderOnboarding3()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg>
                    Back
                </button>
                <button class="btn btn-primary btn-lg" id="nextBtn" ${!state.structure ? 'disabled' : ''}>Continue</button>
            </div>
        </div>
    `;

    $$('.structure-card').forEach(card => {
        card.addEventListener('click', () => {
            state.structure = card.dataset.val;
            $$('.structure-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            $('#nextBtn').disabled = false;
        });
    });

    $('#nextBtn').addEventListener('click', () => handleLaunch());
}

function getStructureOptions() {
    const base = [
        { value: 'single', title: 'One company, all locations', desc: 'Single legal entity operating everything under one brand' },
        { value: 'multi_le_one_brand', title: 'Multiple companies, one brand', desc: 'Different legal entities (e.g. regional companies) under the same brand' },
    ];

    if (state.segment === 'sme') {
        return base;
    }

    return [
        ...base,
        { value: 'multi_brand_one_le', title: 'Multiple brands, one company', desc: 'One company operating several different restaurant concepts' },
        { value: 'multi_brand_multi_le', title: 'Multiple brands and companies', desc: 'Complex structure with multiple brands and legal entities' },
        { value: 'franchise', title: 'Franchise / mixed ownership', desc: 'Brand owner delegates to franchisees who operate under their own legal entities' },
    ];
}


// ═══════════════════════════════════════════
//  SUMMARY SCREEN
// ═══════════════════════════════════════════

function renderSummary() {
    state.currentScreen = 'summary';
    updateBrandPanel('Almost there!', 'Review your setup and we\'ll create your workspace.');

    const scaffold = buildScaffold();

    container().innerHTML = `
        <div class="screen" id="screen">
            <div class="screen-header">
                <div class="screen-header-badge">Final step</div>
                <h2 class="screen-title">Here's what we'll set up</h2>
                <p class="screen-subtitle">Based on your answers, we've designed an initial structure for your business. You can customise everything later.</p>
            </div>

            <div class="summary-section">
                <div class="summary-label">Account</div>
                <div class="summary-value">${state.email}</div>
            </div>

            <div class="summary-section">
                <div class="summary-label">Business</div>
                <div class="summary-value">${state.businessName}</div>
                <div class="text-sm text-muted mt-2">${getSegmentLabel()} &middot; ${state.countries.map(c => c.flag + ' ' + c.name).join(', ')}</div>
            </div>

            ${state.structure && state.segment !== 'micro' ? `
                <div class="summary-section">
                    <div class="summary-label">Structure</div>
                    <div class="summary-value">${getStructureLabel()}</div>
                </div>
            ` : ''}

            <div class="summary-divider"></div>

            <div class="summary-section">
                <div class="summary-label">Your initial hierarchy</div>
                <div class="scaffold-tree">
                    ${scaffold.map(node => `
                        <div class="scaffold-node ${node.indent > 0 ? 'scaffold-node-indent-' + node.indent : ''}">
                            <div class="scaffold-node-icon ${node.iconClass}">${node.iconLetter}</div>
                            <div class="scaffold-node-info">
                                <div class="scaffold-node-name">${node.name}</div>
                                <div class="scaffold-node-type">${node.type}</div>
                            </div>
                            ${node.badge ? `<span class="scaffold-node-badge">${node.badge}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="field-hint mt-4">This is your starting point. You can add more brands, legal entities, locations, and users anytime from the dashboard.</div>
            </div>

            <div class="btn-row">
                <button class="btn btn-secondary" onclick="${state.segment === 'micro' ? 'renderOnboarding3()' : 'renderOnboarding4()'}">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg>
                    Back
                </button>
                <button class="btn btn-primary btn-lg" id="launchBtn">
                    <span class="btn-text">Launch my workspace</span>
                    <span class="btn-spinner"></span>
                </button>
            </div>
        </div>
    `;

    $('#launchBtn').addEventListener('click', handleLaunch);
}

function getSegmentLabel() {
    const map = { micro: 'Micro (1-2 outlets)', sme: 'Growing Chain (3-15 outlets)', midmarket: 'Mid-Market (16-100 outlets)', enterprise: 'Enterprise (100+ outlets)' };
    return map[state.segment] || '';
}

function getStructureLabel() {
    const map = {
        single: 'One company operating all locations',
        multi_le_one_brand: 'Multiple companies under one brand',
        multi_brand_one_le: 'Multiple brands under one company',
        multi_brand_multi_le: 'Multiple brands and companies',
        franchise: 'Franchise / mixed ownership',
    };
    return map[state.structure] || '';
}

function buildScaffold() {
    const country = state.countries[0];
    const nodes = [];

    // Organisation
    nodes.push({ name: state.businessName, type: 'Organisation', iconClass: 'org', iconLetter: 'O', indent: 0 });

    if (state.segment === 'micro') {
        nodes.push({ name: state.businessName, type: 'Brand', iconClass: 'brand', iconLetter: 'B', indent: 1 });
        nodes.push({ name: `${country.name}`, type: 'Country', iconClass: 'country', iconLetter: 'C', indent: 2 });
        nodes.push({ name: `${state.businessName} LLC`, type: 'Legal Entity', iconClass: 'le', iconLetter: 'LE', indent: 3, badge: 'VAT & Tax' });
        nodes.push({ name: `${state.businessName} — Main`, type: 'Location', iconClass: 'loc', iconLetter: 'L', indent: 4 });
    }
    else if (state.segment === 'sme') {
        if (state.structure === 'multi_le_one_brand') {
            nodes.push({ name: state.businessName, type: 'Brand', iconClass: 'brand', iconLetter: 'B', indent: 1 });
            nodes.push({ name: country.name, type: 'Country', iconClass: 'country', iconLetter: 'C', indent: 2 });
            nodes.push({ name: `${state.businessName} — Company A`, type: 'Legal Entity', iconClass: 'le', iconLetter: 'LE', indent: 3, badge: 'VAT & Tax' });
            nodes.push({ name: 'Main Cluster', type: 'Location Group', iconClass: 'lg', iconLetter: 'LG', indent: 4 });
            nodes.push({ name: `${state.businessName} — First Outlet`, type: 'Location', iconClass: 'loc', iconLetter: 'L', indent: 4 });
        } else {
            nodes.push({ name: state.businessName, type: 'Brand', iconClass: 'brand', iconLetter: 'B', indent: 1 });
            nodes.push({ name: country.name, type: 'Country', iconClass: 'country', iconLetter: 'C', indent: 2 });
            nodes.push({ name: `${state.businessName} LLC`, type: 'Legal Entity', iconClass: 'le', iconLetter: 'LE', indent: 3, badge: 'VAT & Tax' });
            nodes.push({ name: 'Main Cluster', type: 'Location Group', iconClass: 'lg', iconLetter: 'LG', indent: 4 });
            nodes.push({ name: `${state.businessName} — First Outlet`, type: 'Location', iconClass: 'loc', iconLetter: 'L', indent: 4 });
        }
    }
    else if (state.segment === 'midmarket') {
        if (state.structure === 'franchise') {
            nodes.push({ name: `${state.businessName} Group`, type: 'Group', iconClass: 'group', iconLetter: 'G', indent: 1, badge: 'Optional' });
        }

        const brandName = state.structure === 'multi_brand_one_le' || state.structure === 'multi_brand_multi_le' || state.structure === 'franchise'
            ? 'Brand A' : state.businessName;

        nodes.push({ name: brandName, type: 'Brand', iconClass: 'brand', iconLetter: 'B', indent: 1 });

        state.countries.forEach(c => {
            nodes.push({ name: c.name, type: 'Country', iconClass: 'country', iconLetter: 'C', indent: 2 });
        });

        const leName = state.structure === 'multi_le_one_brand' || state.structure === 'multi_brand_multi_le'
            ? `${state.businessName} — ${country.name} LLC` : `${state.businessName} LLC`;

        nodes.push({ name: leName, type: 'Legal Entity', iconClass: 'le', iconLetter: 'LE', indent: 3, badge: 'VAT & Tax' });
        nodes.push({ name: 'Default Cluster', type: 'Location Group', iconClass: 'lg', iconLetter: 'LG', indent: 4 });
        nodes.push({ name: `${brandName} — First Outlet`, type: 'Location', iconClass: 'loc', iconLetter: 'L', indent: 4 });

        if (state.structure === 'multi_brand_one_le' || state.structure === 'multi_brand_multi_le' || state.structure === 'franchise') {
            nodes.push({ name: 'Brand B', type: 'Brand', iconClass: 'brand', iconLetter: 'B', indent: 1, badge: 'Add later' });
        }
        if (state.structure === 'franchise') {
            nodes.push({ name: 'Franchisee LLC', type: 'Legal Entity (Franchise)', iconClass: 'le', iconLetter: 'LE', indent: 3, badge: 'Franchise' });
        }
    }
    else if (state.segment === 'enterprise') {
        nodes.push({ name: `${state.businessName} Group`, type: 'Group', iconClass: 'group', iconLetter: 'G', indent: 1 });

        const brandName = state.structure === 'single' || state.structure === 'multi_le_one_brand'
            ? state.businessName : 'Brand A';

        nodes.push({ name: brandName, type: 'Brand', iconClass: 'brand', iconLetter: 'B', indent: 1 });

        state.countries.forEach(c => {
            nodes.push({ name: c.name, type: 'Country', iconClass: 'country', iconLetter: 'C', indent: 2 });
        });

        nodes.push({ name: `${state.businessName} — ${country.name} LLC`, type: 'Legal Entity', iconClass: 'le', iconLetter: 'LE', indent: 3, badge: 'VAT & Tax' });

        if (state.structure === 'multi_brand_multi_le' || state.structure === 'multi_le_one_brand') {
            nodes.push({ name: `${state.businessName} — Company B`, type: 'Legal Entity', iconClass: 'le', iconLetter: 'LE', indent: 3, badge: 'Add later' });
        }

        nodes.push({ name: 'Operations BU', type: 'Business Unit', iconClass: 'bu', iconLetter: 'BU', indent: 4 });
        nodes.push({ name: `${country.name} — Central`, type: 'Location Group', iconClass: 'lg', iconLetter: 'LG', indent: 4 });
        nodes.push({ name: `${brandName} — Flagship`, type: 'Location', iconClass: 'loc', iconLetter: 'L', indent: 4 });

        if (state.structure !== 'single' && state.structure !== 'multi_le_one_brand') {
            nodes.push({ name: 'Brand B', type: 'Brand', iconClass: 'brand', iconLetter: 'B', indent: 1, badge: 'Add later' });
        }
        if (state.structure === 'franchise') {
            nodes.push({ name: 'Franchisee Entity', type: 'Legal Entity (Franchise)', iconClass: 'le', iconLetter: 'LE', indent: 3, badge: 'Franchise' });
        }
    }

    return nodes;
}


// ═══════════════════════════════════════════
//  LAUNCH / CREATE
// ═══════════════════════════════════════════

async function handleLaunch() {
    // Show a full-screen loading state
    container().innerHTML = `
        <div class="screen" style="text-align:center;padding:80px 0;">
            <div class="btn-spinner" style="display:block;width:40px;height:40px;margin:0 auto 24px;border:3px solid var(--gray-200);border-top-color:var(--primary);"></div>
            <h2 class="screen-title">Setting up your workspace...</h2>
            <p class="screen-subtitle">This will only take a moment.</p>
        </div>
    `;
    updateBrandPanel('Creating your workspace', 'We\'re setting everything up for you.');

    try {
        const country = state.countries[0];

        // 1. Create Organisation
        const org = await apiPost('/hierarchy/organisations', {
            name: state.businessName,
            billing_email: state.email,
        });

        // 2. Create Brand
        const brandName = (state.segment === 'midmarket' || state.segment === 'enterprise') &&
            (state.structure === 'multi_brand_one_le' || state.structure === 'multi_brand_multi_le' || state.structure === 'franchise')
            ? 'Brand A' : state.businessName;

        const brand = await apiPost('/hierarchy/brands', {
            name: brandName,
            organisation_id: org.id,
        });

        // 3. Create Country
        const ctry = await apiPost('/hierarchy/countries', {
            name: country.name,
            iso_code: country.code,
            brand_id: brand.id,
            currency_code: country.currency,
        });

        // 4. Create Legal Entity
        const leName = state.segment === 'micro' ? `${state.businessName} LLC`
            : state.structure === 'multi_le_one_brand' || state.structure === 'multi_brand_multi_le'
                ? `${state.businessName} — ${country.name} LLC`
                : `${state.businessName} LLC`;

        const le = await apiPost('/hierarchy/legal-entities', {
            name: leName,
            organisation_id: org.id,
            country_id: ctry.id,
            brand_ids: [brand.id],
            currency_code: country.currency,
            tax_mode: 'inclusive',
        });

        // 5. Create Location Group (for non-micro)
        let lgId = null;
        if (state.segment !== 'micro') {
            const lg = await apiPost('/hierarchy/location-groups', {
                name: state.segment === 'enterprise' ? `${country.name} — Central` : 'Main Cluster',
                legal_entity_id: le.id,
            });
            lgId = lg.id;
        }

        // 6. Create Location
        const locName = state.segment === 'micro' ? `${state.businessName} — Main`
            : `${brandName} — First Outlet`;

        await apiPost('/hierarchy/locations', {
            name: locName,
            legal_entity_id: le.id,
            brand_id: brand.id,
            location_group_id: lgId,
            city: country.name,
        });

        // 7. Create additional countries for multi-country
        for (let i = 1; i < state.countries.length; i++) {
            await apiPost('/hierarchy/countries', {
                name: state.countries[i].name,
                iso_code: state.countries[i].code,
                brand_id: brand.id,
                currency_code: state.countries[i].currency,
            });
        }

        // Store setup context for dashboard
        localStorage.setItem('foodics_setup', JSON.stringify({
            orgId: org.id,
            segment: state.segment,
            structure: state.structure,
            countries: state.countries.map(c => c.name),
            businessName: state.businessName,
            completedSteps: ['organisation', 'brand', 'country', 'legal_entity', 'location'],
        }));

        // Redirect to dashboard
        window.location.href = '/?org=' + org.id;

    } catch (e) {
        container().innerHTML = `
            <div class="screen" style="text-align:center;padding:60px 0;">
                <div style="width:64px;height:64px;border-radius:50%;background:var(--danger-light);color:var(--danger);display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;">!</div>
                <h2 class="screen-title">Something went wrong</h2>
                <p class="screen-subtitle">${e.message}</p>
                <button class="btn btn-primary mt-6" onclick="renderOnboarding1()">Try again</button>
            </div>
        `;
    }
}

async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || res.statusText);
    }
    return res.json();
}


// ═══════════════════════════════════════════
//  COMPLETE SCREEN
// ═══════════════════════════════════════════

function renderComplete(orgId) {
    state.currentScreen = 'complete';
    updateBrandPanel('Welcome to Foodics!', 'Your workspace is ready. Let\'s build something great together.');

    // Hide features, show different brand content
    const features = document.getElementById('brandFeatures');
    if (features) features.style.display = 'none';

    container().innerHTML = `
        <div class="screen" id="screen">
            <div class="success-icon-container">
                <div class="success-icon">
                    <svg width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/></svg>
                </div>
            </div>

            <div class="screen-header text-center">
                <h2 class="screen-title">Your workspace is ready!</h2>
                <p class="screen-subtitle"><strong>${state.businessName}</strong> has been set up and is ready to go. Here's what we created for you:</p>
            </div>

            <div style="background:var(--gray-50);border-radius:var(--radius-lg);padding:20px;margin-bottom:24px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div>
                        <div style="font-size:12px;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:0.5px;">Organisation</div>
                        <div style="font-size:15px;font-weight:600;color:var(--gray-800);margin-top:4px;">${state.businessName}</div>
                    </div>
                    <div>
                        <div style="font-size:12px;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:0.5px;">Segment</div>
                        <div style="font-size:15px;font-weight:600;color:var(--gray-800);margin-top:4px;">${getSegmentLabel().split(' (')[0]}</div>
                    </div>
                    <div>
                        <div style="font-size:12px;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:0.5px;">Country</div>
                        <div style="font-size:15px;font-weight:600;color:var(--gray-800);margin-top:4px;">${state.countries.map(c => c.flag + ' ' + c.name).join(', ')}</div>
                    </div>
                    <div>
                        <div style="font-size:12px;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:0.5px;">Trial</div>
                        <div style="font-size:15px;font-weight:600;color:var(--success);margin-top:4px;">14 days remaining</div>
                    </div>
                </div>
            </div>

            <div class="summary-label">Recommended next steps</div>
            <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px;">
                <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid var(--gray-200);border-radius:var(--radius-md);background:white;">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--primary-lighter);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">1</div>
                    <div>
                        <div style="font-size:14px;font-weight:600;color:var(--gray-800);">Invite your team</div>
                        <div style="font-size:12px;color:var(--gray-500);">Add managers, cashiers, and staff</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid var(--gray-200);border-radius:var(--radius-md);background:white;">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--primary-lighter);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">2</div>
                    <div>
                        <div style="font-size:14px;font-weight:600;color:var(--gray-800);">Configure your menu</div>
                        <div style="font-size:12px;color:var(--gray-500);">Add categories, items, and modifiers</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid var(--gray-200);border-radius:var(--radius-md);background:white;">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--primary-lighter);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">3</div>
                    <div>
                        <div style="font-size:14px;font-weight:600;color:var(--gray-800);">Set up payments</div>
                        <div style="font-size:12px;color:var(--gray-500);">Connect payment terminals and methods</div>
                    </div>
                </div>
            </div>

            <button class="btn btn-primary btn-full btn-lg" onclick="window.location.href='/'">
                Go to Dashboard
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14m0 0l-7-7m7 7l-7 7"/></svg>
            </button>

            <p class="text-center text-sm text-muted mt-4">Your 14-day free trial starts now. No credit card required.</p>
        </div>
    `;
}


// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    renderSignup();
});
