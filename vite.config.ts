import { defineConfig, type Plugin } from "vite";
import solid from "@solidjs/vite-plugin";
import { installedVariant } from "./scripts/variant.ts";

const variant = installedVariant();

// `pnpm signals:stock|patched` rewrites the lockfile, then reinstalls. Once the other build is in
// node_modules, restart with re-optimized deps so the open page runs it after a reload.
function signalsVariant(): Plugin {
  return {
    name: "signals-variant",
    configureServer(server) {
      let polling = false;
      server.watcher.add("pnpm-lock.yaml");
      server.watcher.on("change", (file) => {
        if (polling || !file.endsWith("pnpm-lock.yaml")) return;
        polling = true;
        const started = Date.now();
        const poll = setInterval(() => {
          if (installedVariant() !== variant) void server.restart(true);
          else if (Date.now() - started < 10_000) return;
          clearInterval(poll);
          polling = false;
        }, 200);
      });
    },
  };
}

export default defineConfig({
  plugins: [solid(), signalsVariant()],
  define: { __SIGNALS_VARIANT__: JSON.stringify(variant) },
});
