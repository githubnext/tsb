# Three-way benchmark results

The dashboard compares Python (pandas/NumPy), TypeScript running in Bun, and
Rust compiled to Wasm running in the same Bun host. It does not compare a native
Rust executable, and the Wasm column does not imply that ordinary tsb APIs
automatically use Wasm.

## What is measured

Every matched TypeScript/Python workload remains visible. A workload has a Wasm
measurement only if `wasm-support.json` explicitly registers it. Initially this
covers the seven existing `wasm_*` kernel workloads. Other workloads say
**Unsupported**, not zero milliseconds or a TypeScript fallback time.

Registered workloads use the same input generator, operation list, warm-up
count, and measured iteration count on all three backends. Their TypeScript and
Wasm runs execute the same TypeScript script in separate processes with an
explicit backend selection. The TypeScript run requires an unloaded Wasm module;
the Wasm run requires a real loaded binary. Loading is outside the timed region;
the TypeScript/Wasm wrapper input and output conversions are inside it, as is
the Rust export-call counting overhead. Python
uses its native pandas/NumPy operations (standard-library natural sorting for
the constrained ASCII filename fixture); JSON normalization is outside timing.

These are **direct kernel** comparisons, not whole-Series/DataFrame acceleration
claims. The smaller rolling/expanding fixtures keep the current quadratic
implementations bounded; timings from the previous, differently sized fixtures
are not comparable. Existing unregistered workloads retain their own benchmark
contracts and are labeled **Existing workload**.

## Evidence before a Wasm timing is admitted

- The manifest declares the exact kernels expected for the workload.
- The benchmark instruments actual module exports, resets counters after warm-up,
  and requires each expected kernel to execute once per measured iteration.
- Its receipt identifies the binary by SHA-256. The collector verifies the hash
  against the binary before and after execution.
- Registered workloads return their final operation outputs. The collector checks
  all keys, array shapes, ordering, strings, missing values, and numeric values
  against the Python result. Floating-point tolerance is `rtol=1e-9`, `atol=1e-8`;
  integer/integer comparisons and search/sort index outputs are exact. Output
  verification is outside timing. Fixture identity, warm-up, and iteration counts
  must also match the Python reference.
- Failed loading, missing execution evidence, and incorrect outputs retain an
  explicit failure state without a timing or speedup for that backend.

This is verification of the measured fixture, not general pandas parity or a
tamper-proof attestation. Benchmark code and fixture changes still need review;
the optimizing agent must not redefine its own acceptance workload.

## Run a bounded comparison

Build Wasm from the candidate Rust source with the repository's pinned
`wasm-pack` version (currently 0.15.0), then run, for example:

```sh
wasm-pack build --target nodejs --out-dir pkg rust/ -- --locked
python3 benchmarks/runner.py --ts-runner bun --workers 1 --strict \
  --filter wasm_agg_scalar,wasm_rolling_sum_mean \
  --output /tmp/tsb-three-way-results.json
```

The Pages and benchmark-verification workflows move the committed Wasm package
aside and rebuild from source. PR verification selects at most 16 workloads and
sets up Rust only when a registered Wasm workload is selected. The full Pages
sweep retains eight workers to bound collection cost; use repeated serial runs
for optimization decisions rather than treating contended dashboard timings as
an acceptance baseline.

## Report format

Schema 3 adds `comparisons` (one row for every discovered workload) and
`backend_summary` (success, failed, unsupported, and not-selected counts for each
backend). Each backend has its own status, optional timing, and failure reason.
Rust success includes `binary_sha256` and `kernel_calls`. Registered rows include
`output_verification`; large verification outputs are not published.

The legacy `benchmarks` array retains successful TypeScript/Python pairs for
existing consumers. `summary.completed` counts selected rows where every
supported backend succeeds; unsupported backends do not count as execution
failures. Unsupported coverage is always disclosed separately. Schema 1/2
reports remain readable but their Rust column says **Not measured**.

The dashboard shows TS/Python and Wasm/Python ratios only for valid successful
measurements. Search and sort support triage, but an absent or failed backend
cannot win. The measured source revision, runtime versions, worker count, and
Wasm binary hash remain part of the report provenance.
