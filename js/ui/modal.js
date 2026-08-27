window.PJ = window.PJ || {};
PJ.ui = window.PJ.ui || {};

PJ.ui.modal = (function () {
  const { STATUS, STATUS_LABELS, STATUS_ORDER, MAX_IMAGE_DIMENSION } = PJ.constants;
  const { escapeHtml, downscaleImage } = PJ.utils;

  function root() {
    return document.getElementById("modal-root");
  }

  function close() {
    root().innerHTML = "";
  }

  function openAddGame(onCreated) {
    let pendingCover = null;

    root().innerHTML = `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal">
          <h2>Agregar juego</h2>
          <form id="add-game-form">
            <label class="field">
              <span>Nombre *</span>
              <input type="text" id="f-name" required autocomplete="off">
            </label>

            <div class="field">
              <span>Carátula</span>
              <div class="cover-picker">
                <div id="cover-preview" class="cover-preview">🎮</div>
                <div class="cover-inputs">
                  <input type="url" id="f-cover-url" placeholder="Pegar URL de imagen">
                  <input type="file" id="f-cover-file" accept="image/*">
                </div>
              </div>
            </div>

            <label class="field">
              <span>Estado</span>
              <select id="f-status">
                ${STATUS_ORDER.map((s) => `<option value="${s}">${STATUS_LABELS[s]}</option>`).join("")}
              </select>
            </label>

            <label class="field">
              <span>Horas jugadas</span>
              <input type="number" id="f-hours" min="0" step="0.5" value="0">
            </label>

            <label class="field">
              <span>Progreso actual</span>
              <textarea id="f-progress" rows="2" placeholder="¿Dónde vas? ej: Llegué al capítulo 3"></textarea>
            </label>

            <div class="modal-actions">
              <button type="button" class="btn" id="btn-cancel">Cancelar</button>
              <button type="submit" class="btn btn-primary">Agregar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const overlay = document.getElementById("modal-overlay");
    const preview = document.getElementById("cover-preview");
    const urlInput = document.getElementById("f-cover-url");
    const fileInput = document.getElementById("f-cover-file");

    function setPreview(dataUri) {
      pendingCover = dataUri;
      preview.innerHTML = dataUri ? `<img src="${dataUri}" alt="">` : "🎮";
    }

    urlInput.addEventListener("input", () => {
      if (urlInput.value.trim()) {
        fileInput.value = "";
        setPreview(urlInput.value.trim());
      } else {
        setPreview(null);
      }
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      urlInput.value = "";
      try {
        const dataUri = await downscaleImage(file, MAX_IMAGE_DIMENSION);
        setPreview(dataUri);
      } catch (e) {
        console.error(e);
        alert("No se pudo procesar la imagen");
      }
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.getElementById("btn-cancel").addEventListener("click", close);

    document.getElementById("add-game-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("f-name").value.trim();
      if (!name) return;
      const game = PJ.storage.addGame({
        name,
        coverImage: pendingCover,
        status: document.getElementById("f-status").value,
        hoursPlayed: document.getElementById("f-hours").value,
        currentProgress: document.getElementById("f-progress").value.trim(),
      });
      close();
      if (onCreated) onCreated(game);
    });

    document.getElementById("f-name").focus();
  }

  return { openAddGame, close };
})();
