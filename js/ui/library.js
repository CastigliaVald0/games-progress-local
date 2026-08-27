window.PJ = window.PJ || {};
PJ.ui = window.PJ.ui || {};

PJ.ui.library = (function () {
  const { STATUS_LABELS, STATUS_ORDER, PERMISSION_STATE } = PJ.constants;
  const { escapeHtml, formatRelative } = PJ.utils;

  let currentFilter = null;
  let saveDetectedHandler = null;

  function watchIcon(game) {
    if (!game.watch || !game.watch.enabled) return { icon: "", cls: "" };
    const state = game.watch.permissionState;
    if (state === PERMISSION_STATE.GRANTED) return { icon: "●", cls: "watch-ok", title: "Vigilando guardado" };
    if (state === PERMISSION_STATE.MISSING_FILE) return { icon: "●", cls: "watch-missing", title: "Archivo no encontrado" };
    return { icon: "●", cls: "watch-warn", title: "Necesita reautorización" };
  }

  function cardHtml(game) {
    const w = watchIcon(game);
    const lastNote = game.currentProgress || (game.diary.length ? game.diary[game.diary.length - 1].note : "Sin registros todavía");
    return `
      <article class="game-card" data-id="${game.id}">
        <div class="game-cover">
          ${game.coverImage ? `<img src="${game.coverImage}" alt="">` : `<div class="cover-placeholder">🎮</div>`}
          ${w.icon ? `<span class="watch-dot ${w.cls}" title="${escapeHtml(w.title)}">${w.icon}</span>` : ""}
        </div>
        <div class="game-info">
          <h3 class="game-name">${escapeHtml(game.name)}</h3>
          <span class="status-badge status-${game.status}">${STATUS_LABELS[game.status]}</span>
          <p class="game-progress">${escapeHtml(lastNote)}</p>
          <div class="game-meta">
            <span>${game.hoursPlayed || 0} h</span>
            <span>${formatRelative(game.lastPlayedAt)}</span>
          </div>
        </div>
      </article>
    `;
  }

  function filterTabsHtml() {
    const tabs = [{ value: null, label: "Todos" }].concat(
      STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] }))
    );
    return tabs
      .map(
        (t) =>
          `<button class="filter-tab ${currentFilter === t.value ? "active" : ""}" data-status="${t.value || ""}">${t.label}</button>`
      )
      .join("");
  }

  function render(root) {
    const games = PJ.storage.listGames({ status: currentFilter || undefined });
    root.innerHTML = `
      <div class="library">
        <div class="filter-tabs">${filterTabsHtml()}</div>
        ${
          games.length
            ? `<div class="game-grid">${games.map(cardHtml).join("")}</div>`
            : `<div class="empty-state">Todavía no agregaste ningún juego. Usá "Agregar juego" para empezar tu diario.</div>`
        }
      </div>
    `;

    root.querySelectorAll(".filter-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentFilter = btn.dataset.status || null;
        render(root);
      });
    });

    root.querySelectorAll(".game-card").forEach((card) => {
      card.addEventListener("click", () => {
        window.location.hash = `#/game/${card.dataset.id}`;
      });
    });

    if (!saveDetectedHandler) {
      saveDetectedHandler = () => {
        if (window.location.hash === "" || window.location.hash === "#/" || window.location.hash === "#") {
          render(root);
        }
      };
      window.addEventListener("pj:save-detected", saveDetectedHandler);
      window.addEventListener("pj:watch-changed", saveDetectedHandler);
    }
  }

  return { render };
})();
