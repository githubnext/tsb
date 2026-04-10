# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-10T19:41:00Z |
| Iteration Count | 170 |
| Best Metric | 88 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 2 |
| Recent Statuses | error, error, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: — (pending push)
**Steering Issue**: — (pending push)
**Experiment Log**: — (pending push)

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

- **Iters 168+169+170 CRITICAL INFRASTRUCTURE ISSUE**: safeoutputs MCP tools NOT registered in Copilot CLI tool environment. When calling `create_pull_request`, `add_comment`, or `noop`, all return: "Tool 'X' does not exist. Available tools: bash, write_bash, ...". This means git push cannot happen (no token available either - GITHUB_TOKEN not set, git push waits for credentials interactively). The `LD_PRELOAD=/tmp/awf-lib/one-shot-token.so` exists but doesn't help git over HTTPS. This is a systematic environment configuration problem, not a code problem.
- **Implementation notes for to_datetime**: Use `DatetimeIndex.fromDates()` (not `new DatetimeIndex()`). Use `new Timestamp(str)` for string parsing. Overloads: scalar→Timestamp, array→DatetimeIndex, Series→DatetimeIndex. `errors=raise|coerce`.
- **Implementation notes for resample**: Build `SeriesResampler` class, `bucketStart(d, freq)` helper for MS/QS/D/W/H/T/S/YS/AS, aggregation methods (sum/mean/min/max/count/first/last/std/agg).
- **Implementation notes for filter_op**: `buildMatcher(opts)` validates exactly one of items/like/regex. DataFrame uses `df.select(keepCols)` for column filter and `df.iloc(positions)` for row filter.
- **Iter 164 lesson**: use `iat()` not `at()` for integer position access on label-indexed result DataFrames. DataFrame constructor needs explicit Index as 2nd arg.
- **Iters 53–167**: Foundation through 51 modules implemented and pushed successfully.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**State (iter 170)**: SAME RECURRING PUSH FAILURE — safeoutputs MCP tools not registered in Copilot CLI tool list. Code implemented locally (commit `7a6f478`) but cannot be pushed. This is the 3rd consecutive time this has happened (iters 168, 169, 170).

**CRITICAL for next iteration**:
1. Create canonical branch from c9103 (`autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258`, 88 files)
2. Re-implement same 3 features (these are well-documented, should be fast):
   - `to_datetime.ts` in `src/core/` — overloads: scalar→Timestamp, array→DatetimeIndex, Series→DatetimeIndex. Use `DatetimeIndex.fromDates()`, `new Timestamp(str)` for strings, `errors=raise|coerce`
   - `resample.ts` in `src/stats/` — `SeriesResampler` class, `bucketStart()` for freq (MS/QS/D/W/H/T/S/YS/AS), agg: sum/mean/min/max/count/first/last/std/agg
   - `filter_op.ts` in `src/stats/` — `filterDataFrame()` + `filterSeries()`, `buildMatcher()` for items/like/regex, axis=columns/index
3. Export all from index files, tests, playground page
4. **Infrastructure**: safeoutputs MCP tools must be available. If not (same 401/not-registered error), consider reporting the infrastructure issue.

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 170 — 2026-04-10 19:41 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24260032929)

- **Status**: ⚠️ Error (push failed — safeoutputs MCP tools not registered in Copilot CLI)
- **Change**: Re-implemented to_datetime.ts + resample.ts + filter_op.ts (same as iters 168+169). 47 tests pass. Metric 91 locally. Committed as `7a6f478` on local canonical branch but cannot push to origin.
- **Metric**: 91 (local only; best committed = 88, delta: +3 if pushed)
- **Notes**: Same infrastructure failure as iters 168+169. safeoutputs tools (create_pull_request, add_comment, noop) all return "Tool does not exist" in Copilot CLI. This is the 3rd consecutive push failure. Next iteration: re-implement and push.

### Iteration 169 — 2026-04-10 18:48 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24258704424)

- **Status**: ⚠️ Error (push failed — safeoutputs MCP unavailable)
- **Change**: Same 3 features (to_datetime, resample, filter_op) implemented locally but never pushed.
- **Metric**: 91 local only (push failed; best committed was 88)
- **Commit**: `4f50aff` (local only, lost)

### Iteration 168 — 2026-04-10 18:20 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24257520269)

- **Status**: ⚠️ Error (push failed — safeoutputs MCP unavailable)
- **Change**: to_datetime + resample + filter_op implemented, push failed.
- **Metric**: 91 local only (push failed)

### Iteration 167 — 2026-04-10 18:11 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24256220682)

- **Status**: ✅ Accepted
- **Change**: Re-committed 7 new modules: shift_diff, crosstab, get_dummies, autocorr, sampling, date_range, merge_asof.
- **Metric**: 51 (commit `2ece4b5`)

### Iterations 53–166 — Various features (condensed)
- Metrics 8→51 across feature implementations, branch history, and recoveries.
