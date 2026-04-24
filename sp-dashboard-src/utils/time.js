import { MS_PER_MINUTE, MS_PER_HOUR, ROUNDING_MINUTES } from '../constants.js';

export const formatTime = (milliseconds) => {
  if (!milliseconds) return '0h 0m';
  const totalMinutes = Math.floor(milliseconds / MS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

export const formatDecimalHours = (milliseconds) => {
  return (milliseconds / MS_PER_HOUR).toFixed(2) + 'h';
};

export const applyRounding = (milliseconds, mode) => {
  const minutes = ROUNDING_MINUTES[mode] || 0;
  if (minutes === 0) return milliseconds;
  const incrementMs = minutes * 60 * 1000;
  return Math.round(milliseconds / incrementMs) * incrementMs;
};
