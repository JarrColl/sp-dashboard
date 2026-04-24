let cachedTasks = [];
let cachedProjects = [];
let latestMetrics = null;
let currentSort = { key: "date", dir: "desc" };

export const getCachedTasks = () => cachedTasks;
export const getCachedProjects = () => cachedProjects;
export const getLatestMetrics = () => latestMetrics;
export const getCurrentSort = () => currentSort;

export const setCachedTasks = (v) => {
  cachedTasks = v;
};
export const setCachedProjects = (v) => {
  cachedProjects = v;
};
export const setLatestMetrics = (v) => {
  latestMetrics = v;
};
export const setCurrentSort = (v) => {
  currentSort = v;
};

export const resetState = () => {
  cachedTasks = [];
  cachedProjects = [];
  latestMetrics = null;
  currentSort = { key: "date", dir: "desc" };
};
