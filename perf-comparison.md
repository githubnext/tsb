# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-17T19:34:57Z |
| Iteration Count | 358 |
| Best Metric | 686 |
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
- **Python docstrings**: Escaped quotes (`\"\"\"`) fail `py_compile` — use real triple-quotes. Two pre-existing broken files (`bench_str_extract_all.py`, `bench_str_extract_groups.py`) fixed in iter 358.
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

### Iteration 358 — 2026-06-17 19:34 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27714531890)
- **Status**: ✅ Accepted
- **Change**: Add 11 pairs: sort_values/df/multi/na, add_prefix_suffix/series, set_axis, series_to_frame, first_valid_index, series_markdown, to_latex; fix 2 broken Python docstrings
- **Metric**: 686 (prev: 685, delta: +1; canonical 675→686)
- **Commit**: 6d8b925

### Iters 345–357 — ✅ (675→685): resample/markdown/latex variants; suffix branch issues resolved in 357. Canonical was 675 until iter 358.

### Iters 1–344 — ✅ (0→675): Full benchmark suite covering all pandas functions.
