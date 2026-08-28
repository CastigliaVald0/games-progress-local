window.PJ = window.PJ || {};
PJ.ui = window.PJ.ui || {};

PJ.ui.gameDetail = (function () {
  const { STATUS_LABELS, STATUS_ORDER, PERMISSION_STATE, FS_ACCESS_SUPPORTED } = PJ.constants;
  const { escapeHtml, formatDateTime, debounce } = PJ.utils;

  let liveUpdateListenerAttached = false;

  function currentRouteGameId() {
    const hash = window.location.hash.replace(/^#/, "");
    const path = hash.split("?")[0];
    const match = path.match(/^\/game\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function attachLiveUpdateListener(root) {
    if (liveUpdateListenerAttached) return;
    liveUpdateListenerAttached = true;
    const refreshIfActive = (e) => {
      const gameId = e.detail && e.detail.gameId;
      if (gameId && gameId === currentRouteGameId()) {
        render(root, gameId);
      }
    };
    window.addEventListener("pj:save-detected", refreshIfActive);
    window.addEventListener("pj:watch-changed", refreshIfActive);
  }

  function watchStatusHtml(game) {
    if (!FS_ACCESS_SUPPORTED) {
      return `<p class="watch-unsupported">Tu navegador no soporta la detección automática de guardado (necesita Chrome o Edge). Podés seguir usando el diario manualmente.</p>`;
    }
    const watch = game.watch || {};
    if (!watch.enabled) {
      return `
        <p class="watch-hint">Elegí el archivo o carpeta de guardado de este juego para que se registre solo cuando lo actualices.</p>
        <div class="watch-actions">
          <button class="btn" id="btn-watch-file">Elegir archivo</button>
          <button class="btn" id="btn-watch-dir">Elegir carpeta</button>
        </div>
      `;
    }
    if (watch.permissionState === PERMISSION_STATE.GRANTED) {
      return `
        <p class="watch-status watch-status-ok">✓ Vigilando ${watch.kind === "file" ? "archivo" : "carpeta"} de guardado. Última revisión: ${formatDateTime(watch.lastCheckedAt)}</p>
        <p class="watch-hint">Contando horas jugadas desde: ${formatDateTime(watch.hoursAnchorAt)}</p>
        <div class="watch-actions">
          <button class="btn" id="btn-watch-remove">Quitar seguimiento</button>
        </div>
      `;
    }
    if (watch.permissionState === PERMISSION_STATE.MISSING_FILE || watch.permissionState === PERMISSION_STATE.MISSING) {
      return `
        <p class="watch-status watch-status-warn">⚠ El archivo/carpeta ya no se encuentra o no se pudo recuperar. Elegilo de nuevo.</p>
        <div class="watch-actions">
          <button class="btn" id="btn-watch-file">Elegir archivo</button>
          <button class="btn" id="btn-watch-dir">Elegir carpeta</button>
          <button class="btn" id="btn-watch-remove">Quitar seguimiento</button>
        </div>
      `;
    }
    return `
      <p class="watch-status watch-status-warn">⚠ Se perdió el permiso de acceso (esto pasa al reiniciar el navegador). Reautorizá para seguir detectando guardados.</p>
      <div class="watch-actions">
        <button class="btn btn-primary" id="btn-watch-reauth">Reautorizar acceso</button>
        <button class="btn" id="btn-watch-remove">Quitar seguimiento</button>
      </div>
    `;
  }

  function diaryEntryHtml(entry, focusEntryId) {
    const isAuto = entry.type === "auto-save-detected";
    return `
      <li class="diary-entry ${entry.id === focusEntryId ? "diary-entry-focus" : ""}" data-entry-id="${entry.id}">
        <div class="diary-entry-header">
          <span class="diary-date">${formatDateTime(entry.timestamp)}</span>
          ${isAuto ? '<span class="diary-tag">Auto</span>' : ""}
          ${entry.hoursDelta ? `<span class="diary-tag">+${entry.hoursDelta} h</span>` : ""}
        </div>
        <p class="diary-note" data-view>${escapeHtml(entry.note) || "<em>Sin nota</em>"}</p>
        <textarea class="diary-note-edit hidden">${escapeHtml(entry.note)}</textarea>
        <div class="diary-entry-actions">
          <button class="link-btn" data-action="edit">Editar</button>
          <button class="link-btn hidden" data-action="save-edit">Guardar</button>
          <button class="link-btn danger" data-action="delete">Borrar</button>
        </div>
      </li>
    `;
  }

  function render(root, gameId, options = {}) {
    const game = PJ.storage.getGame(gameId);
    if (!game) {
      root.innerHTML = `<div class="empty-state">No se encontró el juego. <a href="#/">Volver</a></div>`;
      return;
    }
    const focusEntryId = options.focusEntryId || null;
    const diaryDesc = game.diary.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    root.innerHTML = `
      <div class="game-detail">
        <a href="#/" class="back-link">&larr; Volver a la biblioteca</a>

        <div class="detail-header">
          <div class="detail-cover">
            ${game.coverImage ? `<img src="${game.coverImage}" alt="">` : `<div class="cover-placeholder">🎮</div>`}
          </div>
          <div class="detail-fields">
            <input type="text" id="d-name" class="detail-name-input" value="${escapeHtml(game.name)}">
            <div class="detail-row">
              <label>Estado
                <select id="d-status">
                  ${STATUS_ORDER.map((s) => `<option value="${s}" ${s === game.status ? "selected" : ""}>${STATUS_LABELS[s]}</option>`).join("")}
                </select>
              </label>
              <label>Horas jugadas
                <span class="hours-control">
                  <button type="button" id="btn-hours-minus">−</button>
                  <input type="number" id="d-hours" min="0" step="0.5" value="${game.hoursPlayed || 0}">
                  <button type="button" id="btn-hours-plus">+</button>
                </span>
              </label>
            </div>
            <label class="field">
              <span>Progreso actual</span>
              <textarea id="d-progress" rows="2" placeholder="¿Dónde vas en el juego?">${escapeHtml(game.currentProgress)}</textarea>
            </label>
          </div>
        </div>

        <section class="heatmap-section">
          <h3>Actividad</h3>
          <div class="heatmap" id="heatmap-container"></div>
        </section>

        <section class="watch-section">
          <h3>Detección de guardado</h3>
          ${watchStatusHtml(game)}
        </section>

        <section class="diary-section">
          <div class="diary-header">
            <h3>Diario</h3>
            <button class="btn btn-primary" id="btn-add-entry">+ Agregar entrada</button>
          </div>
          <ul class="diary-list">
            ${diaryDesc.length ? diaryDesc.map((e) => diaryEntryHtml(e, focusEntryId)).join("") : '<li class="empty-state">Sin entradas todavía.</li>'}
          </ul>
        </section>

        <button class="btn danger-outline" id="btn-delete-game">Eliminar juego</button>
      </div>
    `;

    wireFieldEditing(root, game);
    wireWatchControls(root, game);
    wireDiary(root, game);
    PJ.ui.heatmap.render(document.getElementById("heatmap-container"), game.diary);
    attachLiveUpdateListener(root);

    document.getElementById("btn-delete-game").addEventListener("click", () => {
      if (confirm(`¿Eliminar "${game.name}" y todo su diario? Esta acción no se puede deshacer.`)) {
        PJ.storage.deleteGame(game.id);
        window.location.hash = "#/";
      }
    });

    if (focusEntryId) {
      const el = root.querySelector(`.diary-entry[data-entry-id="${focusEntryId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function wireFieldEditing(root, game) {
    const nameInput = document.getElementById("d-name");
    const statusSelect = document.getElementById("d-status");
    const hoursInput = document.getElementById("d-hours");
    const progressTextarea = document.getElementById("d-progress");

    const saveName = debounce(() => {
      const v = nameInput.value.trim();
      if (v) PJ.storage.updateGame(game.id, { name: v });
    }, 500);
    nameInput.addEventListener("input", saveName);

    statusSelect.addEventListener("change", () => {
      PJ.storage.updateGame(game.id, { status: statusSelect.value });
    });

    const saveHours = debounce(() => {
      PJ.storage.updateGame(game.id, { hoursPlayed: Number(hoursInput.value) || 0 });
    }, 400);
    hoursInput.addEventListener("input", saveHours);

    document.getElementById("btn-hours-minus").addEventListener("click", () => {
      hoursInput.value = Math.max(0, (Number(hoursInput.value) || 0) - 0.5);
      PJ.storage.updateGame(game.id, { hoursPlayed: Number(hoursInput.value) });
    });
    document.getElementById("btn-hours-plus").addEventListener("click", () => {
      hoursInput.value = (Number(hoursInput.value) || 0) + 0.5;
      PJ.storage.updateGame(game.id, { hoursPlayed: Number(hoursInput.value) });
    });

    const saveProgress = debounce(() => {
      PJ.storage.updateGame(game.id, { currentProgress: progressTextarea.value.trim() });
    }, 500);
    progressTextarea.addEventListener("input", saveProgress);
  }

  function wireWatchControls(root, game) {
    const fileBtn = document.getElementById("btn-watch-file");
    const dirBtn = document.getElementById("btn-watch-dir");
    const reauthBtn = document.getElementById("btn-watch-reauth");
    const removeBtn = document.getElementById("btn-watch-remove");

    async function refreshSection() {
      const updated = PJ.storage.getGame(game.id);
      document.querySelector(".watch-section").innerHTML =
        "<h3>Detección de guardado</h3>" + watchStatusHtml(updated);
      wireWatchControls(root, updated);
    }

    if (fileBtn) {
      fileBtn.addEventListener("click", async () => {
        try {
          await PJ.fileWatcher.setupWatch(game.id, "file");
          refreshSection();
        } catch (e) {
          if (e && e.name !== "AbortError") console.error(e);
        }
      });
    }
    if (dirBtn) {
      dirBtn.addEventListener("click", async () => {
        try {
          await PJ.fileWatcher.setupWatch(game.id, "directory");
          refreshSection();
        } catch (e) {
          if (e && e.name !== "AbortError") console.error(e);
        }
      });
    }
    if (reauthBtn) {
      reauthBtn.addEventListener("click", async () => {
        await PJ.fileWatcher.reauthorize(game.id);
        refreshSection();
      });
    }
    if (removeBtn) {
      removeBtn.addEventListener("click", async () => {
        await PJ.fileWatcher.removeWatch(game.id);
        refreshSection();
      });
    }
  }

  function wireDiary(root, game) {
    document.getElementById("btn-add-entry").addEventListener("click", () => {
      const note = prompt("Nota del diario:");
      if (note === null) return;
      const hoursStr = prompt("¿Horas jugadas en esta sesión? (opcional, dejar vacío para 0)");
      const hoursDelta = hoursStr ? Number(hoursStr) || 0 : 0;
      PJ.storage.addDiaryEntry(game.id, { note: note.trim(), hoursDelta });
      render(root, game.id);
    });

    root.querySelectorAll(".diary-entry").forEach((li) => {
      const entryId = li.dataset.entryId;
      const viewEl = li.querySelector('[data-view]');
      const editEl = li.querySelector(".diary-note-edit");
      const editBtn = li.querySelector('[data-action="edit"]');
      const saveBtn = li.querySelector('[data-action="save-edit"]');
      const deleteBtn = li.querySelector('[data-action="delete"]');

      editBtn.addEventListener("click", () => {
        viewEl.classList.add("hidden");
        editEl.classList.remove("hidden");
        saveBtn.classList.remove("hidden");
        editBtn.classList.add("hidden");
        editEl.focus();
      });

      saveBtn.addEventListener("click", () => {
        PJ.storage.updateDiaryEntry(game.id, entryId, { note: editEl.value.trim() });
        render(root, game.id);
      });

      deleteBtn.addEventListener("click", () => {
        if (confirm("¿Borrar esta entrada del diario?")) {
          PJ.storage.deleteDiaryEntry(game.id, entryId);
          render(root, game.id);
        }
      });
    });
  }

  return { render };
})();
