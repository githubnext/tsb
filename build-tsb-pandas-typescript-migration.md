# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-05T13:26:00Z |
| Iteration Count | 56 |
| Best Metric | 11 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #48 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration`
**Pull Request**: #48

---

## 🎯 Current Priorities

**Note**: The main branch was reset to 6 files (earlier branches were not merged). Iter 53 re-establishes the new long-running branch `autoloop/build-tsb-pandas-typescript-migration` from main (6 files → 8). The branch history in the state file (iters 1–52) reflects previous diverged work.

Next candidates (continue building from the current 11-file baseline):
- `src/stats/describe.ts` — describe() with percentiles
- `src/io/json.ts` — read_json / to_json
- `src/io/csv.ts` — add readCsv/toCsv
- `src/core/cat_accessor.ts` — Series.cat categorical accessor

---

## 📚 Lessons Learned

- **Iter 56 (datetime_accessor, 10→11)**: `DatetimeSeriesLike` same pattern as `StringSeriesLike` — include `dt` and `toArray()`. Split `expandDirective` → `expandDatePart + expandTimePart` for CC≤15. `unitMs` needs `default` clause. Format helpers need single-line signatures. Tests import from `src/index.ts` not `src/core/index.ts`. Prefix unused param with `_`.
- **Iter 55 (string_accessor, 9→10)**: `StringSeriesLike` must include `str` and `toArray()`. Top-level regex (Biome). Extract sub-functions for CC≤15. Use `charAt(0)` not `s[0]!`.
- **Iter 54 (GroupBy+CSV, 6→8)**: Biome `useImportRestrictions` requires barrel files. `splitLine` → `stepInsideQuote`. `readCsv` → extract 3 helpers.
- **Iters 45–52 (old branches)**: See previous notes. `exactOptionalPropertyTypes`: `?? null`. `noUncheckedIndexedAccess`: guard `arr[i]`. CC≤15: extract helpers. `useTopLevelRegex`. `useNumberNamespace: Number.NaN`. `import fc from "fast-check"` (default). `useForOf`. `import type` for type-only. Row ordering in join results — sort before asserting.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**New branch (iter 53–56)**: 11 files — Series, DataFrame, GroupBy, concat, merge, str accessor, dt accessor.

**Next**: stats/describe · json I/O · cat accessor · resample · io/csv

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 56 — 2026-04-05 13:26 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24002454105)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/datetime_accessor.ts` — `Series.dt` accessor mirroring pandas `DatetimeProperties`. Calendar components (year/month/day/hour/minute/second/ms/dayofweek/dayofyear/quarter/days_in_month), boolean boundaries (is_month_start/end/is_quarter_start/end/is_year_start/end/is_leap_year), strftime() with 25+ directives, normalize()/date(), floor/ceil/round (D/H/T/S/ms), total_seconds(). All null-propagating.
- **Metric**: 11 (previous: 10, delta: +1)
- **Commit**: 01a2b7d
- **Notes**: Split `expandDirective` into `expandDatePart + expandTimePart` to satisfy CC≤15. `unitMs` needs default clause. mapNum/mapBool/mapStr helpers need single-line signatures. Tests import from `src/index.ts` not `src/core/index.ts`.

### Iteration 55 — 2026-04-05 12:49 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24001823414)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/string_accessor.ts` — `Series.str` accessor with 35+ string methods. All null-propagating.
- **Metric**: 10 (previous: 9, delta: +1)
- **Commit**: 5f42c0c

### Iteration 54 — 2026-04-05 12:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24001239424)

- **Status**: ✅ Accepted
- **Change**: Added `src/merge/merge.ts` — full `merge()` with inner/left/right/outer joins.
- **Metric**: 9 (previous: 8, delta: +1)
- **Commit**: d61b790

### Iteration 53 — 2026-04-05 11:43 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24000770925)

- **Status**: ✅ Accepted
- **Change**: New branch from main. Added GroupBy + CSV I/O. Barrel files for import restrictions.
- **Metric**: 8 (previous: 6 on main, delta: +2)
- **Commit**: 9e9045b

### Iterations 46–52 — ✅ (old branches, not merged to main)
### Iterations 1–45 — ✅ Foundation through eval/query/resample (old branches)

