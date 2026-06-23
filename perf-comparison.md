# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-22T17:30:00Z |
| Iteration Count | 368 |
| Best Metric | 693 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #328 |
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
**Metric**: benchmarked_functions (higher is better) · **Issue**: #221 · **PR**: #328

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
- **bun build**: `node:zlib` lacks `inflateRawSync`; bench_read_excel must be self-contained.
- **Function naming**: operation-first: `maskSeries`, `maskDataFrame`, `whereSeries`, `whereDataFrame`, `resampleSeries`, `resampleDataFrame`.
- **Resample frequencies**: Use "H", "D", "MS", "QS", "YS" — NOT "1h".
- **Series constructor**: `new Series({ data: Array.from(arr), index: idx })`.
- **Nullable Series**: `Series<Scalar>` when mixing numbers/nulls.
- **Branch baseline**: Iters 343–362 were phantom; real baseline 675 (iters 321/330/342). Iter 363 = first real commit.
- **DataFrame.fromColumns index**: Pass via `{ index: idx }` options object.
- **Bun unavailable in sandbox**: Evaluation returns null; acceptance based on file count.
- **crossJoin**: Columns must not overlap unless lsuffix/rsuffix provided.
- **joinAll**: `joinAll(left, others[], options?)` — sequential index joins.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- Option-variant benchmarks (axis/limit/method parameters)
- join/crossJoin with overlapping columns using suffixes

---

## 📊 Iteration History

### Iteration 368 — 2026-06-22 17:30 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27995840443)
- **Status**: ✅ Accepted
- **Change**: Add 3 pairs: get_set_option (getOption/setOption/resetOption), xs_series (xsSeries flat + MultiIndex), dataframe_update (dataFrameUpdate).
- **Metric**: 693 (previous best: 690, delta: +3)

### Iteration 367 — 2026-06-22 05:30 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27961138526)
- **Status**: ✅ Accepted
- **Change**: Add 3 pairs: numeric_ops_log2_exp (seriesLog2/Log10/Exp/Sign + DataFrame variants), dataframe_transform_named (dataFrameTransform with "mean"/"cumsum"/["sum","mean"]), series_compare_pair (seriesNe/Gt/Le/Eq Series-to-Series).
- **Metric**: 690 (previous best: 687, delta: +3)

### Iters 363–367 — ✅ (675→690): 363: merge_asof/cross_join/join_all; 364: shift_diff/sort_ops/pow_mod; 365: at_iat/filter_series/truncate_df; 366: convert_dtypes/series_format_table/str_findall_expand; 367: numeric_ops_log2_exp/dataframe_transform_named/series_compare_pair.
