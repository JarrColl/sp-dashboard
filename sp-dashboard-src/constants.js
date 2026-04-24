export const MS_PER_MINUTE = 60 * 1000;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

export const UNCATEGORIZED_PROJECT_NAME = "Uncategorized";

export const MODES = {
  PRESET: {
    TODAY: "today",
    WEEK: "week",
    MONTH: "month",
    YEAR: "year",
    CUSTOM: "custom",
  },
  SORT: { DATE_PROJECT: "date-project", PROJECT_DATE: "project-date" },
  FORMAT: { FORMATTED: "formatted", DECIMAL: "decimal" },
  ROUNDING: { NONE: "none", MIN_6: "6min", MIN_15: "15min", MIN_30: "30min" },
  CHART: {
    TIME: "time",
    COMPLETED: "completed",
    OVERDUE: "overdue",
    LATE: "late",
  },
};

export const ROUNDING_MINUTES = {
  [MODES.ROUNDING.NONE]: 0,
  [MODES.ROUNDING.MIN_6]: 6,
  [MODES.ROUNDING.MIN_15]: 15,
  [MODES.ROUNDING.MIN_30]: 30,
};

export const PIE_COLORS = [
  "#03a9f4",
  "#b388ff",
  "#4ade80",
  "#f472b6",
  "#fbbf24",
  "#f87171",
  "#34d399",
  "#818cf8",
  "#a78bfa",
];

export const TAB_IDS = ["dashboard", "daily-breakdown", "details"];
