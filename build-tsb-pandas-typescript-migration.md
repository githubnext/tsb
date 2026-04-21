# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-21T19:56:52Z |
| Iteration Count | 232 |
| Best Metric | 108 |
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
**Pull Request**: #174 | **Steering Issue**: #107

---

## 🎯 Current Priorities

- `stats/timedelta_range.ts` — pd.timedelta_range() for generating TimedeltaIndex sequences
- `core/str_accessor` improvements (findall, extractall)
- `io/to_json_normalize.ts` — inverse of jsonNormalize

---

## 📚 Lessons Learned

- **Biome**: `useBlockStatements --write --unsafe`. `Number.NaN`/`Number.POSITIVE_INFINITY`. Default import fc. `import type` for value-unused imports.
- **TypeScript**: `(value as unknown) instanceof X` for instanceof-passthrough. `as Scalar`/`as number` for noUncheckedIndexedAccess. `readonly T[]` not `ReadonlyArray<T>`. Extract helpers for ≤15 complexity. Use structural interface (`TimedeltaInput`) for duck-typing across module boundaries without casts.
- **Tests**: Import from `../../src/index.ts`. `Series<Scalar>` type. `Series({dtype: Dtype, name: null|string})`.
- **MCP safeoutputs**: session flow: init → notifications/initialized → tools/call with Mcp-Session-Id. Accept: application/json, text/event-stream. `push_to_pull_request_branch` (not create) when PR exists.
- **Regex**: Global regex requires `lastIndex=0` reset before reuse in loops.
- **Dual Timedelta classes**: stats/to_timedelta.ts has its own Timedelta (public ctor, totalMs), core/timedelta.ts has full Timedelta (private ctor, totalMilliseconds). Export `Timedelta` from index comes from stats. Use `TimedeltaInput` interface as structural bridge. The stats Timedelta now has `totalMilliseconds` getter + `static fromMilliseconds()`.
- **Iter 232**: Fixed 33 failing timedelta_range tests by: (1) adding "N days" parse support to core Timedelta.parse, (2) adding totalMilliseconds/fromMilliseconds to stats Timedelta, (3) using TimedeltaInput interface in timedelta_range. Metric: 108.
- **Iter 230**: date_range: D/B/h/min/s/ms/W/W-DOW/MS/ME/QS/QE/YS/YE, inclusive, normalize, UNIT_NORM table. Complexity ≤15 via helpers. Metric: 61.
- **Iter 229**: to_timedelta: RE_PANDAS/RE_ISO/RE_HUMAN_UNIT, Timedelta class, applyErrors(), parseFrac(), formatTimedelta(). 5 prior push failures fixed by using push_to_pull_request_branch targeting PR #120.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `stats/timedelta_range.ts` — pd.timedelta_range()
- `core/str_accessor` — findall, extractall, normalize
- `io/to_json_normalize.ts` — nested records from flat DataFrame

---

## 📊 Iteration History

### Iter 232 — 2026-04-21 19:56 UTC — ✅ Fix 33 timedelta_range test failures. Metric: 108. Commit: 5cfc40c. [Run](https://github.com/githubnext/tsessebe/actions/runs/24743307489)
- Added "N days"/"N day" format to core Timedelta.parse; refactored parse to private static helpers (#tryIso, #tryPandas, #tryDaysOnly, #tryHms); added totalMilliseconds getter + static fromMilliseconds() to stats Timedelta; introduced TimedeltaInput structural interface in timedelta_range. All 4714 tests pass (was 4681 pass / 33 fail).

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
