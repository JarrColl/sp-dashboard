import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";

export default defineConfig({
  root: "sp-dashboard-src",
  plugins: [viteSingleFile()],
  build: {
    outDir: path.resolve(__dirname, "build/sp-dashboard"),
    emptyOutDir: true,
  },
  server: { port: 5173 },
});
