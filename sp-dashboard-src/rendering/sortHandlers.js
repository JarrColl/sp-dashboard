import { getCurrentSort, getLatestMetrics } from '../state.js';
import { renderTable } from './renderTable.js';

export const sortEntries = (entries, key, dir) => {
  const cmp = (a, b) => {
    let av = a[key];
    let bv = b[key];
    if (key === 'date') {
      av = a.date || '';
      bv = b.date || '';
    } else if (key === 'timeSpent') {
      av = a.timeSpent || 0;
      bv = b.timeSpent || 0;
    } else if (key === 'status') {
      const label = e => e.late ? '2' : e.overdue ? '1' : e.isDone ? '3' : '0';
      av = label(a);
      bv = label(b);
    } else {
      av = (av || '').toString();
      bv = (bv || '').toString();
    }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  };
  return [...entries].sort(cmp);
};

export const updateSortIndicators = () => {
  const currentSort = getCurrentSort();
  document.querySelectorAll('#view-details th').forEach(th => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    const key = th.getAttribute('data-sort');
    if (key === currentSort.key) {
      th.classList.add(currentSort.dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
  });
};

export const attachSortHandlers = () => {
  document.querySelectorAll('#view-details th[data-sort]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const currentSort = getCurrentSort();
      const key = th.getAttribute('data-sort');
      if (currentSort.key === key) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.key = key;
        currentSort.dir = 'asc';
      }
      const latestMetrics = getLatestMetrics();
      if (latestMetrics) {
        const sorted = sortEntries(latestMetrics.tableEntries, currentSort.key, currentSort.dir);
        renderTable(sorted);
      }
      updateSortIndicators();
    });
  });
};
