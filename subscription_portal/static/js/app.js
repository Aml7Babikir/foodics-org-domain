(async function main() {
  await Store.load();
  const root = document.getElementById("view-root");
  const btns = document.querySelectorAll(".persona-btn[data-persona]");
  function show(persona) {
    btns.forEach((b) => b.classList.toggle("active", b.dataset.persona === persona));
    if (persona === "sales") SalesView.render(root);
    else if (persona === "cs") CSView.render(root);
    else if (persona === "admin") AdminView.render(root);
  }
  btns.forEach((b) => b.addEventListener("click", () => show(b.dataset.persona)));
  show("sales");
})();
