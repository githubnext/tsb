# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-26T07:22:00Z |
| Iteration Count | 22 |
| Best Metric | 27.999 |
| Target Metric | — |
| Branch | autoloop/tsb-perf-evolve |
| PR | pending CI |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, not-pushed, not-pushed |

## 🧬 Population

### c023 · island 3 · fitness pending CI · gen 22

- **Op**: exploitation (c022 on clean ff'd branch); **Cell**: parallel-typed-arrays · non-comparison; **Parent**: c022
- **Approach**: Same LSD 8-pass radix as c022 but also make `finBuf` (400KB), `nanBuf` (400KB), `fvals` (800KB), and `fvalsU32` (view) module-level grow-on-demand buffers. Eliminates 1.6MB of TypedArray GC per sort call (80MB total across 50 bench iterations). Commit 12276e5.
- **Status**: ⏳ pending CI

### c022 · island 3 · fitness unknown (merged via PR #226) · gen 21

- **Op**: exploration (rebuild of c021 on clean ff'd branch); **Cell**: parallel-typed-arrays · non-comparison; **Parent**: c003
- **Approach**: LSD 8-pass radix sort (_putKey IEEE-754 sign-flip → hi/lo uint32; _rBufA/_rBufB ping-pong; _rKeyHi/_rKeyLo per row; _rNanBuf; _rHist 256-bucket). All buffers module-level (_RSORT_CAP=200001). Descending via reversed prefix-sum. Fallback for n>cap or non-numeric. Commit 47b4029.
- **Status**: ⏳ pending CI

### ~~c021~~ · island 3 · gen 20 · lost (branch reset) — LSD 8-pass radix; ALL buffers module-level

### ~~c020~~ · island 3 · gen 19 · lost (branch reset)

### ~~c017~~ · phantom gen 16 · LSD radix design; lost to branch reset

### c003 · island 1 · fitness 27.999 · gen 2

- **Cell**: parallel-typed-arrays · comparison; NaN pre-partition + Float64Array; `fvals[a]!-fvals[b]!` comparator
- **Status**: ✅ accepted CI 24843983915; tsb=155.63ms / pandas=5.56ms

## 📚 Lessons Learned

- **All per-call TypedArray allocations eliminated** once module-level buffers are warm: zero GC pressure on the hot path after first call. Benchmark measures 50 iterations, so it's essentially free after warmup.
- `noUncheckedIndexedAccess`: TypedArray[i] = number|undefined; use `!`.
- Callback overhead bottleneck at n=100k: ~1.6M calls × 100ns = 160ms.
- `new Uint32Array(fvals.buffer)` valid TypeScript; no `as` needed.
- LSD radix: 8-pass IEEE-754 transform eliminates callbacks. Even #swaps → result in curSrc after 8 passes.
- `arr[i]!++` invalid TS; use `const v=arr[i]!; arr[i]=v+1;`.
- **Branch must be fast-forwarded to origin/main** before committing to prevent phantom commits.
- Keys indexed by ROW (not by position/slot) simplifies the scatter step: `curB[cv] = r` where r is already the row index. No finBuf copy needed.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- c022 (radix, all rx buffers module-level, merged via PR #226) — fitness unknown, never measured by autoloop (merged externally). Radix is confirmed in main.
- Next: c023 (also make finBuf/nanBuf/fvals module-level) awaiting CI. If accepted and fitness improved, explore 4-pass 16-bit radix or interleaved key layout.

## 📊 Iteration History

### Iteration 22 — 2026-04-26 07:22 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24951061682)

- **Status**: ⏳ pending CI · **Op**: exploitation · **Island**: 3 · c023
- **Change**: Make finBuf/nanBuf/fvals/fvalsU32 module-level grow-on-demand (was per-call). Eliminates 1.6MB TypedArray GC per call (80MB for 50 bench iters). Branch ff'd to main + 1 commit 12276e5.
- **Metric**: pending CI (sandbox bun unavailable)

### Iteration 21 — 2026-04-25 17:57 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24936876897)

- **Status**: ⏳ pending CI · **Op**: exploration · **Island**: 3 · c022
- **Change**: LSD 8-pass radix sort with module-level buffers. _putKey stores IEEE-754 sign-flip hi/lo keys. _radixSort ping-pongs _rBufA↔_rBufB for 8 passes. PR created. Commit 47b4029.
- **Notes**: Clean rebuild of c021 on ff'd branch. Proper descending via reversed prefix-sum. Falls back for non-numeric/large n.

### Iters 3–20 — 2026-04-23–25 — all phantom/pending-ci radix attempts (c017–c021) lost to branch resets or pending CI. See earlier state file versions for details.

### Iters 1–2 — 2026-04-23 — ✅ c003 fitness=27.999 (tsb=155.63ms, pandas=5.56ms); iter 1 ❌ TS2538
