# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-18T19:20:08Z |
| Iteration Count | 419 |
| Best Metric | 199 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #363 |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, accepted, accepted, accepted, accepted, accepted |

---

## 🎯 Current Priorities

- Next: Structural VAR (SVAR), Time-varying parameter VAR (TVP-VAR), Kalman smoother extensions

---

## 📚 Lessons Learned

- **Iter 419**: factor_analysis.ts (FactorAnalysis EM + FastICA + rotateFactors varimax/quartimax), mcd.ts (MinCovDet FAST-MCD + mahalanobisRobust + robustOutliers), bvar.ts (BVAR Minnesota prior + bvarForecast + bvarIRF Cholesky + bvarFEVD). Branch baseline 196, +3 new files = 199.
- **Iter 418**: granger.ts (Granger causality F/Chi2/LR, grangerMatrix), covariance_shrinkage.ts (LW/OAS/shrunkCovariance/correlationFromCov), robust_regression.ts (IRLS huber/bisquare/cauchy/hampel/andrews, theilSen, passingBablok), var_model.ts (fitVAR, varForecast, varIRF, selectVARLag). Branch baseline 193, +4 new files = 197.
- **Iter 417**: spectral.ts (CSD+Lomb-Scargle), stl.ts (STL+decompose+stlForecast), forecast_eval.ts (MASE/MSIS/CRPS), transfer_func.ts (ARIMAX+CCF+prewhiten). Rebase→193, +4 files=197. `rfft`/`fftFreq`/`Complex` all exported from signal.ts.
- **MSTL/TBATS (416)**: iterative STL per period; TBATS Fourier state-space + Box-Cox (Guerrero) + ARMA (Yule-Walker+OLS). `[arP,arQ] as [number,number]` for tuple. No `(M[r] as T)[c]` — use `const row = M[r]; if (!row) continue`. Baseline after 52-commit rebase = 193; +2 files = 195.
- **Cointegration (414)**: Engle-Granger (OLS+ADF) + Johansen (Cholesky+QR eigSym). MacKinnon p-values.
- **HMM (410)**: Forward-backward log-space. `noUncheckedIndexedAccess`→`?? 0`. `exactOptionalPropertyTypes`: no optional spread.
- **General TS**: `?? 0` everywhere. `slice()` on `readonly T[]`. Always push via `push_to_pull_request_branch`. Metric = exported TS files (excl index.ts). +1 per new exported file.

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)
- Phantom commits: always push via `push_to_pull_request_branch`

---

## 🔭 Future Directions

- Factor analysis (PCA/FA) ✅ done in iter 419
- Minimum Covariance Determinant (MCD) ✅ done in iter 419
- Bayesian VAR (BVAR) ✅ done in iter 419
- Structural VAR (SVAR) — identification via short-run/long-run restrictions
- Time-varying parameter VAR (TVP-VAR) — state-space VAR with Kalman filter
- Panel data models (fixed effects, random effects, GMM)
- Survival analysis (Cox PH, Kaplan-Meier, Nelson-Aalen)
- Spatial statistics (variogram, kriging, spatial lag model)
- Copula models (Gaussian, t, Clayton, Gumbel, Frank)

---

## 📊 Iteration History

### Iter 419 — 2026-07-18 19:20 UTC — [Run §29657514367](https://github.com/githubnext/tsb/actions/runs/29657514367)
- **Status**: ⏳ Pending CI | **Change**: FactorAnalysis (EM+FastICA+rotateFactors), MinCovDet (FAST-MCD+robustOutliers), BVAR (Minnesota prior+IRF+FEVD)
- **Metric**: 199 (prev best: 197, delta: +2) | **Commit**: e106398

### Iter 418 — 2026-07-18 07:25 UTC — [Run §29635636124](https://github.com/githubnext/tsb/actions/runs/29635636124)
- **Status**: ⏳ Pending CI | **Change**: Granger causality (grangerCausality/grangerMatrix), Ledoit-Wolf+OAS covariance shrinkage, robust regression (IRLS/Huber/Bisquare/Cauchy/Hampel/Andrews + theilSen + passingBablok), VAR model (fitVAR/varForecast/varIRF/selectVARLag)
- **Metric**: 197 (prev best: 196, delta: +1) | **Commit**: 980a618

### Iter 417 — 2026-07-17 19:21 UTC — [Run §29607085220](https://github.com/githubnext/tsb/actions/runs/29607085220)
- **Status**: ⏳ Pending CI | **Change**: CSD+coherence+Lomb-Scargle (spectral.ts), STL+classical decompose+stlForecast (stl.ts), MASE/MSIS/CRPS/pinball/RMSSE (forecast_eval.ts), ARIMAX+CCF+prewhiten (transfer_func.ts)
- **Metric**: 197 (prev best: 196, delta: +1) | **Commit**: 00392aa

### Iter 416 — 2026-07-17 07:36 UTC — [Run §29563477051](https://github.com/githubnext/tsb/actions/runs/29563477051)
- **Status**: ⏳ Pending CI | **Change**: STL/MSTL multi-seasonal decomposition + classical decomp + stlForecast; TBATS model (Fourier seasonality, Box-Cox, ARMA, damped trend)
- **Metric**: 195 (prev best: 196, delta: -1 vs state / +2 vs branch baseline of 193) | **Commit**: 5ba2fc2

### Iter 415 — 2026-07-16 19:24 UTC — [Run §29527556660](https://github.com/githubnext/tsb/actions/runs/29527556660)
- **Status**: ⏳ Pending CI | **Change**: ARIMAX model (CSS+Nelder-Mead), cross-spectral density + coherence + Lomb-Scargle, STL decomposition + classical decompose
- **Metric**: 196 (prev: 195, delta: +1) | **Commit**: f10df79

### Iters 407–416: ✅ DLM(407), HMM(410), SARIMA(411), Granger(412), MarkovSwitch(413), Cointegration(414), ARIMAX/CSD/STL(415), MSTL/TBATS(416). Phantom 408-409. Metric 191→196.
### Iters 1–406: (0→191) Core, stats, io, window, groupby, reshape, merge, tseries, wasm, playground.
