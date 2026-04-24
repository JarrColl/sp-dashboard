export const DEBUG = false;

export const log = (...args) => {
  if (DEBUG) console.log("[sp-dashboard]", ...args);
};
