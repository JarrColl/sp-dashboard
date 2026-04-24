# Migration Plan — Split sp-dashboard into Source Modules + Vite Single-File Build

## Context

`sp-dashboard` is a Super Productivity plugin that currently lives as a single
`sp-dashboard/index.html` file (~1330 lines with all CSS and JS inlined). SP
loads the plugin inside a sandboxed iframe whose CSP forbids external
`<script src>` and `<link rel="stylesheet">`, so the shipped artefact **must**
be one self-contained HTML.

## Super Productivity plugin reference material

Read these before starting; the migration must stay within the constraints they
describe.

- **Plugin development guide** (authoritative, may drift — check for updates):
  <https://github.com/super-productivity/super-productivity/blob/master/docs/plugin-development.md>
- **Type definitions** (`Project`, `Task`, `PluginAPI` method signatures):
  <https://github.com/super-productivity/super-productivity/blob/master/packages/plugin-api/src/types.ts>
- **Reference plugins** (in the monorepo; read for patterns):
  - `packages/plugin-dev/api-test-plugin` — minimal PluginAPI exercise
  - `packages/plugin-dev/yesterday-tasks-plugin`
  - `packages/plugin-dev/procrastination-buster`
  - `packages/plugin-dev/boilerplate-solid-js` — the official build-step
    boilerplate; this migration adopts the same general approach (multi-file
    source → single-file HTML output), just with vanilla JS instead of Solid.

### Constraints this migration must respect

From the plugin development guide, non-negotiable:

1. **Single self-contained HTML for iframe plugins.** External scripts and
   styles are blocked by the iframe sandbox / CSP. Everything the browser
   executes must be inlined. This is the core reason we need
   `vite-plugin-singlefile`.
2. **`manifest.json` fields** — the `manifestVersion: 1`, `minSupVersion`,
   `iFrame: true`, `permissions`, `hooks` fields in the existing
   `sp-dashboard/manifest.json.template` must be preserved byte-for-byte (aside
   from the Makefile-substituted `{{VERSION}}` / `{{DESCRIPTION}}`
   placeholders).
3. **`plugin.js` (the non-iframe entry)** runs in the plugin host context, NOT
   in the iframe. It has access to the registration APIs (`registerHook`,
   etc.) that the iframe cannot call. It posts messages into the iframe. The
   migration does not touch this file; keep it as a static asset copied into
   the build output.
4. **Permissions** — the plugin's current permissions (`getTasks`,
   `getArchivedTasks`, `getAllProjects`, `persistDataSynced`, `loadSyncedData`
   per the manifest template) must not expand during this migration.
5. **Theme CSS variables** (`--c-primary`, `--bg`, `--text-color`, `--s`,
   `--s2`, etc.) are injected by the SP host at runtime. Do not replace their
   use with hardcoded colors or spacing values. The `var(--x, fallback)`
   pattern in the current CSS is the correct approach and must be preserved
   when splitting CSS into modules. See "Theme Variables & UI Kit" in the
   plugin development guide.
6. **UI Kit injection** — by default SP injects a CSS reset into iframe
   plugins (`manifest` `uiKit: true`, which is the implicit default). The
   current manifest does not set `uiKit: false`, so the reset is active. The
   existing CSS assumes this. Do not change this assumption.
7. **Iframe API restrictions** — inside the iframe (where our entire bundle
   runs), these methods are NOT available:
   `registerHeaderButton`, `registerMenuEntry`, `registerSidePanelButton`,
   `registerShortcut`, `registerHook`, `execNodeScript`.
   The current code doesn't use any of them. Do not add any during the
   migration.
8. **`PluginAPI` shape** — the iframe accesses tasks/projects via
   `window.PluginAPI.getTasks()`, `getArchivedTasks()`, `getAllProjects()`
   (all async). The types file above is the authoritative source for the
   `Task` and `Project` interfaces; the current `processData` assumes those
   shapes and they must not be changed.

