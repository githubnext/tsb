# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T18:47:32Z |
| Iteration Count | 33 |
| Best Metric | 38 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-frequency-cut-33-e855a3b78c5d1965` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration-frequency-cut-33-e855a3b78c5d1965`

---

## 🎯 Current Priorities

Iter 33 complete (valueCounts/crosstab + cut/qcut, 38 files). Next candidates:
- `apply` / `applyMap` standalone module (+1 file)
- `get_dummies` one-hot encoding (+1 file, lost in iter 31)
- `to_datetime` / `to_timedelta` parsing (+1-2 files, lost in iters 29-31)
- To beat best_metric=38, need at least 2 new files per iteration (to reach 40+).

**IMPORTANT**: Best branch is `autoloop/build-tsb-pandas-typescript-migration-frequency-cut-33-e855a3b78c5d1965`. If inaccessible, fall back to `origin/autoloop/build-tsb-pandas-typescript-migration-datetime-tz-25-01ffe236087c7f0a` (36 files).

---

## 📚 Lessons Learned

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

✅ Done through Iter 33: Foundation, Index/Dtype/Series/DataFrame, GroupBy, concat, merge, ops, strings, missing, datetime, sort, indexing, compare, reshape, window, I/O, stats, categorical, MultiIndex, Timedelta, IntervalIndex, CategoricalIndex, DatetimeIndex, valueCounts/crosstab, cut/qcut.

**Next**: apply/applyMap · get_dummies · to_datetime/to_timedelta · read_parquet · plotting

---

## 📊 Iteration History

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
