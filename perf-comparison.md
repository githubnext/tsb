# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-15T11:50:00Z |
| Iteration Count | 95 |
| Best Metric | 281 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #141 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 1 |
| Recent Statuses | error, accepted, error, error, error, error, error, error, error, error |
| Paused | false |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: #141
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- Metric = min(ts_bench_count, py_bench_count); base branch is origin/autoloop/perf-comparison-3c596789b15fd053 (actual 251 pairs despite commits saying 265).
- Bun not installed; TS benchmark files validated by file-count metric only.
- push_repo_memory limit ~8 KB per file (total ~10 KB across all files).
- Index API: delete(), drop(), equals(), identical(), argsort(), isna(), dropna(), min(), max(), argmin(), argmax(), insert(), nunique(), fillna(), append(), rename().
- String accessor: fullmatch(), lower(), upper(), title(), capitalize(), swapcase(), find(), rfind(), repeat(), isalpha(), isdigit(), isalnum(), isnumeric(), islower(), isupper(), istitle(), isspace(), zfill(), center(), ljust(), rjust(), slice(), count().
- DatetimeAccessor: is_year_start(), is_year_end(), is_leap_year(), days_in_month(), is_month_start(), is_month_end(), hour(), minute(), second().
- Branching: checkout origin/autoloop/perf-comparison-3c596789b15fd053 as local autoloop/perf-comparison, add pairs, commit, push via push_to_pull_request_branch to PR #141.
- groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only; Series({data,name,index}); df.assign({c: series}) direct.
- CategoricalAccessor instance methods (addCategories, removeCategories, renameCategories, setCategories, reorderCategories, asOrdered, asUnordered) are accessed via s.cat.<method>(). Python equivalent uses pd.Categorical directly.
- DatetimeAccessor has millisecond/microsecond/nanosecond/dayofyear/weekday/round/date methods not previously benchmarked.

---

## 🔭 Future Directions

- More groupby aggregation variants (nunique — check if API exists).
- IO benchmarks: read_parquet, to_parquet, read_excel.
- Advanced reshape: crosstab with margins, pivot_table with fill_value.
- Series-level dropna/fillna separate benchmarks.
- More str_* ops: strftime on datetime accessor.
- Series arithmetic edge cases: floordiv, mod, pow operators — ✅ Done (iter 70/71)
- Index operations: sort, nunique (Index has these methods) — ✅ Done (iter 71)
- DataFrame shift/diff if added to API.
- GroupBy nunique if API exists.
- DataFrameExpanding min/max/count/median — ✅ Done (iter 71)
- EWM apply with custom function — ✅ Done (iter 71)
- DataFrameEwm std/var — ✅ Done (iter 71)
- Series comparison operators — ✅ Done (iter 71)
- Index set ops — ✅ Done (iter 71)
- DataFrame rank — ✅ Done (iter 71)
- series_groupby_transform, index_contains, dataframe_apply_axis1, index_sort, dataframe_rolling_apply — ✅ Done (iter 72)
- index_slice_take, index_drop_duplicates, countna, series_str_replace, groupby_get_group — ✅ Done (iter 73/74)
- str_strip, str_pad, dt_floor_ceil — ✅ Done (iter 74)
- str_startswith_endswith, str_match, str_join, str_cat, dt_normalize, dt_quarter_month — ✅ Done (iter 75)
- str_case, str_zfill_center_ljust_rjust, str_count, str_slice_get, str_isalnum_isnumeric, str_islower_isupper, str_wrap, str_encode, str_istitle_isspace, index_fillna, index_append, index_rename — ✅ Done (iter 94, commit 82afaa6).
- dt_millisecond_microsecond_nanosecond, dt_dayofyear_weekday, dt_round, dt_date, str_rsplit, str_slice_replace, index_isin, index_duplicated, cat_add_remove_categories, cat_rename_set_categories, cat_reorder_as_ordered, cat_value_counts — ⏳ Pending push (iter 95, commit db56034 local only).
- Base branch still at 281 pairs (iter 94); iter 95 commit pending push.
- Next: Series.at/iat single-element access benchmark.
- Next: Index.getIndexer benchmark.
- Next: CategoricalAccessor.removeUnusedCategories benchmark.
- DataFrame str accessor on columns.
- IO benchmarks (read_parquet, to_parquet) still pending if API exists.

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 95 — 2026-04-15 11:50 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24452790751)

- **Status**: ⚠️ Error
- **Change**: Added 12 pairs: dt_millisecond_microsecond_nanosecond, dt_dayofyear_weekday, dt_round, dt_date, str_rsplit, str_slice_replace, index_isin, index_duplicated, cat_add_remove_categories, cat_rename_set_categories, cat_reorder_as_ordered, cat_value_counts. Local commit db56034. Metric would be 293.
- **Metric**: N/A (push blocked — safeoutputs MCP tools unavailable; push_to_pull_request_branch returns "Tool does not exist")
- **Commit**: db56034 (local only)
- **Notes**: All 24 benchmark files (12 TS + 12 PY) created and committed. Same blocker as iters 83-93 (except 86, 94). safeoutputs MCP server not connected this run.

### Iteration 94 — 2026-04-15 10:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24450563155)

- **Status**: ✅ Accepted
- **Change**: Added 12 pairs: str_case, str_zfill_center_ljust_rjust, str_count, str_slice_get, str_isalnum_isnumeric, str_islower_isupper, str_istitle_isspace, str_wrap, str_encode, index_fillna, index_append, index_rename.
- **Metric**: 281 (previous best: 269, delta: +12)
- **Commit**: 82afaa6
- **Notes**: safeoutputs MCP tools available this run. Successfully pushed 24 benchmark files (12 TS + 12 PY) covering remaining string accessor and Index methods.