This plan migrates the **source** to a multi-file ESM layout while keeping the
**output** as a single self-contained HTML, using Vite + vite-plugin-singlefile.

This is a pure refactor. **No feature changes. No UI changes.** The migration
is done when: all 35 existing tests still pass, the `build/sp-dashboard/index.html`
output renders identically to the current one, and the zip artefact still loads
successfully in Super Productivity.

Phase 2 features already implemented that must keep working: Daily Breakdown
tab (long-format table, sort Date↔Project, subtotals, no-project bucket,
empty-day hiding, rounding dropdown, formatted/decimal toggle).

## Non-goals (do NOT change during this migration)

- No UI behaviour changes. Pixel-equivalent output.
- No TypeScript (can be added later; keep this migration scoped).
- No framework (no SolidJS — that was evaluated and deferred).
- No change to `plugin.js` (the SP→iframe bridge; stays a separate 29-line file).
- No change to `manifest.json.template` or its Makefile rendering.
- No change to `icon.svg` or the zip-packaging Makefile target.
- No change to the `DEBUG` flag default (`false`).
- No change to mock-data *contents* — its *location* moves (see §8).
- No change to the git remote (`origin` → `https://github.com/JarrColl/sp-dashboard`).

## Current state reference

- **Main file**: `sp-dashboard/index.html` (~1330 lines; inlined `<style>` and `<script>`).
- **Plugin bridge**: `sp-dashboard/plugin.js` (29 lines; calls `PluginAPI.registerHook` and forwards state changes to the iframe via `postMessage`). Runs outside the iframe — keep as-is.
- **Manifest template**: `sp-dashboard/manifest.json.template` with `{{VERSION}}` and `{{DESCRIPTION}}` placeholders rendered by the Makefile from `package.json`.
- **Icon**: `sp-dashboard/icon.svg`.
- **Tests**: `tests/index.test.js` (35 tests). Current setup reads the HTML file, extracts the inline `<script>` via querySelector, and executes it with `new Function(scriptElement.textContent).call(window)`. This machinery is obsolete post-migration — tests will `import` from source modules directly.
- **Scripts**:
  - `scripts/check-js.js` — parses the inline script with Acorn for syntax validation. Obsolete post-migration (`vite build` fails on syntax errors).
  - `scripts/screenshot.js` — puppeteer opens `file://sp-dashboard/index.html` directly. Must be updated to open the built output instead (see §6.7).
  - `scripts/minify.sh` — wraps `html-minifier-terser`. Replaced by Vite's own minification.
- **Makefile**: `build` target copies source → `build/sp-dashboard/`, renders manifest, minifies, and zips. Needs to call `vite build` instead of the copy+minify steps.
- **package.json** v1.0.1. Current scripts: `test`, `test:watch`, `test:coverage`, `build:min`, `check:syntax`, `screenshot`.

## Target source structure

