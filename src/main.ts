import { setup } from "./repro.ts";

const logEl = document.querySelector("#log")!;
const log = (line: string): void => void (logEl.textContent += line + "\n");
const report = (error: unknown): void => log(`ERROR: ${String(error).split("\n")[0]}`);

window.addEventListener("error", (e) => report(e.error ?? e.message));
window.addEventListener("unhandledrejection", (e) => report(e.reason));

let toggle = setup({ split: false, log });
document.querySelector<HTMLInputElement>("#split")!.addEventListener("change", (e) => {
  logEl.textContent = "";
  toggle = setup({ split: (e.target as HTMLInputElement).checked, log });
});
document.querySelector("#toggle")!.addEventListener("click", () => {
  log("--- toggle");
  toggle().catch(report);
});
