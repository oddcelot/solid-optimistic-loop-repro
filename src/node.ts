// `node src/node.ts same|split`: two toggles, then the error count. One variant per process,
// because the first error halts Solid's reactive system for the rest of the process.
import { setup } from "./repro.ts";

const split = process.argv[2] === "split";
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const errors: string[] = [];
const onError = (error: unknown): void => void errors.push(String(error).split("\n")[0]!);
process.on("uncaughtException", onError);
process.on("unhandledRejection", onError);

const toggle = setup({ split, log: () => {} });
for (let i = 0; i < 2; i++) {
  await toggle().catch(onError);
  await sleep(30);
}
console.log(`${split ? "split flush (workaround)" : "same batch"}: ${errors.length} error(s)`);
for (const e of [...new Set(errors)]) console.log("  " + e);
process.exit(errors.length > 0 ? 1 : 0);