```
sp-dashboard-src/               # new — source of truth going forward
  index.html                    # Vite entry HTML (minimal skeleton, script/link tags)
  main.js                       # entry: wires listeners, kicks off pullDataFromSP
  constants.js                  # MODES, MS_PER_*, UNCATEGORIZED_PROJECT_NAME,
                                #   ROUNDING_MINUTES, PIE_COLORS, TAB_IDS
  utils/
    log.js                      # DEBUG flag + log() helper
    time.js                     # formatTime, formatDecimalHours, applyRounding
    date.js                     # toDateString, formatDateShort,
                                #   formatDateWithWeekday, getDatesInRange
  state.js                      # cachedTasks, cachedProjects, latestMetrics,
                                #   currentSort (module-level mutable)
  processing/
    getDueBounds.js
    processData.js              # the aggregation function
  rendering/
    tabs.js                     # switchTab
    sortHandlers.js             # sortEntries, attachSortHandlers, updateSortIndicators
    renderTable.js              # getStatusBadge, renderTable
    renderDailyBreakdown.js
    charts.js                   # CHART_CONFIGS, updateBarChart, updatePieChart,
                                #   renderGenericBarChart, renderNativePieChart,
                                #   setupBarTooltip, formatHours, formatTaskCount
    renderDashboard.js          # updateDashboardUI (composes per-pane renderers)
  sp-integration.js             # pullDataFromSP, message listener, bootstrap setTimeout
  styles/
    base.css                    # body, scrollbar, *, .hidden, .text-red
    layout.css                  # .container, .header, .controls, .main-card, .control-box
    tabs.css                    # .tabs, .tab-btn
    views.css                   # .view-content, .grid-2, .grid-3
    stats.css                   # .stat-card, .stat-header, .stat-title, .stat-value,
                                #   .progress-track, .progress-fill, .badge-*, .stat-icon
    charts.css                  # .chart-card, .chart-container, .bar-chart, .bar,
                                #   .bar-label, .bar-tooltip, .pie-wrapper, .pie-chart,
                                #   .pie-legend, .legend-*
    table.css                   # .details-table
    breakdown.css               # .daily-breakdown-toolbar, .subtotal-row
  dev/
    mock-data.js                # the current !window.PluginAPI fallback block
                                # imported only by main.dev.js (see §8)
  main.dev.js                   # dev entry — imports main.js + dev/mock-data.js

tests/                          # unchanged location
  index.test.js                 # rewritten to import from src (see §7)
  test-setup.js                 # new — sets up the DOM from dist HTML before each test

sp-dashboard/                   # static artefacts kept here for the Makefile
  plugin.js                     # unchanged
  manifest.json.template        # unchanged
  icon.svg                      # unchanged

vite.config.js                  # new
vitest.config.js                # existing, extended
package.json                    # scripts + deps updated
Makefile                        # `build` target delegates to `vite build`
scripts/
  screenshot.js                 # updated to open build output
  # check-js.js — deleted
  # minify.sh — deleted
```

**Rename note**: moving from `sp-dashboard/index.html` source to a new
`sp-dashboard-src/` source tree avoids clobbering paths during migration.
After migration, the `sp-dashboard/` directory only holds static artefacts
(`plugin.js`, `manifest.json.template`, `icon.svg`) that ship alongside
the built HTML.

## Dependencies to add

```
npm i -D vite vite-plugin-singlefile
```

Keep: `vitest`, `@vitest/coverage-v8`, `@vitest/ui`, `jsdom`, `puppeteer`.

Remove after migration is verified: `html-minifier-terser`, `acorn`.

## Build/config files

### `vite.config.js`

```js
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig(({ mode }) => ({
  root: 'sp-dashboard-src',
  plugins: [viteSingleFile()],
  build: {
    outDir: path.resolve(__dirname, 'build/sp-dashboard'),
    emptyOutDir: true,
    // viteSingleFile handles inlining; minification happens by default.
  },
  // Dev server for eyeballing standalone (loads main.dev.js with mocks):
  server: { port: 5173, open: '/index.dev.html' },
}));
```

### `sp-dashboard-src/index.html` (production entry — no mocks)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard</title>
</head>
<body>
  <!-- entire DOM skeleton from current index.html: header, tabs, views -->
  <!-- Copy lines 241–463 from the current sp-dashboard/index.html verbatim -->
  <script type="module" src="/main.js"></script>
</body>
</html>
```

### `sp-dashboard-src/index.dev.html` (dev-only — injects mocks)

Identical to `index.html` except:

```html
  <script type="module" src="/main.dev.js"></script>
```

### `sp-dashboard-src/main.js`

```js
import './styles/base.css';
import './styles/layout.css';
import './styles/tabs.css';
import './styles/views.css';
import './styles/stats.css';
import './styles/charts.css';
import './styles/table.css';
import './styles/breakdown.css';

