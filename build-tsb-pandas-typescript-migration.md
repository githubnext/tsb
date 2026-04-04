# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T14:13:00Z |
| Iteration Count | 24 |
| Best Metric | 35 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-categorical-index-24` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration-categorical-index-24`](../../tree/autoloop/build-tsb-pandas-typescript-migration-categorical-index-24)
**Pull Request**: —
**Steering Issue**: —

---

## 🎯 Current Priorities

MultiIndex done (metric=33). Next priorities:
1. ~~**DateTime accessor** (`src/core/datetime.ts`)~~ — ✅ Done (Iteration 12)
2. ~~**Sorting utilities** (`src/core/sort.ts`)~~ — ✅ Done (Iteration 13)
3. ~~**Indexing/selection** (`src/core/indexing.ts`)~~ — ✅ Done (Iteration 14)
4. ~~**Comparison/boolean ops** (`src/core/compare.ts`)~~ — ✅ Done (Iteration 15)
5. ~~**Reshaping** (`src/reshape/`)~~ — ✅ Done (Iteration 16)
6. ~~**Window functions** (`src/window/`)~~ — ✅ Done (Iteration 17)
7. ~~**I/O utilities** (`src/io/`)~~ — ✅ Done (Iteration 18)
8. ~~**Statistical functions** (`src/stats/`)~~ — ✅ Done (Iteration 19)
9. ~~**Categorical data** (`src/core/categorical.ts`)~~ — ✅ Done (Iteration 20)
10. ~~**MultiIndex** (`src/core/multi-index.ts`)~~ — ✅ Done (Iteration 21)
11. ~~**Timedelta** (`src/core/timedelta.ts`)~~ — ✅ Done (Iteration 22)
12. ~~**IntervalIndex** (`src/core/interval-index.ts`)~~ — ✅ Done (Iteration 23)
13. ~~**CategoricalIndex** (`src/core/categorical-index.ts`)~~ — ✅ Done (Iteration 24)
14. **DatetimeTZDtype / DatetimeTZIndex** (`src/core/datetime-tz.ts`) — timezone-aware datetime index, or next: `read_parquet`, `plotting`

---

## 📚 Lessons Learned

- **General**: `exactOptionalPropertyTypes`: use `?? null` not undefined. `noUncheckedIndexedAccess`: guard array accesses. Complexity ≤15: extract helpers. `useBlockStatements`: braces everywhere. `useTopLevelRegex`: move regex to top level. `useNumberNamespace`: `Number.NaN`. `import fc from "fast-check"` (default import). `biome check --write --unsafe` auto-fixes Array<T>→T[].
- **Imports**: `useImportRestrictions` — import from barrel `../core/index.ts` not direct files. `import type` for type-only imports. Circular ESM deps (strings/datetime/categorical) are fine.
- **Build env**: `bun` not available — use `node_modules/.bin/biome` and `node_modules/.bin/tsc`. Pre-existing TS errors in window/io/tests — only validate new file has 0 errors.
- **CategoricalIndex** (Iter 24): Extends `Index<Label>` via `super(cat.toArray(), name)`. `fromCategorical` factory for clean construction. Monotonicity uses category-position codes when `ordered=true`. `sortByCategoryOrder` helper keeps `sortValues` complexity low by using codes for comparison. Category management delegates fully to `Categorical` instance methods. No barrel imports needed for `Categorical` (direct import from `./categorical.ts`).
- **IntervalIndex** (Iter 23): `Interval` class needs no imports from core barrel (standalone numeric type). `intervalsOverlap` helper with touching-endpoint logic (both sides must include the shared point). `resolveRangeParams` extractor keeps `intervalRange` complexity low. `extractLeft/Right/Mid/Length` helpers for clean property getters. `maskContains`/`maskOverlaps` for vectorized ops. fromIntervals inherits `closed` from first element (empty→"right" default).
- **Timedelta** (Iter 22): Store as ms integer. `floorDiv`/`floorMod` helpers for Python-style floor-division decomposition (components always non-negative). `Timedelta` NOT in `Scalar` type — `TimedeltaAccessor` accepts numbers (ms) or strings. Accessor's `_mapTd` returns ms numbers to stay within Scalar. Two top-level regex (PANDAS_RE + UNIT_RE) for biome compliance.
- **MultiIndex** (Iter 21): levels+codes compressed storage. Complexity extractors: `buildTargetCodes`/`filterByTargetCodes`/`compareAtLevel`/`makeSortComparator`. Avoid `toFrame()` (potential circular dep); use `toRecord()` instead.
- **Stats** (Iter 19): skew/kurtosis use sample std (ddof=1). G1 = n/((n-1)(n-2))·Σ((xi-x̄)/s)³.
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

### Phase 3+ — Advanced
**Next**: DatetimeTZDtype/Index (`src/core/datetime-tz.ts`) — timezone-aware datetime handling (matching `pd.DatetimeTZDtype` and `pd.DatetimeIndex`). Or: `read_parquet` (binary format), `plotting` module.

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 24 — 2026-04-04 14:13 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23980570547)

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
