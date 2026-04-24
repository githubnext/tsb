# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-23T23:47:19Z |
| Iteration Count | 4 |
| Best Metric | 27.999 |
| Target Metric | — |
| Branch | autoloop/tsb-perf-evolve |
| PR | #206 |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | rejected, accepted, accepted, pending |

## 🧬 Population

### c005 · island 1 · fitness — (pending CI) · gen 4

- **Operator**: exploitation (c003); **Feature cell**: parallel-typed-arrays · comparison
- **Approach**: Inline introsort (_qsortFin: median-of-3 qsort + heapsort fallback + insertion sort n<16) replacing Uint32Array.sort(callback); + skip Index.take for default RangeIndex
- **Status**: pending CI (commit 4d03bb2)

### ~~c004~~ · island 1 · never pushed · gen 3

- **Approach**: RangeIndex skip only — commit 19508f1 recorded but never pushed. Superseded by c005.
- **Status**: ❌ not pushed

### c003 · island 1 · fitness 27.999 · gen 2

- **Operator**: exploration; **Feature cell**: parallel-typed-arrays · comparison
- **Approach**: NaN pre-partition + Float64Array fvals; `fvals[a]!-fvals[b]!` numeric comparator; fvals indexed by row
- **Status**: ✅ accepted — CI run 24843983915; tsb=155.63ms / pandas=5.56ms

### ~~c002~~ · island 1 · fitness — (CI failed) · gen 1

- **Approach**: NaN pre-partition + Uint32Array indirect sort + generic T[] comparator
- **Status**: ❌ TS2538; human-fixed + merged main (b230a01)

## 📚 Lessons Learned

- `noUncheckedIndexedAccess`: TypedArray[i]=number|undefined; use `!`.
- c003 fitness=27.999: tsb=155.63ms vs pandas=5.56ms. ~1.6M JS callback calls in Uint32Array.sort(callback) at ~100ns/call ≈ 160ms. Callback overhead IS the bottleneck.
- `instanceof RangeIndex` narrows TS type; `.start`/`.step` accessible without `as` cast.
- RangeIndex.take(perm) for default range = new Index(perm); skip 100k at() calls.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- Island 3 (radix sort): float64→uint64 transform, O(n).
- Buffer reuse: module-level TypedArrays amortise allocation across 50 benchmark iterations.

## 📊 Iteration History

### Iteration 4 — 2026-04-23 23:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24864559744)

- **Status**: pending CI · **Op**: exploitation · **Island**: 1
- **Change**: Inline introsort + RangeIndex.take skip
- **Commit**: 4d03bb2 · **Metric**: pending · **Delta**: TBD

### Iters 1–3 — 2026-04-23

- Iter 3: ❌ not pushed (commit 19508f1 phantom)
- Iter 2: ✅ accepted — c003 fitness=27.999 (tsb=155.63ms, pandas=5.56ms)
- Iter 1: ❌ CI failed TS2538; human-fixed → merged main
