# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-26T08:05:36Z |
| Iteration Count | 380 |
| Best Metric | 179 |
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
| Recent Statuses | accepted, accepted, accepted, pending-ci, pending-ci, accepted, pending-ci, pending-ci, accepted, accepted |

---

## 🎯 Current Priorities

- More io/stats features; next: read_orc, or signal processing (FFT/STFT)

---

## 📚 Lessons Learned

- **Biome**: `useBlockStatements`=error (always `{}`). `useSimplifiedLogicExpression`. `useNumberNamespace` (use `Number.X`). Fix in same commit.
- **TS**: `noUncheckedIndexedAccess` → `arr[i] ?? fallback`. `exactOptionalPropertyTypes`. `biome-ignore lint/correctness/noNodejsModules` for node:zlib. BigInt: no `_` before `n`.
- **Metric**: counts `src/**/*.ts` with exports (not index.ts). One new file = +1 metric.
- **Stats math**: erf (A&S 7.1.26), logGamma, regIncGamma reusable. Peter Acklam probit; BCa = jackknife accel + bias-correction. Rest param `...samples: readonly (readonly number[])[]` avoids `as` casts.
- **Binary**: Parquet (Thrift compact, zigzag varints, RLE def levels). Arrow/Feather (FlatBuffer). IBM 370 floats (BigInt). SAS7BDAT (IBM 370, Stata struct).
- **PCA/Mahalanobis**: Jacobi eigendecomposition for symmetric covariance matrices. Closures in `PCAResult` (transform/inverseTransform) capture frozen state — clean fitted-model pattern.
- **KDE**: Log-sum-exp in logPdf for numerical stability. Box-Muller transform + weighted CDF binary search for resample. Use `new Array<number>(n).fill(0)` not `new Array(n) as number[]`. Use `toNumbers`-style Series→number[] iteration instead of `data.values as readonly number[]`.

---

- Adding offset/frequency classes to existing files: no metric gain (already exported)

---

## 📊 Iteration History

### Iteration 380 — 2026-06-26 08:05 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28225452889)
- **Status**: ✅ accepted (pre-existing CI failures unrelated to this module)
- **Change**: Add `src/stats/kde.ts` — `gaussianKDE()` + `GaussianKDE` class. Silverman/Scott bandwidth rules, evaluate/pdf/logPdf/logpdf, Simpson's-rule integrate, analytic integrateGaussian, CDF, weighted KDE, resample with seeded xorshift* + Box-Muller. Tests + playground/kde.html.
- **Metric**: 178 → 179 (Δ+1)
- **Commit**: f219ee5

### Iteration 379 — 2026-06-25 19:47 UTC
- **Status**: ✅ accepted (pre-existing CI failures unrelated to this module)
- **Change**: Add `src/stats/bootstrap.ts` — `bootstrap()` + `bootstrap1()`. Percentile, basic, BCa methods. Seeded xorshift* RNG, Peter Acklam probit, jackknife acceleration. Tests + playground/bootstrap.html. (Retry of iter 377 — commit now successfully pushed.)
- **Metric**: 177 → 178 (Δ+1)

### Iteration 378 — 2026-06-25 08:20 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28155673662)
- **Status**: ✅ accepted (pre-existing CI failures)
- **Change**: Add `src/stats/multivariate.ts` — `mahalanobis()`, `PCA`, Jacobi eigendecomposition. Tests + playground.
- **Metric**: 176 → 177 (Δ+1)

### Iters 374–377 — ✅ (173→177): bootstrap (BCa/percentile), contingency tables, regression (OLS/polyfit), hypothesis_tests (ttest/chi2/ANOVA/KS).

### Iters 367–373 — ✅ (157→173): sparse, to_excel, feather, hdf, pd.arrays (7 masked types), holiday calendars, offsets/frequencies, read_sas.

### Iters 1–366 — ✅ (0→157): Core, stats, io, merge, reshape, window, groupby, datetime, multi-index, sql, xml, stata, parquet, fwf, excel, feather, and more.
