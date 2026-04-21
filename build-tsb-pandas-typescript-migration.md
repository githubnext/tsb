# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-21T22:18:20Z |
| Iteration Count | 235 |
| Best Metric | 111 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #174 |
| Steering Issue | #107 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, error, accepted, error, error, error, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: #174 | **Steering Issue**: #107 | **Experiment Log**: #3

---

## 🎯 Current Priorities

- `core/str_accessor` improvements — extractall as `.str.extractall()` method on StringAccessor
- `stats/cut_bins_to_frame.ts` — convert cut/qcut results to DataFrame of bin info
- `stats/str_findall.ts` ✅ iter 235: strFindall, strFindallCount, strFindFirst, strFindallExpand
- `io/to_json_normalize.ts` ✅ iter 235: toJsonDenormalize, toJsonRecords, toJsonSplit, toJsonIndex

---

## 📚 Lessons Learned

- **Biome**: `useBlockStatements --write --unsafe`. `Number.NaN`/`Number.POSITIVE_INFINITY`. Default import fc. `import type` for value-unused imports.
- **TypeScript**: `(value as unknown) instanceof X` for instanceof. `as Scalar`/`as number` for noUncheckedIndexedAccess. `readonly T[]`. Extract helpers for ≤15 complexity. `df.columns.values` (not `.map(String)`) — `df.columns` is `Index<string>`. `(record[key] as T[]).push(v)` for pre-initialized Record dicts.
- **Tests**: Import from `../../src/index.ts`. `Series<Scalar>` type. `fc.float({ noNaN: true, noDefaultInfinity: true })` to avoid Infinity in multiply-by-zero tests.
- **MCP safeoutputs**: `push_to_pull_request_branch` (not create) when PR exists. Use PR #174.
- **Regex**: Global regex requires `lastIndex=0` reset before reuse. `strFindall` stores matches as JSON strings (Scalar-compatible). `strFindallExpand` uses dummy `re.exec("")` for named group detection.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `core/str_accessor` — findall, extractall, normalize
- `io/to_json_normalize.ts` — nested records from flat DataFrame
- `stats/cut.ts` / `stats/qcut.ts` — binning functions

---

## 📊 Iteration History

### Iter 235 — 2026-04-21 22:18 UTC — ✅ +strFindall/strFindallCount/strFindFirst/strFindallExpand + toJsonDenormalize/toJsonRecords/toJsonSplit/toJsonIndex. Metric: 111. Commit: 3f9fcf0. [Run](https://github.com/githubnext/tsessebe/actions/runs/24749266130)
### Iter 234 — 2026-04-21 21:47 UTC — ✅ Fix eval_query tests + add strFindall/strFindallCount/strFindFirst. Metric: 110. Commit: 72160d1. [Run](https://github.com/githubnext/tsessebe/actions/runs/24748075361)
### Iters 218–234 — ✅/⚠️ (metrics 51→110): +jsonNormalize(51), +readExcel(50), +nancumops(58), to_timedelta push failures(224-228), +to_timedelta(60), +date_range(61), +timedelta_range(108), +unique/between(110), +queryDataFrame/evalDataFrame(110), fix eval_query+fromArrays(110).
### Iters 53–217 — ✅/⚠️ (metrics 8→50): selectDtypes, interpolate, factorize, pivotTable, crosstab, getDummies, Interval, cut/qcut, clip, sample, duplicated, diff_shift, where_mask, replace, astype, idxmin/idxmax, na_ops, 22+ core features.
