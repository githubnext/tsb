/** Explicit TypeScript or Rust/Wasm kernel bridge; see shared matching fixtures. */
import { runKernelBenchmark } from "../kernel-workloads.ts";

await runKernelBenchmark("wasm_rolling_sum_mean");
