# Autoloop: autoloop-autoloop-tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-23T04:41:19Z |
| Iteration Count | 1 |
| Best Metric | — (pending CI) |
| Target Metric | — |
| Branch | `autoloop/autoloop-autoloop-tsb-perf-evolve` |
| PR | — |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci |

## 📚 Lessons Learned

- `noUncheckedIndexedAccess`: `TypedArray[i]` → `number|undefined`. Use `for...of`.
- `as T` for `_values[idx]` is standard pattern. N boxed `{v,i}` = high GC.
- NaN pre-partition removes hot-path NaN check.

## 🧬 Population

### c002 · island 1 · pending · gen 1

- exploration · parallel-typed-arrays · comparison
- NaN pre-partition + Uint32Array indirect sort + for...of gather. Commit 23e1d87.
- ⏳ pending CI

## 📊 Iteration History

### Iter 1 — 2026-04-23T04:41Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/24816842111)

- ⏳ pending CI · Island 1 · Uint32Array sort + NaN pre-partition + for...of gather
