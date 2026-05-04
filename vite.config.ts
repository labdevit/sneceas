import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devPort = Number(env.VITE_DEV_PORT || 3000);
  const hmrHost = env.VITE_HMR_HOST || undefined;

  return {
    server: {
      host: "0.0.0.0",
      port: devPort,
      strictPort: true,
      hmr: {
        host: hmrHost,
        clientPort: devPort,
        overlay: false,
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-popover", "@radix-ui/react-select", "@radix-ui/react-tabs", "@radix-ui/react-tooltip"],
            charts: ["recharts"],
            editor: ["@tiptap/react", "@tiptap/starter-kit"],
          },
        },
      },
    },
  };
});
