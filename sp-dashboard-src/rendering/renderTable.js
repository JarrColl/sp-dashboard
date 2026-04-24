import { formatTime } from "../utils/time.js";
import { formatDateShort } from "../utils/date.js";

export const getStatusBadge = (entry) => {
  if (entry.late) return { cls: "badge-yellow", label: "Late" };
  if (entry.overdue) return { cls: "badge-red", label: "Overdue" };
  if (entry.isDone) return { cls: "badge-done", label: "Done" };
  return { cls: "badge-progress", label: "In Progress" };
};

export const renderTable = (entries) => {
  const tbody = document.getElementById("details-table-body");

  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-color-muted, #9e9e9e); padding: 3rem;">No tracked time found for this date range.</td></tr>`;
    return;
  }

  tbody.innerHTML = entries
    .map((entry) => {
      const badge = getStatusBadge(entry);
      return `
        <tr>
          <td style="white-space: nowrap;">${formatDateShort(entry.date)}</td>
          <td style="color: var(--text-color-muted, #9e9e9e); font-size: 0.875rem;">${entry.projectName}</td>
          <td style="font-weight: 500;">${entry.taskTitle}</td>
          <td class="time-cell">${formatTime(entry.timeSpent)}</td>
          <td><span class="badge ${badge.cls}">${badge.label}</span></td>
        </tr>
      `;
    })
    .join("");
};
