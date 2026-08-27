window.PJ = window.PJ || {};
PJ.ui = window.PJ.ui || {};

PJ.ui.toast = (function () {
  const { escapeHtml } = PJ.utils;
  const MAX_VISIBLE = 3;

  function container() {
    return document.getElementById("toast-root");
  }

  function show({ gameName, coverImage, message, gameId, entryId }) {
    const root = container();
    if (!root) return;

    while (root.children.length >= MAX_VISIBLE) {
      root.removeChild(root.firstElementChild);
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
      <div class="toast-cover">${
        coverImage
          ? `<img src="${coverImage}" alt="">`
          : `<div class="toast-cover-placeholder">🎮</div>`
      }</div>
      <div class="toast-body">
        <div class="toast-title">${escapeHtml(gameName || "Juego")}</div>
        <div class="toast-message">${escapeHtml(message || "")}</div>
        <div class="toast-actions">
          ${gameId ? `<button class="toast-link" data-action="note">Agregar nota</button>` : ""}
        </div>
      </div>
      <button class="toast-close" aria-label="Cerrar">&times;</button>
    `;

    const dismiss = () => {
      toast.classList.add("toast-hide");
      setTimeout(() => toast.remove(), 200);
    };

    toast.querySelector(".toast-close").addEventListener("click", dismiss);
    const noteBtn = toast.querySelector('[data-action="note"]');
    if (noteBtn) {
      noteBtn.addEventListener("click", () => {
        dismiss();
        window.location.hash = `#/game/${gameId}?focusEntry=${entryId || ""}`;
      });
    }

    root.appendChild(toast);
    setTimeout(dismiss, 8000);
  }

  return { show };
})();
