import { MODES } from './constants.js';
import { log } from './utils/log.js';
import { toDateString } from './utils/date.js';
import {
  getCachedTasks, getCachedProjects, getLatestMetrics,
  setCachedTasks, setCachedProjects,
} from './state.js';
import { processData } from './processing/processData.js';
import { renderDailyBreakdown } from './rendering/renderDailyBreakdown.js';
import { updateBarChart, updatePieChart } from './rendering/charts.js';
import { attachSortHandlers } from './rendering/sortHandlers.js';
import { initTabHandlers } from './rendering/tabs.js';

export const pullDataFromSP = async () => {
  log("pullDataFromSP invoked, PluginAPI?", !!window.PluginAPI);
  try {
    if (window.PluginAPI) {
      const activeTasks = await window.PluginAPI.getTasks() || [];
      log("received activeTasks count", activeTasks.length);
      const activeTasksDone = activeTasks.filter(t => t.isDone);
      log("activeTasks done:", JSON.stringify(activeTasksDone.map(t => ({ id: t.id, title: t.title, doneOn: t.doneOn })), null, 2));

      const archivedTasks = await window.PluginAPI.getArchivedTasks() || [];
      log("received archivedTasks count", archivedTasks.length);
      const archivedTasksDone = archivedTasks.filter(t => t.isDone);
      log("archivedTasks done:", JSON.stringify(archivedTasksDone.map(t => ({ id: t.id, title: t.title, doneOn: t.doneOn })), null, 2));

      const taskMap = new Map();
      const duplicateIds = new Set();
      archivedTasks.forEach(task => {
        if (taskMap.has(task.id)) duplicateIds.add(task.id);
        taskMap.set(task.id, task);
      });
      activeTasks.forEach(task => {
        if (taskMap.has(task.id)) duplicateIds.add(task.id);
        taskMap.set(task.id, task);
      });
      const merged = Array.from(taskMap.values());
      setCachedTasks(merged);
      log("after deduplication, unique tasks count", merged.length);
      if (duplicateIds.size > 0) {
        log("duplicate task IDs found:", Array.from(duplicateIds));
      }
      const finalDoneCount = merged.filter(t => t.isDone).length;
      log("final cachedTasks done count:", finalDoneCount);
      const projects = await window.PluginAPI.getAllProjects() || [];
      setCachedProjects(projects);
      log("received projects count", projects.length);
      processData(merged, projects);
    } else {
      console.warn("[sp-dashboard] PluginAPI missing inside pullDataFromSP");
    }
  } catch (err) {
    console.error("[sp-dashboard] Dashboard failed to fetch SP data:", err);
  }
};

const loadMockDataInline = () => {
  log("No PluginAPI detected. Loading mock data...");

  const dates = [
    toDateString('2026-02-22'),
    toDateString('2026-02-21'),
    toDateString('2026-02-20'),
    toDateString('2026-02-19'),
  ];

  const mockProjects = [
    { id: "p1", title: "Website Redesign" },
    { id: "p2", title: "Marketing Campaign" },
  ];

  const mockTasks = [
    {
      id: "t1", parentId: null, title: "Create Figma Mockups", isDone: true, doneOn: new Date('2026-02-22T10:00Z').getTime(), projectId: "p1",
      timeSpentOnDay: { [dates[0]]: 14400000, [dates[1]]: 7200000 },
    },
    {
      id: "t2", parentId: null, title: "General Admin", isDone: false, projectId: null,
      timeSpentOnDay: { [dates[0]]: 3600000 },
    },
    {
      id: "t3", parentId: null, title: "Draft Email Copy", isDone: true, doneOn: new Date('2026-02-20T10:00Z').getTime(), projectId: "p2",
      timeSpentOnDay: { [dates[2]]: 18000000 },
    },
    {
      id: "t4", parentId: null, title: "Setup Database", isDone: false, projectId: "p1",
      timeSpentOnDay: { [dates[3]]: 10800000 }, dueDay: "2026-02-18",
    },
    {
      id: "t5", parentId: null, title: "Write Documentation", isDone: false, projectId: "p1",
      timeSpentOnDay: {},
      dueDay: "2026-02-28",
    },
    {
      id: "t6", parentId: null, title: "API Integration", isDone: false, projectId: "p1",
      subTaskIds: ["t6-1"],
      timeSpentOnDay: { [dates[0]]: 5400000, [dates[1]]: 7200000 },
      dueDay: "2026-02-17",
    },
    {
      id: "t6-1", parentId: "t6", title: "Fix authentication endpoint", isDone: true, doneOn: new Date('2026-02-21T14:00Z').getTime(), projectId: "p1",
      timeSpentOnDay: { [dates[1]]: 7200000 },
    },
    {
      id: "t7", parentId: null, title: "Review Code", isDone: true, doneOn: new Date('2026-02-21T15:00Z').getTime(), projectId: "p1",
      timeSpentOnDay: { [dates[1]]: 3600000 }, dueDay: "2026-02-19",
    },
  ];

  setCachedTasks(mockTasks);
  setCachedProjects(mockProjects);
  processData(mockTasks, mockProjects);
};

export const bootstrap = () => {
  const todayObjInit = new Date();
  document.getElementById('date-from').value = toDateString(todayObjInit);
  document.getElementById('date-to').value = toDateString(todayObjInit);

  const presetSelect = document.getElementById('date-preset');
  const customContainer = document.getElementById('custom-date-container');

  presetSelect.addEventListener('change', (e) => {
    if (e.target.value === MODES.PRESET.CUSTOM) {
      customContainer.classList.remove('hidden');
    } else {
      customContainer.classList.add('hidden');
    }
    processData(getCachedTasks(), getCachedProjects());
  });

  document.getElementById('date-from').addEventListener('change', () => processData(getCachedTasks(), getCachedProjects()));
  document.getElementById('date-to').addEventListener('change', () => processData(getCachedTasks(), getCachedProjects()));
  document.getElementById('bar-chart-select').addEventListener('change', () => updateBarChart());
  document.getElementById('pie-chart-select').addEventListener('change', () => updatePieChart());
  document.getElementById('daily-breakdown-sort').addEventListener('change', () => {
    const m = getLatestMetrics();
    if (m) renderDailyBreakdown(m.dailyBreakdownEntries);
  });
  document.getElementById('daily-breakdown-rounding').addEventListener('change', () => {
    const m = getLatestMetrics();
    if (m) renderDailyBreakdown(m.dailyBreakdownEntries);
  });
  document.getElementById('daily-breakdown-format').addEventListener('change', () => {
    const m = getLatestMetrics();
    if (m) renderDailyBreakdown(m.dailyBreakdownEntries);
  });
  attachSortHandlers();
  initTabHandlers();

  window.addEventListener('message', (event) => {
    log('message event received in iframe', event.data);
    if (event.data && event.data.type === 'SP_STATE_CHANGED') {
      pullDataFromSP();
    }
  });

  setTimeout(() => {
    log("bootstrap timeout fired; PluginAPI exists?", !!window.PluginAPI);
    if (window.PluginAPI) {
      pullDataFromSP();
    } else {
      loadMockDataInline();
    }
  }, 500);
};
