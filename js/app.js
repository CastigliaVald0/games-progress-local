(function () {
  document.addEventListener("DOMContentLoaded", async () => {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }

    PJ.router.init();

    document.getElementById("btn-add-game").addEventListener("click", () => {
      PJ.ui.modal.openAddGame(() => {
        window.location.hash = "#/";
        PJ.router.render();
      });
    });

    try {
      await PJ.fileWatcher.initWatchers();
    } catch (e) {
      console.error("No se pudo inicializar la detección de guardado automático", e);
    }
  });
})();
