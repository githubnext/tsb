# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-21T17:24:54Z |
| Iteration Count | 231 |
| Best Metric | 108 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #120 |
| Steering Issue | #107 |
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
**Pull Request**: #120 | **Steering Issue**: #107 | **Experiment Log**: #3

---

## 🎯 Current Priorities

- `core/str_accessor` improvements (findall, extractall)
- `io/to_json_normalize.ts` — inverse of jsonNormalize (already implemented as json_normalize; consider reverse/export)
- `period_range` — generating PeriodIndex sequences (mirrors pd.period_range)

---

## 📚 Lessons Learned

- **Iter 231**: timedelta_range in src/core/ (not stats/) to avoid file counting collision. Supports all pandas param combos: start+end+freq, start+periods+freq, end+periods+freq, start+end+periods (linspace). Multiplier prefixes like "2H","30min". closed=both/left/right/neither. Metric jumped from 107→108 (many features merged to main since last state update).
- **Biome**: `useBlockStatements --write --unsafe`. `Number.NaN`/`Number.POSITIVE_INFINITY`. Default import fc. `import type` for value-unused imports.
- **TypeScript**: `(value as unknown) instanceof X` for instanceof-passthrough. `as Scalar`/`as number` for noUncheckedIndexedAccess. `readonly T[]` not `ReadonlyArray<T>`. Extract helpers for ≤15 complexity.
- **Tests**: Import from `../../src/index.ts`. `Series<Scalar>` type. `Series({dtype: Dtype, name: null|string})`.
- **MCP safeoutputs**: session flow: init → notifications/initialized → tools/call with Mcp-Session-Id. Accept: application/json, text/event-stream. `push_to_pull_request_branch` (not create) when PR exists.
- **Regex**: Global regex requires `lastIndex=0` reset before reuse in loops.
- **Iter 230**: date_range: D/B/h/min/s/ms/W/W-DOW/MS/ME/QS/QE/YS/YE, inclusive, normalize, UNIT_NORM table. Complexity ≤15 via helpers. Metric: 61.
- **Iter 229**: to_timedelta: RE_PANDAS/RE_ISO/RE_HUMAN_UNIT, Timedelta class, applyErrors(), parseFrac(), formatTimedelta(). 5 prior push failures fixed by using push_to_pull_request_branch targeting PR #120.
- **Iter 223**: nancumops: 9 nan-ignoring agg fns (nansum/mean/median/var/std/min/max/prod/count). Metric: 58.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `core/str_accessor` — findall, extractall, normalize
- `period_range` — pd.period_range() for PeriodIndex sequences
- `io/to_json_normalize.ts` — reverse of json_normalize (nested DataFrame from flat records)

---

## 📊 Iteration History

### Iter 231 — 2026-04-21 17:24 UTC — ✅ +timedelta_range. Metric: 108 (prev best: 107). Commit: 54afc7d. [Run](https://github.com/githubnext/tsessebe/actions/runs/24736530340)
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
