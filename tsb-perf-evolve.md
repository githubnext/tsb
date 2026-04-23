# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-23T10:33:30Z |
| Iteration Count | 2 |
| Best Metric | — (pending CI) |
| Target Metric | — |
| Branch | autoloop/tsb-perf-evolve |
| PR | — |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | rejected, pending |

## 🧬 Population

### c003 · island 1 · fitness — (pending) · gen 2

- **Operator**: exploration; **Feature cell**: parallel-typed-arrays · comparison
- **Approach**: NaN pre-partition + parallel Float64Array; `fvSlice[a]!-fvSlice[b]!` numeric comparator; string fallback
- **Status**: pending CI (commit f343170)

### ~~c002~~ · island 1 · fitness — (CI failed) · gen 1

- **Approach**: NaN pre-partition + Uint32Array indirect sort + generic T[] comparator
- **Status**: ❌ TS2538; human-fixed + merged to main (PR #190, b230a01)

## 📚 Lessons Learned

- `noUncheckedIndexedAccess`: TypedArray[i]=number|undefined; use `!` or `??`.
- TS2538 = bracket-index used as index without `!`. `as` casts pass TS fine.
- Island 1 baseline on main (5792af4). Benchmark: Series<number|null> dtype=float64.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- Island 3 (radix sort): float64→uint, O(n).
- Island 4 (hybrid): small-n boxed + large-n typed.
- Skip Index.take for RangeIndex.

## 📊 Iteration History

### Iter 2 — 2026-04-23 10:33 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24830395075)

- **Status**: pending · **Op**: exploration · **Island**: 1
- **Change**: Parallel Float64Array + `fvSlice[a]!-fvSlice[b]!` monomorphic comparator
- **Commit**: f343170

### Iter 1 — 2026-04-23 03:52 UTC

- **Status**: ❌ CI failed · **Island**: 1
- **Change**: NaN pre-partition + Uint32Array indirect sort (generic comparator)
- **Commit**: 24bbe85 → fixed b230a01 → merged main
