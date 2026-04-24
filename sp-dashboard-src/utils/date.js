export const toDateString = (dateOrMs) => new Date(dateOrMs).toISOString().split('T')[0];

export const formatDateShort = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatDateWithWeekday = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

export const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);
  while (currentDate <= end) {
    dates.push(toDateString(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};