import { bootstrap } from './sp-integration.js';

bootstrap();
```

### `sp-dashboard-src/main.dev.js`

```js
import './main.js';
import { loadMockData } from './dev/mock-data.js';

// Runs after main.js wires up listeners. If PluginAPI is missing (standalone
// browser open / puppeteer screenshot), inject mock data into the module state
// and trigger a render.
if (!window.PluginAPI) loadMockData();
```

### `vitest.config.js`

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/test-setup.js'],
    globals: false,
  },
});
```

### `package.json` scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "screenshot": "npm run build && node scripts/screenshot.js"
  }
}
```

Remove: `build:min`, `check:syntax`.

### `Makefile` — `build` target

Replace the copy+minify block with:

```make
build: clean
	@echo "Building plugin zip file..."
	@npm run build
	@echo "Generating manifest.json from template..."
	@VERSION="$(VERSION)" DESCRIPTION="$(DESCRIPTION)" sh -c '\
		sed -e "s/{{VERSION}}/$$VERSION/g" -e "s|{{DESCRIPTION}}|$$DESCRIPTION|g" \
		sp-dashboard/manifest.json.template > build/sp-dashboard/manifest.json'
	@cp sp-dashboard/plugin.js build/sp-dashboard/plugin.js
	@cp sp-dashboard/icon.svg build/sp-dashboard/icon.svg
	@cd build/sp-dashboard && zip -r ../../$(ZIP_FILE) .
	@echo "✓ Plugin packaged successfully: $(ZIP_FILE)"
