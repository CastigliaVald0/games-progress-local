window.PJ = window.PJ || {};

PJ.router = (function () {
  function parseHash() {
    const hash = window.location.hash.replace(/^#/, "");
    const [path, query] = hash.split("?");
    const params = new URLSearchParams(query || "");
    return { path: path || "/", params };
  }

  function render() {
    const root = document.getElementById("view-root");
    const { path, params } = parseHash();

    const gameMatch = path.match(/^\/game\/([^/]+)$/);
    if (gameMatch) {
      PJ.ui.gameDetail.render(root, decodeURIComponent(gameMatch[1]), {
        focusEntryId: params.get("focusEntry") || null,
      });
      return;
    }

    PJ.ui.library.render(root);
  }

  function init() {
    window.addEventListener("hashchange", render);
    render();
  }

  return { init, render };
})();
