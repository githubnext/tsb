# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T19:14:40Z |
| Iteration Count | 34 |
| Best Metric | 40 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-apply-dummies-34-0331b27` |
| PR | — |
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
**Branch**: `autoloop/build-tsb-pandas-typescript-migration-apply-dummies-34-0331b27`

---

## 🎯 Current Priorities

Iter 34 complete (applyMap/pipe + valueCounts/crosstab + cut/qcut + getDummies/fromDummies, 40 files).
Branch: `autoloop/build-tsb-pandas-typescript-migration-apply-dummies-34-0331b27` (40 files).

Next candidates to beat 40 (need 2+ new files):
- `to_datetime` / `to_timedelta` parsing (+2 files — re-implement, previously lost in branch divergence)
- `read_parquet` / `read_excel` I/O (+1-2 files)
- `Series.plot` / `DataFrame.plot` (stub for plotting integration, +1 file)
- `pivot_wider` / pivot helpers (+1 file)

**IMPORTANT**: Best branch is `autoloop/build-tsb-pandas-typescript-migration-apply-dummies-34-0331b27` (40 files). If inaccessible, fall back to `origin/autoloop/build-tsb-pandas-typescript-migration-datetime-tz-25-01ffe236087c7f0a` (36 files).

---

## 📚 Lessons Learned

- **apply.ts (Iter 34)**: `Series<T>` generic causes type inference issues in pipe tests — use `Series<Scalar>` explicit type. `cutToIntervals` must return `Array<Interval|null>` not `Series<Interval|null>` since Interval extends beyond Scalar constraint.
- **get_dummies.ts (Iter 34)**: `encodeDummiesDataFrame` helper needed to avoid CC>15 in main `getDummies` function. Use `Set<string>` for O(1) column lookup.
- **frequency.ts (Iter 34)**: Same pattern as Iter 33 but built on datetime-tz-25 base. `CrosstabNormalize = "all"|"index"|"columns"|false` confirmed.
- **General**: `exactOptionalPropertyTypes`: use `?? null`. `noUncheckedIndexedAccess`: guard array accesses. CC≤15: extract helpers. `useTopLevelRegex`: move regex to top. `useNumberNamespace`: `Number.NaN`. `import fc from "fast-check"` (default). `useForOf` requires for-of not for-let-i.
- **Imports**: import from `../../src/index.ts` (tests), barrel `../core/index.ts` (src). `import type` for type-only. `useDefaultSwitchClause`: default: in every switch.
- **Build env**: bun not available — use `npm install` then `node_modules/.bin/biome` / `node_modules/.bin/tsc`. Pre-existing TS errors in window/io/tests — only validate new files have 0 errors.
- **frequency.ts (Iter 33)**: Refactor buildCells into accumulateCell+finalizeAcc (CC≤15). Extract collectUniqueKeys, addMargins, buildDataFrame, applyNormalization from crosstab. `CrosstabNormalize = "all"|"index"|"columns"|false` — no `|true` (causes TS2367).
- **cut.ts (Iter 33)**: Move regex to top-level (`TRIM_ZEROS_RE`). `Scalar[]` not `Array<Scalar>`. `unique.at(-1)` not `unique[unique.length-1]`.
- **DatetimeIndex (Iter 25)**: `Date` not a `Label` — implement as standalone class, not extending `Index<T>`. Timezone via `Intl.DateTimeFormat.formatToParts`. applyPart helper for CC≤15.
- **to_datetime (Iter 29)**: Extract `onParseError`+`parseStringVal` from coerceOne. strptime via `buildStrptimeRegex`+capture list. `DIRECTIVE_RE = /%[YymdHIMSfp%]/g` at top. `resolveHour12` helper.
- **Merge (Iter 10)**: composite keys use `\x00`+`__NULL__` for nulls; sentinel `-1` = right-only row.
- **Branch strategy**: Branches are per-run; old branches get lost. State best_metric may exceed what any single remote branch shows. Always build from most recent accessible branch.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

✅ Done through Iter 34: Foundation, Index/Dtype/Series/DataFrame, GroupBy, concat, merge, ops, strings, missing, datetime, sort, indexing, compare, reshape, window, I/O, stats, categorical, MultiIndex, Timedelta, IntervalIndex, CategoricalIndex, DatetimeIndex, valueCounts/crosstab, cut/qcut, applyMap/pipe, getDummies/fromDummies.

**Next**: to_datetime/to_timedelta (re-port, +2 files) · read_parquet (+1 file) · Series.plot stub · additional window functions

---

## 📊 Iteration History

### Iteration 34 — 2026-04-04 19:14 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23985700746)

- **Status**: ✅ Accepted
- **Change**: `src/core/apply.ts` (applyMap/applyMapFrame/applyFrame/pipe) + `src/stats/frequency.ts` (valueCounts/crosstab) + `src/transform/cut.ts` (cut/qcut) + `src/transform/get_dummies.ts` (getDummies/fromDummies). 4 test files, 3 playground pages.
- **Metric**: 40 (prev: 38, delta: **+2**) · **Commit**: 4e793db
- **Notes**: Built on datetime-tz-25 base (36 files). Recovered from branch divergence. cutToIntervals returns `Array<Interval|null>` not Series due to Scalar constraint. `pipe` tests need explicit `Series<Scalar>` typing.

### Iteration 33 — 2026-04-04 18:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23985243056)

- **Status**: ✅ Accepted
- **Change**: `src/stats/frequency.ts` (valueCounts+crosstab) + `src/transform/cut.ts` (cut+qcut). 30+ tests, 2 playground pages.
- **Metric**: 38 (prev: 37, delta: +1) · **Commit**: 3c7bc5e

### Iteration 32 — 2026-04-04 18:11 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23984617988)

- **Status**: ✅ Accepted (branch lost)
- **Change**: `src/stats/frequency.ts` — valueCounts+crosstab. Metric: 37. Commit: 8192426 (lost)

### Iteration 31 — 2026-04-04 17:44 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23984162858)

- **Status**: ✅ Accepted (branch lost)
- **Change**: cut.ts + get_dummies.ts + to_datetime.ts + to_timedelta.ts. Metric: 40. Commit: 82bb36a (lost)

### Iterations 1–30 (summary)
Iter 30 ✅ to_datetime/to_timedelta re-impl · Iter 29 ✅ to_timedelta/TimedeltaIndex · Iter 25 ✅ DatetimeIndex (36) · Iter 24 ✅ CategoricalIndex (35) · Iter 23 ✅ IntervalIndex (34) · Iter 22 ✅ Timedelta (33) · Iter 21 ✅ MultiIndex (32) · Iter 20 ✅ Categorical (31) · Iter 19 ✅ stats (30) · Iter 18 ✅ I/O (26) · Iter 17 ✅ window (22) · Iter 16 ✅ reshape (19) · Iter 15 ✅ compare (16) · Iter 14 ✅ indexing (15) · Iter 13 ✅ sort (14) · Iter 12 ✅ datetime.ts (13) · Iter 11 ✅ missing (12) · Iter 10 ✅ merge (11) · Iter 9 ✅ strings (10) · Iter 8 ✅ ops (9) · Iter 7 ✅ concat (8) · Iter 6 ✅ GroupBy (7) · Iter 5 ✅ DataFrame (6) · Iter 3 ✅ Dtype+Series (5) · Iter 2 ✅ Index+Dtype (4) · Iter 1 ✅ Foundation (1)
