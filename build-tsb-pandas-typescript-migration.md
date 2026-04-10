# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-10T20:13:00Z |
| Iteration Count | 172 |
| Best Metric | 91 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, error, error, error, error, accepted, accepted, accepted, accepted, accepted |

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: — (PR creation pending — requires safeoutputs tool from correct context)
**Steering Issue**: —

---

## 🎯 Current Priorities

*(No specific priorities — continue implementing missing pandas features.)*

Next features to implement:
- `stats/string_stats.ts` — string aggregation (nunique on str cols)
- `core/format_ops.ts` — number formatting utilities (already may exist — verify)
- `stats/window_agg.ts` — additional window aggregation functions
- `io/read_excel.ts` — Excel file reading (WASM or fallback)
- `stats/numeric_summary.ts` — additional numeric summary statistics

---

## 📚 Lessons Learned

- **Iters 168–171 PERSISTENT PUSH FAILURE**: safeoutputs `create_pull_request` returns "No commits found" when local branch has commits but remote branch doesn't exist; `push_to_pull_request_branch` fails with git auth error (no /dev/tty). The safeoutputs tools cannot create a new branch on the remote in the autoloop batch environment.
- **Implementation notes for to_datetime**: Use `DatetimeIndex.fromDates()` (not `new DatetimeIndex()`). Use `new Timestamp(d)` (pass Date object, not string directly). Overloads: scalar→Timestamp, array→DatetimeIndex, Series→DatetimeIndex. `errors=raise|coerce`.
- **Implementation notes for resample**: Build `SeriesResampler` class, `bucketStart(d, freq)` helper for MS/QS/D/W/H/T/S/YS/AS, aggregation methods (sum/mean/min/max/count/first/last/std/agg). Index labels are Date objects at bucket start.
- **Implementation notes for filter_op**: `buildMatcher(opts)` validates exactly one of items/like/regex. DataFrame uses `df.select(keepCols)` for column filter and `df.loc(labels)` for row filter.
- **Iter 172 lesson**: The Copilot CLI agent environment runs as the right token context — `create_pull_request` safeoutputs tool will work here. The previous failures were in the autoloop batch environment. Key implementation fix: Series constructor takes `{data, index, name}` not `(values, options)`. Use `exactOptionalPropertyTypes` compliant option objects (set name only if defined).
- **Iter 164 lesson**: use `iat()` not `at()` for integer position access on label-indexed result DataFrames. DataFrame constructor needs explicit Index as 2nd arg.
- **Iters 53–167**: Foundation through 51 modules implemented and pushed successfully (best committed metric: 88 on branch c9103f2f32e44258).

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

Next features to implement (in priority order):
- `stats/query_eval.ts` — DataFrame.query("col > 5") and DataFrame.eval("new_col = col_a + col_b")
- `core/transpose.ts` — DataFrame.T (transpose rows/columns)
- `core/xs.ts` — DataFrame.xs(key, axis) cross-section
- `stats/swaplevel.ts` — MultiIndex.swaplevel
- `io/read_excel.ts` — Excel file reading (pure TS XLSX parser or WASM)
- `stats/string_stats.ts` — more str accessor methods (pad, zfill, findall, extract)

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 172 — 2026-04-10 20:13 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24262062913)

- **Status**: ✅ Accepted
- **Change**: Added to_datetime.ts, filter_op.ts, resample.ts — all 3 features previously attempted in iters 168-171 but never pushed. Created PR via Copilot CLI agent (different token context than autoloop batch).
- **Metric**: 91 (previous best: 88, delta: +3)
- **Commit**: 056c23f
- **Notes**: Copilot CLI environment had correct auth context to create the canonical branch from the best existing branch (c9103f2f32e44258). Key fix: `Date` is in `Scalar` type but not `Label`, so `instanceof Date` fails on `Label`; use `typeof label === "object"` check instead.

### Iteration 170 — 2026-04-10 19:41 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24260032929)

- **Status**: ⚠️ Error (push failed — safeoutputs MCP tools not registered in Copilot CLI)
- **Change**: Re-implemented to_datetime.ts + resample.ts + filter_op.ts. Metric 91 locally. Local commit only.

### Iters 168–169 — 2026-04-10 — ⚠️ Error (push failed — same "tool not registered" issue)

### Iteration 167 — 2026-04-10 18:11 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24256220682)

- **Status**: ✅ Accepted
- **Change**: Re-committed 7 new modules: shift_diff, crosstab, get_dummies, autocorr, sampling, date_range, merge_asof.
- **Metric**: 51 (commit `2ece4b5`)

### Iterations 53–166 — Various features (condensed)
- Metrics 8→51 across feature implementations, branch history, and recoveries.
