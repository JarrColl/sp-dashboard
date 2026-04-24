import { MS_PER_DAY } from "../constants.js";

export const getDueBounds = (task) => {
  let dueStart = null;
  if (task.dueDay) {
    const parsed = Date.parse(task.dueDay);
    if (!isNaN(parsed)) {
      dueStart = parsed;
    }
  }
  const dueEnd = dueStart !== null ? dueStart + MS_PER_DAY - 1 : null;
  return { dueStart, dueEnd };
};
