import { log } from "../utils/log.js";
import { toDateString } from "../utils/date.js";
import { setCachedTasks, setCachedProjects } from "../state.js";
import { processData } from "../processing/processData.js";

export const loadMockData = () => {
  log("No PluginAPI detected. Loading mock data...");

  const dates = [
    toDateString("2026-02-22"),
    toDateString("2026-02-21"),
    toDateString("2026-02-20"),
    toDateString("2026-02-19"),
  ];

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
      doneOn: new Date("2026-02-22T10:00Z").getTime(),
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
      doneOn: new Date("2026-02-20T10:00Z").getTime(),
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
      dueDay: "2026-02-18",
    },
    {
      id: "t5",
      parentId: null,
      title: "Write Documentation",
      isDone: false,
      projectId: "p1",
      timeSpentOnDay: {},
      dueDay: "2026-02-28",
    },
    {
      id: "t6",
      parentId: null,
      title: "API Integration",
      isDone: false,
      projectId: "p1",
      subTaskIds: ["t6-1"],
      timeSpentOnDay: { [dates[0]]: 5400000, [dates[1]]: 7200000 },
      dueDay: "2026-02-17",
    },
    {
      id: "t6-1",
      parentId: "t6",
      title: "Fix authentication endpoint",
      isDone: true,
      doneOn: new Date("2026-02-21T14:00Z").getTime(),
      projectId: "p1",
      timeSpentOnDay: { [dates[1]]: 7200000 },
    },
    {
      id: "t7",
      parentId: null,
      title: "Review Code",
      isDone: true,
      doneOn: new Date("2026-02-21T15:00Z").getTime(),
      projectId: "p1",
      timeSpentOnDay: { [dates[1]]: 3600000 },
      dueDay: "2026-02-19",
    },
  ];

  setCachedTasks(mockTasks);
  setCachedProjects(mockProjects);
  processData(mockTasks, mockProjects);
};
