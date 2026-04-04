# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T12:30:00Z |
| Iteration Count | 20 |
| Best Metric | 31 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-categorical-20` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration-categorical-20`](../../tree/autoloop/build-tsb-pandas-typescript-migration-categorical-20)
**Pull Request**: —
**Steering Issue**: —

---

## 🎯 Current Priorities

Reshaping done (metric=19). Window functions done (metric=22). I/O done (metric=26). Stats done (metric=30). Categorical done (metric=31). Next priorities:
1. ~~**DateTime accessor** (`src/core/datetime.ts`)~~ — ✅ Done (Iteration 12)
2. ~~**Sorting utilities** (`src/core/sort.ts`)~~ — ✅ Done (Iteration 13)
3. ~~**Indexing/selection** (`src/core/indexing.ts`)~~ — ✅ Done (Iteration 14)
4. ~~**Comparison/boolean ops** (`src/core/compare.ts`)~~ — ✅ Done (Iteration 15)
5. ~~**Reshaping** (`src/reshape/`)~~ — ✅ Done (Iteration 16)
6. ~~**Window functions** (`src/window/`)~~ — ✅ Done (Iteration 17)
7. ~~**I/O utilities** (`src/io/`)~~ — ✅ Done (Iteration 18)
8. ~~**Statistical functions** (`src/stats/`)~~ — ✅ Done (Iteration 19)
9. ~~**Categorical data** (`src/core/categorical.ts`)~~ — ✅ Done (Iteration 20)
10. **MultiIndex** (`src/core/multi-index.ts`) — multi-level index for hierarchical data

---

## 📚 Lessons Learned

- Iter 3: Series<T> thin wrapper: readonly array + Index<Label> + Dtype. `exactOptionalPropertyTypes`: use conditional spreads. `noUncheckedIndexedAccess`: explicit `as T | undefined` on array accesses.
- Iter 2: Index<T> method signatures accept `Label` (not T) for query/set ops. Dtype singletons cached with Map.
- The autoloop branch should be created from main (merged PRs), not stale old branches.
- Iter 8 (ops): No circular deps — `ops.ts` imports Series/DataFrame, they don't import back. `Index.contains()` not `has()`. `biome check --write` auto-fixes imports. Use `default:` in switch for `useDefaultSwitchClause`.
- Iter 5 (DataFrame): Column-oriented with `ReadonlyMap<string, Series<Scalar>>`. Extract helpers for `noExcessiveCognitiveComplexity` (max 15).
- Iter 10 (merge): Composite keys use `\x00` + `__NULL__` for nulls. Sentinel `-1` on leftRows = right-only row.
- Iter 9 (strings): `StringAccessor` circular ESM dep fine. Move regex to top level (`useTopLevelRegex`).
- Iter 11 (missing): Test files import from `src/index.ts` (`useImportRestrictions`). `df.get(name)` (→ undefined) not `df.col(name)` (throws).
- Iter 12 (datetime): Extract helpers outside class for complexity. `(getDay() + 6) % 7` for Mon=0 dayofweek. Property tests with `fc.date()`.
- Iter 13 (sort): Use `import type { Index }` when only used as type annotation. Aggressive helper extraction needed for rank's 5-method algorithm. `biome check --write` auto-formats long signatures.
- Iter 14 (indexing): Biome v2.4.x via npx is incompatible with project's biome.json (1.9.4 schema). Install `@biomejs/biome@1.9.4` in node_modules for correct linting. `resolveILocPositions`/`resolveLocPositions` hit complexity 15 limit — extract `boolMaskToPositions`, `normaliseSinglePos`, `labelToPositions`, `labelArrayToPositions`. `exactOptionalPropertyTypes`: use `?? null` not just undefined for `name` field in SeriesOptions. Use `import fc from "fast-check"` (default import), not `import * as fc`.

- Iter 16 (reshape): `pivot` uses `JSON.stringify` for composite keys (handles null/boolean labels). Complexity 15 limit: extract `collectRowKeys`/`accumulateCells`/`buildPivotTableData` for pivotTable; extract `buildMeltOutputs`/`buildStackOutputs`/`assembleStackResult` for melt/stack. Import `Series` type at top of module to avoid inline `import("...")` in function signatures. `biome check --fix --unsafe` auto-fixes `useAtIndex`/`useTemplate`/`useBlockStatements`.
- Iter 17 (window): `useImportRestrictions` requires importing from barrel `../core/index.ts` not directly from `../core/frame.ts` etc. Biome auto-fix converts direct imports to `import type { X }` first; manually consolidate all into `import { DataFrame, Series } from "../core/index.ts"` + `import type { Index }`. `useBlockStatements`: one-liner `if/for` must have braces. `useNumberNamespace`: use `Number.NaN` not bare `NaN`.
- Iter 18 (I/O): `useTopLevelRegex` — move regex literals out of functions to module top level. `exactOptionalPropertyTypes` — use conditional `? { index: rowIndex } : undefined` not `{ index: maybeUndefined }`. When parsing `unknown` JSON, `as Record<string, unknown>` after type guards is provably safe. `noUncheckedIndexedAccess` — use `colNames[ci]` with `if (colName !== undefined)` guard; avoid `as string` cast on array access. `Label[]` from `Scalar[]` — use `.map(v => v === null || typeof v === 'string' || typeof v === 'number' ? v : null)` not cast. Import `type { DataFrame }` and `type { Series }` as type-only is sufficient when used only as parameter types.

