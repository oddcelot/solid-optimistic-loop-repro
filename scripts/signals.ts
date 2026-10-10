// `node scripts/signals.ts stock|patched|status|compare`: switch @solidjs/signals between the
// published 2.0.0-rc.14 and the same build with patches/ applied. pnpm applies a patch to every
// copy of a package, so both can't be installed at once: this toggles `patchedDependencies` in
// pnpm-workspace.yaml and reinstalls.
import { execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { installedVariant, type Variant } from "./variant.ts";

const WORKSPACE = "pnpm-workspace.yaml";
const BLOCK = /^(# )?patchedDependencies:\n(# )?(  '@solidjs\/signals@[^\n]+)\n/m;

function use(variant: Variant): void {
  const yaml = readFileSync(WORKSPACE, "utf8");
  if (!BLOCK.test(yaml)) throw new Error(`no patchedDependencies block in ${WORKSPACE}`);
  const prefix = variant === "patched" ? "" : "# ";
  writeFileSync(WORKSPACE, yaml.replace(BLOCK, (_, _a, _b, entry) => `${prefix}patchedDependencies:\n${prefix}${entry}\n`));
  execSync("pnpm install --silent", { stdio: "inherit" });
  console.log(`@solidjs/signals 2.0.0-rc.14: ${installedVariant()}`);
}

const command = process.argv[2];
if (command === "stock" || command === "patched") use(command);
else if (command === "status") console.log(`@solidjs/signals 2.0.0-rc.14: ${installedVariant()}`);
else if (command === "compare") {
  const initial = installedVariant();
  for (const variant of ["stock", "patched"] as const) {
    console.log(`\n=== ${variant} ===`);
    use(variant);
    // The repro exits non-zero when it sees errors; that is the expected stock result.
    spawnSync("pnpm -s repro; pnpm -s repro:prod", { shell: true, stdio: "inherit" });
  }
  if (installedVariant() !== initial) use(initial);
} else {
  console.error("usage: node scripts/signals.ts stock|patched|status|compare");
  process.exit(1);
}
