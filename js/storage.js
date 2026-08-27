window.PJ = window.PJ || {};

PJ.storage = (function () {
  const { STORAGE_KEY, SCHEMA_VERSION, STATUS, DIARY_TYPE, PERMISSION_STATE } = PJ.constants;
  const { uuid, nowIso } = PJ.utils;

  function defaultData() {
    return { schemaVersion: SCHEMA_VERSION, games: [] };
  }

  function migrate(data) {
    if (!data || typeof data !== "object") return defaultData();
    if (data.schemaVersion === undefined) {
      data.schemaVersion = SCHEMA_VERSION;
    }
    if (!Array.isArray(data.games)) data.games = [];
    return data;
  }

  function loadData() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      console.error("No se pudo leer localStorage", e);
      return defaultData();
    }
    if (!raw) return defaultData();
    try {
      return migrate(JSON.parse(raw));
    } catch (e) {
      console.error("Datos corruptos en localStorage, reiniciando", e);
      return defaultData();
    }
  }

  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("No se pudo guardar en localStorage", e);
      if (e && e.name === "QuotaExceededError") {
        PJ.ui?.toast?.show({
          message: "No hay espacio suficiente en el almacenamiento local. Probá con una carátula más liviana o borrando entradas viejas.",
          gameName: "Almacenamiento lleno",
        });
      }
      return false;
    }
  }

  function listGames({ status } = {}) {
    const data = loadData();
    let games = data.games;
    if (status) games = games.filter((g) => g.status === status);
    return games.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function getGame(id) {
    const data = loadData();
    return data.games.find((g) => g.id === id) || null;
  }

  function addGame({ name, coverImage, status, hoursPlayed, currentProgress }) {
    const data = loadData();
    const ts = nowIso();
    const game = {
      id: uuid(),
      name: name.trim(),
      coverImage: coverImage || null,
      status: status || STATUS.JUGANDO,
      hoursPlayed: Number(hoursPlayed) || 0,
      currentProgress: currentProgress || "",
      createdAt: ts,
      updatedAt: ts,
      lastPlayedAt: null,
      watch: {
        enabled: false,
        handleId: null,
        kind: null,
        lastKnownModified: null,
        lastCheckedAt: null,
        permissionState: PERMISSION_STATE.MISSING,
      },
      diary: [],
    };
    data.games.push(game);
    saveData(data);
    return game;
  }

  function updateGame(id, patch) {
    const data = loadData();
    const game = data.games.find((g) => g.id === id);
    if (!game) return null;
    Object.assign(game, patch);
    game.updatedAt = nowIso();
    saveData(data);
    return game;
  }

  function updateWatch(id, watchPatch) {
    const data = loadData();
    const game = data.games.find((g) => g.id === id);
    if (!game) return null;
    game.watch = Object.assign({}, game.watch, watchPatch);
    game.updatedAt = nowIso();
    saveData(data);
    return game;
  }

  function deleteGame(id) {
    const data = loadData();
    const game = data.games.find((g) => g.id === id);
    if (game && game.watch && game.watch.handleId) {
      PJ.db.deleteHandle(game.watch.handleId).catch(() => {});
    }
    data.games = data.games.filter((g) => g.id !== id);
    saveData(data);
  }

  function addDiaryEntry(gameId, { note, type, hoursDelta, timestamp }) {
    const data = loadData();
    const game = data.games.find((g) => g.id === gameId);
    if (!game) return null;
    const entry = {
      id: uuid(),
      timestamp: timestamp || nowIso(),
      type: type || DIARY_TYPE.MANUAL,
      note: note || "",
      hoursDelta: Number(hoursDelta) || 0,
    };
    game.diary.push(entry);
    if (entry.hoursDelta) {
      game.hoursPlayed = Math.max(0, (Number(game.hoursPlayed) || 0) + entry.hoursDelta);
    }
    game.lastPlayedAt = entry.timestamp;
    game.updatedAt = nowIso();
    saveData(data);
    return entry;
  }

  function updateDiaryEntry(gameId, entryId, patch) {
    const data = loadData();
    const game = data.games.find((g) => g.id === gameId);
    if (!game) return null;
    const entry = game.diary.find((e) => e.id === entryId);
    if (!entry) return null;
    Object.assign(entry, patch);
    game.updatedAt = nowIso();
    saveData(data);
    return entry;
  }

  function deleteDiaryEntry(gameId, entryId) {
    const data = loadData();
    const game = data.games.find((g) => g.id === gameId);
    if (!game) return;
    game.diary = game.diary.filter((e) => e.id !== entryId);
    game.updatedAt = nowIso();
    saveData(data);
  }

  return {
    loadData,
    saveData,
    listGames,
    getGame,
    addGame,
    updateGame,
    updateWatch,
    deleteGame,
    addDiaryEntry,
    updateDiaryEntry,
    deleteDiaryEntry,
  };
})();
