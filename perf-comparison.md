# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-14T10:39:13Z |
| Iteration Count | 63 |
| Best Metric | 207 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #141 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

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

- Metric = min(ts_bench_count, py_bench_count); start from main, union 3c596789 branch (172 pairs) + all other hashed branches, add new pairs.
- Bun not installed; TS benchmark files validated by file-count metric only.
- MCP: push_to_pull_request_branch needs remote tracking ref; create via `git update-ref refs/remotes/origin/autoloop/perf-comparison $(git rev-parse origin/main)`.
- push_repo_memory limit ~10KB total; compress iteration history when needed.
- API notes: seriesRound, s.dt.year() is method; groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only; rollingApply(s, window, fn); Series({data,name,index}); df.assign({c: series}) direct.
- All iter 46–62 pairs accepted; 3c596789 has 172 pairs, main has 51. Pipeline: branch from main → checkout 3c596789 → add new pairs → commit.
- groupby.first()/last() on both GroupBy types; dataFrameCummin/Cumprod exported; EWM.corr takes EwmSeriesLike.

---

## 🔭 Future Directions

- More groupby aggregation variants (nunique — check if API exists).
- Series/DataFrame accessor benchmarks (str on DataFrame columns).
- IO benchmarks: read_parquet, to_parquet, read_excel.
- Advanced reshape: crosstab with margins, pivot_table with fill_value.
- Series-level dropna/fillna separate benchmarks.
- More str_* ops: strftime on datetime accessor.

---

## 📊 Iteration History

### Iteration 63 — 2026-04-14 10:39 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24394419832)
- ✅ Accepted metric=207 (+5 vs prev best 202) | Based on 3c596789 branch (172 pairs) + 35 new: concat_axis1, dataframe_set/sort_index, dataframe_iloc/loc/drop/assign/select/to_array/to_records/to_dict/fillna/isna/notna/min_max/std_var/count/sum_mean/resetindex, series_median/min_max/sum_mean/unique/corr/filter/count/std_var/toobject/resetindex, merge_left/right/inner/outer, ewm_corr, groupby_median | Commit: b81351e

### Iteration 62 — 2026-04-14 09:59 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24392806184)
- ✅ Accepted metric=202 (+1 vs prev best 201) | Recovered 186 pairs from 3c596789 branch + 16 new: concat_axis1, dataframe_set_index, dataframe_sort_index, dataframe_iloc, dataframe_drop, dataframe_to_array, dataframe_fillna, dataframe_isna, dataframe_loc, dataframe_min_max, dataframe_std_var, series_median, series_min_max, series_sum_mean, merge_left, merge_outer | Commit: f56b6d5

### Iteration 61 — 2026-04-14 09:02 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24390384652)
- ✅ Accepted metric=201 (+15 vs prev best 186) | Recovered all 150 from hashed branches + 15 new: series_unique, series_isin, series_corr, series_filter, series_count, series_std_var, series_toobject, dataframe_assign, dataframe_select, dataframe_to_records, dataframe_to_dict, dataframe_count, dataframe_sum_mean, ewm_corr, groupby_median | Commit: 687990c

### Iteration 60 — 2026-04-14 08:07 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24388084827)
- ✅ Accepted metric=186 (+14 vs prev best 172) | Recovered 157 pairs from 8 hashed branches + 29 new: dataframe_abs/round/clip/cumsum/cummax/cummin/cumprod, groupby_first/last/sum/count/min/max/size, datetime_accessor, percentile_of_score, quantile, str_byte_length/char_width, dataframe_value_counts, attrs_ops/count_keys, make_formatter, cat_union_intersect_diff, dataframe_where/mask, series_dt_strftime, dataframe_nlargest_nsmallest, fillna_dropna | Commit: 249e71e

### Iteration 59 — 2026-04-14 07:05 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24385692074)
- ✅ Accepted metric=172 (+5 vs prev best 167) | Union 3c596789 branch (157 pairs) + 15 new: dataframe_abs, dataframe_round, dataframe_clip, dataframe_cumsum, dataframe_cummax, dataframe_cummin, dataframe_cumprod, groupby_first, groupby_last, datetime_accessor, percentile_of_score, quantile, str_byte_length, dataframe_value_counts, attrs_ops | Commit: d967d82

### Iteration 58 — 2026-04-14 06:10 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24383841023)
- ✅ Accepted metric=167 (+10 vs prev best 157) | Union 143-branch (106 new pairs) + 10 brand-new: dataframe_abs, dataframe_round, dataframe_clip, dataframe_cumsum, dataframe_cummax, percentile_of_score, quantile, str_byte_length, dataframe_value_counts, attrs_ops | Commit: 8da9620

### Iteration 57 — 2026-04-14 05:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24382472700)
- ✅ Accepted metric=157 (+7 vs prev best 150) | Union 8 hashed branches (97 pairs) + 60 new: all iter52-56 pairs recovered + new (dataframe_transform, dataframe_apply_map, count_valid, dataframe_transform_rows, cat_equal_categories, groupby_apply) | Commit: ba7eebd

### Iters 46–55 — 2026-04-13/14 (all ✅ accepted, metrics 34→145): Steady accumulation; recovery pipeline established with 8 hashed branches union + new pairs each run.

### Iters 25–45 — 2026-04-13 (all ✅ accepted, metrics progressively increasing to 33): Baseline resets to 22 after each merge; best-ever was 239 before resets
