import { expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import fc from "fast-check";
import {
  type BackendRuntime,
  backendName,
  instrumentKernels,
  prepareBackend,
  registeredKernels,
  verificationOutputs,
  verificationValue,
} from "../../benchmarks/backend.ts";
import {
  kernelWorkload,
  naturalData,
  numericData,
  runKernelBenchmark,
} from "../../benchmarks/kernel-workloads.ts";

function source(module: object | null): BackendRuntime {
  return {
    loaded: () => module,
    load: async () => module,
    binary: () => new Uint8Array([0, 97, 115, 109]),
  };
}

test("backend selection must be explicit and cannot silently become fallback", () => {
  expect(backendName("typescript")).toBe("typescript");
  expect(backendName("rust-wasm")).toBe("rust-wasm");
  for (const value of [undefined, "", "wasm", "RUST_WASM"])
    expect(() => backendName(value)).toThrow();
});

test("registry requires a nonempty unique kernel list and kernel scope", () => {
  const entry = { scope: "kernel", kernels: ["sum_f64"] };
  expect(registeredKernels("sum", { schema_version: 1, benchmarks: { sum: entry } })).toEqual([
    "sum_f64",
  ]);
  for (const manifest of [
    null,
    {},
    { schema_version: 2, benchmarks: {} },
    { schema_version: 1, benchmarks: {} },
    ...[
      { scope: "public", kernels: ["sum_f64"] },
      { scope: "kernel", kernels: [] },
      { scope: "kernel", kernels: ["sum_f64", "sum_f64"] },
      { scope: "kernel", kernels: [3] },
      { scope: "kernel", kernels: ["bad/name"] },
    ].map((sum) => ({ schema_version: 1, benchmarks: { sum } })),
  ]) {
    expect(() => registeredKernels("sum", manifest)).toThrow();
  }
});

test("counter observes actual export calls, excludes warmup, and restores exports", () => {
  const original = (values: number[]) => values.reduce((sum, value) => sum + value, 0);
  const module = { sum_f64: original, nonfunction: "metadata" };
  const counter = instrumentKernels(module, ["sum_f64"]);
  module.sum_f64([1, 2]);
  counter.reset();
  expect(module.sum_f64([2, 3])).toBe(5);
  expect(counter.receipt(1)).toEqual({ sum_f64: 1 });
  counter.restore();
  expect(module.sum_f64).toBe(original);
});

test("loaded module without measured kernels, partial fallback and wrong call counts fail", () => {
  const module = { first: () => 1, second: () => 2 };
  const counter = instrumentKernels(module, ["first", "second"]);
  try {
    expect(() => counter.receipt(1)).toThrow();
    module.first();
    expect(() => counter.receipt(1)).toThrow();
    module.second();
    module.second();
    expect(() => counter.receipt(1)).toThrow();
    for (const iterations of [0, -1, 0.5, Number.NaN])
      expect(() => counter.receipt(iterations)).toThrow();
  } finally {
    counter.restore();
  }
});

test("unregistered measured kernel and absent or uninstrumentable export fail", () => {
  const module = { first: () => 1, extra: () => 2 };
  const counter = instrumentKernels(module, ["first"]);
  try {
    module.first();
    module.extra();
    expect(() => counter.receipt(1)).toThrow();
  } finally {
    counter.restore();
  }
  expect(() => instrumentKernels(module, ["missing"])).toThrow();
  expect(() => instrumentKernels(Object.freeze({ first: () => 1 }), ["first"])).toThrow();
});

test("TypeScript rejects a module loaded before or during its measurement", async () => {
  await expect(prepareBackend("typescript", ["sum_f64"], source({}))).rejects.toThrow();
  let loaded: object | null = null;
  const environment = { ...source(null), loaded: () => loaded };
  const backend = await prepareBackend("typescript", ["sum_f64"], environment);
  backend.reset();
  expect(backend.finish(1)).toEqual({ backend: "typescript" });
  loaded = {};
  expect(() => backend.finish(1)).toThrow();
  backend.restore();
});

test("a missing binary or module never becomes a successful Rust result", async () => {
  await expect(prepareBackend("rust-wasm", ["sum_f64"], source(null))).rejects.toThrow(
    "requires a loaded module",
  );
  const absent = new URL("./intentionally-absent-benchmark.wasm", import.meta.url);
  await expect(
    prepareBackend("rust-wasm", ["sum_f64"], {
      ...source({ sum_f64: () => 1 }),
      binary: () => readFileSync(absent),
    }),
  ).rejects.toThrow();
  await expect(
    prepareBackend("rust-wasm", ["sum_f64"], {
      ...source({}),
      load: async () => ({ sum_f64: () => 1 }),
    }),
  ).rejects.toThrow("requires a loaded module");
});

test("Rust receipt binds binary hash, measured exact calls and module identity", async () => {
  const module = { sum_f64: () => 5 };
  let loaded: object | null = module;
  const backend = await prepareBackend("rust-wasm", ["sum_f64"], {
    ...source(module),
    loaded: () => loaded,
  });
  try {
    backend.reset();
    module.sum_f64();
    const receipt = backend.finish(1);
    expect(receipt.backend).toBe("rust-wasm");
    if (!("wasm" in receipt)) throw new Error("Missing Wasm receipt");
    expect(receipt.wasm.binary_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.wasm.kernel_calls).toEqual({ sum_f64: 1 });
    loaded = null;
    expect(() => backend.finish(1)).toThrow();
  } finally {
    backend.restore();
  }
});

test("binary changes during loading or measurement fail closed", async () => {
  let reads = 0;
  await expect(
    prepareBackend("rust-wasm", ["sum_f64"], {
      ...source({ sum_f64: () => 1 }),
      binary: () => new Uint8Array([++reads]),
    }),
  ).rejects.toThrow("changed during initialization");
  let bytes = new Uint8Array([1]);
  const module = { sum_f64: () => 1 };
  const backend = await prepareBackend("rust-wasm", ["sum_f64"], {
    ...source(module),
    binary: () => bytes,
  });
  try {
    module.sum_f64();
    bytes = new Uint8Array([2]);
    expect(() => backend.finish(1)).toThrow("changed during measurement");
  } finally {
    backend.restore();
  }
});

test("verification preserves every value and shape; only NaN becomes missing", () => {
  expect(verificationValue([1, [Number.NaN, null], "word", true])).toEqual([
    1,
    [null, null],
    "word",
    true,
  ]);
  expect(() => verificationValue([Number.POSITIVE_INFINITY])).toThrow();
  expect(verificationOutputs({ sum_f64: 1 }, ["sum_f64"])).toEqual({ sum_f64: 1 });
  expect(() => verificationOutputs({ unrelated: 1 }, ["sum_f64"])).toThrow();
});

test("registered fixtures expose the entire matching operation output set", () => {
  const manifest: unknown = JSON.parse(
    readFileSync(new URL("../../benchmarks/wasm-support.json", import.meta.url), "utf8"),
  );
  for (const name of [
    "wasm_accelerated",
    "wasm_natsort",
    "wasm_agg_scalar",
    "wasm_agg_ops",
    "wasm_rolling_sum_mean",
    "wasm_rolling_stats",
    "wasm_expanding_stats",
  ]) {
    const work = kernelWorkload(name);
    expect(
      Object.keys(verificationOutputs(work.run(), registeredKernels(name, manifest))).length,
    ).toBeGreaterThan(0);
  }
  expect(() => kernelWorkload("unknown")).toThrow();
  expect(numericData(3)).toEqual([-63, -58.375, -53.75]);
  expect(naturalData().slice(0, 2)).toEqual(["file4273_v0.txt", "file4188_v1.txt"]);
});

test("randomized receipts accept exactly the measured count and no off-by-one count", () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 100 }), (iterations) => {
      const module = { first: (): number => 1 };
      const counter = instrumentKernels(module, ["first"]);
      try {
        for (let i = 0; i < iterations; i++) {
          module.first();
        }
        expect(counter.receipt(iterations)).toEqual({ first: iterations });
        expect(() => counter.receipt(iterations + 1)).toThrow();
        expect(() => counter.receipt(iterations - 1)).toThrow();
      } finally {
        counter.restore();
      }
    }),
    { numRuns: 100 },
  );
});

