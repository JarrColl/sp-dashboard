import { MODES } from '../constants.js';
import { formatTime, formatDecimalHours, applyRounding } from '../utils/time.js';
import { formatDateWithWeekday } from '../utils/date.js';

export const renderDailyBreakdown = (entries) => {
  const tbody = document.getElementById('daily-breakdown-body');
  const sortMode = document.getElementById('daily-breakdown-sort').value;
  const roundingMode = document.getElementById('daily-breakdown-rounding').value;
  const formatMode = document.getElementById('daily-breakdown-format').value;

  if (!entries || entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-color-muted, #9e9e9e); padding: 3rem;">No tracked time found for this date range.</td></tr>`;
    return;
  }

  const hoursCellContent = (ms) => {
    if (formatMode === MODES.FORMAT.DECIMAL) {
      return { text: formatDecimalHours(ms), title: formatTime(ms) };
    }
    return { text: formatTime(ms), title: formatDecimalHours(ms) };
  };

  const htmlRows = [];
  const dataRow = (e) => {
    const ms = applyRounding(e.totalMs, roundingMode);
    const { text, title } = hoursCellContent(ms);
    return `
          <tr>
            <td style="white-space: nowrap;">${formatDateWithWeekday(e.dateStr)}</td>
            <td style="color: var(--text-color-muted, #9e9e9e); font-size: 0.875rem;">${e.projectName}</td>
            <td class="time-cell" title="${title}">${text}</td>
          </tr>
        `;
  };
  const subtotalRow = (labelHtml, rawTotalMs) => {
    const ms = applyRounding(rawTotalMs, roundingMode);
    const { text, title } = hoursCellContent(ms);
    return `
          <tr class="subtotal-row">
            <td></td>
            <td>${labelHtml}</td>
            <td class="time-cell" title="${title}">${text}</td>
          </tr>
        `;
  };

  if (sortMode === MODES.SORT.PROJECT_DATE) {
    const projectGroups = new Map();
    entries.forEach(e => {
      const key = e.projectId || '__no_project__';
      if (!projectGroups.has(key)) {
        projectGroups.set(key, { projectName: e.projectName, entries: [], totalMs: 0 });
      }
      const g = projectGroups.get(key);
      g.entries.push(e);
      g.totalMs += e.totalMs;
    });
    const sortedGroups = Array.from(projectGroups.values()).sort((a, b) => b.totalMs - a.totalMs);
    sortedGroups.forEach(group => {
      const sortedEntries = [...group.entries].sort((a, b) => b.dateStr.localeCompare(a.dateStr));
      sortedEntries.forEach(e => htmlRows.push(dataRow(e)));
      htmlRows.push(subtotalRow(`Project total &mdash; ${group.projectName}`, group.totalMs));
    });
  } else {
    const dateGroups = new Map();
    entries.forEach(e => {
      if (!dateGroups.has(e.dateStr)) {
        dateGroups.set(e.dateStr, { entries: [], totalMs: 0 });
      }
      const g = dateGroups.get(e.dateStr);
      g.entries.push(e);
      g.totalMs += e.totalMs;
    });
    const sortedDates = Array.from(dateGroups.keys()).sort((a, b) => b.localeCompare(a));
    sortedDates.forEach(dateStr => {
      const g = dateGroups.get(dateStr);
      const sortedEntries = [...g.entries].sort((a, b) => b.totalMs - a.totalMs);
      sortedEntries.forEach(e => htmlRows.push(dataRow(e)));
      htmlRows.push(subtotalRow(`Day total &mdash; ${formatDateWithWeekday(dateStr)}`, g.totalMs));
    });
  }

  tbody.innerHTML = htmlRows.join('');
};
