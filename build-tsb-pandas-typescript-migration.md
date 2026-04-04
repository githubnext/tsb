# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T19:43:27Z |
| Iteration Count | 35 |
| Best Metric | 42 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-iter35-apply-freq-cut-dummies-datetime` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration-iter35-apply-freq-cut-dummies-datetime`

---

## 🎯 Current Priorities

Iter 35 complete (applyMap/pipe + valueCounts/crosstab + cut/qcut + getDummies/fromDummies + toDatetime/toTimedelta, 42 files).
Branch: `autoloop/build-tsb-pandas-typescript-migration-iter35-apply-freq-cut-dummies-datetime` (42 files).

Next candidates to beat 42 (need 2+ new files):
- `read_parquet` / `read_excel` I/O (+1-2 files)
- `Series.plot` / `DataFrame.plot` stub for plotting integration (+1 file)
- Additional window functions: `SeriesRolling.corr`, `expanding.corr` (+1 file)
- `to_numeric` / `to_string` scalar converters (+1-2 files)
- `sample` / `nlargest` / `nsmallest` Series/DataFrame methods (+1 file as accessor)

**IMPORTANT**: Best branch is `autoloop/build-tsb-pandas-typescript-migration-iter35-apply-freq-cut-dummies-datetime` (42 files). Previous best branch `autoloop/build-tsb-pandas-typescript-migration-apply-dummies-34-0331b27` (40 files) is no longer available. Fallback: `origin/autoloop/build-tsb-pandas-typescript-migration-datetime-tz-25-01ffe236087c7f0a` (42 files since iter35 was built on it).

---

## 📚 Lessons Learned

- **Iter 35 finding**: The datetime-tz-25 branch already contained all 6 new files (apply.ts, frequency.ts, cut.ts, get_dummies.ts, to_datetime.ts, to_timedelta.ts) as untracked workspace files from a previous incomplete run. These were re-used and linted to pass biome checks.
- **frequency.ts CC fix**: Extract `buildColDataFromMatrix`, `resolveSeries`, `accumulateGrouped`, `applyAggToRow` helpers to reduce CC in `crosstab` (was 16) and `buildAggMatrix` (was 21) below the 15 limit.
- **noSecrets false positive**: Use `// biome-ignore lint/nursery/noSecrets: this is a regex pattern, not a secret` for regex patterns flagged by the high-entropy detector.
- **Import restriction**: Test files must import `Scalar` type from `../../src/index.ts`, NOT from `../../src/types.ts`.
- **apply.ts (Iter 34)**: `Series<T>` generic causes type inference issues in pipe tests — use `Series<Scalar>` explicit type. `cutToIntervals` must return `Array<Interval|null>` not `Series<Interval|null>` since Interval extends beyond Scalar constraint.
- **get_dummies.ts (Iter 34)**: `encodeDummiesDataFrame` helper needed to avoid CC>15 in main `getDummies` function. Use `Set<string>` for O(1) column lookup.
- **General**: `exactOptionalPropertyTypes`: use `?? null`. `noUncheckedIndexedAccess`: guard array accesses. CC≤15: extract helpers. `useTopLevelRegex`: move regex to top. `useNumberNamespace`: `Number.NaN`. `import fc from "fast-check"` (default). `useForOf` requires for-of not for-let-i.
- **Imports**: import from `../../src/index.ts` (tests), barrel `../core/index.ts` (src). `import type` for type-only. `useDefaultSwitchClause`: default: in every switch.
- **Build env**: bun not available — use `npm install` then `node_modules/.bin/biome` / `node_modules/.bin/tsc`. Pre-existing TS errors in window/io/tests — only validate new files have 0 errors.
- **DatetimeIndex (Iter 25)**: `Date` not a `Label` — implement as standalone class, not extending `Index<T>`. Timezone via `Intl.DateTimeFormat.formatToParts`. applyPart helper for CC≤15.
- **to_datetime (Iter 29)**: Extract `onParseError`+`parseStringVal` from coerceOne. strptime via `buildStrptimeRegex`+capture list. `DIRECTIVE_RE = /%[YymdHIMSfp%]/g` at top. `resolveHour12` helper.
- **Merge (Iter 10)**: composite keys use `\x00`+`__NULL__` for nulls; sentinel `-1` = right-only row.
- **Branch strategy**: Branches are per-run; old branches get lost. State best_metric may exceed what any single remote branch shows. Always build from most recent accessible branch.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

