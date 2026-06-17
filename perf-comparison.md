# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-17T01:40:43Z |
| Iteration Count | 357 |
| Best Metric | 685 |
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

- **Import paths**: Always `../../src/index.ts`; older files use `.js` — must be `.ts` for bun build.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **merge_asof**: `mergeAsof(left, right, { on, direction })` — DFs must be sorted.
- **corrWith**: `corrWith(df, seriesOther)` — DF as first arg, returns Series per column.
- **Python docstrings**: Escaped quotes (`\"\"\"`) fail `py_compile` — use real triple-quotes.
- **bun build browser**: `node:zlib` polyfill lacks `inflateRawSync`; `bench_read_excel.ts` must be self-contained (inline ZIP/XML, no zlib).
- **Function naming**: mask/where are operation-first: `maskSeries`, `maskDataFrame`, `whereSeries`, `whereDataFrame`.
- **Resample API**: Use `resampleSeries(s, "freq")` and `resampleDataFrame(df, "freq")` — Series/DataFrame do NOT have a `.resample()` method. The old bench_resample.ts uses `"tsb"` package import which bypasses type-check in bun build.
- **Resample frequencies**: Use base frequencies "H", "D", "MS", "QS", "YS" — NOT "1h" (numeric prefix not supported by binGroupKey switch).
- **Series constructor**: Use `new Series({ data: Array.from(arr), index: idx })` — NOT `new Series(arr, { index })`. The constructor takes a single SeriesOptions object.
- **seriesToMarkdown/seriesToLaTeX**: Exported from `../../src/index.ts` (format_table.ts). Accepts `Series<Scalar>` and `ToMarkdownOptions`/`ToLaTeXOptions`.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- Option-variant benchmarks (axis/limit/method parameters)

---

## 📊 Iteration History

### Iteration 357 — 2026-06-17 01:40 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27659958413)
- **Status**: ✅ Accepted
- **Change**: Add 10 benchmark pairs: resample_ohlc, resample_series_agg, resample_df, resample_df_agg, resample_quarterly, series_markdown_latex, to_markdown_options, to_latex_options, resample_series_size_min_max, resample_df_std_var
- **Metric**: 685 (canonical branch: 675→685, delta: +10)
- **Commit**: 81ff7c0
- **Notes**: Rebased canonical branch (ahead=4/behind=5 divergence), then added 10 new resample and markdown/latex benchmark pairs. All use `../../src/index.ts` import. Uses `resampleSeries`/`resampleDataFrame` function API with "H"/"MS"/"QS" frequency strings. Python files validated with py_compile.

### Iteration 356 — 2026-06-16 14:31 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27624921642)
- **Status**: ✅ Accepted
- **Change**: Add 10 benchmark pairs: series_markdown_latex, resample_ohlc, resample_series_agg, resample_df, resample_df_agg, resample_quarterly, to_markdown_options, to_latex_options, resample_series_size_min_max, resample_df_std_var
- **Metric**: 685 (prev canonical: 675, delta: +10; note: state claimed 683 from suffix branches)
- **Commit**: 3997934 (on suffix branch — not on canonical; canonical corrected in iter 357)

### Iters 345–355 — ✅ (canonical 675, suffix branches claimed 683): These were pushed to wrong branches due to tooling issue.

### Iteration 355 — 2026-06-16 — [Run](https://github.com/githubnext/tsb/actions/runs/27588373544)
- **Status**: ✅ Accepted (suffix branch — not on canonical)
- **Change**: Add 8 benchmark pairs: autocorr, series_markdown_latex, resample_ohlc/df/series_sum/df_sum/df_agg/quarterly
- **Metric**: 683 (prev: 680, delta: +3); commit becb6f3 (on suffix branch only)

### Iters 345–354 — ✅ (675→680): resample variants, join/crossJoin, mask/where fixes.

### Iters 1–344 — ✅ (0→675): Full benchmark suite covering all pandas functions.
