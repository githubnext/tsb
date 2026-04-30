# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-30T18:44:20Z |
| Iteration Count | 29 |
| Best Metric | 21.841 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, accepted, rejected, pending-ci |

## 🧬 Population

### c029 · island 3 · fitness pending CI · gen 29

- **Op**: exploitation; **Cell**: aos-typed-array · non-comparison; **Parent**: c028
- **Approach**: Switch radix ping-pong from SoA (6 separate arrays: idx/lo/hi × 2) to AoS (2 arrays, stride-3: [origIdx, loKey, hiKey]). All 3 scatter writes per element hit the same cache line → ~3× fewer random cache-line evictions during scatter. Commit 0aa6847.
- **Status**: ⏳ pending CI

### c028 · island 3 · fitness 21.841 · gen 28

- **Op**: exploitation; **Cell**: parallel-typed-arrays · non-comparison; **Parent**: c027/main
- **Approach**: Merge partition loop + radix key-init into single O(n) pass. Compact fvals indexing; direct srcIdx gather. Saves ~2 × O(n) typed-array loop passes per call. Commit 7f76b94.
- **Status**: ✅ accepted CI 25142515927 — tsb=116.68ms / pandas=5.34ms / fitness=21.841

### ~~c027~~ (rejected — fitness=29.573 > 27.999 best; pandas was faster on that CI run: tsb=117.92ms/pandas=3.99ms)

### ~~c022~~ (merged via PR #226 — LSD 8-pass radix, all rx module-level)

### c003 · island 1 · fitness 27.999 · gen 2

- **Cell**: parallel-typed-arrays · comparison; tsb=155.63ms / pandas=5.56ms
- **Status**: ✅ accepted CI 24843983915

## 📚 Lessons Learned

- LSD radix (8-pass, IEEE-754 transform) eliminates all comparator callbacks; the bottleneck at n=100k.
- Module-level TypedArray buffers eliminate GC pressure; grow lazily, never shrink.
- `noUncheckedIndexedAccess`: use `!` on TypedArray[i]. `arr[i]!++` invalid; use `const v=arr[i]!; arr[i]=v+1`.
- Fast-forward branch to origin/main before committing to prevent phantom commits.
- Keys indexed by ROW simplifies scatter: `curB[cv] = r`. Even pass count → result in srcIdx after 8 passes.
- `new Uint32Array(fvals.buffer)` valid TypeScript; update `_fvalsU32` whenever `_fvals` is reallocated.
- Pending-CI pattern: sandbox has no `bun`; CI benchmark is the acceptance gate.
- c027 raw tsb time was 117ms (improved from 155ms), but pandas was also faster (3.99ms vs 5.56ms) on that CI run → ratio 29.57 > 27.999. Benchmark noise from pandas can mask real tsb improvements; need large enough tsb gains.
- Compact fvals indexing (fvals[finCount]) allows merging the partition loop and radix key-init into one pass; fvalsU32[j*2] immediately reads what was just written to fvals[j] (same cache line).
- c028 achieved fitness=21.841 by saving 2×O(n) loop passes (merged init+partition). Confirmed: tsb dropped from 155ms to 116ms.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- 4-pass 16-bit radix (half passes, 64KB histogram, cache effects unknown).
- Island 4 (hybrid): Array.prototype.sort for n < 1000, radix for n ≥ 1000.
- Pre-compute all 8 histograms in a single scan (save 7×n count-loop reads).

### Iteration 29 — 2026-04-30 18:44 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25183052353)

- **Status**: ⏳ pending CI · **Op**: exploitation · **Island**: 3 · c029
- **Change**: AoS scatter: 6 SoA arrays → 2 AoS arrays (stride-3 [idx,lo,hi]). All 3 scatter writes per element hit same cache line → ~3× fewer cache-line evictions.
- **Metric**: pending CI (sandbox has no bun)

### Iteration 28 — 2026-04-30 01:08 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25142029767)

- **Status**: ✅ Accepted fitness=21.841 (tsb=116.68ms / pandas=5.34ms); PR #249 merged
- **Change**: Merged partition+radix-init into one O(n) pass; compact fvals indexing; direct srcIdx gather. Saves ~2×O(n). delta: -6.158

### Iters 1–27 — 2026-04-23–29 — c022 ✅ merged PR #226 (LSD 8-pass radix). c027 ❌ fitness=29.573 (pandas variance). Others pending-ci or lost.
