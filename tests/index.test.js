import { describe, it, expect } from 'vitest';
import { formatTime, applyRounding } from '../sp-dashboard-src/utils/time.js';
import { formatDateShort, getDatesInRange } from '../sp-dashboard-src/utils/date.js';
import { processData } from '../sp-dashboard-src/processing/processData.js';
import { switchTab } from '../sp-dashboard-src/rendering/tabs.js';
import { updateBarChart, updatePieChart } from '../sp-dashboard-src/rendering/charts.js';

const makeTask = (id, title, overrides = {}) => ({
  id,
  parentId: null,
  title,
  isDone: false,
  timeSpentOnDay: {},
  ...overrides,
});

describe('Date Range Reporter UI', () => {
  describe('Utility Functions', () => {
    it('should correctly format time in milliseconds to hours and minutes', () => {
      expect(formatTime(3600000)).toBe('1h 0m');
      expect(formatTime(9000000)).toBe('2h 30m');
      expect(formatTime(0)).toBe('0h 0m');
    });

    it('should format date strings to short readable format', () => {
      expect(formatDateShort('2026-02-22')).toBe('Feb 22, 2026');
    });

    it('should generate an array of dates within a range', () => {
      const range = getDatesInRange('2026-02-20', '2026-02-22');
      expect(range).toEqual(['2026-02-20', '2026-02-21', '2026-02-22']);
    });
  });

  describe('Dashboard State Updates', () => {
    it('should calculate metrics correctly and update stat cards', () => {
      const today = new Date().toISOString().split('T')[0];
      const mockTasks = [
        makeTask('t1', 'Task 1', { isDone: true, doneOn: Date.now(), timeSpentOnDay: { [today]: 7200000 } }),
        makeTask('t2', 'Task 2', { timeSpentOnDay: { [today]: 3600000 } }),
      ];
      const mockProjects = [{ id: 'p1', title: 'Test Project' }];

      processData(mockTasks, mockProjects);

      expect(document.getElementById('stat-time').innerText).toBe('3h 0m');
      expect(document.getElementById('stat-tasks').innerText).toBe('1');
      expect(document.getElementById('stat-tasks-total').innerText).toContain('2 total');

      const progressFill = document.getElementById('stat-tasks-progress');
      expect(progressFill.style.width).toBe('50%');
    });

    it('should not double-count time from parent aggregator tasks', () => {
      const today = new Date().toISOString().split('T')[0];
      const mockTasks = [
        makeTask('parent', 'Parent Task', { subTaskIds: ['child'], timeSpentOnDay: { [today]: 7200000 } }),
        makeTask('child', 'Child Task', { parentId: 'parent', timeSpentOnDay: { [today]: 7200000 } }),
      ];

      processData(mockTasks, []);

      expect(document.getElementById('stat-time').innerText).toBe('2h 0m');
      expect(document.getElementById('stat-tasks-total').innerText).toContain('1 total');
    });

    it('should honor dueDay provided initially', () => {
      const now = Date.now();
      const dueStr = new Date(now - 86400000).toISOString().split('T')[0];
      const task = makeTask('t-initial', 'Initial Overdue', { dueDay: dueStr });
      processData([task], []);
      expect(document.getElementById('stat-overdue').innerText).toBe('1');
      const row = document.querySelector('#details-table-body tr');
      expect(row.textContent).toContain('Initial Overdue');
    });

    it('should pick up overdue when dueDay is added later', () => {
      const now = Date.now();
      const task = makeTask('t-late', 'Late Task');
      const tasks = [task];

      processData(tasks, []);
      expect(document.getElementById('stat-overdue').innerText).toBe('0');

      task.dueDay = new Date(now - 86400000).toISOString().split('T')[0];
      processData(tasks, []);
      expect(document.getElementById('stat-overdue').innerText).toBe('1');
    });

    it('should not mark a task overdue/late if dueDay is added on the same day after completion', () => {
      const now = Date.now();
      const task = makeTask('t-add-today', 'Added Today', { isDone: true, doneOn: now });
      const tasks = [task];
      processData(tasks, []);
      expect(document.getElementById('stat-overdue').innerText).toBe('0');
      expect(document.getElementById('stat-late').innerText).toBe('0');

      task.dueDay = new Date(now).toISOString().split('T')[0];
      processData(tasks, []);
      expect(document.getElementById('stat-overdue').innerText).toBe('0');
      expect(document.getElementById('stat-late').innerText).toBe('0');
    });

    it('should count a task done after its due day as overdue and late', () => {
      const now = Date.now();
      const due = new Date(now - 86400000);
      const task = makeTask('t-done-late', 'Done Late', {
        isDone: true, doneOn: now, dueDay: due.toISOString().split('T')[0],
      });
      processData([task], []);
      expect(document.getElementById('stat-overdue').innerText).toBe('1');
      expect(document.getElementById('stat-late').innerText).toBe('1');
      const row = document.querySelector('#details-table-body tr');
      expect(row.textContent).toContain('Done Late');
    });

    it('should handle a task without dueDay by not marking it overdue', () => {
      const task = makeTask('t-no-due', 'No Due Date');
      processData([task], []);
      expect(document.getElementById('stat-overdue').innerText).toBe('0');
      expect(document.getElementById('stat-tasks').innerText).toBe('0');
    });

    it('should not mark a task due today as late if completed same day', () => {
      const now = Date.now();
      const todayStr = new Date(now).toISOString().split('T')[0];
      const task = makeTask('t-due-today', 'Due Today', {
        isDone: true, doneOn: now, dueDay: todayStr,
      });
      processData([task], []);
      expect(document.getElementById('stat-late').innerText).toBe('0');
      const row = document.querySelector('#details-table-body tr');
      expect(row.textContent).toContain('Due Today');
      expect(document.getElementById('stat-tasks').innerText).toBe('1');
      expect(document.getElementById('stat-tasks-total').innerText).toContain('1 total');
    });

    it('should count a completed subtask in total tasks', () => {
      const now = Date.now();
      const sub = makeTask('sub1', 'subtask done', {
        parentId: 'parent', isDone: true, doneOn: now,
        dueDay: new Date(now).toISOString().split('T')[0],
      });
      processData([sub], []);
      expect(document.getElementById('stat-tasks').innerText).toBe('1');
      expect(document.getElementById('stat-tasks-total').innerText).toContain('1 total');
    });

    it('should count tasks due today in totalTasks denominator even with no time logged', () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const taskDueToday = makeTask('t-due-no-time', 'Due Today No Time', { dueDay: todayStr });
      processData([taskDueToday], []);
      expect(document.getElementById('stat-tasks-total').innerText).toContain('1 total');
      expect(document.getElementById('stat-tasks').innerText).toBe('0');
    });

    it('should deduplicate tasks that appear in both active and archived lists', () => {
      const now = Date.now();
      const doneTask = makeTask('task1', 'Done Task', {
        isDone: true, doneOn: now,
        dueDay: new Date(now).toISOString().split('T')[0],
      });
      const activeTasks = [doneTask];
      const archivedTasks = [doneTask];

      const taskMap = new Map();
      archivedTasks.forEach(task => taskMap.set(task.id, task));
      activeTasks.forEach(task => taskMap.set(task.id, task));
      const deduplicatedTasks = Array.from(taskMap.values());

      expect(deduplicatedTasks.length).toBe(1);

      processData(deduplicatedTasks, []);
      expect(document.getElementById('stat-tasks').innerText).toBe('1');
    });
  });

  describe('Navigation & Interactivity', () => {
    it('should switch between Dashboard and Detailed List tabs', () => {
      const dashView = document.getElementById('view-dashboard');
      const detailsView = document.getElementById('view-details');
      const dashBtn = document.getElementById('tab-btn-dashboard');
      const detailsBtn = document.getElementById('tab-btn-details');

      expect(dashView.classList.contains('hidden')).toBe(false);
      expect(detailsView.classList.contains('hidden')).toBe(true);
      expect(dashBtn.classList.contains('active')).toBe(true);

      switchTab('details');
      expect(dashView.classList.contains('hidden')).toBe(true);
      expect(detailsView.classList.contains('hidden')).toBe(false);
      expect(detailsBtn.classList.contains('active')).toBe(true);

      switchTab('dashboard');
      expect(dashView.classList.contains('hidden')).toBe(false);
      expect(dashBtn.classList.contains('active')).toBe(true);
    });

    it('should show custom date pickers only when Custom Range is selected', () => {
      const presetSelect = document.getElementById('date-preset');
      const customContainer = document.getElementById('custom-date-container');

      presetSelect.value = 'custom';
      presetSelect.dispatchEvent(new Event('change'));
      expect(customContainer.classList.contains('hidden')).toBe(false);

      presetSelect.value = 'week';
      presetSelect.dispatchEvent(new Event('change'));
      expect(customContainer.classList.contains('hidden')).toBe(true);
    });

    it('today preset should produce a single-day date range', () => {
      const presetSelect = document.getElementById('date-preset');
      presetSelect.value = 'today';
      presetSelect.dispatchEvent(new Event('change'));

      processData([], []);

      const barContainer = document.getElementById('bar-chart-container');
      expect(barContainer.querySelectorAll('.bar-col').length).toBe(1);
    });

    it('bar and pie charts should render for overdue and late types and details show badges', () => {
      const now = Date.now();
      const yesterdayStr = new Date(now - 86400000).toISOString().split('T')[0];
      const overdueTask = makeTask('t1', 'Foo', { dueDay: '2026-02-20', timeSpentOnDay: { '2026-02-20': 0 } });
      const lateTask = makeTask('t2', 'Bar', { isDone: true, doneOn: now, dueDay: yesterdayStr });
      processData([overdueTask, lateTask], []);

      const rows = document.querySelectorAll('#details-table-body tr');
      expect(rows.length).toBe(2);
      const text = Array.from(rows).map(r => r.textContent).join(' ');
      expect(text).toContain('Overdue');
      expect(text).toContain('Late');

      const barSelect = document.getElementById('bar-chart-select');
      const pieSelect = document.getElementById('pie-chart-select');
      const barContainer = document.getElementById('bar-chart-container');

      const preset = document.getElementById('date-preset');
      preset.value = 'month';
      preset.dispatchEvent(new Event('change'));
      processData([overdueTask, lateTask], []);
      expect(barContainer.querySelectorAll('.bar-col').length).toBeLessThanOrEqual(12);
      preset.value = 'year';
      preset.dispatchEvent(new Event('change'));
      processData([overdueTask, lateTask], []);
      expect(barContainer.querySelectorAll('.bar-col').length).toBeLessThanOrEqual(12);

      barSelect.value = 'overdue';
      updateBarChart();
      expect(barContainer.querySelector('.bar')).not.toBeNull();

      barSelect.value = 'late';
      updateBarChart();
      expect(barContainer.querySelector('.bar')).not.toBeNull();

      pieSelect.value = 'overdue';
      updatePieChart();
      const pieLegend = document.getElementById('pie-legend-container');
      expect(pieLegend.querySelector('.legend-item')).not.toBeNull();

      pieSelect.value = 'late';
      updatePieChart();
      expect(pieLegend.querySelector('.legend-item')).not.toBeNull();
    });

    it('switchTab also toggles the daily-breakdown tab', () => {
      const dashView = document.getElementById('view-dashboard');
      const dailyView = document.getElementById('view-daily-breakdown');
      const detailsView = document.getElementById('view-details');
      const dailyBtn = document.getElementById('tab-btn-daily-breakdown');

      switchTab('daily-breakdown');
      expect(dashView.classList.contains('hidden')).toBe(true);
      expect(dailyView.classList.contains('hidden')).toBe(false);
      expect(detailsView.classList.contains('hidden')).toBe(true);
      expect(dailyBtn.classList.contains('active')).toBe(true);
    });

    it('detail list columns are sortable when headers are clicked', () => {
      const taskA = makeTask('a', 'A', { dueDay: '2026-01-01', timeSpentOnDay: { '2026-01-01': 3600000 } });
      const taskB = makeTask('b', 'B', { dueDay: '2026-01-02', timeSpentOnDay: { '2026-01-02': 3600000 } });
      processData([taskA, taskB], []);
      const initial = Array.from(document.querySelectorAll('#details-table-body tr td:first-child')).map(td => td.textContent);
      expect(initial.length).toBe(2);
      const dateTh = document.querySelector('#view-details th[data-sort="date"]');
      dateTh.click();
      expect(dateTh.classList.contains('sorted-asc')).toBe(true);
      const after = Array.from(document.querySelectorAll('#details-table-body tr td:first-child')).map(td => td.textContent);
      expect(after[0]).toBe(initial[1]);
      expect(after[1]).toBe(initial[0]);
      dateTh.click();
      expect(dateTh.classList.contains('sorted-desc')).toBe(true);
    });
  });

  describe('Daily Breakdown Tab', () => {
    const setCustomRange = (fromStr, toStr) => {
      const presetSelect = document.getElementById('date-preset');
      presetSelect.value = 'custom';
      document.getElementById('date-from').value = fromStr;
      document.getElementById('date-to').value = toStr;
    };

    it('aggregates time per (date, project) pair, dropping empty-day cells', () => {
      setCustomRange('2026-02-19', '2026-02-22');
      const tasks = [
        makeTask('a', 'A', { projectId: 'p1', timeSpentOnDay: { '2026-02-20': 3600000, '2026-02-21': 1800000 } }),
        makeTask('b', 'B', { projectId: 'p1', timeSpentOnDay: { '2026-02-20': 1800000 } }),
        makeTask('c', 'C', { projectId: 'p2', timeSpentOnDay: { '2026-02-22': 7200000 } }),
      ];
      const projects = [{ id: 'p1', title: 'Alpha' }, { id: 'p2', title: 'Beta' }];
      processData(tasks, projects);

      const rows = Array.from(document.querySelectorAll('#daily-breakdown-body tr'));
      expect(rows.length).toBe(6);

      const text = rows.map(r => r.textContent).join(' ');
      expect(text).not.toContain('Feb 19');
    });

    it('buckets tasks with null projectId under Uncategorized', () => {
      setCustomRange('2026-02-20', '2026-02-20');
      const tasks = [
        makeTask('n', 'No Proj', { projectId: null, timeSpentOnDay: { '2026-02-20': 3600000 } }),
      ];
      processData(tasks, []);
      const text = document.getElementById('daily-breakdown-body').textContent;
      expect(text).toContain('Uncategorized');
    });

    it('Date → Project sort emits a Day total row between date groups, sorted desc', () => {
      setCustomRange('2026-02-20', '2026-02-22');
      const tasks = [
        makeTask('a', 'A', { projectId: 'p1', timeSpentOnDay: { '2026-02-20': 3600000, '2026-02-22': 7200000 } }),
      ];
      const projects = [{ id: 'p1', title: 'Alpha' }];
      processData(tasks, projects);
      document.getElementById('daily-breakdown-sort').value = 'date-project';
      document.getElementById('daily-breakdown-sort').dispatchEvent(new Event('change'));

      const rows = Array.from(document.querySelectorAll('#daily-breakdown-body tr'));
      expect(rows[0].textContent).toContain('Feb 22');
      expect(rows[1].classList.contains('subtotal-row')).toBe(true);
      expect(rows[1].textContent).toContain('Day total');
      expect(rows[1].textContent).toContain('2h 0m');
      expect(rows[2].textContent).toContain('Feb 20');
      expect(rows[3].classList.contains('subtotal-row')).toBe(true);
      expect(rows[3].textContent).toContain('Day total');
      expect(rows[3].textContent).toContain('1h 0m');
    });

    it('Project → Date sort emits a Project total row and orders projects by total hours desc', () => {
      setCustomRange('2026-02-19', '2026-02-22');
      const tasks = [
        makeTask('a', 'A', { projectId: 'p1', timeSpentOnDay: { '2026-02-20': 3600000 } }),
        makeTask('b', 'B', { projectId: 'p2', timeSpentOnDay: { '2026-02-21': 7200000, '2026-02-22': 3600000 } }),
      ];
      const projects = [{ id: 'p1', title: 'Alpha' }, { id: 'p2', title: 'Beta' }];
      processData(tasks, projects);

      document.getElementById('daily-breakdown-sort').value = 'project-date';
      document.getElementById('daily-breakdown-sort').dispatchEvent(new Event('change'));

      const rows = Array.from(document.querySelectorAll('#daily-breakdown-body tr'));
      expect(rows[0].textContent).toContain('Beta');
      expect(rows[0].textContent).toContain('Feb 22');
      expect(rows[1].textContent).toContain('Beta');
      expect(rows[1].textContent).toContain('Feb 21');
      expect(rows[2].classList.contains('subtotal-row')).toBe(true);
      expect(rows[2].textContent).toContain('Project total');
      expect(rows[2].textContent).toContain('Beta');
      expect(rows[2].textContent).toContain('3h 0m');

      expect(rows[3].textContent).toContain('Alpha');
      expect(rows[4].classList.contains('subtotal-row')).toBe(true);
      expect(rows[4].textContent).toContain('Project total');
      expect(rows[4].textContent).toContain('Alpha');
      expect(rows[4].textContent).toContain('1h 0m');
    });

    it('hours cell exposes decimal hours via title attribute', () => {
      setCustomRange('2026-02-20', '2026-02-20');
      const tasks = [
        makeTask('a', 'A', { projectId: 'p1', timeSpentOnDay: { '2026-02-20': 9000000 } }),
      ];
      const projects = [{ id: 'p1', title: 'Alpha' }];
      processData(tasks, projects);
      const cell = document.querySelector('#daily-breakdown-body .time-cell');
      expect(cell.textContent.trim()).toBe('2h 30m');
      expect(cell.getAttribute('title')).toBe('2.50h');
    });

    it('shows empty-state message when no tracked time in the range', () => {
      setCustomRange('2026-02-19', '2026-02-22');
      processData([], []);
      const tbody = document.getElementById('daily-breakdown-body');
      expect(tbody.textContent).toContain('No tracked time found for this date range.');
    });

    it('default sort mode is date-project', () => {
      const select = document.getElementById('daily-breakdown-sort');
      expect(select.value).toBe('date-project');
    });

    describe('Rounding', () => {
      it('default rounding mode is none', () => {
        const select = document.getElementById('daily-breakdown-rounding');
        expect(select.value).toBe('none');
      });

      it('applyRounding passes through when mode is none', () => {
        expect(applyRounding(0, 'none')).toBe(0);
        expect(applyRounding(123456, 'none')).toBe(123456);
      });

      it('applyRounding rounds to 6 / 15 / 30 minute increments', () => {
        const min = (n) => n * 60 * 1000;
        expect(applyRounding(min(4), '6min')).toBe(min(6));
        expect(applyRounding(min(2), '6min')).toBe(min(0));
        expect(applyRounding(min(22), '15min')).toBe(min(15));
        expect(applyRounding(min(23), '15min')).toBe(min(30));
        expect(applyRounding(min(14), '30min')).toBe(min(0));
        expect(applyRounding(min(16), '30min')).toBe(min(30));
      });

      it('changing rounding select re-renders cells with rounded values', () => {
        const presetSelect = document.getElementById('date-preset');
        presetSelect.value = 'custom';
        document.getElementById('date-from').value = '2026-02-20';
        document.getElementById('date-to').value = '2026-02-20';
        const tasks = [
          makeTask('a', 'A', { projectId: 'p1', timeSpentOnDay: { '2026-02-20': 135 * 60000 } }),
        ];
        const projects = [{ id: 'p1', title: 'Alpha' }];
        processData(tasks, projects);

        const cell = () => document.querySelector('#daily-breakdown-body .time-cell');
        expect(cell().textContent.trim()).toBe('2h 15m');

        const roundingSelect = document.getElementById('daily-breakdown-rounding');
        roundingSelect.value = '30min';
        roundingSelect.dispatchEvent(new Event('change'));
        expect(cell().textContent.trim()).toBe('2h 30m');
        expect(cell().getAttribute('title')).toBe('2.50h');
      });

      it('default format mode is formatted', () => {
        const select = document.getElementById('daily-breakdown-format');
        expect(select.value).toBe('formatted');
      });

      it('format toggle swaps cell text and title between formatted and decimal', () => {
        const presetSelect = document.getElementById('date-preset');
        presetSelect.value = 'custom';
        document.getElementById('date-from').value = '2026-02-20';
        document.getElementById('date-to').value = '2026-02-20';
        const tasks = [
          makeTask('a', 'A', { projectId: 'p1', timeSpentOnDay: { '2026-02-20': 9000000 } }),
        ];
        const projects = [{ id: 'p1', title: 'Alpha' }];
        processData(tasks, projects);

        const cell = () => document.querySelector('#daily-breakdown-body .time-cell');
        expect(cell().textContent.trim()).toBe('2h 30m');
        expect(cell().getAttribute('title')).toBe('2.50h');

        const formatSelect = document.getElementById('daily-breakdown-format');
        formatSelect.value = 'decimal';
        formatSelect.dispatchEvent(new Event('change'));
        expect(cell().textContent.trim()).toBe('2.50h');
        expect(cell().getAttribute('title')).toBe('2h 30m');

        formatSelect.value = 'formatted';
        formatSelect.dispatchEvent(new Event('change'));
        expect(cell().textContent.trim()).toBe('2h 30m');
        expect(cell().getAttribute('title')).toBe('2.50h');
      });

      it('decimal format combined with rounding renders rounded decimal', () => {
        const presetSelect = document.getElementById('date-preset');
        presetSelect.value = 'custom';
        document.getElementById('date-from').value = '2026-02-20';
        document.getElementById('date-to').value = '2026-02-20';
        const tasks = [
          makeTask('a', 'A', { projectId: 'p1', timeSpentOnDay: { '2026-02-20': 135 * 60000 } }),
        ];
        const projects = [{ id: 'p1', title: 'Alpha' }];
        processData(tasks, projects);

        document.getElementById('daily-breakdown-rounding').value = '30min';
        document.getElementById('daily-breakdown-rounding').dispatchEvent(new Event('change'));
        document.getElementById('daily-breakdown-format').value = 'decimal';
        document.getElementById('daily-breakdown-format').dispatchEvent(new Event('change'));

        const cell = document.querySelector('#daily-breakdown-body .time-cell');
        expect(cell.textContent.trim()).toBe('2.50h');
        expect(cell.getAttribute('title')).toBe('2h 30m');
      });

      it('subtotal uses round-of-raw-sum, not sum-of-rounded-cells', () => {
        const presetSelect = document.getElementById('date-preset');
        presetSelect.value = 'custom';
        document.getElementById('date-from').value = '2026-02-20';
        document.getElementById('date-to').value = '2026-02-21';
        const twoDayTasks = [
          makeTask('a', 'A', { projectId: 'p1', timeSpentOnDay: { '2026-02-20': 4 * 60000, '2026-02-21': 4 * 60000 } }),
        ];
        const projects = [{ id: 'p1', title: 'Alpha' }];
        processData(twoDayTasks, projects);

        const roundingSelect = document.getElementById('daily-breakdown-rounding');
        roundingSelect.value = '6min';
        roundingSelect.dispatchEvent(new Event('change'));
        const sortSelect = document.getElementById('daily-breakdown-sort');
        sortSelect.value = 'project-date';
        sortSelect.dispatchEvent(new Event('change'));

        const rows = Array.from(document.querySelectorAll('#daily-breakdown-body tr'));
        expect(rows.length).toBe(3);
        expect(rows[0].textContent).toContain('0h 6m');
        expect(rows[1].textContent).toContain('0h 6m');
        expect(rows[2].classList.contains('subtotal-row')).toBe(true);
        expect(rows[2].textContent).toContain('Project total');
        expect(rows[2].textContent).toContain('0h 6m');
        expect(rows[2].textContent).not.toContain('0h 12m');
      });
    });
  });
});
