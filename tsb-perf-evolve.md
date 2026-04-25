# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-25T15:04:03Z |
| Iteration Count | 19 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, not-pushed, not-pushed, pending-ci, pending-ci |

## 🧬 Population

### c020 · island 3 · fitness pending CI · gen 19

- **Op**: exploration; **Cell**: parallel-typed-arrays · non-comparison; **Parent**: c003
- **Approach**: ALL buffers module-level (_rBufA/_rBufB/_rKeyHi/_rKeyLo/_rFinBuf/_rNanBuf/_rFvals, grow-only). Keys by ROW. 8-pass LSD radix on float64 → uint64 sortable keys. Commit a90f9df.
- **Status**: ⏳ pending CI

### ~~c019~~ · island 3 · gen 18 · never confirmed (branch reset)

### ~~c017~~ · phantom gen 16 · same radix design; lost to branch reset

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

- c020 (radix, ALL buffers module-level including _rFinBuf/_rNanBuf/_rFvals) awaiting CI. If accepted, explore 4-pass 16-bit radix (may be more cache-friendly).
- If radix still fails: try Island 4 hybrid (callback sort for small n, radix for large).

## 📊 Iteration History

### Iteration 19 — 2026-04-25 15:04 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24933725916)

- **Status**: ⏳ pending CI · **Op**: exploration · **Island**: 3 · c020
- **Change**: LSD 8-pass radix; ALL buffers module-level. Zero per-call alloc after warmup. Commit a90f9df.
- **Notes**: Branch ff'd to main. c019 lost to reset. c020 adds _rFinBuf/_rNanBuf/_rFvals as module-level.

### Iters 3–18 — 2026-04-23–25 — all phantom/pending-ci radix attempts lost to branch resets

### Iters 1–2 — 2026-04-23 — ✅ c003 fitness=27.999 (tsb=155.63ms, pandas=5.56ms); iter 1 ❌ TS2538
