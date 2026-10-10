# @solidjs/signals 2.0.0-rc.14: "Potential Infinite Loop Detected" with a held optimistic value

`npm install`, then either:

- `npm run repro` (Node ≥ 23.6, runs the TypeScript directly, dev build): prints the error count for the bug and for the workaround.
- `npm run repro:prod`: the same against the production build, where there is no loop guard: the loop runs until `RangeError: Invalid array length`, and `until()` times out.
- `npm run dev`: click **Toggle favourite**; each toggle logs the error. Tick the checkbox to try the workaround.

## Setup

- `data` signal (a loader result) and `revalidating` signal (true while the loader re-runs).
- `createOptimistic(() => data().favourite)`.
- One `createEffect` reading `data().favourite`, the optimistic value and `revalidating()`.
- An `action`: set the optimistic value, await a save, start a re-load
  (`revalidating = true`, then 5 ms later `revalidating = false` and new `data`
  in the same batch), and `yield until(() => data().favourite === next)`.

## Expected

No errors.

## Actual

`Potential Infinite Loop Detected. Kept alive by scheduled work; last staged node: computed`,
thrown from a scheduled flush, once per toggle.

## Narrowing

The loop goes away if any of these change:

- `revalidating` is never set to `true`.
- `revalidating = false` lands in an earlier flush than the new `data` (the checkbox).
- The effect drops any one of its three reads.
