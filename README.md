# @solidjs/signals 2.0.0-rc.14: "Potential Infinite Loop Detected" with a held optimistic value

`pnpm install`, then either:

- `pnpm repro` (Node ≥ 23.6, runs the TypeScript directly, dev build): prints the error count for the bug and for the workaround.
- `pnpm repro:prod`: the same against the production build, where there is no loop guard: the loop runs until `RangeError: Invalid array length`, and `until()` times out.
- `pnpm dev`: click **Toggle favourite**; each toggle logs the error. Tick the checkbox to try the workaround.

## Stock vs patched

[`patches/@solidjs__signals@2.0.0-rc.14.patch`](patches/@solidjs__signals@2.0.0-rc.14.patch) is a candidate fix (see [Fix](#fix)). The repo installs the stock build by default.

- `pnpm signals:patched` / `pnpm signals:stock`: switch builds (toggles `patchedDependencies` in `pnpm-workspace.yaml` and reinstalls). A running `pnpm dev` restarts on its own; reload the page. The page and the `repro` output show which build is installed.
- `pnpm signals:status`: show the installed build.
- `pnpm compare`: run `repro` and `repro:prod` against both builds, then switch back.

| | stock | patched |
|---|---|---|
| `repro`, same batch | 2 × Potential Infinite Loop Detected | 0 errors |
| `repro:prod`, same batch | `RangeError: Invalid array length`, `until()` timeout | 0 errors |
| workaround (split flush) | 0 errors | 0 errors |

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

## Fix

The effect reads the optimistic value, so it is lane work. In the flush that lands `revalidating = false` and the new `data` together, `until()` resolves and the action's transaction holds both writes. The effect reads the held `revalidating` inside the lane, so `GlobalQueue._laneSeams` (`packages/signals/src/core/lanes.ts`) queues it to re-derive on the committed world. That re-derivation starts outside the lane, reads the held `data` first and joins the transaction (`REACTIVE_JOINED`). Its next read, the optimistic value, enters the lane, and `enterLane` reports the joined pass as a staged reader again. `data` stays held until the action lands, which needs the flush to end, so the seam re-queues the effect every round.

The patch seats the re-derivation in its lane from the start of the pass, so held reads are served committed (and re-run when the transaction lands) instead of joining it:

```ts
// GlobalQueue._laneSeams, before enqueueSub(r)
if (l != null && l._lane) r._flags |= REACTIVE_LANE_DIRTY;
```

The flag is consumed by the next `recompute`. With the patch the effect runs once more on the committed world (the log shows `optimistic=true revalidating=true` twice per toggle). Still reproduces on `next` at `a497d4b1`; the signals test suite passes with the patch applied there.
