window.PJ = window.PJ || {};

PJ.fileWatcher = (function () {
  const { POLL_INTERVAL_MS, PERMISSION_STATE, DIARY_TYPE, FS_ACCESS_SUPPORTED, MAX_AUTO_HOURS_PER_SAVE } = PJ.constants;
  const storage = PJ.storage;
  const db = PJ.db;

  // gameId -> { handle, kind }
  const activeWatchers = new Map();
  let intervalId = null;

  function dispatchSaveDetected(gameId, entry) {
    window.dispatchEvent(new CustomEvent("pj:save-detected", { detail: { gameId, entry } }));
  }

  async function directoryMaxModified(dirHandle) {
    let max = 0;
    for await (const [, handle] of dirHandle.entries()) {
      if (handle.kind === "file") {
        try {
          const file = await handle.getFile();
          if (file.lastModified > max) max = file.lastModified;
        } catch (e) {
          // ignore unreadable entries
        }
      }
    }
    return max;
  }

  async function readModified(handle, kind) {
    if (kind === "file") {
      const file = await handle.getFile();
      return file.lastModified;
    }
    return directoryMaxModified(handle);
  }

  function estimateHoursDelta(watch) {
    const checkpoint = watch.lastDetectionAt || watch.lastCheckedAt;
    if (!checkpoint) return 0;
    const elapsedMs = Date.now() - new Date(checkpoint).getTime();
    const hours = Math.max(0, elapsedMs / 3600000);
    const capped = Math.min(hours, MAX_AUTO_HOURS_PER_SAVE);
    return Math.round(capped * 10) / 10;
  }

  async function onSaveDetected(gameId) {
    const game = storage.getGame(gameId);
    if (!game) return;
    const hoursDelta = estimateHoursDelta(game.watch);
    const wasCapped = hoursDelta >= MAX_AUTO_HOURS_PER_SAVE;
    const note = wasCapped
      ? `Partida guardada (detectado automáticamente) — se sumaron ${hoursDelta} h (tope máximo; ajustá si jugaste menos)`
      : `Partida guardada (detectado automáticamente) — se sumaron ${hoursDelta} h`;

    const entry = storage.addDiaryEntry(gameId, {
      type: DIARY_TYPE.AUTO_SAVE_DETECTED,
      note,
      hoursDelta,
    });
    storage.updateWatch(gameId, {
      lastCheckedAt: PJ.utils.nowIso(),
      lastDetectionAt: PJ.utils.nowIso(),
    });
    dispatchSaveDetected(gameId, entry);
    PJ.ui.toast.show({
      gameName: game.name,
      coverImage: game.coverImage,
      message: `Partida guardada detectada — +${hoursDelta} h`,
      gameId,
      entryId: entry ? entry.id : null,
    });
  }

  async function pollOnce() {
    for (const [gameId, watcher] of activeWatchers.entries()) {
      const game = storage.getGame(gameId);
      if (!game || !game.watch || !game.watch.enabled) {
        activeWatchers.delete(gameId);
        continue;
      }
      try {
        const modified = await readModified(watcher.handle, watcher.kind);
        const prev = game.watch.lastKnownModified;
        storage.updateWatch(gameId, { lastKnownModified: modified, lastCheckedAt: PJ.utils.nowIso() });
        if (prev !== null && prev !== undefined && modified > prev) {
          await onSaveDetected(gameId);
        }
      } catch (e) {
        if (e && e.name === "NotFoundError") {
          storage.updateWatch(gameId, { permissionState: PERMISSION_STATE.MISSING_FILE });
          activeWatchers.delete(gameId);
          window.dispatchEvent(new CustomEvent("pj:watch-changed", { detail: { gameId } }));
        } else {
          console.error("Error revisando archivo vigilado", gameId, e);
        }
      }
    }
  }

  function startPolling() {
    if (intervalId) return;
    intervalId = setInterval(pollOnce, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = null;
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      stopPolling();
    } else {
      startPolling();
      pollOnce();
    }
  }

  async function initWatchers() {
    if (!FS_ACCESS_SUPPORTED) return;
    const games = storage.listGames().filter((g) => g.watch && g.watch.enabled);
    for (const game of games) {
      try {
        const record = await db.getHandle(game.watch.handleId);
        if (!record) {
          storage.updateWatch(game.id, { permissionState: PERMISSION_STATE.MISSING });
          continue;
        }
        const perm = await record.handle.queryPermission({ mode: "read" });
        if (perm === "granted") {
          activeWatchers.set(game.id, { handle: record.handle, kind: record.kind });
          storage.updateWatch(game.id, { permissionState: PERMISSION_STATE.GRANTED });
        } else {
          storage.updateWatch(game.id, { permissionState: perm });
        }
      } catch (e) {
        console.error("No se pudo inicializar el watch de", game.id, e);
        storage.updateWatch(game.id, { permissionState: PERMISSION_STATE.MISSING });
      }
    }
    if (!document.hidden) {
      startPolling();
      pollOnce();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  async function setupWatch(gameId, kind) {
    if (!FS_ACCESS_SUPPORTED) throw new Error("File System Access API no soportada en este navegador");
    const handle =
      kind === "file" ? await window.showOpenFilePicker().then((r) => r[0]) : await window.showDirectoryPicker();
    const handleId = PJ.utils.uuid();
    await db.saveHandle(handleId, gameId, kind, handle);
    const modified = await readModified(handle, kind);
    storage.updateWatch(gameId, {
      enabled: true,
      handleId,
      kind,
      lastKnownModified: modified,
      lastCheckedAt: PJ.utils.nowIso(),
      permissionState: PERMISSION_STATE.GRANTED,
    });
    activeWatchers.set(gameId, { handle, kind });
    if (!document.hidden) startPolling();
    return storage.getGame(gameId);
  }

  async function reauthorize(gameId) {
    const game = storage.getGame(gameId);
    if (!game || !game.watch || !game.watch.handleId) return null;
    const record = await db.getHandle(game.watch.handleId);
    if (!record) {
      storage.updateWatch(gameId, { permissionState: PERMISSION_STATE.MISSING });
      return storage.getGame(gameId);
    }
    const perm = await record.handle.requestPermission({ mode: "read" });
    if (perm === "granted") {
      const modified = await readModified(record.handle, record.kind);
      activeWatchers.set(gameId, { handle: record.handle, kind: record.kind });
      storage.updateWatch(gameId, {
        permissionState: PERMISSION_STATE.GRANTED,
        lastKnownModified: modified,
        lastCheckedAt: PJ.utils.nowIso(),
      });
      if (!document.hidden) startPolling();
    } else {
      storage.updateWatch(gameId, { permissionState: perm });
    }
    return storage.getGame(gameId);
  }

  async function removeWatch(gameId) {
    const game = storage.getGame(gameId);
    if (game && game.watch && game.watch.handleId) {
      await db.deleteHandle(game.watch.handleId).catch(() => {});
    }
    activeWatchers.delete(gameId);
    storage.updateWatch(gameId, {
      enabled: false,
      handleId: null,
      kind: null,
      lastKnownModified: null,
      lastCheckedAt: null,
      permissionState: PERMISSION_STATE.MISSING,
    });
    return storage.getGame(gameId);
  }

  return {
    initWatchers,
    setupWatch,
    reauthorize,
    removeWatch,
    pollOnce,
    isSupported: () => FS_ACCESS_SUPPORTED,
  };
})();