```

## Step-by-step migration

Execute in this order. Each step should leave the tree in a buildable state;
commit at the end of each step.

### Step 1 — Scaffold and dependencies

1. `npm i -D vite vite-plugin-singlefile`
2. Create `vite.config.js`, `vitest.config.js` (replacing existing one), `tests/test-setup.js` (empty for now).
3. Create empty `sp-dashboard-src/` with the target folder tree (no content yet).
4. Update `package.json` scripts as above.
5. Commit: "chore: scaffold vite build pipeline".

### Step 2 — Extract styles

The current `<style>` block spans lines 8–237 of `sp-dashboard/index.html`.
Split into the 8 CSS files listed in §3 using the section comments already
present as natural cut points (e.g. `/* --- BASE STYLES --- */`, `/* --- TABS --- */`).
Verify each CSS file is standalone (no unresolved custom properties or dependencies
across files — they all reference CSS vars from SP, which are injected by the host).

Commit: "refactor: split CSS into modules".

### Step 3 — Extract constants and utilities

Move to `sp-dashboard-src/`:

- `constants.js` — `MODES`, `MS_PER_MINUTE`, `MS_PER_HOUR`, `MS_PER_DAY`,
  `UNCATEGORIZED_PROJECT_NAME`, `ROUNDING_MINUTES`, `PIE_COLORS`, `TAB_IDS`.
  Export all as named exports.
- `utils/log.js` — `DEBUG` constant (`false`) and `log()` helper.
- `utils/time.js` — `formatTime`, `formatDecimalHours`, `applyRounding`.
- `utils/date.js` — `toDateString`, `formatDateShort`, `formatDateWithWeekday`, `getDatesInRange`.

Each file uses `import { MS_PER_HOUR } from '../constants.js';` style.

Commit: "refactor: extract constants + utils".

### Step 4 — Extract state, processing, rendering

- `state.js` — export `let cachedTasks = []; let cachedProjects = []; let latestMetrics = null; let currentSort = { key: 'date', dir: 'desc' };` plus setter functions (`setCachedTasks`, `setCachedProjects`, `setLatestMetrics`). ES modules disallow assigning to imported bindings, so consumers must go through setters. Use getters for read access (`export const getLatestMetrics = () => latestMetrics;`).
- `processing/getDueBounds.js` — `getDueBounds` function.
- `processing/processData.js` — the big `processData` function. Internal helpers (`getProjectName`, `dayBoundsByDate`, `cachedDueBounds`) remain function-local. Takes `tasksArr, projectsArr` as args (as it already does); calls `updateDashboardUI(metrics)` at the end.
- `rendering/tabs.js` — `switchTab`, wires onclick handlers (currently inline `onclick="switchTab(...)"`; see Gotcha §10.1).
- `rendering/sortHandlers.js` — `sortEntries`, `attachSortHandlers`, `updateSortIndicators`.
- `rendering/renderTable.js` — `getStatusBadge`, `renderTable`.
- `rendering/renderDailyBreakdown.js` — `renderDailyBreakdown`. Internal `hoursCellContent`, `dataRow`, `subtotalRow` stay function-local.
- `rendering/charts.js` — `formatHours`, `formatTaskCount`, `CHART_CONFIGS`, `updateBarChart`, `updatePieChart`, `renderGenericBarChart`, `setupBarTooltip`, `renderNativePieChart`.
- `rendering/renderDashboard.js` — `updateDashboardUI`. Imports from all the above and the per-stat-card DOM updates that currently live inline in `updateDashboardUI` at lines 611–662.
- `sp-integration.js` — `pullDataFromSP`, the `message` listener, and a `bootstrap()` that does the `setTimeout` + init event-listener wiring currently at lines 585–612.

Commit: "refactor: split script into modules".

### Step 5 — Wire the production entry HTML

Create `sp-dashboard-src/index.html` (DOM skeleton only; no inline `<script>` or `<style>`).

Create `sp-dashboard-src/main.js` that imports the 8 CSS files and `bootstrap()`.

Run `npm run build` and verify it produces `build/sp-dashboard/index.html` as a
single self-contained file with inlined CSS and JS.

Commit: "build: produce single-file HTML via vite".

### Step 6 — Migrate the mock-data block

See §8. Move the current `!window.PluginAPI` bootstrap block (lines 1310–1383 or so, the setTimeout fallback) into `sp-dashboard-src/dev/mock-data.js`.

Create `sp-dashboard-src/main.dev.js` and `sp-dashboard-src/index.dev.html`.

Verify standalone browser open still works via `npm run dev` (Vite dev server
loads `index.dev.html`).

Verify the **production** build (`npm run build`) does **not** contain any
mock-data strings (`grep "Website Redesign" build/sp-dashboard/index.html`
should return nothing).

Commit: "refactor: dev-only mock data".

### Step 7 — Update screenshot script

`scripts/screenshot.js` currently opens `file://sp-dashboard/index.html`.
Update it to:

1. Run `vite build` first (or rely on caller having run it — package.json
   script already does `npm run build && node scripts/screenshot.js`).
2. For screenshots with mock data: open `file://` on a dev build or start the
   Vite dev server and point puppeteer at `http://localhost:5173/index.dev.html`.
   Recommended: start a transient dev server inside the script, screenshot, close.

Alternative simpler approach: run `vite build --mode dev` with a dev-specific
config that uses `main.dev.js` as the entry, produce a second output file
`build/sp-dashboard/index.dev.html`, and open that.

Commit: "scripts: screenshot against built output".

### Step 8 — Migrate tests

See §7. Rewrite `tests/index.test.js` to import from `sp-dashboard-src/` modules
directly. Create `tests/test-setup.js` that loads the DOM skeleton (either by
reading `sp-dashboard-src/index.html` or by maintaining a minimal hand-written
fixture) and runs `bootstrap()` before each test.

All 35 tests must pass.

Commit: "test: import from source modules".

### Step 9 — Cleanup

1. Delete `sp-dashboard/index.html` (the old monolithic source).
2. Delete `scripts/check-js.js`, `scripts/minify.sh`.
3. Remove `html-minifier-terser` and `acorn` from `package.json` → `npm install` to update lockfile.
4. Update `README.md` sections that reference the old build flow (paths in "Development" etc.).
5. Update `.vscode/` settings if they reference the old paths.

