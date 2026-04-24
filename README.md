# Dashboard Plugin for Super Productivity

A lightweight dashboard plugin for [Super Productivity](https://super-productivity.com) that visualizes time tracked, completed tasks, overdue items, and project breakdowns within a user‑defined date range. It ships as a self-contained HTML/JavaScript widget with no external dependencies and is styled to support light/dark themes.

---

## 🚀 Features

- Selectable date ranges: past week, month, year or custom range
- Two views:
  - **Dashboard** with key metrics, bar charts and pie charts
  - **Detailed list** of individual time entries and task status

## 🖼️ Preview

Below are screenshots of the plugin rendered outside of the host app (mock data is used when `PluginAPI` is not available):

![Dashboard View](assets/dashboard.png)
*Dashboard with key metrics and charts.*

![Detailed List View](assets/detailed_list.png)
*Detailed list of individual time entries and task statuses.*

*(Images are regenerated via the screenshot utility when the UI changes.)*

- Native charts rendered with vanilla JS and CSS (no charting libraries)
- Responsive layout and theming consistent with Super Productivity
- Live updates when task data changes in the host app
- Fallback mock data for standalone development and screenshots

---

## 🛠️ Project Structure

```
sp-dashboard-src/         # ESM source (built with Vite → single-file HTML)
├── index.html            # Production entry (DOM skeleton only)
├── index.dev.html        # Dev-only entry that loads mock data
├── main.js               # Production bootstrap: imports CSS + runs bootstrap()
├── main.dev.js           # Dev bootstrap: main.js + loadMockData() fallback
├── constants.js          # MODES, MS_PER_*, PIE_COLORS, TAB_IDS, etc.
├── state.js              # cachedTasks/Projects/latestMetrics/currentSort
├── sp-integration.js     # pullDataFromSP + message listener + bootstrap()
├── processing/           # getDueBounds, processData
├── rendering/            # tabs, sortHandlers, renderTable, renderDailyBreakdown,
│                         # charts, renderDashboard
├── styles/               # 8 CSS modules (base/layout/tabs/views/stats/charts/
│                         # table/breakdown)
└── dev/mock-data.js      # Standalone mock dataset (dev-only, tree-shaken from prod)

sp-dashboard/             # Static artefacts that ship next to the built HTML
├── manifest.json.template
├── plugin.js             # SP → iframe bridge (runs outside the iframe)
└── icon.svg

build/sp-dashboard/       # Generated single-file output (vite build)
tests/                    # Vitest/JSDOM tests that import directly from sp-dashboard-src
vite.config.js, vitest.config.js, Makefile, package.json, README.md
```

> Source is multi-file ESM; the Vite build inlines everything into a single
> self-contained `build/sp-dashboard/index.html` to conform with the SP
> plugin iframe's CSP.

---

## 📦 Installation

1. Download the plugin files for the latest [Release](https://github.com/dougcooper/sp-dashboard/releases)
2. Open Super Productivity
3. Go to Settings → Plugins
4. Click "Load Plugin from Folder"
5. Select the `sp-dashboard` zip file
6. The plugin will be activated automatically

---

## 🔧 Development

### Prerequisites

- Node.js (18+) and npm/yarn installed
- `make` available (macOS/Linux)

### Install dependencies

```bash
npm install
```

### Standalone dev server

```bash
npm run dev       # vite dev server with hot reload
# open http://localhost:5173/index.dev.html — loads mock data automatically
```

### Running tests

```bash
npm test          # run once
npm run test:watch # watch mode
npm run test:coverage # generate coverage report
# or simply
make test
```

### Updating the screenshots

The screenshots are stored under `assets/`. Regenerate them with:

```bash
npm run screenshot   # spins up a transient vite dev server + puppeteer
# or
make screenshot
```

The tests import functions directly from `sp-dashboard-src/*` and load the
DOM skeleton from `sp-dashboard-src/index.html` in a per-test `beforeEach`
(see `tests/test-setup.js`).

### Building for release

```bash
make
#or
make build        # runs `vite build` and packages into /build/sp-dashboard + zip
```

`make release` performs additional steps (tagging, GitHub release) and requires the GitHub CLI.

---

## 📝 Usage Notes

- The plugin listens for Redux `ACTION` hooks from Super Productivity and posts a message to the iframe to refresh whenever the app state changes.
- If the PluginAPI is unavailable, the production bundle renders an empty dashboard (that's the correct behaviour for production). For local iteration, run `npm run dev` and open `/index.dev.html`, which injects mock data via `sp-dashboard-src/dev/mock-data.js`.
- Charts are rendered using CSS and DOM elements; they automatically bucket data if the date range contains more than 30 days.

---

## ✅ Testing Guidelines

- Add new unit tests for every new feature or logic change.
- Mock `PluginAPI` where necessary using `vi.stubGlobal` or manual objects.
- Cover edge cases such as empty date ranges, tasks without projects, overdue detection, and date manipulation.

---

## 📬 Reporting Issues & Contributing

Please file issues or pull requests against the [GitHub repository](https://github.com/dougcooper/sp-dashboard) with
clear descriptions and, if applicable, screenshots. Contributions are welcome!

---

## 🗂️ License

MIT © 2026 Douglas Cooper
