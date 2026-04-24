import { log } from "../utils/log.js";
import { MS_PER_DAY } from "../constants.js";
import { toDateString } from "../utils/date.js";
import { setCachedTasks, setCachedProjects } from "../state.js";
import { processData } from "../processing/processData.js";

export const loadMockData = () => {
  log("No PluginAPI detected. Loading mock data...");

  const now = Date.now();
  const daysAgo = (n) => toDateString(now - n * MS_PER_DAY);
  const timeAt = (n, hour) =>
    new Date(daysAgo(n) + `T${String(hour).padStart(2, "0")}:00:00Z`).getTime();

  const dates = [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3)];

  const mockProjects = [
    { id: "p1", title: "Website Redesign" },
    { id: "p2", title: "Marketing Campaign" },
  ];

  const mockTasks = [
    {
      id: "t1",
      parentId: null,
      title: "Create Figma Mockups",
      isDone: true,
      doneOn: timeAt(0, 10),
      projectId: "p1",
      timeSpentOnDay: { [dates[0]]: 14400000, [dates[1]]: 7200000 },
    },
    {
      id: "t2",
      parentId: null,
      title: "General Admin",
      isDone: false,
      projectId: null,
      timeSpentOnDay: { [dates[0]]: 3600000 },
    },
    {
      id: "t3",
      parentId: null,
      title: "Draft Email Copy",
      isDone: true,
      doneOn: timeAt(2, 10),
      projectId: "p2",
      timeSpentOnDay: { [dates[2]]: 18000000 },
    },
    {
      id: "t4",
      parentId: null,
      title: "Setup Database",
      isDone: false,
      projectId: "p1",
      timeSpentOnDay: { [dates[3]]: 10800000 },
      dueDay: daysAgo(5),
    },
    {
      id: "t5",
      parentId: null,
      title: "Write Documentation",
      isDone: false,
      projectId: "p1",
      timeSpentOnDay: {},
      dueDay: daysAgo(-5),
    },
    {
      id: "t6",
      parentId: null,
      title: "API Integration",
      isDone: false,
      projectId: "p1",
      subTaskIds: ["t6-1"],
      timeSpentOnDay: { [dates[0]]: 5400000, [dates[1]]: 7200000 },
      dueDay: daysAgo(6),
    },
    {
      id: "t6-1",
      parentId: "t6",
      title: "Fix authentication endpoint",
      isDone: true,
      doneOn: timeAt(1, 14),
      projectId: "p1",
      timeSpentOnDay: { [dates[1]]: 7200000 },
    },
    {
      id: "t7",
      parentId: null,
      title: "Review Code",
      isDone: true,
      doneOn: timeAt(1, 15),
      projectId: "p1",
      timeSpentOnDay: { [dates[1]]: 3600000 },
      dueDay: daysAgo(3),
    },
  ];

  setCachedTasks(mockTasks);
  setCachedProjects(mockProjects);
  processData(mockTasks, mockProjects);
};