Commit: "cleanup: remove obsolete build scripts".

## Test migration specifics

### New test-setup strategy

The current tests' bottleneck is `new Function(scriptContent).call(window)` —
that re-executes the entire script for each test, including the `setTimeout`
bootstrap that loads mock data. This conflates "load the DOM" with "run the
plugin's init logic".

Post-migration:

```js
// tests/test-setup.js
import { beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Maintain a minimal HTML skeleton file or read index.html and strip its <script>
const skeleton = readFileSync(
  resolve(__dirname, '../sp-dashboard-src/index.html'),
  'utf8'
);

beforeEach(async () => {
  document.documentElement.innerHTML = skeleton;
  // Reset module state between tests
  const state = await import('../sp-dashboard-src/state.js');
  state.resetState();  // add this setter
  const { bootstrap } = await import('../sp-dashboard-src/sp-integration.js');
  bootstrap({ skipMockFallback: true });  // flag that prevents the setTimeout fallback from kicking in
});
```

Add to `state.js` a `resetState()` that re-initialises the module-level vars.

### Test file rewrite pattern

Before:
```js
window.processData(tasks, projects);
expect(document.getElementById('stat-time').innerText).toBe('3h 0m');
```

After:
```js
import { processData } from '../sp-dashboard-src/processing/processData.js';

processData(tasks, projects);
expect(document.getElementById('stat-time').innerText).toBe('3h 0m');
```

The `makeTask` helper at the top of `tests/index.test.js` stays as-is.

Tests that use `window.formatTime`, `window.applyRounding`, etc. switch to
direct imports from `utils/time.js`.

Tests that call `window.switchTab` switch to `import { switchTab } from '...'`.

### Expected test-diff shape

- ~35 `window.X` references replaced with ES imports
- `beforeEach` in `index.test.js` shortened (the HTML-parse + new-Function
  scaffolding moves to `test-setup.js`)
- `makeTask`, `setCustomRange` helpers unchanged
- Assertion bodies unchanged
- All 35 tests continue to pass

## Mock data handling

Currently in `sp-dashboard/index.html` ~line 1310: a `setTimeout` fires 0ms
after load and, if `window.PluginAPI` is absent, synthesises a fixed dataset
and calls `processData`. The block is ~75 lines (see lines 1310–1383).

**Migration**:

1. Move the mock-data assignment verbatim into
   `sp-dashboard-src/dev/mock-data.js`. Export a `loadMockData()` function
   that sets `cachedTasks` / `cachedProjects` via the state setters and
   calls `processData(cachedTasks, cachedProjects)`.
