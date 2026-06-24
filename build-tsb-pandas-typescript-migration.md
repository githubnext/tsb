# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-24T19:45:00Z |
| Iteration Count | 377 |
| Best Metric | 177 |
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
| Recent Statuses | accepted, accepted, pending-ci, pending-ci, pending-ci, accepted, pending-ci, pending-ci, pending-ci, accepted |

---

## 🎯 Current Priorities

- More io/stats features; next: multivariate stats (mahalanobis, PCA) or read_orc

---

## 📚 Lessons Learned

- **Biome**: `useBlockStatements`=error (always `{}`). `useSimplifiedLogicExpression`. `useNumberNamespace` (use `Number.X`). Fix in same commit.
- **TS**: `noUncheckedIndexedAccess` → `arr[i] ?? fallback` or `for...of entries()`. `exactOptionalPropertyTypes`. `biome-ignore lint/correctness/noNodejsModules` for node:zlib. BigInt: no `_` before `n`.
- **Metric**: counts `src/**/*.ts` with exports (not index.ts). One new file = +1 metric.
- **Stats math**: erf (A&S 7.1.26), logGamma, regIncGamma, regIncBeta are reusable across hypothesis_tests/regression/bootstrap. Peter Acklam rational approx for probit.
- **Bootstrap**: BCa = jackknife acceleration + bias-correction. Rest param `...samples: readonly (readonly number[])[]` enables spreading `ReadonlyArray<readonly number[]>` without `as` casts.
- **Binary formats**: Parquet (Thrift compact, zigzag varints, RLE def levels). Arrow/Feather (FlatBuffer backward builder, IPC blocks). IBM 370 floats (BigInt encoder). SAS7BDAT (IBM 370 floats, Stata struct).

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)

---

## 📊 Iteration History

### Iteration 377 — 2026-06-24 19:45 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28123622073)
- **Status**: ✅ accepted (pre-existing CI failures unrelated to this module)
- **Change**: Add `src/stats/bootstrap.ts` — `bootstrap()` + `bootstrap1()`. Percentile, basic, BCa methods. Seeded xorshift* RNG, Peter Acklam probit, jackknife acceleration. Tests + playground/bootstrap.html.
- **Metric**: 176 → 177 (Δ+1)

### Iteration 376 — 2026-06-24 08:00 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28084024731)
- **Status**: ✅ accepted (pre-existing CI failures)
- **Change**: Add `src/stats/contingency.ts` — expectedFreq, relativeRisk (log-normal CI), oddsRatio (Woolf CI), association (Cramér's V, phi, C, T). Tests + playground.
- **Metric**: 175 → 176 (Δ+1)

### Iteration 375 — 2026-06-23 16:00 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28051418185)
- **Status**: ✅ accepted (pre-existing CI failures)
- **Change**: Add `src/stats/regression.ts` — linregress, polyfit, polyval, OLS. Tests + playground.
- **Metric**: 174 → 175 (Δ+1)

### Iteration 374 — 2026-06-22 22:20 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28030741725)
- **Status**: ✅ accepted (pre-existing CI failures)
- **Change**: Add `src/stats/hypothesis_tests.ts` — ttest, chi2, ANOVA, KS, Mann-Whitney, Jarque-Bera, pearsonr, spearmanr. Math primitives from scratch.
- **Metric**: 173 → 174 (Δ+1)

### Iters 367–373 — ✅ (157→173): sparse, to_excel, feather, hdf, pd.arrays (7 masked types), holiday calendars, offsets/frequencies, read_sas.

### Iters 1–366 — ✅ (0→157): Core, stats, io, merge, reshape, window, groupby, datetime, multi-index, sql, xml, stata, parquet, fwf, excel, feather, and more.
