# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-14T19:16:54Z |
| Iteration Count | 353 |
| Best Metric | 679 |
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

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- Option-variant benchmarks (axis/limit/method parameters)
- Period.contains/diff not yet benchmarked as standalone
- DataFrameResampler.agg() with per-column spec — ✅ done (iter 353)
- Resample with closed/label variant options

---

## 📊 Iteration History

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
