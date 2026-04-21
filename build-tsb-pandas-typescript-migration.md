# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-21T21:47:28Z |
| Iteration Count | 234 |
| Best Metric | 110 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #174 |
| Steering Issue | #107 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, error, accepted, error, error, error, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: #174 | **Steering Issue**: #107 | **Experiment Log**: #3

---

## 🎯 Current Priorities

- `core/str_accessor` improvements (findall ✅ iter 234, extractall)
- `io/to_json_normalize.ts` — inverse of jsonNormalize

---

## 📚 Lessons Learned

- **Biome**: `useBlockStatements --write --unsafe`. `Number.NaN`/`Number.POSITIVE_INFINITY`. Default import fc. `import type` for value-unused imports.
- **TypeScript**: `(value as unknown) instanceof X` for instanceof-passthrough. `as Scalar`/`as number` for noUncheckedIndexedAccess. `readonly T[]` not `ReadonlyArray<T>`. Extract helpers for ≤15 complexity.
- **Tests**: Import from `../../src/index.ts`. `Series<Scalar>` type. `Series({dtype: Dtype, name: null|string})`.
- **MCP safeoutputs**: session flow: init → notifications/initialized → tools/call with Mcp-Session-Id. Accept: application/json, text/event-stream. `push_to_pull_request_branch` (not create) when PR exists.
- **Regex**: Global regex requires `lastIndex=0` reset before reuse in loops.
- **Iter 234**: `DataFrame.fromArrays()` needed as alias for `fromColumns` (used by generated tests). `fc.float({ noNaN: true })` includes Infinity - use `noDefaultInfinity: true` for multiply-by-zero property tests. `norm0(-0) = 0` for pandas semantics. New file `str_findall.ts` adds `strFindall/strFindallCount/strFindFirst`.
- **Iter 232**: Two-Timedelta problem — stats Timedelta (exported) and core Timedelta (used by timedelta_range) are distinct classes. Must add missing structural members to stats Timedelta so tests pass typecheck. `withValues()` preserves index — use `new Series({ data: vals })` for resized results.
- **Iter 230**: date_range: D/B/h/min/s/ms/W/W-DOW/MS/ME/QS/QE/YS/YE, inclusive, normalize, UNIT_NORM table. Complexity ≤15 via helpers. Metric: 61.
- **Iter 229**: to_timedelta: RE_PANDAS/RE_ISO/RE_HUMAN_UNIT, Timedelta class, applyErrors(), parseFrac(), formatTimedelta(). 5 prior push failures fixed by using push_to_pull_request_branch targeting PR #120.
- **Iter 223**: nancumops: 9 nan-ignoring agg fns (nansum/mean/median/var/std/min/max/prod/count). Metric: 58.

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

### Iter 234 — 2026-04-21 21:47 UTC — ✅ Fix eval_query tests + add strFindall/strFindallCount/strFindFirst. Metric: 110. Commit: 72160d1. [Run](https://github.com/githubnext/tsessebe/actions/runs/24748075361)
### Iter 233 — 2026-04-21 ~21:20 UTC — ✅ +queryDataFrame/evalDataFrame. Metric: 110. Commit: ae530a9.
### Iter 232 — 2026-04-21 21:06 UTC — ✅ Fix timedelta_range tests + add unique/between. Metric: 110. Commit: ce2b102. [Run](https://github.com/githubnext/tsessebe/actions/runs/24739263127)
### Iter 231 — 2026-04-21 ~09:00 UTC — ✅ +timedelta_range. Metric: 108. PR #174.
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
