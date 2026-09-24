import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: { api: "modern-compiler" },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Rollup's default automatic chunking otherwise merges echarts
          // into whichever unrelated lazy chunk happens to share a build
          // graph with it (observed: it landed inside RichTextEditor's
          // chunk, ~1.1MB added to a component that never touches a
          // chart) — forcing it into its own chunk means only the pages
          // that actually import SunburstChart (which uses
          // echarts-for-react) pay that cost.
          if (id.includes("node_modules/echarts") || id.includes("node_modules/echarts-for-react") || id.includes("node_modules/zrender")) {
            return "echarts";
          }
        },
      },
    },
  },
});
