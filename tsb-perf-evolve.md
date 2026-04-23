# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-23T03:52:41Z |
| Iteration Count | 1 |
| Best Metric | — (CI failed) |
| Target Metric | — |
| Branch | autoloop/tsb-perf-evolve |
| PR | #190 |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | rejected |

## 📚 Lessons Learned

- noUncheckedIndexedAccess: TypedArray[i]=number|undefined. Use for...of.
- N boxed {v,i}+2 map()=high GC. NaN pre-partition removes hot-path check.
- c001: bracket-index on Uint32Array → TS2322/TS2538. Fixed in c002 (for...of).

## 📊 Iteration History

- Iter 1: ❌ CI failed · Island 1 · commit 24bbe85 · TS errors fixed in c002.
