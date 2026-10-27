import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'
import { resolve } from "node:path";
import { tanstackRouter } from '@tanstack/router-plugin/vite'

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss(), tanstackRouter()],

 	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
		},
	},

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // Ignore native runtime state as well as Rust sources. SQLite and config.toml
      // are updated while the app is running and should never trigger a page reload.
      ignored: ["**/src-tauri/**", "db.sqlite*", "**/db.sqlite*", "config.toml", "**/config.toml", "**/*.sqlite*", "**/*.db"],
    },
  },
}));
