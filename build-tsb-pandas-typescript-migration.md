# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-10T14:53:00Z |
| Iteration Count | 164 |
| Best Metric | 93 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258` |
| PR | #81 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

## 🎯 Current Priorities

*(No specific priorities — continue implementing missing pandas features.)*

Next features to implement:
- `io/read_excel.ts` — Excel file reading (using WASM or fallback)
- `stats/string_stats.ts` — string aggregation functions (nunique on str cols, etc.)
- `stats/numeric_summary.ts` — additional numeric summary statistics

---

## 📚 Lessons Learned

- **Iter 164 (5 features — COMMITTED)**: format_ops + export_ops + corr_methods + str_ops + window_agg = +5 metric (88→93). 161 tests pass. Commit `428281a` on canonical branch. Key: use `iat()` not `at()` for integer position access on label-indexed result DataFrames. DataFrame constructor always needs explicit Index as 2nd arg. TypeScript `result[0]` needs `undefined` check in addition to `null`.
- **Iter 163 (format_ops + export_ops + corr_methods — PUSHED)**: 3 features in 1 iteration = +3 metric (88→91). 117 tests pass. Commit `7694a5b`. LaTeX test must use direct substring check. `fc.double` bounded to le1e15 for `toFixed` property tests.
- **Iter 161 lesson**: Always verify actual branch file count at start. State file was claiming 90 but actual was 88.
- **Iters 53–162**: Foundation through format_ops re-implementations (all pre-existing lessons condensed).

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**State (iter 164)**: 93 files committed on branch (commit `428281a`). Next: push to PR #81, then io/read_excel, stats/string_stats, stats/numeric_summary

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 164 — 2026-04-10 14:53 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24248753268)

- **Status**: ✅ Accepted
- **Change**: Added 5 new modules: `format_ops.ts` (14 fns, 42 tests), `export_ops.ts` (5 fns, 38 tests), `corr_methods.ts` (Spearman/Kendall, 18 tests), `str_ops.ts` (13 standalone string ops, 46 tests), `window_agg.ts` (10 window aggs, 17 tests).
- **Metric**: 93 (previous best: 88 on pushed branch, delta: +5)
- **Commit**: `428281a`
- **Notes**: All 161 new tests pass. Key fixes: use `iat()` for integer-position access on label-indexed DataFrames; DataFrame constructor needs explicit Index; `undefined` check alongside `null` for TS strict mode.

### Iteration 163 — 2026-04-10 11:48 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24241372135)

- **Status**: ✅ Accepted (local commit `7694a5b` — re-done in iter 164)
- **Change**: format_ops + export_ops + corr_methods. 117 tests pass. Metric 88→91 (+3).
- **Metric**: 91 (local only, origin still at 88)

### Iters 155–162 — ✅ Various features, some local-only commits
### Iters 53–154 — ✅ (metrics 8→53): Foundation through categorical/sparse/hash/clip ops
### Iterations 1–52 — ✅ Earlier work on diverged branches
