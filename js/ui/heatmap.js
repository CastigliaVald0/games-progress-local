window.PJ = window.PJ || {};
PJ.ui = window.PJ.ui || {};

PJ.ui.heatmap = (function () {
  const WEEKS = 53;
  const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const WEEKDAY_LABELS = { 1: "Lun", 3: "Mié", 5: "Vie" };

  function toDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function startOfDay(d) {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  function fromDateKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function levelFor(count) {
    if (!count) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count === 3) return 3;
    return 4;
  }

  function render(container, diaryEntries) {
    const counts = new Map();
    (diaryEntries || []).forEach((entry) => {
      if (!entry.timestamp) return;
      const key = toDateKey(new Date(entry.timestamp));
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const today = startOfDay(new Date());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
    const start = new Date(endOfWeek);
    start.setDate(endOfWeek.getDate() - (WEEKS * 7 - 1));

    const weeks = [];
    for (let w = 0; w < WEEKS; w++) {
      const weekDays = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + w * 7 + d);
        weekDays.push(day);
      }
      weeks.push(weekDays);
    }

    let playedDays = 0;
    counts.forEach((_, key) => {
      const d = fromDateKey(key);
      if (d >= start && d <= today) playedDays++;
    });

    let lastMonth = -1;
    const monthsHtml = weeks
      .map((weekDays) => {
        const firstDay = weekDays[0];
        let label = "";
        if (firstDay.getMonth() !== lastMonth && firstDay.getDate() <= 7) {
          label = MONTH_NAMES[firstDay.getMonth()];
          lastMonth = firstDay.getMonth();
        }
        return `<div class="heatmap-col-slot heatmap-month-label">${label}</div>`;
      })
      .join("");

    const weekdayLabelsHtml = [0, 1, 2, 3, 4, 5, 6]
      .map((wd) => `<div class="heatmap-weekday-label">${WEEKDAY_LABELS[wd] || ""}</div>`)
      .join("");

    const weeksHtml = weeks
      .map((weekDays) => {
        const daysHtml = weekDays
          .map((d) => {
            if (d > today) {
              return `<div class="heatmap-day heatmap-day-empty"></div>`;
            }
            const key = toDateKey(d);
            const count = counts.get(key) || 0;
            const level = levelFor(count);
            const dateLabel = d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
            const countLabel = count ? `${count} registro${count === 1 ? "" : "s"}` : "Sin actividad";
            return `<div class="heatmap-day heatmap-level-${level}" title="${countLabel} — ${dateLabel}"></div>`;
          })
          .join("");
        return `<div class="heatmap-col-slot heatmap-week">${daysHtml}</div>`;
      })
      .join("");

    container.innerHTML = `
      <div class="heatmap-total">${playedDays} día${playedDays === 1 ? "" : "s"} con actividad en el último año</div>
      <div class="heatmap-body">
        <div class="heatmap-weekday-labels">
          <div class="heatmap-weekday-spacer"></div>
          ${weekdayLabelsHtml}
        </div>
        <div class="heatmap-scroll">
          <div class="heatmap-months">${monthsHtml}</div>
          <div class="heatmap-weeks">${weeksHtml}</div>
        </div>
      </div>
      <div class="heatmap-legend">
        <span>Menos</span>
        <span class="heatmap-day heatmap-level-0"></span>
        <span class="heatmap-day heatmap-level-1"></span>
        <span class="heatmap-day heatmap-level-2"></span>
        <span class="heatmap-day heatmap-level-3"></span>
        <span class="heatmap-day heatmap-level-4"></span>
        <span>Más</span>
      </div>
    `;
  }

  return { render };
})();
