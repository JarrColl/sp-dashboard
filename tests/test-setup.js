import { beforeEach } from "vitest";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(
  resolve(__dirname, "../sp-dashboard-src/index.html"),
  "utf8",
);

beforeEach(async () => {
  document.documentElement.innerHTML = html;
  const state = await import("../sp-dashboard-src/state.js");
  state.resetState();
  const { bootstrap } = await import("../sp-dashboard-src/sp-integration.js");
  bootstrap();
});
