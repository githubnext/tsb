# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-09T01:26:46Z |
| Iteration Count | 36 |
| Best Metric | 21.048 |
| Target Metric | — |
| Metric Direction | lower |
| Branch | autoloop/tsb-perf-evolve |
| PR | — |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, accepted, pending-ci |

## 🧬 Population

### c036 · island 3 · fitness pending CI · gen 36

- **Op**: exploitation; **Cell**: aos-typed-array · non-comparison; **Parent**: c035
- **Approach**: Unroll all 8 radix scatter passes into explicit loops with inlined constants. Eliminates outer-loop ternary; lets JIT specialise each inner loop. Passes 3/7 drop `& 0xff`. Commit 4994f95.
- **Status**: ⏳ pending CI

### c035 · island 3 · fitness pending CI · gen 35

- **Approach**: Merge all 8 histogram passes inline + si stride counters + RangeIndex fast path. Commit 3873563.
- **Status**: ✅ merged to main PR #272

### c029 · island 3 · fitness 21.048 · gen 29

- **Approach**: AoS scatter; all 3 writes/element on same cache line. Commit 150c0be.
- **Status**: ✅ accepted CI 25183916807 — tsb=112.50ms / pandas=5.34ms

### ~~c028~~ fitness 21.841 · ~~c027~~ rejected · ~~c022~~ merged PR #226 (LSD 8-pass radix) · ~~c003~~ island 1 fitness 27.999 · ~~c030–c034~~ lost

## 📚 Lessons Learned

- LSD radix (8-pass, IEEE-754 transform) eliminates comparator callbacks; bottleneck at n=100k.
- Module-level TypedArray buffers eliminate GC; grow lazily, never shrink.
- Even pass count (8) → result in srcBuf after all passes (no final copy needed).
- Benchmark noise: pandas time varies (~4-5.5ms); need ≥10% tsb speedup to clear noise.
- AoS scatter packs all 3 writes/element on same cache line; SoA is worse for writes.
- Merging histogram accumulation into init loop saves one O(n) pass over _rxA.
- `index.take(perm)` calls at() with bounds-check; RangeIndex fast path saves 100k calls.
- Accumulated stride counter (si += 3) avoids one multiply per scatter element.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- 4-pass 16-bit radix (half passes, 256KB histogram; may hurt L1 cache hit rate).
- Island 4 hybrid: Array.prototype.sort for n < 1k, radix for n ≥ 1k.

## 📊 Iteration History

### Iteration 36 — 2026-05-09 01:26 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25587692274)

- **Status**: ⏳ pending CI · c036 · exploitation · island 3
- **Change**: Unroll 8 radix scatter passes with inlined constants; drop redundant & 0xff for shift=24.
- **Metric**: pending CI (best: 21.048)

### Iters 29–35 — ✅ accepted (fitness 21.048); c035 merged PR #272 (merged-histogram + stride + RangeIndex fast path)

### Iters 1–28 — c022 ✅ merged PR #226 (LSD 8-pass radix, fitness ~29→21.841→21.048)
