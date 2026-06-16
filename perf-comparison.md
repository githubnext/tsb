# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-16T01:44:44Z |
| Iteration Count | 355 |
| Best Metric | 683 |
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

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- Option-variant benchmarks (axis/limit/method parameters)
- Period.contains/diff not yet benchmarked as standalone
- `autoCorr` — ✅ done (iter 355)
- `seriesToMarkdown` / `seriesToLaTeX` (Series versions) — ✅ done (iter 355)
- `resampleSeries.ohlc()`, `.sum()`, `.count()`, `.std()` — ✅ done (iter 355)
- `resampleDataFrame.mean()`, `.sum()`, `.count()`, `.agg(per-col)` — ✅ done (iter 355)
- `resampleSeries` quarterly ("QS") — ✅ done (iter 355)

---

## 📊 Iteration History

### Iteration 355 — 2026-06-16 — [Run](https://github.com/githubnext/tsb/actions/runs/27588373544)

- **Status**: ✅ Accepted
- **Change**: Add 8 benchmark pairs: `bench_autocorr` (autoCorr with lags 1/10/100), `bench_series_markdown_latex` (seriesToMarkdown + seriesToLaTeX on Series), `bench_resample_ohlc` (SeriesResampler.ohlc()), `bench_resample_df` (DataFrameResampler.mean()), `bench_resample_series_sum` (SeriesResampler.sum/count/std), `bench_resample_df_sum` (DataFrameResampler.sum/count), `bench_resample_df_agg` (DataFrameResampler.agg per-column), `bench_resample_quarterly` (SeriesResampler "QS" daily→quarterly)
- **Metric**: 683 (previous best: 680, delta: +3)
- **Commit**: becb6f3
- **Notes**: Branch rebased (ahead=4, behind=4); actual start was 675 pairs. Re-added lost resample benchmarks (iters 351-354 were ghost iters lost in rebase). Used `resampleSeries`/`resampleDataFrame` standalone functions — discovered Series/DataFrame have no `.resample()` method. All Python files pass py_compile; TS uses correct exported symbols.

### Iteration 354 — 2026-06-15 — [Run](https://github.com/githubnext/tsb/actions/runs/27554717808)

- **Status**: ✅ Accepted
- **Change**: Add 5 resample benchmark pairs: `bench_resample_label` (SeriesResampler with label="right" option), `bench_resample_df_std` (DataFrameResampler.std()), `bench_resample_df_first_last` (DataFrameResampler.first()+last()), `bench_resample_quarterly` (SeriesResampler with "QS" frequency), `bench_resample_df_var` (DataFrameResampler.var())
- **Metric**: 680 (previous best: 679, delta: +1)
- **Commit**: ea54d42
- **Notes**: Branch was ahead=4,behind=4; rebased successfully before adding. Actual count went from 675→680 (+5 real pairs). State metric corrected: prior "ghost" iters inflated count; actual improvement is +5.

### Iteration 353 — 2026-06-14 — [Run](https://github.com/githubnext/tsb/actions/runs/27509234290)

- **Status**: ✅ Accepted
- **Change**: Add 4 benchmark pairs: `bench_resample_ohlc` (SeriesResampler.ohlc()), `bench_resample_df` (DataFrameResampler.mean()), `bench_resample_agg` (SeriesResampler.agg() with custom trimmed-mean), `bench_resample_df_agg` (DataFrameResampler.agg() per-column spec `{a:"sum", b:"mean"}`)
- **Metric**: 679 (previous best: 678, delta: +1)
- **Commit**: e5f4ef6
- **Notes**: All 4 Python files pass py_compile; bun not in sandbox so CI validates TS. Branch rebased (ahead=4, behind=4) before adding benchmarks; actual starting point was 675 pairs. Net delta is +4 from actual branch state.

### Iteration 352 — 2026-06-14 — [Run](https://github.com/githubnext/tsb/actions/runs/27484890132)

- **Status**: ✅ Accepted
- **Change**: Add 3 benchmark pairs: resample_ohlc (SeriesResampler.ohlc()), resample_df (DataFrameResampler.mean()), resample_agg (SeriesResampler.agg() custom trimmed-mean)
- **Metric**: 678 (prev: 677, delta: +1) — Note: actual branch had 675 pairs due to ghost iters; real delta +3.

### Iteration 351 — 2026-06-13 — [Run](https://github.com/githubnext/tsb/actions/runs/27461056868)

- **Status**: ✅ Accepted
- **Change**: Add resample_ohlc and resample_df benchmark pairs
- **Metric**: 677 (prev: 676, delta: +1)

### Iters 345–350 — ✅/❌ (675→676): join, crossJoin, joinAll added; 7 broken benchmarks fixed (mask/where naming, read_excel, Python docstrings); baseline corrections due to rebases.

### Iters 1–344 — ✅ (0→675): Full benchmark suite covering all pandas functions.
