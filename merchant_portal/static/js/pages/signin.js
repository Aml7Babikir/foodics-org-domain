const SignInView = (() => {
  function render(root) {
    root.innerHTML = `
      <div class="signin-page">
        <div class="signin-hero">
          <div>
            <div class="badge">● Foodics · Self-service</div>
            <h1>Manage your Foodics subscription.</h1>
            <p>Upgrade, add features, size your devices, pay invoices — all in one place.</p>
            <div class="features">
              <div><div class="icon">1</div><div><h4>One place for everything</h4><p>Plan, add-ons, device licences, and Foodics Online — all editable.</p></div></div>
              <div><div class="icon">2</div><div><h4>Prorated upgrades</h4><p>Change tier mid-cycle; we only bill the difference for what's left.</p></div></div>
              <div><div class="icon">3</div><div><h4>Instant payment</h4><p>Pay by card — activation is automatic.</p></div></div>
            </div>
          </div>
          <div class="small" style="opacity:.5;">Demo · connected to the internal Subscription Portal</div>
        </div>
        <div class="signin-form-wrap">
          <div class="signin-form">
            <h2>Sign in</h2>
            <p class="sub">Enter your billing email or Salesforce account number.</p>
            <div class="field">
              <label>Email or SF account</label>
              <input id="si-input" placeholder="ops@qahwaco.sa" autofocus />
            </div>
            <button class="btn accent wide" id="si-submit">Continue</button>

            <div class="signin-demo-list">
              <h4>Demo accounts — click to fill</h4>
              <div id="si-demo-list"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const inp = document.getElementById("si-input");
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    document.getElementById("si-submit").addEventListener("click", submit);

    API.allMerchants().then((list) => {
      const el = document.getElementById("si-demo-list");
      el.innerHTML = list.slice(0, 5).map((m) => `<button data-id="${m.email}">${m.name} — ${m.email}</button>`).join("");
      el.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
        inp.value = b.dataset.id;
        submit();
      }));
    });
  }

  async function submit() {
    const identifier = document.getElementById("si-input").value.trim();
    if (!identifier) return toast("Enter an email or SF account number");
    try {
      const m = await API.login(identifier);
      Store.setMerchant(m);
      App.goto("home");
    } catch (e) {
      toast(e.message || "Login failed");
    }
  }

  return { render };
})();
