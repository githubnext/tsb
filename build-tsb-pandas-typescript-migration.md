# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-21T18:51:28Z |
| Iteration Count | 231 |
| Best Metric | 109 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #174 |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, error, accepted, error, error, error, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: #174
**Issue**: #1

---

## 🎯 Current Priorities

- `core/str_accessor` improvements (findall, extractall) — str accessor on Series
- `stats/period_range.ts` — pd.period_range() for PeriodIndex sequences
- `io/read_parquet.ts` — Parquet reader (if feasible without native bindings)
- More str accessor methods on Series: `str.cat()`, `str.repeat()`, etc.

---

## 📚 Lessons Learned

- **Biome**: `useBlockStatements --write --unsafe`. `Number.NaN`/`Number.POSITIVE_INFINITY`. Default import fc. `import type` for value-unused imports.
- **TypeScript**: `(value as unknown) instanceof X` for instanceof-passthrough. `as Scalar`/`as number` for noUncheckedIndexedAccess. `readonly T[]` not `ReadonlyArray<T>`. Extract helpers for ≤15 complexity.
- **Tests**: Import from `../../src/index.ts`. `Series<Scalar>` type. Use `DataFrame.fromColumns({...})` not `new DataFrame({...})`. `Series({dtype: Dtype, name: null|string})`.
- **MCP safeoutputs**: session flow: init → notifications/initialized → tools/call with Mcp-Session-Id. Accept: application/json, text/event-stream. `push_to_pull_request_branch` (not create) when PR exists.
- **Regex**: Global regex requires `lastIndex=0` reset before reuse in loops.
- **Timedelta**: Two Timedelta classes exist (stats/to_timedelta.ts and core/timedelta.ts). Duck-type in timedelta_range.ts to handle both. RE_PANDAS regex: make time component optional for "N days" strings. Stats Timedelta needs `fromMilliseconds`/`totalMilliseconds` for test compatibility.
- **Iter 231**: Fixed timedelta_range (30 tests now pass), added toJsonNormalize. Metric: 109.
- **Iter 230**: date_range: D/B/h/min/s/ms/W/W-DOW/MS/ME/QS/QE/YS/YE, inclusive, normalize, UNIT_NORM table. Complexity ≤15 via helpers. Metric: 61.
- **Iter 229**: to_timedelta: RE_PANDAS/RE_ISO/RE_HUMAN_UNIT, Timedelta class, applyErrors(), parseFrac(), formatTimedelta(). 5 prior push failures fixed by using push_to_pull_request_branch targeting PR #120.
- **Iter 223**: nancumops: 9 nan-ignoring agg fns (nansum/mean/median/var/std/min/max/prod/count). Metric: 58.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `core/str_accessor` — findall, extractall, normalize, cat, repeat
- `stats/period_range.ts` — pd.period_range()
- `io/read_parquet.ts` — Parquet reader
- `stats/business_day.ts` — bdate_range, BDay offset
- More merge/join improvements
- `core/sparse.ts` — SparseArray/SparseDtype

---

## 📊 Iteration History

### Iter 231 — 2026-04-21 18:51 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24740445752)

- **Status**: ✅ Accepted
- **Change**: Fixed timedelta_range tests (30 failing → 0) by patching RE_PANDAS regex + duck-typing; added toJsonNormalize (inverse of jsonNormalize)
- **Metric**: 109 (previous best: 108, delta: +1)
- **Commit**: 142ee48
- **Notes**: RE_PANDAS needed optional time component for "N days" strings. Two Timedelta classes needed reconciliation. toJsonNormalize splits dot-separated column names to reconstruct nested objects.

### Iter 230 — 2026-04-12 11:15 UTC — ✅ +date_range. Metric: 61. Commit: 996705d. [Run](https://github.com/githubnext/tsessebe/actions/runs/24305375139)
### Iter 229 — 2026-04-12 10:47 UTC — ✅ +to_timedelta (after 5 push failures). Metric: 60. Commit: 48a486c.
### Iters 224–228 — ⚠️ Push failures (MCP policy). to_timedelta + to_datetime code written but not pushed. to_datetime IS on remote at 716a7f3/480c452.
### Iter 223 — 2026-04-12 07:50 UTC — ✅ +nancumops (9 fns). Metric: 58. Commit: f7ab898.
### Iter 222 — 2026-04-12 06:50 UTC — ✅ +to_numeric. Metric: 57. Commit: 576ddbb.
### Iter 221 — 2026-04-12 05:46 UTC — ✅ +quantile (5 methods). Metric: 56. Commit: a48560f.
### Iter 220 — 2026-04-12 05:15 UTC — ✅ +sem_var+nunique. Metric: 55. Commit: bb3f8f3.
### Iter 219 — ⚠️ Push failure. Recovered in iter 220.
### Iter 218 — 2026-04-12 02:19 UTC — ✅ +mode+skew_kurt. Metric: 53. Commit: 35e1521.
### Iter 217 — ⚠️ Push failure. Recovered in iter 218.
### Iter 216 — 2026-04-12 00:30 UTC — ✅ +jsonNormalize. Metric: 51. Commit: b26b44c.
### Iter 215 — 2026-04-11 23:30 UTC — ✅ +readExcel. Metric: 50. Commit: 5748b07.
### Iters 53–214 — ✅/⚠️ (metrics 8→49): Features ported include selectDtypes(49), interpolate(48), factorize+wide_to_long(47), pivotTableFull(44), crosstab(43), getDummies(42), Interval/IntervalIndex(41), cut/qcut(40), clip+apply(39), fix-exports(38), sample(37), duplicated(36), diff_shift(35), where_mask(34), replace(33), astype(32), idxmin_idxmax(31), na_ops(30), and 22+ core features from iters 53-172.
