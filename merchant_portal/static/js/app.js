/**
 * Top-level router for the merchant portal.
 * Simple state-based routing — no URL hashing since it's an SPA demo.
 */
const App = (() => {
  let root;
  let currentParams = {};

  async function init() {
    root = document.getElementById("app");
    // Make sure catalog is always available for signed-in flows
    // (signed-in check happens after first load)
    await Store.loadCatalog();
    const restored = await Store.restoreSession();
    if (restored) goto("home"); else goto("signin");
  }

  function goto(route, params = {}) {
    currentParams = params;
    Store.route = route;
    root.innerHTML = "";
    switch (route) {
      case "signin":    return SignInView.render(root);
      case "home":      return HomeView.render(root);
      case "checkout":
        CheckoutView.reset();
        return CheckoutView.render(root);
      case "manage":    return ManageView.render(root);
      case "payment":   return PaymentView.render(root, params);
      default:          return SignInView.render(root);
    }
  }

  function renderHeader(parent) {
    const m = Store.merchant;
    const header = document.createElement("header");
    header.className = "app-header";
    header.innerHTML = `
      <div class="brand">
        <div class="logo">F</div>
        <div>
          <div class="brand-title">Foodics · My Subscription</div>
          <div class="brand-sub">Self-service portal</div>
        </div>
      </div>
      <div class="user-area">
        <div class="small muted" style="text-align:right;">
          <div><b>${m.name}</b></div>
          <div>${m.email} · ${m.currency}</div>
        </div>
        <div class="avatar" title="${m.name}">${initials(m.name)}</div>
        <button class="btn small secondary" id="hd-home">Home</button>
        <button class="btn small secondary" id="hd-signout">Sign out</button>
      </div>
    `;
    parent.appendChild(header);
    header.querySelector("#hd-home").addEventListener("click", () => goto("home"));
    header.querySelector("#hd-signout").addEventListener("click", () => {
      Store.signOut();
      goto("signin");
    });
  }

  return { init, goto, renderHeader, params: () => currentParams };
})();

init();

function init() { App.init(); }
