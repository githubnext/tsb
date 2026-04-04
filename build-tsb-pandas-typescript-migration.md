# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T15:44:00Z |
| Iteration Count | 27 |
| Best Metric | 37 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-to-timedelta-27` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration-to-timedelta-27`](../../tree/autoloop/build-tsb-pandas-typescript-migration-to-timedelta-27)
**Pull Request**: —
**Steering Issue**: —

---

## 🎯 Current Priorities

Iterations 12–27 all complete. Next: `read_parquet` (Parquet I/O via pure TS) or `plotting` module.
- ✅ Done through Iter 27: datetime, sort, indexing, compare, reshape, window, I/O, stats, categorical, MultiIndex, Timedelta, IntervalIndex, CategoricalIndex, DatetimeIndex, to_datetime, to_timedelta.

---

## 📚 Lessons Learned

- **General**: `exactOptionalPropertyTypes`: use `?? null` not undefined. `noUncheckedIndexedAccess`: guard array accesses. Complexity ≤15: extract helpers. `useBlockStatements`: braces everywhere. `useTopLevelRegex`: move regex to top level. `useNumberNamespace`: `Number.NaN`. `import fc from "fast-check"` (default import). `biome check --write --unsafe` auto-fixes Array<T>→T[].
- **Imports**: `useImportRestrictions` — import from barrel `../core/index.ts` not direct files. `import type` for type-only imports. Circular ESM deps (strings/datetime/categorical) are fine.
- **Build env**: `bun` not available — use `node_modules/.bin/biome` and `node_modules/.bin/tsc`. Pre-existing TS errors in window/io/tests — only validate new file has 0 errors. `create_pull_request` safeoutputs tool fails with "no commits found" — seems to require unstaged changes rather than pre-committed branches.
- **to_timedelta** (Iter 27): `Timedelta` class has `days`/`seconds`/`microseconds`/`milliseconds` components but NOT `hours` or `minutes` — derive via `floorMod(ms, 86_400_000) / 3_600_000` and `floorMod(ms, 3_600_000) / 60_000`. Use `td.sub(other)` not `td.subtract(other)`. ISO 8601 duration regex at top-level. `floorMod = ((a%b)+b)%b` needed for Python-style non-negative modulo.
- **to_datetime** (Iter 26): Sequential char-scanner strptime cleaner than regex-building. Extract helper functions for CC≤15. All regex at top level. Function overloads for scalar/array return types. `DatetimeIndex` constructor accepts `DateLike|null|undefined` directly. `create_pull_request` tool fails ("no commits found") when branch is pre-committed but not pushed.
- **DatetimeIndex** (Iter 25): `Date` is not a `Label` (Label = number|string|boolean|null), so `DatetimeIndex` cannot extend `Index<T>`. Implement as standalone class with own `_values: readonly Date[]` and Index-like interface. Timezone handling via `Intl.DateTimeFormat.formatToParts` works without dependencies but `applyPart` helper must be split from `applyParts` to keep cognitive complexity ≤15.
- **CategoricalIndex** (Iter 24): Extends `Index<Label>` via `super(cat.toArray(), name)`. `fromCategorical` factory. Monotonicity uses category-position codes when `ordered=true`. Direct import from `./categorical.ts` avoids circular dep.
- **IntervalIndex** (Iter 23): Standalone numeric type. `intervalsOverlap` helper. `resolveRangeParams` extractor. `maskContains`/`maskOverlaps` for vectorized ops.
- **Timedelta** (Iter 22): Store as ms integer. `floorDiv`/`floorMod` helpers. `Timedelta` NOT in `Scalar` type. Two top-level regex (PANDAS_RE + UNIT_RE).
- **MultiIndex** (Iter 21): levels+codes compressed storage. Complexity extractors. Avoid `toFrame()` (circular dep); use `toRecord()`.
- **Stats** (Iter 19): skew/kurtosis use sample std (ddof=1).
- **Merge** (Iter 10): composite keys use `\x00`+`__NULL__` for nulls; sentinel `-1` = right-only row.

---

## 🔭 Future Directions

### Phase 1 — Core Foundation ✅ Done
Index, Dtype, Series, DataFrame all implemented.

### Phase 2 — Operations ✅ Done
- ~~Arithmetic~~ ✅ (Iter 8) · ~~String accessor~~ ✅ (Iter 9) · ~~DateTime accessor~~ ✅ (Iter 12)
- ~~Missing data~~ ✅ (Iter 11) · ~~Groupby~~ ✅ (Iter 6) · ~~concat~~ ✅ (Iter 7) · ~~merge~~ ✅ (Iter 10)
- ~~Sorting utilities~~ ✅ (Iter 13) · ~~Indexing/selection~~ ✅ (Iter 14) · ~~Comparison/boolean ops~~ ✅ (Iter 15) · ~~Reshaping~~ ✅ (Iter 16) · ~~Window functions~~ ✅ (Iter 17)
- ~~**I/O utilities**~~ ✅ (Iter 18) · ~~**Statistical functions**~~ ✅ (Iter 19) · ~~**Categorical data**~~ ✅ (Iter 20)
- ~~**MultiIndex**~~ ✅ (Iter 21)
- ~~**Timedelta**~~ ✅ (Iter 22)
- ~~**IntervalIndex**~~ ✅ (Iter 23)
- ~~**CategoricalIndex**~~ ✅ (Iter 24)
- ~~**DatetimeIndex / DatetimeTZDtype**~~ ✅ (Iter 25)
- ~~**to_datetime / strptime**~~ ✅ (Iter 26)
- ~~**to_timedelta / TimedeltaIndex**~~ ✅ (Iter 27)

