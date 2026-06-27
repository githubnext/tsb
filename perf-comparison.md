# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-27T19:00:00Z |
| Iteration Count | 377 |
| Best Metric | 720 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | (new, created iter 377) |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better) · **Issue**: #221 · **PR**: new PR created iter 377

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Import paths**: Always `../../src/index.ts` (not `.js`).
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **merge_asof**: `mergeAsof(left, right, { on, direction })` — DFs must be sorted.
- **corrWith**: `corrWith(df, seriesOther)` — DF as first arg, returns Series per column.
- **Python docstrings**: Use real triple-quotes (escaped quotes fail py_compile).
- **Resample frequencies**: Use "H", "D", "MS", "QS", "YS" — NOT "1h".
- **Series constructor**: `new Series({ data: Array.from(arr), index: idx })`. DataFrame.fromColumns index: `{ index: idx }`.
- **Evaluation**: bun validates TS; py_compile validates PY; metric = min(TS count, PY count).

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- Option-variant benchmarks (axis/limit/method parameters)
- join/crossJoin with overlapping columns using suffixes

---

## 📊 Iteration History

### Iters 363–377 — ✅ (675→720): 363: merge_asof/cross_join/join_all; 364: shift_diff/sort_ops/pow_mod; 365: at_iat/filter_series/truncate_df; 366: convert_dtypes/series_format_table/str_findall_expand; 367: numeric_ops_log2_exp/dataframe_transform_named/series_compare_pair; 368: get_set_option/xs_series/dataframe_update; 369: series_to_markdown/dataframe_compare_pair/resample_dataframe; 370: autocorr/window_indexers/series_dot_dataframe; 371: series_setaxis_toframe/item_bool_extract/option_context; 372: to_latex/styler_format/styler_highlight_adv; 373: styler_table_props/errors/extensions; 374: dataframe_itertuples/series_items_iter/nanprod; 375: resample_ohlc/resample_first_last/resample_std_var_size; 376: iterrows/items/from_records (lost on merge, recovered); 377: iterrows/items/from_records + groupby_sum_many_groups/concat_many_frames/str_replace_regex (+6, now 720).