- Iter 19 (stats): Adjusted Fisher–Pearson formulas for skew/kurtosis use sample std (ddof=1), not population std. Formula: G1 = n/((n-1)(n-2)) * Σ[(xi-x̄)/s]³; G2 = n(n+1)/((n-1)(n-2)(n-3)) * Σ[(xi-x̄)/s]⁴ − 3(n-1)²/((n-2)(n-3)). `biome check --fix` auto-fixes organizeImports formatting. No new circular deps needed — import from `../core/index.ts` barrel.
- Iter 20 (categorical): Circular ESM dep (categorical.ts → series.ts → categorical.ts) is fine — same pattern as strings/datetime. `useConsistentArrayType`/`useShorthandArrayType`: use `Label[]` not `Array<Label>` for return types. Use `biome check --write --unsafe` to fix Array<T> → T[] automatically. `import fc from "fast-check"` (default import, not namespace). Always test index.ts barrel export too.

---

- *(none yet)*

---

## 🔭 Future Directions

### Phase 1 — Core Foundation ✅ Done
Index, Dtype, Series, DataFrame all implemented.

### Phase 2 — Operations (active)
- ~~Arithmetic~~ ✅ (Iter 8) · ~~String accessor~~ ✅ (Iter 9) · ~~DateTime accessor~~ ✅ (Iter 12)
- ~~Missing data~~ ✅ (Iter 11) · ~~Groupby~~ ✅ (Iter 6) · ~~concat~~ ✅ (Iter 7) · ~~merge~~ ✅ (Iter 10)
- ~~Sorting utilities~~ ✅ (Iter 13) · ~~Indexing/selection~~ ✅ (Iter 14) · ~~Comparison/boolean ops~~ ✅ (Iter 15) · ~~Reshaping~~ ✅ (Iter 16) · ~~Window functions~~ ✅ (Iter 17)
- ~~**I/O utilities**~~ ✅ (Iter 18) · ~~**Statistical functions**~~ ✅ (Iter 19) · ~~**Categorical data**~~ ✅ (Iter 20)
- **Next**: MultiIndex (`src/core/multi-index.ts`) — hierarchical indexing for DataFrames

### Phase 3+ — Advanced
~~Categorical~~ ✅ · MultiIndex · Timedelta · read_parquet · plotting

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 20 — 2026-04-04 12:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23978618596)

- **Status**: ✅ Accepted
- **Change**: `src/core/categorical.ts` — `Categorical` class (integer-coded fixed-vocabulary array), `CategoricalDtype` (metadata descriptor), `CategoricalAccessor` (`Series.cat`), `factorize()`. Added `.cat` getter to `Series`.
- **Metric**: 31 (previous best: 30, delta: +1)
- **Commit**: cd9c49c
- **Notes**: 55 unit + 3 property-based tests. Circular ESM dep (categorical↔series) is fine per prior pattern. `Array<T>` → `T[]` auto-fixed by biome --unsafe.

### Iteration 19 — 2026-04-04 11:42 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23978159484)

- **Status**: ✅ Accepted
- **Change**: `src/stats/` — `describe`/`describeDataFrame`, `corrSeries`/`corrDataFrame` (Pearson/Spearman/Kendall tau-b), `covSeries`/`covDataFrame` (sample covariance), `skewSeries`/`skewDataFrame` (G1), `kurtosisSeries`/`kurtosisDataFrame`/`kurtSeries`/`kurtDataFrame` (G2 excess).
- **Metric**: 30 (previous best: 26, delta: +4)
- **Commit**: 26daef2
- **Notes**: 42 unit + 3 property-based tests. Key learning: adjusted formulas use sample std (ddof=1), not population std.

### Iteration 18 — 2026-04-04 11:11 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23977676601)

- **Status**: ✅ Accepted
- **Change**: `src/io/` — readCsv, readJson, toCsv, seriesToCsv, toJson, seriesToJson.
- **Metric**: 26 (previous best: 22, delta: +4)
- **Commit**: 0d23bc4

### Iteration 17 — [Run](https://github.com/githubnext/tsessebe/actions/runs/23977302713)

- **Status**: ✅ Accepted
- **Change**: `src/window/` — rolling/expanding/ewm.
- **Metric**: 22 (delta: +3)

### Iterations 9–20 (summary)
- Iter 20 ✅ categorical: Categorical/CategoricalDtype/factorize/Series.cat (31) · Iter 19 ✅ stats: describe/corr/cov/skew/kurtosis (30) · Iter 18 ✅ I/O: readCsv/readJson/toCsv/toJson (26) · Iter 17 ✅ window (22) · Iter 16 ✅ reshape (19)
- Iter 15 ✅ compare.ts (16) · Iter 14 ✅ indexing.ts (15) · Iter 13 ✅ sort.ts (14)
- Iter 12 ✅ datetime.ts (13) · Iter 11 ✅ missing.ts (12) · Iter 10 ✅ merge (11) · Iter 9 ✅ strings.ts (10)

### Iterations 1–8 (summary)
- Iter 8 ✅ ops.ts aligned arithmetic (9) · Iter 7 ✅ concat (8) · Iter 6 ✅ GroupBy (7)
- Iter 5 ✅ DataFrame (6) · Iter 4 ⚠️ Error · Iter 3 ✅ Dtype+Series (5) · Iter 2 ✅ Index+Dtype (4) · Iter 1 ✅ Foundation (1)