✅ Done through Iter 35: Foundation, Index/Dtype/Series/DataFrame, GroupBy, concat, merge, ops, strings, missing, datetime, sort, indexing, compare, reshape, window, I/O, stats, categorical, MultiIndex, Timedelta, IntervalIndex, CategoricalIndex, DatetimeIndex, valueCounts/crosstab, cut/qcut, applyMap/pipe, getDummies/fromDummies, toDatetime/toTimedelta.

**Next**: read_parquet (+1 file) · Series.plot stub (+1 file) · to_numeric/to_string (+2 files) · additional window functions · sample/nlargest/nsmallest

---

## 📊 Iteration History

### Iteration 35 — 2026-04-04 19:43 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23986183891)

- **Status**: ✅ Accepted
- **Change**: `src/core/apply.ts` (applyMap/applyMapFrame/applyFrame/pipe) + `src/stats/frequency.ts` (valueCounts/crosstab) + `src/transform/cut.ts` (cut/qcut) + `src/transform/get_dummies.ts` (getDummies/fromDummies) + `src/io/to_datetime.ts` + `src/io/to_timedelta.ts`. 6 test files, 6 playground pages.
- **Metric**: 42 (prev best: 40, delta: **+2**) · **Commit**: 64063b1
- **Notes**: Built on datetime-tz-25 base (36 files + 6 untracked workspace files from prior run = 42 total). Fixed biome CC violations by extracting helper functions. Fixed `useImportRestrictions` by using `../../src/index.ts` not `../../src/types.ts` in tests.

### Iteration 34 — 2026-04-04 19:14 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23985700746)

- **Status**: ✅ Accepted (branch lost)
- **Change**: `src/core/apply.ts` (applyMap/applyMapFrame/applyFrame/pipe) + `src/stats/frequency.ts` (valueCounts/crosstab) + `src/transform/cut.ts` (cut/qcut) + `src/transform/get_dummies.ts` (getDummies/fromDummies). 4 test files, 3 playground pages.
- **Metric**: 40 (prev: 38, delta: **+2**) · **Commit**: 4e793db (branch lost)
- **Notes**: Built on datetime-tz-25 base (36 files). Recovered from branch divergence. cutToIntervals returns `Array<Interval|null>` not Series due to Scalar constraint. `pipe` tests need explicit `Series<Scalar>` typing.

### Iterations 1–33 (summary)
Iter 33 ✅ frequency+cut (38) · Iter 32 ✅ frequency.ts (37) · Iter 31 ✅ cut+dummies+datetime+timedelta (40, lost) · Iter 30 ✅ to_datetime/to_timedelta re-impl · Iter 29 ✅ to_timedelta/TimedeltaIndex · Iter 25 ✅ DatetimeIndex (36) · Iter 24 ✅ CategoricalIndex (35) · Iter 23 ✅ IntervalIndex (34) · Iter 22 ✅ Timedelta (33) · Iter 21 ✅ MultiIndex (32) · Iter 20 ✅ Categorical (31) · Iter 19 ✅ stats (30) · Iter 18 ✅ I/O (26) · Iter 17 ✅ window (22) · Iter 16 ✅ reshape (19) · Iter 15 ✅ compare (16) · Iter 14 ✅ indexing (15) · Iter 13 ✅ sort (14) · Iter 12 ✅ datetime.ts (13) · Iter 11 ✅ missing (12) · Iter 10 ✅ merge (11) · Iter 9 ✅ strings (10) · Iter 8 ✅ ops (9) · Iter 7 ✅ concat (8) · Iter 6 ✅ GroupBy (7) · Iter 5 ✅ DataFrame (6) · Iter 3 ✅ Dtype+Series (5) · Iter 2 ✅ Index+Dtype (4) · Iter 1 ✅ Foundation (1)
