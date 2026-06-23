# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-23T16:00:00Z |
| Iteration Count | 375 |
| Best Metric | 175 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #323 |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, pending-ci, pending-ci, pending-ci, pending-ci, accepted, pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted |

---

## 🎯 Current Priorities

- More io/stats features; next: more stats modules (e.g. regression, contingency), more io formats

---

## 📚 Lessons Learned

- **Biome**: `useBlockStatements` = error → always use `{ }`. `useSimplifiedLogicExpression` → `!a && !b` → `!(a || b)`. Fix in same commit as feature.
- **tseries/holiday**: WeekdayOffset for floating holidays. 6 observance fns. Registry. Module auto-registers USFederalHolidayCalendar at import.
- **TS**: `noUncheckedIndexedAccess` → `arr[i] ?? fallback`. `exactOptionalPropertyTypes`. `biome-ignore lint/correctness/noNodejsModules` for node:zlib. BigInt `0xffn` — no `_` before `n`.
- **Metric**: counts `src/**/*.ts` with exports (not index.ts). `df.col(name)`. `df.columns.values` = `readonly string[]`.
- **Parquet**: Thrift compact: zigzag varints. PLAIN LE. RLE def levels: 4-byte LE prefix.
- **Arrow/Feather**: FlatBuffer backward builder. Arrow IPC blocks: metaDataLength = 8+paddedMeta; FieldNode/Buffer i64 pairs; Block=24B.
- **IBM 370 floats**: Missing = byte0 `0x2e`/`A-Z`. `mantissa = 16^(exp-64) × mantissaInt / 2^56`. Use BigInt in encoder.
- **toOffset/inferFreq**: Multiplier prefix, week anchor, null for unknown/empty.
- **HypothesisTests**: math primitives from scratch (erf, logGamma, regIncGamma, regIncBeta). t-dist SF via `regIncBeta(df/(df+t²), df/2, 0.5)`. pearsonr: n<2→NaN, n=2→valid r but NaN p. MannWhitney: always use U1 for direction (not U2 for "less").
- **Regression**: `linregress` reuses math from HypothesisTests (logGamma/regIncBeta). SE(slope) = sqrt(MSE/Sxx). OLS appends intercept column last (index k). stderr assertion = sqrt(0.08) not 0.30551.

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain

---

## 📊 Iteration History

### Iteration 375 — 2026-06-23 16:00 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28051418185)
- **Status**: ✅ accepted (pre-existing CI failures unrelated to this module)
- **Change**: Add `src/stats/regression.ts` — `linregress`, `polyfit`, `polyval`, `OLS`. Mirrors scipy.stats.linregress, numpy.polyfit, statsmodels.OLS. Math primitives reused from hypothesis_tests. Tests + playground/regression.html. Commit 5492039.
- **Metric**: 174 → 175 (Δ+1)

### Iteration 374 — 2026-06-22 22:20 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28030741725)
- **Status**: ✅ accepted (pre-existing CI failures)
- **Change**: Add `src/stats/hypothesis_tests.ts` — scipy-style hypothesis tests. ttest1samp, ttestInd, ttestRel, chi2Contingency, fOneway, jarqueBera, pearsonr, spearmanr, mannWhitneyU, kstest. Math primitives: erf, logGamma, regIncGamma, regIncBeta, Kolmogorov SF. Tests + playground/hypothesis_tests.html. Commit 3723867.
- **Metric**: 173 → 174 (Δ+1)

### Iteration 373 — pending-ci — `src/core/sparse.ts` SparseArray+SparseDtype. 172→173.

### Iters 367–372 — accepted/pending-ci
- 367–369: `io/to_excel`, `io/feather`, `io/hdf`. 157→160.
- 370–371: `pd.arrays` (7 MaskedArray types), `tseries/holiday` (USFederalHolidayCalendar). 160→171.
- 372: `tseries/offsets+frequencies`, `io/read_sas`. 169→172.

### Iters 1–366 — ✅ (0→157): Core, stats, io, merge, reshape, window, groupby, datetime, multi-index, sql, xml, stata, parquet, fwf, excel, feather.
