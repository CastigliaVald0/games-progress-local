window.PJ = window.PJ || {};

PJ.constants = (function () {
  const STORAGE_KEY = "pj:data";
  const SCHEMA_VERSION = 1;

  const DB_NAME = "pj-file-handles";
  const DB_VERSION = 1;
  const DB_STORE = "handles";

  const POLL_INTERVAL_MS = 45000;
  const MAX_IMAGE_DIMENSION = 400;
  const MAX_AUTO_HOURS_PER_SAVE = 12;

  const STATUS = {
    JUGANDO: "jugando",
    COMPLETADO: "completado",
    PAUSADO: "pausado",
    ABANDONADO: "abandonado",
  };

  const STATUS_LABELS = {
    [STATUS.JUGANDO]: "Jugando",
    [STATUS.COMPLETADO]: "Completado",
    [STATUS.PAUSADO]: "Pausado",
    [STATUS.ABANDONADO]: "Abandonado",
  };

  const STATUS_ORDER = [STATUS.JUGANDO, STATUS.COMPLETADO, STATUS.PAUSADO, STATUS.ABANDONADO];

  const DIARY_TYPE = {
    MANUAL: "manual",
    AUTO_SAVE_DETECTED: "auto-save-detected",
  };

  const PERMISSION_STATE = {
    GRANTED: "granted",
    PROMPT: "prompt",
    DENIED: "denied",
    MISSING: "missing",
    MISSING_FILE: "missing-file",
    UNSUPPORTED: "unsupported",
  };

  const FS_ACCESS_SUPPORTED =
    typeof window.showOpenFilePicker === "function" &&
    typeof window.showDirectoryPicker === "function";

  return {
    STORAGE_KEY,
    SCHEMA_VERSION,
    DB_NAME,
    DB_VERSION,
    DB_STORE,
    POLL_INTERVAL_MS,
    MAX_IMAGE_DIMENSION,
    MAX_AUTO_HOURS_PER_SAVE,
    STATUS,
    STATUS_LABELS,
    STATUS_ORDER,
    DIARY_TYPE,
    PERMISSION_STATE,
    FS_ACCESS_SUPPORTED,
  };
})();
