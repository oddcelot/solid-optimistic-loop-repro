import { readFileSync } from "node:fs";

export type Variant = "stock" | "patched";

// The line patches/@solidjs__signals@2.0.0-rc.14.patch adds to dist/dev.js.
const PATCHED_LINE = "if (l != null && l._lane) r._flags |= REACTIVE_LANE_DIRTY;";

/** Which @solidjs/signals build is installed, read from node_modules (not from config). */
export function installedVariant(root = process.cwd()): Variant {
  const dev = readFileSync(`${root}/node_modules/@solidjs/signals/dist/dev.js`, "utf8");
  return dev.includes(PATCHED_LINE) ? "patched" : "stock";
}
