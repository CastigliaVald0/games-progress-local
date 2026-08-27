window.PJ = window.PJ || {};

PJ.utils = (function () {
  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatRelative(iso) {
    if (!iso) return "Nunca";
    const then = new Date(iso).getTime();
    const diffMs = Date.now() - then;
    const sec = Math.round(diffMs / 1000);
    if (sec < 60) return "Justo ahora";
    const min = Math.round(sec / 60);
    if (min < 60) return `Hace ${min} min`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `Hace ${hr} h`;
    const day = Math.round(hr / 24);
    if (day < 30) return `Hace ${day} d`;
    const month = Math.round(day / 30);
    if (month < 12) return `Hace ${month} mes${month > 1 ? "es" : ""}`;
    const year = Math.round(month / 12);
    return `Hace ${year} año${year > 1 ? "s" : ""}`;
  }

  function debounce(fn, wait) {
    let t = null;
    return function debounced(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function downscaleImage(file, maxDimension) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("No se pudo leer la imagen"));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  return {
    uuid,
    nowIso,
    formatDateTime,
    formatRelative,
    debounce,
    escapeHtml,
    downscaleImage,
  };
})();
