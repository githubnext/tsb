# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-25T11:55:00Z |
| Iteration Count | 17 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, not-pushed, not-pushed, pending, pending-ci |

## 🧬 Population

### c018 · island 3 · fitness pending CI · gen 17

- **Op**: exploration; **Cell**: parallel-typed-arrays · non-comparison; **Parent**: c003
- **Approach**: LSD 8-pass radix sort on IEEE-754 uint64 keys, with module-level pre-allocated `_rSrc/_rDst/_rKHi/_rKLo` buffers (128k cap). `fview=new Uint32Array(fvals.buffer)` for key extraction. keyHi/keyLo indexed by position (0..finCount-1). Ping-pong curSrc/curDst; 8 swaps → result in curSrc. Commit f0e96a7.
- **Status**: ⏳ pending CI

### ~~c017~~ · phantom gen 16 · same radix design; lost to branch reset

### c003 · island 1 · fitness 27.999 · gen 2

- **Cell**: parallel-typed-arrays · comparison; NaN pre-partition + Float64Array; `fvals[a]!-fvals[b]!` comparator
- **Status**: ✅ accepted CI 24843983915; tsb=155.63ms / pandas=5.56ms

## 📚 Lessons Learned

- `noUncheckedIndexedAccess`: TypedArray[i] = number|undefined; use `!`.
- Callback overhead bottleneck at n=100k: ~1.6M calls × 100ns = 160ms.
- `new Uint32Array(fvals.buffer)` valid TypeScript; no `as` needed.
- LSD radix: 8-pass IEEE-754 transform eliminates callbacks. Even #swaps → result in curSrc after 8 passes.
- `arr[i]!++` invalid TS; use `const v=arr[i]!; arr[i]=v+1;`.
- **Branch must be fast-forwarded to origin/main** before committing to prevent phantom commits.
- keyHi/keyLo indexed by **position** (0..finCount-1); curSrc/curDst carry positions that map back to finSlice row indices.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- c018 (radix + pre-alloc) now implements the "exploit pre-alloc" direction — awaiting CI.
- If radix fails: try Island 4 hybrid (callback sort for small n, radix for large).

## 📊 Iteration History

### Iteration 17 — 2026-04-25 11:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24930235421)

- **Status**: ⏳ pending CI · **Op**: exploration · **Island**: 3 · c018
- **Change**: LSD 8-pass radix sort with module-level pre-allocated buffers (_RADIX_CAP=131072); keyHi/kLo indexed by position
- **Commit**: f0e96a7 · **Metric**: pending CI
- **Notes**: Branch fast-forwarded (ahead=0, behind=33). c017 was phantom. Fresh PR. Fix: keyHi/kLo indexed by position (0..finCount-1), not row.

### Iters 2–16 — 2026-04-23–25 — ✅ c003 fitness=27.999 (tsb=155.63ms, pandas=5.56ms); iters 3–16 all phantom/pending-ci radix attempts lost to branch resets

### Iter 1 — 2026-04-23 — ❌ TS2538
