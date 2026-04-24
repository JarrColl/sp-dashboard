import { MS_PER_HOUR, MODES, PIE_COLORS } from "../constants.js";
import { getLatestMetrics } from "../state.js";

export const formatHours = (v) => `${(v / MS_PER_HOUR).toFixed(1)}h`;
export const formatTaskCount = (v) => `${Math.round(v)} tasks`;

export const CHART_CONFIGS = {
  [MODES.CHART.TIME]: {
    barData: (m) => m.weeklyData,
    barColor: "var(--c-primary, #03a9f4)",
    pieData: (m) => m.projectData,
    format: formatHours,
  },
  [MODES.CHART.COMPLETED]: {
    barData: (m) => m.completedPerDay,
    barColor: "#4ade80",
    pieData: (m) => m.projectCompletedData,
    format: formatTaskCount,
  },
  [MODES.CHART.OVERDUE]: {
    barData: (m) => m.overduePerDay,
    barColor: "#f87171",
    pieData: (m) => m.projectOverdueData,
    format: formatTaskCount,
  },
  [MODES.CHART.LATE]: {
    barData: (m) => m.latePerDay,
    barColor: "#fbbf24",
    pieData: (m) => m.projectLateData,
    format: formatTaskCount,
  },
};

export const updateBarChart = () => {
  const latestMetrics = getLatestMetrics();
  if (!latestMetrics) return;
  const cfg = CHART_CONFIGS[document.getElementById("bar-chart-select").value];
  if (!cfg) return;
  renderGenericBarChart(
    cfg.barData(latestMetrics),
    "bar-chart-container",
    cfg.barColor,
    cfg.format,
  );
};

export const updatePieChart = () => {
  const latestMetrics = getLatestMetrics();
  if (!latestMetrics) return;
  const cfg = CHART_CONFIGS[document.getElementById("pie-chart-select").value];
  if (!cfg) return;
  renderNativePieChart(cfg.pieData(latestMetrics), cfg.format);
};

export const renderGenericBarChart = (
  chartData,
  containerId,
  color,
  formatFn,
) => {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  if (chartData.data.length === 0) return;

  const maxVal = Math.max(...chartData.data, 1);
  let maxBars = 30;
  const preset = document.getElementById("date-preset").value;
  if (preset === MODES.PRESET.YEAR || preset === MODES.PRESET.MONTH) {
    maxBars = 12;
  }
  let step = Math.ceil(chartData.data.length / maxBars);
  for (let i = 0; i < chartData.data.length; i += step) {
    let chunkSum = 0;
    let chunkCount = 0;
    for (let j = 0; j < step && i + j < chartData.data.length; j++) {
      chunkSum += chartData.data[i + j];
      chunkCount++;
    }
    const val = step === 1 ? chunkSum : chunkSum / chunkCount;
    const label = chartData.labels[i].substring(5);
    const heightPct = (val / maxVal) * 100;
    const displayVal = formatFn(val);

    const col = document.createElement("div");
    col.className = "bar-col";
    col.innerHTML = `
          <div class="bar" style="height: ${heightPct}%; background: ${color};" data-val="${displayVal}"></div>
          <div class="bar-label" title="${chartData.labels[i]}">${label}</div>
        `;
    container.appendChild(col);
  }

  setupBarTooltip();
};

export const setupBarTooltip = () => {
  const tooltip = document.getElementById("bar-tooltip");
  const bars = document.querySelectorAll(".bar-chart .bar");

  bars.forEach((bar) => {
    bar.addEventListener("mouseenter", () => {
      tooltip.textContent = bar.getAttribute("data-val");
      tooltip.classList.add("visible");
    });

    bar.addEventListener("mousemove", (e) => {
      tooltip.style.left = e.clientX + 8 + "px";
      tooltip.style.top = e.clientY - 12 + "px";
    });

    bar.addEventListener("mouseleave", () => {
      tooltip.classList.remove("visible");
    });
  });
};

export const renderNativePieChart = (projectData, formatFn) => {
  const pieEl = document.getElementById("pie-chart-element");
  const legendEl = document.getElementById("pie-legend-container");
  legendEl.innerHTML = "";

  const entries = Object.entries(projectData).sort((a, b) => b[1] - a[1]);
  const totalVal = entries.reduce((acc, curr) => acc + curr[1], 0);

  if (totalVal === 0 || entries.length === 0) {
    pieEl.style.background = "var(--divider-color, #333)";
    legendEl.innerHTML =
      '<div class="text-muted text-sm">No data for selected period</div>';
    return;
  }

  const gradientStops = [];
  const legendHtml = [];
  let currentPercent = 0;

  entries.forEach(([name, val], index) => {
    const color = PIE_COLORS[index % PIE_COLORS.length];
    const percent = (val / totalVal) * 100;

    gradientStops.push(
      `${color} ${currentPercent}% ${currentPercent + percent}%`,
    );
    currentPercent += percent;

    const displayName = name.length > 20 ? name.substring(0, 20) + "..." : name;
    legendHtml.push(`
          <div class="legend-item">
            <div class="legend-label">
              <span class="legend-dot" style="background: ${color}"></span>
              <span title="${name}">${displayName}</span>
            </div>
            <div class="legend-val">${formatFn(val)}</div>
          </div>
        `);
  });
  legendEl.innerHTML = legendHtml.join("");
  pieEl.style.background = `conic-gradient(${gradientStops.join(", ")})`;
};
