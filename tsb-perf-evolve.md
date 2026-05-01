# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-01T12:36:06Z |
| Iteration Count | 30 |
| Best Metric | 21.048 |
| Target Metric | — |
| Metric Direction | lower |
| Branch | autoloop/tsb-perf-evolve |
| PR | pending CI |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, accepted, rejected, pending-ci, pending-ci |

## 🧬 Population

### c030 · island 3 · fitness pending CI · gen 30

- **Op**: exploitation; **Cell**: aos-typed-array · non-comparison; **Parent**: c029
- **Approach**: Pre-compute all 8 radix histograms in a single O(n) scan before scatter. Saves 7×n reads. Commit cb1eada.
- **Status**: ⏳ pending CI

### c029 · island 3 · fitness 21.048 · gen 29

- **Op**: exploitation; **Cell**: aos-typed-array · non-comparison; **Parent**: c028
- **Approach**: SoA→AoS scatter layout; all 3 writes/element on same cache line. Commit 150c0be.
- **Status**: ✅ accepted CI 25183916807 — tsb=112.50ms / pandas=5.34ms / fitness=21.048

### c028 · island 3 · fitness 21.841 · gen 28

- **Op**: exploitation; **Cell**: parallel-typed-arrays · non-comparison; **Parent**: c027/main
- **Approach**: Merge partition+radix-init into single O(n) pass. Commit 7f76b94.
- **Status**: ✅ accepted CI 25142515927 — tsb=116.68ms / pandas=5.34ms / fitness=21.841

### ~~c027~~ (rejected — fitness=29.573; pandas faster on that run: 3.99ms)

### ~~c022~~ (merged PR #226 — LSD 8-pass radix, module-level arrays)

### c003 · island 1 · fitness 27.999 · gen 2

- **Cell**: parallel-typed-arrays · comparison; tsb=155.63ms / pandas=5.56ms
- **Status**: ✅ accepted CI 24843983915

## 📚 Lessons Learned

- LSD radix (8-pass, IEEE-754 transform) eliminates comparator callbacks; bottleneck at n=100k.
- Module-level TypedArray buffers eliminate GC; grow lazily, never shrink.
- `noUncheckedIndexedAccess`: use `const v=arr[i]!; arr[i]=v+1`. For repeated indexed writes use local `idx` var.
- Fast-forward branch to origin/main before committing to prevent phantom commits.
- Even pass count (8) → result in srcIdx/srcBuf after all passes (no final copy needed).
- Benchmark noise: pandas time varies (~4-5.5ms); need ≥10% tsb speedup to clear noise.
- Merging partition+init saves 2×O(n) passes (c028: 116ms). AoS scatter saves cache-line evictions (c029: 112ms).

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- 4-pass 16-bit radix (half passes, 64KB histogram, cache effects unknown).
- Island 4 (hybrid): Array.prototype.sort for n < 1000, radix for n ≥ 1000.
- ~~Pre-compute all 8 histograms in a single scan~~ → now implemented in c030.

### Iteration 30 — 2026-05-01 12:36 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25214403845)

- **Status**: ⏳ pending CI · **Op**: exploitation · **Island**: 3 · c030
- **Change**: Pre-compute all 8 radix histograms in one O(n) scan; saves 7×n element reads vs 8 separate per-pass count loops.
- **Metric**: pending CI (sandbox has no bun)

### Iteration 29 — 2026-04-30 18:44 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25183052353)

- **Status**: ✅ Accepted fitness=21.048 (tsb=112.50ms / pandas=5.34ms); merged via PR #255. delta: -0.793
- **Change**: AoS scatter: 6 SoA arrays → 2 AoS arrays (stride-3 [idx,lo,hi]). All 3 scatter writes per element hit same cache line.

### Iteration 28 — 2026-04-30 01:08 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25142029767)

- **Status**: ✅ Accepted fitness=21.841 (tsb=116.68ms / pandas=5.34ms); PR #249 merged
- **Change**: Merged partition+radix-init into one O(n) pass; compact fvals indexing; direct srcIdx gather. Saves ~2×O(n). delta: -6.158

### Iters 1–27 — 2026-04-23–29 — c022 ✅ merged PR #226 (LSD 8-pass radix). c027 ❌ fitness=29.573 (pandas variance). Others pending-ci or lost.
