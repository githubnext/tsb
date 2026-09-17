/** Matching fixed-point fixtures for TypeScript, Rust/Wasm and Python.
 * The 1,024-row window fixtures deliberately bound the current quadratic
 * expanding implementations. This is a bridge microbenchmark, not proof that
 * ordinary Series/DataFrame calls dispatch to Rust, or of large-data scaling.
 */
import {
  argsortScalarsAccelerated,
  expandingMaxF64Accelerated,
  expandingMeanF64Accelerated,
  expandingMedianF64Accelerated,
  expandingMinF64Accelerated,
  expandingStdF64Accelerated,
  expandingSumF64Accelerated,
  expandingVarF64Accelerated,
  maxF64Accelerated,
  meanF64Accelerated,
  medianF64Accelerated,
  minF64Accelerated,
  natArgSortAccelerated,
  natCompareAccelerated,
  natSortedAccelerated,
  rollingMaxF64Accelerated,
  rollingMeanF64Accelerated,
  rollingMedianF64Accelerated,
  rollingMinF64Accelerated,
  rollingStdF64Accelerated,
  rollingSumF64Accelerated,
  rollingVarF64Accelerated,
  searchsortedAccelerated,
  searchsortedManyAccelerated,
  stdF64Accelerated,
  sumF64Accelerated,
  varF64Accelerated,
} from "../src/wasm/index.ts";
import { type BenchmarkOutputs, runBenchmark } from "./backend.ts";

export function numericData(size: number): number[] {
  return Array.from({ length: size }, (_, i) => (((i * 37) % 1009) - 504) / 8);
}

export function naturalData(): string[] {
  let seed = 42;
  return Array.from({ length: 1000 }, (_, i) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return `file${seed % 10000}_v${i % 100}.txt`;
  });
}

function scalar(data: number[]): BenchmarkOutputs {
  return {
    sum_f64: sumF64Accelerated(data),
    mean_f64: meanF64Accelerated(data),
    min_f64: minF64Accelerated(data),
    max_f64: maxF64Accelerated(data),
    var_f64: varF64Accelerated(data, 1),
    std_f64: stdF64Accelerated(data, 1),
    median_f64: medianF64Accelerated(data),
  };
}

function sumMeanWindows(data: number[]): BenchmarkOutputs {
  return {
    rolling_sum_f64: rollingSumF64Accelerated(data, 50, 2),
    rolling_mean_f64: rollingMeanF64Accelerated(data, 50, 2),
    expanding_sum_f64: expandingSumF64Accelerated(data, 2),
    expanding_mean_f64: expandingMeanF64Accelerated(data, 2),
  };
}

function expanding(data: number[]): BenchmarkOutputs {
  return {
    expanding_min_f64: expandingMinF64Accelerated(data, 2),
    expanding_max_f64: expandingMaxF64Accelerated(data, 2),
    expanding_var_f64: expandingVarF64Accelerated(data, 2, 1),
    expanding_std_f64: expandingStdF64Accelerated(data, 2, 1),
    expanding_median_f64: expandingMedianF64Accelerated(data, 2),
  };
}

export function kernelWorkload(name: string): { run: () => BenchmarkOutputs; fixture: string } {
  switch (name) {
    case "wasm_accelerated": {
      const data = Array.from({ length: 10000 }, (_, i) => (((i * 37) % 10007) - 5003) / 8);
      const sorted = [...data].sort((a, b) => a - b);
      const queries = Array.from({ length: 100 }, (_, i) => (((i * 101) % 10007) - 5003) / 8);
      return {
        fixture: "search-modular-v1:n=10000:queries=100:left:stable-argsort",
        run: () => ({
          searchsorted_f64: searchsortedAccelerated(sorted, queries[0] ?? 0, "left"),
          searchsorted_many_f64: searchsortedManyAccelerated(sorted, queries, "left"),
          argsort_f64: argsortScalarsAccelerated(data),
        }),
      };
    }
    case "wasm_natsort": {
      const data = naturalData();
      return {
        fixture: "natural-positive-ascii-v1:n=1000:lcg=42",
        run: () => ({
          nat_compare: natCompareAccelerated("file10.txt", "file9.txt"),
          nat_sorted: natSortedAccelerated(data),
          nat_argsort: natArgSortAccelerated(data),
        }),
      };
    }
    case "wasm_agg_scalar": {
      const data = numericData(10000);
      return { fixture: "numeric-modular-v1:n=10000:ddof=1", run: () => scalar(data) };
    }
    case "wasm_agg_ops": {
      const data = numericData(1024);
      return {
        fixture: "numeric-modular-v1:n=1024:window=50:min_periods=2:ddof=1",
        run: () => ({ ...scalar(data), ...sumMeanWindows(data) }),
      };
    }
    case "wasm_rolling_sum_mean": {
      const data = numericData(1024);
      return {
        fixture: "numeric-modular-v1:n=1024:window=50:min_periods=2:ddof=1",
        run: () => sumMeanWindows(data),
      };
    }
    case "wasm_expanding_stats": {
      const data = numericData(1024);
      return {
        fixture: "numeric-modular-v1:n=1024:window=50:min_periods=2:ddof=1",
        run: () => expanding(data),
      };
    }
    case "wasm_rolling_stats": {
      const data = numericData(1024);
      return {
        fixture: "numeric-modular-v1:n=1024:window=50:min_periods=2:ddof=1",
        run: () => ({
          rolling_min_f64: rollingMinF64Accelerated(data, 50, 2),
          rolling_max_f64: rollingMaxF64Accelerated(data, 50, 2),
          rolling_var_f64: rollingVarF64Accelerated(data, 50, 2, 1),
          rolling_std_f64: rollingStdF64Accelerated(data, 50, 2, 1),
          rolling_median_f64: rollingMedianF64Accelerated(data, 50, 2),
          ...expanding(data),
        }),
      };
    }
    default:
      throw new Error(`Unknown kernel workload ${name}`);
  }
}

export async function runKernelBenchmark(name: string): Promise<void> {
  const workload = kernelWorkload(name);
  await runBenchmark(name, workload.run, workload.fixture);
}
