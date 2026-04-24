import { setLatestMetrics, getCurrentSort } from '../state.js';
import { formatTime } from '../utils/time.js';
import { sortEntries, updateSortIndicators } from './sortHandlers.js';
import { renderTable } from './renderTable.js';
import { renderDailyBreakdown } from './renderDailyBreakdown.js';
import { updateBarChart, updatePieChart } from './charts.js';

export const updateDashboardUI = (metrics) => {
  setLatestMetrics(metrics);

  const currentSort = getCurrentSort();
  const sortedEntries = sortEntries(metrics.tableEntries, currentSort.key, currentSort.dir);

  document.getElementById('stat-time').innerText = formatTime(metrics.totalTimeSpent);
  document.getElementById('stat-tasks').innerText = String(metrics.totalCompleted);
  document.getElementById('stat-tasks-total').innerText = `/ ${metrics.totalTasks} total`;

  const progress = metrics.totalTasks > 0 ? (metrics.totalCompleted / metrics.totalTasks) * 100 : 0;
  document.getElementById('stat-tasks-progress').style.width = `${progress}%`;

  const overdueEl = document.getElementById('stat-overdue');
  const overdueLabel = document.getElementById('stat-overdue-label');
  const overdueNote = document.getElementById('overdue-note');
  document.getElementById('stat-late').innerText = String(metrics.lateCompleted);
  overdueEl.innerText = String(metrics.overdueTasks);

  if (metrics.overdueTasks > 0) {
    overdueLabel.classList.remove('hidden');
    overdueEl.classList.add('text-red');
    overdueNote.classList.add('hidden');
  } else {
    overdueLabel.classList.add('hidden');
    overdueEl.classList.remove('text-red');
    if (metrics.unplannedCount > 0) {
      overdueNote.classList.remove('hidden');
      overdueNote.innerText = `${metrics.unplannedCount} task(s) have no due date so overdue is unavailable`;
    } else {
      overdueNote.classList.add('hidden');
    }
  }

  updateBarChart();
  updatePieChart();
  renderTable(sortedEntries);
  renderDailyBreakdown(metrics.dailyBreakdownEntries);
  updateSortIndicators();
};