### Phase 3+ — Advanced
**Next**: `read_parquet` (binary Parquet I/O via pure TS), or `plotting` module (Vega/Canvas-based charting).

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 27 — 2026-04-04 15:44 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23982120680)

- **Status**: ✅ Accepted
- **Change**: `src/core/to_timedelta.ts` — `to_timedelta()` (scalar→Timedelta / array→TimedeltaIndex; pandas-style/ISO 8601/unit-style strings; numeric with unit ns/us/ms/s/min/h/D/W; errors:raise/coerce/ignore) + `TimedeltaIndex` (days/hours/minutes/seconds/ms accessors; min/max/sum/mean; sort/unique/contains; add/subtract/shift; strformat ISO 8601)
- **Metric**: 37 (previous actual: 36, delta: +1) · **Commit**: c80c718
- **Notes**: ISO 8601 duration parser (regex-based), floorMod helper for hour/minute component extraction. Function overloads for correct scalar/array return types. create_pull_request tool fails when branch is pre-committed (same issue as prior runs).

### Iteration 26 — 2026-04-04 15:10 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23981537369)

- **Status**: ✅ Accepted
- **Change**: `src/core/to_datetime.ts` — `to_datetime()` (scalar→Date / array→DatetimeIndex), `strptime()` (format directives %Y %y %m %d %H %M %S %f %z %%), `parseDatetime()`. Options: ISO auto-detect, numeric units (ns/us/ms/s/m/min/h/D), origins (unix/julian/Date), dayfirst/yearfirst, utc/tz, errors:raise/coerce.
- **Metric**: 37 (previous best: 36, delta: +1) · **Commit**: c26aaf2
- **Notes**: Sequential char-scanner strptime cleaner than regex-building. Function overloads give correct scalar/array return types. `create_pull_request` tool failed this run — commits on branch but no remote PR created.

### Iteration 25 — 2026-04-04 14:45 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23981104668)

- **Status**: ✅ Accepted
- **Change**: `src/core/datetime-index.ts` — `DatetimeIndex` (standalone class with Date[] storage, IANA timezone support via Intl API; component accessors; strftime; floor/ceil/round; shift; tz_localize/tz_convert) + `DatetimeTZDtype` + `date_range()` factory (fixed + calendar freqs)
- **Metric**: 36 (previous best: 35, delta: +1) · **Commit**: 9bdd0f5
- **Notes**: DatetimeIndex cannot extend `Index<T>` since Date is not a Label type; standalone class avoids the constraint. Intl API handles timezone offseting without dependencies. 70+ tests pass biome/tsc clean.

- **Status**: ✅ Accepted
- **Change**: `src/core/categorical-index.ts` — `CategoricalIndex` (extends `Index<Label>`, backed by `Categorical`; categories/codes/ordered/dtype; full category mgmt API; monotonicity/sort by code-position when ordered; `fromCategorical` factory)
- **Metric**: 35 (previous best: 34, delta: +1) · **Commit**: e38efa8
- **Notes**: ~70 tests. Delegates to `Categorical` instance; monotonicity/sort uses integer codes. Direct import from `./categorical.ts` avoids circular dep.

### Iterations 19–23 (summary)
- Iter 23 ✅ IntervalIndex (34) · Iter 22 ✅ Timedelta (33) · Iter 21 ✅ MultiIndex (32)
- Iter 20 ✅ Categorical/CategoricalDtype/CategoricalAccessor/factorize (31) · Iter 19 ✅ stats: describe/corr/cov/skew/kurtosis (30)

### Iterations 1–18 (summary)
- Iter 18 ✅ I/O: readCsv/readJson/toCsv/toJson (26) · Iter 17 ✅ window: rolling/expanding/ewm (22) · Iter 16 ✅ reshape: pivot/melt/stack (19)
- Iter 15 ✅ compare.ts (16) · Iter 14 ✅ indexing.ts (15) · Iter 13 ✅ sort.ts (14)
- Iter 12 ✅ datetime.ts (13) · Iter 11 ✅ missing.ts (12) · Iter 10 ✅ merge (11) · Iter 9 ✅ strings.ts (10)
- Iter 8 ✅ ops.ts (9) · Iter 7 ✅ concat (8) · Iter 6 ✅ GroupBy (7) · Iter 5 ✅ DataFrame (6) · Iter 4 ⚠️ Error · Iter 3 ✅ Dtype+Series (5) · Iter 2 ✅ Index+Dtype (4) · Iter 1 ✅ Foundation (1)
