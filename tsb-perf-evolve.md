# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-25T10:32:00Z |
| Iteration Count | 16 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, not-pushed, not-pushed, pending, pending-ci, pending-ci |

## 🧬 Population

### c017 · island 3 · fitness pending CI · gen 16

- **Op**: exploration; **Cell**: parallel-typed-arrays · non-comparison; **Parent**: c003
- **Approach**: LSD 8-pass radix sort on IEEE-754 bit-transformed uint64 keys. `new Uint32Array(fvals.buffer)` overlay. keyHi/keyLo indexed by row. Ping-pong curSrc/curDst. XOR all bits for descending. Commit 565930f.
- **Status**: ⏳ pending CI

### ~~c016~~ · phantom gen 15 · same radix design; lost to fast-forward reset

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
- keyHi/keyLo must be indexed by row index (0..n-1), not by finBuf position, so ping-pong buffers carry row indices directly.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- If radix (c017) succeeds: exploit — make keyHi/keyLo/curSrc/curDst module-level pre-allocated buffers to eliminate per-call allocation.
- If radix fails: try Island 4 hybrid (callback sort for small n, radix for large).

## 📊 Iteration History

### Iteration 16 — 2026-04-25 10:32 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24928883789)

- **Status**: ⏳ pending CI · **Op**: exploration · **Island**: 3 · c017
- **Change**: LSD 8-pass radix sort on IEEE-754 bit-transformed float64 keys (keyHi/keyLo indexed by row index; ping-pong curSrc/curDst)
- **Commit**: 565930f · **Metric**: pending CI
- **Notes**: Branch fast-forwarded to origin/main (ahead=0, behind=33). Fresh PR queued. Previous c016 was phantom (lost to reset).

### Iters 3–15 — 2026-04-23–25 — phantoms/pending-ci — island 3 radix; all lost to branch resets

### Iter 2 — 2026-04-23 — ✅ c003 fitness=27.999 (tsb=155.63ms, pandas=5.56ms)
### Iter 1 — 2026-04-23 — ❌ TS2538