test("randomized verification retains all finite values and preserves missing positions", () => {
  fc.assert(
    fc.property(
      fc.array(fc.oneof(fc.integer(), fc.constant(Number.NaN)), { maxLength: 100 }),
      (values) => {
        expect(verificationValue(values)).toEqual(
          values.map((value) => (Number.isNaN(value) ? null : value)),
        );
      },
    ),
    { numRuns: 100 },
  );
});

test("real Rust bridge emits the measured receipt and consumed output from the binary", async () => {
  const previous = process.env["TSB_BENCHMARK_BACKEND"];
  process.env["TSB_BENCHMARK_BACKEND"] = "rust-wasm";
  const output: string[] = [];
  const log = spyOn(console, "log").mockImplementation((value: unknown): void => {
    if (typeof value !== "string") throw new Error("Benchmark output must be one JSON string");
    output.push(value);
  });
  try {
    await runKernelBenchmark("wasm_agg_scalar");
    expect(output).toHaveLength(1);
    const raw = output[0];
    if (raw === undefined) throw new Error("Missing benchmark output");
    const payload: unknown = JSON.parse(raw);
    const sha = createHash("sha256")
      .update(readFileSync(new URL("../../rust/pkg/tsb_wasm_bg.wasm", import.meta.url)))
      .digest("hex");
    expect(payload).toEqual(
      expect.objectContaining({
        function: "wasm_agg_scalar",
        backend: "rust-wasm",
        scope: "kernel",
        fixture: "numeric-modular-v1:n=10000:ddof=1",
        iterations: 10,
        warmup: 3,
        wasm: {
          binary_sha256: sha,
          kernel_calls: {
            sum_f64: 10,
            mean_f64: 10,
            min_f64: 10,
            max_f64: 10,
            var_f64: 10,
            std_f64: 10,
            median_f64: 10,
          },
        },
        verification: {
          schema_version: 1,
          outputs: expect.objectContaining({
            sum_f64: numericData(10000).reduce((sum, value) => sum + value, 0),
          }),
        },
      }),
    );
  } finally {
    log.mockRestore();
    if (previous === undefined) delete process.env["TSB_BENCHMARK_BACKEND"];
    else process.env["TSB_BENCHMARK_BACKEND"] = previous;
  }
});
