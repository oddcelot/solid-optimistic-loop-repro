import { setup } from "./repro.ts";

// The log is written straight to the DOM, not through a signal: the first loop error halts
// Solid's reactive system, and the log has to keep working after that.
export default function App() {
  let logEl!: HTMLPreElement;
  const log = (line: string): void => void (logEl.textContent += line + "\n");
  const report = (error: unknown): void => log(`ERROR: ${String(error).split("\n")[0]}`);

  window.addEventListener("error", (e) => report(e.error ?? e.message));
  window.addEventListener("unhandledrejection", (e) => report(e.reason));

  let toggle = setup({ split: false, log });

  return (
    <>
      <p>
        <code>@solidjs/signals</code> 2.0.0-rc.14: <strong>{__SIGNALS_VARIANT__}</strong> (switch with{" "}
        <code>pnpm signals:stock</code> / <code>pnpm signals:patched</code>)
      </p>
      <p>
        <label>
          <input
            type="checkbox"
            onChange={(e) => {
              logEl.textContent = "";
              toggle = setup({ split: e.currentTarget.checked, log });
            }}
          />{" "}
          Workaround: clear <code>revalidating</code> in its own flush
        </label>
      </p>
      <button
        onClick={() => {
          log("--- toggle");
          toggle().catch(report);
        }}
      >
        Toggle favourite
      </button>
      <pre ref={logEl} />
    </>
  );
}