### Iteration 93 — 2026-04-15 10:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24449548477)

- **Status**: ⚠️ Error
- **Change**: Added 12 pairs: str_case, str_zfill_center_ljust_rjust, str_count, str_slice_get, str_isalnum_isnumeric, str_islower_isupper, str_istitle_isspace, str_wrap, str_encode, index_fillna, index_append, index_rename. Local commit 285aa2b. Metric = 281.
- **Metric**: N/A (push blocked — safeoutputs MCP tools unavailable)
- **Commit**: 285aa2b (local only)
- **Notes**: Same blocker as iters 83-92 (except 86). safeoutputs MCP server not connected this run.

### Iteration 92 — 2026-04-15 09:35 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24447197715)

- **Status**: ⚠️ Error
- **Change**: Added 11 pairs. Local commit f1292ae. Metric = 280.
- **Metric**: N/A (push blocked — safeoutputs MCP tools unavailable)
- **Commit**: f1292ae (local only)

### Iteration 91 — 2026-04-15 08:36 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24444706373)

- **Status**: ⚠️ Error
- **Change**: Added 12 pairs. Local commit 05f47c9. Metric = 281.
- **Metric**: N/A (push blocked — safeoutputs MCP tools not available)
- **Commit**: 05f47c9 (local only)

### Iteration 90 — 2026-04-15 07:36 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24442256190)

- **Status**: ⚠️ Error
- **Change**: Added 12 pairs. Local commit 66879ec. Metric = 281.
- **Metric**: N/A (push blocked — git HTTPS auth unavailable; safeoutputs MCP not connected)
- **Commit**: 66879ec (local only)

### Iteration 89 — 2026-04-15 06:40 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24440234178)

- **Status**: ⚠️ Error
- **Change**: Added 12 pairs. Local commit 563bc8d. Metric = 281.
- **Metric**: N/A (push blocked — safeoutputs MCP unavailable)
- **Commit**: 563bc8d (local only)

### Iteration 88 — 2026-04-15 05:44 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24438481402)

- **Status**: ⚠️ Error
- **Change**: Added 11 pairs. Local commit 08f2852. Metric = 280.
- **Metric**: N/A (push blocked — safeoutputs MCP unavailable)
- **Commit**: 08f2852 (local only)

### Iteration 87 — 2026-04-15 04:48 UTC

- **Status**: ⚠️ Error
- **Change**: Added 8 pairs. Local commit de7bcae. Metric would be 277.
- **Metric**: N/A (push blocked — safeoutputs MCP unavailable)
- **Commit**: de7bcae (local only)

### Iteration 86 — 2026-04-15 03:06 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24434261479)

- **Status**: ✅ Accepted
- **Change**: Added 8 pairs: str_case, str_zfill_center_ljust_rjust, str_count, str_slice_get, str_isalnum_isnumeric, index_fillna, index_append, index_rename.
- **Metric**: 277 (previous best: 269, delta: +8)
- **Commit**: 809e0e9
- **Notes**: safeoutputs MCP tools available; successfully pushed 16 benchmark files blocked from iters 83–85.

### Iters 83–85 — ⚠️ Error: safeoutputs MCP unavailable. 8 pairs each created locally; all pushes blocked.

### Iteration 81 — 2026-04-14 22:47 UTC — ⚠️ Error: 8 pairs local (commit 3c4abe0), push blocked.

### Iteration 80 — 2026-04-14 22:17 UTC — ⚠️ Error: 18 pairs local (commit e5e32a8), push blocked (GitHub auth expired).

### Iteration 79 — 2026-04-14 21:19 UTC — ⚠️ Error: push_to_pull_request_branch not callable (4th consecutive).

### Iters 76–78 — ⚠️ Error: safeoutputs MCP unavailable. 8 pairs each (259 total from 251); local commits lost.

### Iteration 75 — 2026-04-14 18:53 UTC — ✅ metric=265 (+6) | +6: str_startswith_endswith, str_match, str_join, str_cat, dt_normalize, dt_quarter_month | Commit: d95af07

### Iteration 74 — 2026-04-14 18:27 UTC — ✅ metric=259 (+3) | +8: countna, series_str_replace, index_slice_take, index_drop_duplicates, groupby_get_group, str_strip, str_pad, dt_floor_ceil | Commit: 18927bf

### Iteration 73 — 2026-04-14 17:55 UTC — ✅ metric=256 (+5) | +5: index_slice_take, index_drop_duplicates, countna, series_str_replace, groupby_get_group | Commit: e5fa59b

### Iteration 72 — 2026-04-14 17:35 UTC — ✅ metric=251 (+5) | +17 various ewm/expanding/groupby/merge/str/dt ops | Commit: 3059488

### Iters 57–71 — 2026-04-14 (all ✅ accepted, metrics 157→246): Rebuilt from 3c596789 branch; added ewm/expanding/groupby/merge/str/dt ops.

### Iters 46–56 — 2026-04-13/14 (all ✅ accepted, metrics 34→150): Steady accumulation; recovery pipeline established.

### Iters 25–45 — 2026-04-13 (all ✅ accepted, metrics progressively increasing to 33): Baseline resets to 22 after each merge; best-ever was 239 before resets.