2. `sp-integration.js::bootstrap()` no longer contains the `!PluginAPI` fallback
   branch — in production, if PluginAPI is missing, the dashboard simply stays
   empty (that's the correct behaviour for production).
3. `main.dev.js` imports `loadMockData` and calls it when PluginAPI is missing.
4. `main.js` does NOT import `dev/mock-data.js`. Vite's tree-shaking ensures
   the mock is absent from `build/sp-dashboard/index.html`.

Verification: after `npm run build`, run
`grep "Website Redesign" build/sp-dashboard/index.html` — should return nothing.

## Verification checklist

Run in order. Each must pass before moving on.

1. `npm test` → 35/35 tests pass.
2. `npm run build` → produces `build/sp-dashboard/index.html`. Open the file
   directly — the DOM skeleton should appear but empty (no PluginAPI in that
   context, and production build has no mock fallback).
3. `npm run dev` → Vite dev server on :5173. Visiting
   `http://localhost:5173/index.dev.html` should show the dashboard with mock
   data, identical to the pre-migration appearance.
4. `grep -r "Website Redesign" build/` → nothing (mock data excluded).
5. `grep -r "Dashboard script initialized" build/` → nothing (DEBUG-gated log,
   shouldn't even be in the bundle since `DEBUG = false`).
6. `make build` → produces `sp-dashboard.zip`. Extract and confirm it contains:
   `manifest.json`, `index.html`, `plugin.js`, `icon.svg`.
7. Load the extracted folder into Super Productivity via "Load Plugin from
   Folder". Verify: tabs switch (Dashboard / Daily Breakdown / Detailed List),
   date preset switches re-render, Daily Breakdown sort/rounding/format
   dropdowns work, all existing features behave identically.
8. `npm run screenshot` → produces `assets/dashboard.png` and
   `assets/detailed_list.png` comparable to the pre-migration images (minor
   anti-aliasing / font differences are fine).
9. File-size sanity: the built `index.html` should be within ~20% of the
   current minified size (plus Vite runtime ~2KB).

## Gotchas and preserved behaviours

### 1. Inline `onclick` handlers

`sp-dashboard/index.html` lines 281–283 use inline attributes:
`<button ... onclick="switchTab('dashboard')">`. Inline handlers require the
function to be a global. Two fixes:

- **Recommended**: remove the inline `onclick`, attach listeners
  programmatically in `rendering/tabs.js` (by id, in `initTabHandlers()`
  called from `bootstrap()`).
- Alternative: keep inline handlers and re-expose `switchTab` on `window` in
  `main.js`. Works, but re-introduces global pollution.

### 2. Module-level state vs `let` reassignment

ES modules forbid reassigning imported bindings. The current `let cachedTasks = []`
gets reassigned throughout. Fix: expose `getCachedTasks()` / `setCachedTasks(arr)`
from `state.js` rather than the raw binding.

### 3. `attachSortHandlers` timing

Already fixed in the previous simplification pass: called once at init, not per
render. Preserve this — call from `bootstrap()`.

### 4. `DEBUG` flag

Keep `false` as default. Developers flip to `true` in `utils/log.js` for local
debugging. Do NOT gate behind `import.meta.env.DEV` — the explicit constant is
simpler and matches current behaviour.

### 5. `toDateString` in mock data

`sp-dashboard-src/dev/mock-data.js` must import `toDateString` from
`../utils/date.js`.

### 6. CSS custom properties from SP host

The CSS uses `var(--c-primary, #03a9f4)` etc. These variables are injected by
the SP host when the plugin runs in the iframe. In standalone dev/puppeteer
contexts, the fallback values kick in. Do NOT replace these with hardcoded colors.

### 7. Test that counts tests

`tests/index.test.js` line ~478 (`it('default sort mode is date-project')`) and
similar single-liner tests depend on the DOM existing. `test-setup.js` must
set up the skeleton before *every* test, not just the ones that call
`processData`.

### 8. The tiny stat-card badge logic

`updateDashboardUI` (currently lines ~611–662) contains inline DOM manipulation
for stat cards (totalTime, overdue label, overdue note, etc.). Keep this in
`renderDashboard.js`. Do not over-abstract into per-card components — that's
SolidJS territory, explicitly out of scope.

### 9. `html-minifier-terser` replacement

Vite's default minification is esbuild, which is fine. If whitespace in the
output matters (it doesn't, but just in case), `vite-plugin-singlefile`'s
options allow tweaking. Default settings are fine.

### 10. Git remote preserved

Remote is `https://github.com/JarrColl/sp-dashboard`. Don't overwrite.

## Summary

~2–3 hours of focused work. Leaves you with:

- Multi-file ESM source that's comfortable to navigate and edit
- Tests that import functions directly (goodbye `new Function` hack)
- Mock data that doesn't ship to production
- Dev server with live reload for standalone iteration
- Single-file HTML output unchanged in shape, matching SP's requirements
- Clean foundation if you later want TypeScript, SolidJS, or more features

Nothing about the plugin's runtime behaviour inside SP changes.
