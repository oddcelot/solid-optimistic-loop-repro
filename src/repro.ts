import {
  action,
  createEffect,
  createOptimistic,
  createRoot,
  createSignal,
  flush,
  until,
} from "@solidjs/signals";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Models a router route: `data` is the loader result, `revalidating` is true
 * while the loader re-runs. An action optimistically flips `favourite`, saves,
 * re-runs the loader, and holds the optimistic value until the new data agrees.
 *
 * Expected: no errors. Actual (2.0.0-rc.14): "Potential Infinite Loop Detected"
 * once per toggle, when `revalidating` clears in the same batch as `data` lands
 * and one effect reads all three of data, the optimistic value and revalidating.
 */
export function setup(options: { split: boolean; log: (line: string) => void }) {
  let saved = false;
  const [data, setData] = createSignal({ favourite: false });
  const [revalidating, setRevalidating] = createSignal(false);

  // The loader re-run ("invalidate"), started outside the action.
  function invalidate(): void {
    queueMicrotask(() => {
      setRevalidating(true);
      void sleep(5).then(() => {
        setRevalidating(false);
        // Workaround: land revalidating=false in its own flush before the data.
        if (options.split) flush();
        setData(() => ({ favourite: saved }));
      });
    });
  }

  return createRoot(() => {
    const [favourite, setFavourite] = createOptimistic(() => data().favourite);

    // One effect reading all three. Drop any one read and the loop goes away.
    createEffect(
      () => [data().favourite, favourite(), revalidating()] as const,
      ([d, f, r]) => options.log(`effect: data=${d} optimistic=${f} revalidating=${r}`),
    );

    return action(function* () {
      const next = !favourite();
      setFavourite(next);
      yield sleep(5).then(() => (saved = next)); // the "save"
      invalidate();
      yield until(() => data().favourite === next, { timeout: 1000 });
    });
  });
}
