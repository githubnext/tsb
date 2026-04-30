# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-30T01:08:11Z |
| Iteration Count | 28 |
| Best Metric | 27.999 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, rejected, pending-ci |

## 🧬 Population

### c028 · island 3 · fitness pending CI · gen 28

- **Op**: exploitation; **Cell**: parallel-typed-arrays · non-comparison; **Parent**: c027/main
- **Approach**: Merge partition loop + radix key-init into single O(n) pass. Use compact fvals indexing (fvals[finCount] instead of fvals[i]) for sequential memory access. Gather directly from srcIdx, skipping copy-to-finSlice step. Saves ~2 × O(n) typed-array loop passes per call. Commit 7f76b94.
- **Status**: ⏳ pending CI

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

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- 4-pass 16-bit radix (half passes, 64KB histogram, cache effects unknown).
- Interleaved key layout: [lo0, hi0, lo1, hi1, ...] for better spatial locality.
- Island 4 (hybrid): Array.prototype.sort for n < 1000, radix for n ≥ 1000.

## 📊 Iteration History

### Iteration 28 — 2026-04-30 01:08 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25142029767)

- **Status**: ⏳ pending CI · **Op**: exploitation · **Island**: 3 · c028
- **Change**: Merged partition+radix-init into one O(n) pass; compact fvals indexing; direct srcIdx gather. Commit 7f76b94.
- **Metric**: pending CI (sandbox has no bun)

### Iteration 27 — 2026-04-29 22:51 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25137904374)

- **Status**: ❌ Rejected (fitness=29.573; tsb=117.92ms/pandas=3.99ms; ratio worse than best 27.999 due to pandas variance)
- **Op**: exploitation · **Island**: 3 · c027
- **Change**: _finBuf/_nanBuf/_fvals/_fvalsU32 → module-level grow-on-demand. Commit 7f42e5a.
- **Metric**: 29.573 (best: 27.999, delta: +1.574) — tsb actually improved 25% but pandas was faster that run

### Iters 1–26 — 2026-04-23–29 — c003 ✅ fitness=27.999 (tsb=155.63ms, pandas=5.56ms). c022 ✅ merged PR #226 (LSD 8-pass radix). Others pending-ci or lost to branch resets.
