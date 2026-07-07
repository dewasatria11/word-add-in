import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { resolve } from "node:path";

export default defineConfig({
  root: "src/taskpane",
  plugins: [basicSsl()],
  publicDir: "../../public",
  server: {
    port: 3000,
    https: {},
    strictPort: true
  },
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        taskpane: resolve(__dirname, "src/taskpane/taskpane.html")
      }
    }
  }
});