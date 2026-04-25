# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-25T13:35:00Z |
| Iteration Count | 18 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, not-pushed, not-pushed, pending-ci |

## 🧬 Population

### c019 · island 3 · fitness pending CI · gen 18

- **Op**: exploration; **Cell**: parallel-typed-arrays · non-comparison; **Parent**: c003
- **Approach**: LSD 8-pass radix sort on IEEE-754 → sortable-uint64 keys. Module-level `_rSrc/_rDst/_rKHi/_rKLo` (128k cap, grow-only). Keys indexed by ROW (not position); slots carry row indices. Ping-pong curA/curB local vars; 8 swaps → result in curA. Descending: reverse finBuf after ascending sort. Commit 6a6e514.
- **Status**: ⏳ pending CI

### c018 · island 3 · fitness unknown · gen 17

- **Op**: exploration; **Cell**: parallel-typed-arrays · non-comparison; **Parent**: c003
- **Approach**: LSD 8-pass radix sort on IEEE-754 uint64 keys, with module-level pre-allocated `_rSrc/_rDst/_rKHi/_rKLo` buffers (128k cap). `fview=new Uint32Array(fvals.buffer)` for key extraction. keyHi/keyLo indexed by position (0..finCount-1). Ping-pong curSrc/curDst; 8 swaps → result in curSrc. Commit f0e96a7.
- **Status**: ❓ never confirmed (branch was reset to main before CI)

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
- Keys indexed by ROW (not by position/slot) simplifies the scatter step: `curB[cv] = r` where r is already the row index. No finBuf copy needed.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- c019 (radix, keys-by-row) awaiting CI. If accepted, explore 4-pass 16-bit radix (may be more cache-friendly).
- If radix still fails: try Island 4 hybrid (callback sort for small n, radix for large).

## 📊 Iteration History

### Iteration 18 — 2026-04-25 13:35 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24932091850)

- **Status**: ⏳ pending CI · **Op**: exploration · **Island**: 3 · c019
- **Change**: LSD 8-pass radix sort; keys indexed by ROW (not position); module-level 128k pre-alloc buffers; local curA/curB ping-pong
- **Commit**: 6a6e514 · **Metric**: pending CI
- **Notes**: Branch fast-forwarded to main (ahead=0, behind=33). c018 was never confirmed. c019 corrects key indexing design to row-indexed (cleaner, no finBuf copy needed).

### Iters 2–16 — 2026-04-23–25 — ✅ c003 fitness=27.999 (tsb=155.63ms, pandas=5.56ms); iters 3–16 all phantom/pending-ci radix attempts lost to branch resets

### Iter 1 — 2026-04-23 — ❌ TS2538
