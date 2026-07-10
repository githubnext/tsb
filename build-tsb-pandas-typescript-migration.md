# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-10T19:24:42Z |
| Iteration Count | 403 |
| Best Metric | 194 |
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
| Recent Statuses | pending-ci, accepted, accepted, accepted, pending-ci, accepted, accepted, pending-ci, accepted, accepted |

---

## 🎯 Current Priorities

- VAR (Vector AutoRegression) ✅ done (iter 403)
- Prophet-style additive decomposition (trend + seasonal + holiday)
- State-space DLM (Dynamic Linear Model) — generalization of Kalman

---

## 📚 Lessons Learned

- **VAR (403)**: OLS equation-by-equation. Build regressor matrix X=[1, y_{t-1},...,y_{t-p}]. Coef matrix: B[offset+lag*K+j][i] = A[i][j]. MSE via MA(∞) Ψ recursion + running sum. IRF: Ψ₀=I, Ψₕ=ΣAⱼΨ_{h-j}. orthIrf=ΨₕP where P=chol(Σ). FEVD: (ΣΘₛ[i,j]²)/(Σ_j ΣΘₛ[i,j]²). Lag selection: AIC/BIC/HQIC over lag 1..maxlags.
- **GARCH (402)**: Log-parameterise ω/α/β for unconstrained Nelder-Mead MLE. Soft stationarity penalty (persist≥0.9999→1e12). `conditionalVariances()` helper returns null on σ²≤0. Multi-step forecast: E[ε²_{t+h}]=σ²_{t+h} for h>1. `x.values` (not `as` cast) for Series input.
- **Phantom commits**: always call push_to_pull_request_branch — iters 398/399/400 were phantom (GARCH+SARIMA never pushed). GARCH (911b44b) never existed on branch.
- **SARIMA (401)**: CSS via Nelder-Mead on differenced series. `polyMul` for combined AR/MA poly. Store last seasonal/regular values for forecast undifferencing. Fitted values: `y[t] - eps[t - offset]` where `offset = d + D*s`. Series constructor: `new Series<T>({ data: arr })`. `fc.float` bounds need `Math.fround`.
- **Stats math**: Hannan-Rissanen, Levinson-Durbin, FFT Cooley-Tukey, Butterworth bilinear SOS, ACF/PACF Bartlett CI, Kalman Joseph form, CSS optimisation.
- **TS**: `noUncheckedIndexedAccess`→`?? 0`. `slice()` on `readonly T[]` → mutable. 2D writes: guard row before assign.
- **Metric**: `find src -name '*.ts' -not -name 'index.ts' | xargs grep -l 'export' | wc -l`. +1 per new file.
- **Avro/IO**: Zigzag varint, AvroDatum* interfaces for recursive types (interfaces self-ref, aliases can't).

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)
- **Phantom commits**: always push via `push_to_pull_request_branch`; verify branch has the commit before marking accepted.

---

## 🔭 Future Directions

- GARCH/volatility models ✅ done (iter 402)
- Prophet-style additive seasonal decomposition (trend + seasonal + holiday)
- VAR (Vector AutoRegression) — multivariate time series
- State-space DLM (Dynamic Linear Model) — generalization of Kalman

---

## 📊 Iteration History

### Iter 403 — 2026-07-10 — [Run §29117709797](https://github.com/githubnext/tsb/actions/runs/29117709797)
✅ +1 → 194: VAR(p) Vector AutoRegression. OLS fitting, multi-step forecast w/ CI, IRF (Cholesky-orthogonalised), FEVD, AIC/BIC/HQIC lag selection. 50+ tests, playground. Commit 4a41839. Rebase (ahead=14,behind=52).

### Iter 402 — 2026-07-10 — [Run §29078452984](https://github.com/githubnext/tsb/actions/runs/29078452984)
✅ +1 → 193: GARCH(p,q) conditional heteroskedasticity. MLE via Nelder-Mead on log-params; soft stationarity penalty; multi-step variance forecast. 40+ tests, playground. Commit a006aec. Rebase (ahead=12,behind=52).

### Iter 401 — 2026-07-09 — [Run §29022916600](https://github.com/githubnext/tsb/actions/runs/29022916600)
✅ +1 → 192: SARIMA(p,d,q)(P,D,Q)[s] seasonal ARIMA. CSS/Nelder-Mead, polyMul for combined AR/MA poly, undiff forecast, ψ-weight intervals. 40+ tests, playground. Commit fb8d5c5. Rebase (ahead=12,behind=11).

### Iters 398–400 — ❌ Phantom (GARCH+SARIMA never pushed; metric stayed 191)
### Iters 1–397 — (0→191): Core (Index, Series, DataFrame, Dtype), stats (ACF/PACF, ARIMA, Kalman, ETS, signal, filters, etc.), io (CSV, JSON, Excel, Parquet, HDF5, Feather, Avro, ORC, SAS, Stata, FWF, XML, SQL) and more.
