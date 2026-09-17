/** Explicit kernel-bridge measurements, not automatic Series/DataFrame dispatch.
 * Input conversion, result allocation and call-counter overhead are timed.
 * Module startup, fixtures, warmup and output normalization are not timed.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { getWasm, loadWasm } from "../src/wasm/index.ts";

export type BackendName = "typescript" | "rust-wasm";
export type BenchmarkValue = number | string | boolean | null | readonly BenchmarkValue[];
export type BenchmarkOutputs = Readonly<Record<string, BenchmarkValue>>;

export interface BackendRuntime {
  loaded(): object | null;
  load(): Promise<object | null>;
  binary(): Uint8Array;
}

const runtime: BackendRuntime = {
  loaded: getWasm,
  load: loadWasm,
  binary: () => readFileSync(new URL("../rust/pkg/tsb_wasm_bg.wasm", import.meta.url)),
};

export function backendName(value: string | undefined): BackendName {
  if (value === "typescript" || value === "rust-wasm") return value;
  throw new Error("TSB_BENCHMARK_BACKEND must explicitly be typescript or rust-wasm");
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function registeredKernels(name: string, manifest: unknown): string[] {
  if (!record(manifest) || manifest["schema_version"] !== 1 || !record(manifest["benchmarks"])) {
    throw new Error("Invalid Wasm benchmark registration");
  }
  const entry = manifest["benchmarks"][name];
  if (!record(entry) || entry["scope"] !== "kernel" || !Array.isArray(entry["kernels"])) {
    throw new Error(`No kernel registration for ${name}`);
  }
  const kernels: string[] = [];
  for (const item of entry["kernels"]) {
    if (typeof item !== "string" || !/^[a-z][a-z0-9_]*$/.test(item) || kernels.includes(item)) {
      throw new Error("Invalid or duplicate registered kernel");
    }
    kernels.push(item);
  }
  if (kernels.length === 0) throw new Error("Empty kernel registration");
  return kernels;
}

/** Instrument actual module exports, including unexpected calls, before warmup. */
export function instrumentKernels(module: object, expected: readonly string[]) {
  const originals = new Map<string, unknown>();
  const calls = new Map<string, number>();
  const restore = (): void => {
    for (const [name, original] of originals) {
      if (!Reflect.set(module, name, original)) throw new Error(`Cannot restore kernel ${name}`);
    }
  };
  try {
    for (const name of expected) {
      if (typeof Reflect.get(module, name) !== "function")
        throw new Error(`Missing kernel ${name}`);
    }
    for (const name of Object.keys(module)) {
      const original: unknown = Reflect.get(module, name);
      if (typeof original !== "function") continue;
      originals.set(name, original);
      if (
        !Reflect.set(module, name, (...args: unknown[]): unknown => {
          calls.set(name, (calls.get(name) ?? 0) + 1);
          const result: unknown = Reflect.apply(original, module, args);
          return result;
        })
      )
        throw new Error(`Cannot instrument kernel ${name}`);
    }
  } catch (error) {
    restore();
    throw error;
  }
  return {
    reset(): void {
      calls.clear();
    },
    receipt(iterations: number): Record<string, number> {
      if (!Number.isSafeInteger(iterations) || iterations <= 0)
        throw new Error("Invalid iteration count");
      if (
        calls.size !== expected.length ||
        [...calls.keys()].some((name) => !expected.includes(name))
      ) {
        throw new Error(
          "Measured Wasm kernel set differs from registration; fallback is not a result",
        );
      }
      const result: Record<string, number> = {};
      for (const name of expected) {
        const count = calls.get(name);
        if (count !== iterations)
          throw new Error(`Expected ${iterations} measured calls to ${name}, got ${count ?? 0}`);
        result[name] = count;
      }
      return result;
    },
    restore,
  };
}

export async function prepareBackend(
  mode: BackendName,
  kernels: readonly string[],
  source: BackendRuntime = runtime,
) {
  if (mode === "typescript") {
    if (source.loaded() !== null)
      throw new Error("TypeScript benchmark must not have a loaded Wasm module");
    return {
      reset(): void {},
      finish(_iterations: number): { backend: "typescript" } {
        if (source.loaded() !== null)
          throw new Error("TypeScript benchmark loaded Wasm during measurement");
        return { backend: "typescript" };
      },
      restore(): void {},
    };
  }
  // Read/hash the binary that the production loader resolves; a missing binary
  // is an error, never an invitation to report the TypeScript fallback as Rust.
  const before = createHash("sha256").update(source.binary()).digest("hex");
  const module = await source.load();
  if (module === null || source.loaded() !== module)
    throw new Error("Rust/Wasm benchmark requires a loaded module");
  if (createHash("sha256").update(source.binary()).digest("hex") !== before) {
    throw new Error("Wasm binary changed during initialization");
  }
  const counter = instrumentKernels(module, kernels);
  return {
    reset: counter.reset,
    finish(iterations: number) {
      if (
        source.loaded() !== module ||
        createHash("sha256").update(source.binary()).digest("hex") !== before
      ) {
        throw new Error("Wasm module or binary changed during measurement");
      }
      return {
        backend: mode,
        wasm: { binary_sha256: before, kernel_calls: counter.receipt(iterations) },
      };
    },
    restore: counter.restore,
  };
}

/** Normalize only the finite measured outputs; preserve shapes and all values. */
export function verificationValue(value: BenchmarkValue): BenchmarkValue {
  if (Array.isArray(value)) return value.map((item: BenchmarkValue) => verificationValue(item));
  if (typeof value === "number") {
    if (Number.isNaN(value)) return null;
    if (!Number.isFinite(value)) throw new Error("Non-finite benchmark result");
    return value;
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  throw new Error("Unsupported benchmark result representation");
}

export function verificationOutputs(
  outputs: BenchmarkOutputs,
  kernels: readonly string[],
): BenchmarkOutputs {
  if (
    Object.keys(outputs).length !== kernels.length ||
    Object.keys(outputs).some((name) => !kernels.includes(name))
  ) {
    throw new Error("Operation output keys differ from registered kernels");
  }
  const result: Record<string, BenchmarkValue> = {};
  for (const name of kernels) {
    const value = outputs[name];
    if (value === undefined) throw new Error(`Missing output for ${name}`);
    result[name] = verificationValue(value);
  }
  return result;
}

export async function runBenchmark(
  name: string,
  run: () => BenchmarkOutputs,
  fixture: string,
): Promise<void> {
  const mode = backendName(process.env["TSB_BENCHMARK_BACKEND"]);
  const manifest: unknown = JSON.parse(
    readFileSync(new URL("./wasm-support.json", import.meta.url), "utf8"),
  );
  const kernels = registeredKernels(name, manifest);
  const backend = await prepareBackend(mode, kernels);
  const iterations = 10;
  const warmup = 3;
  try {
    for (let i = 0; i < warmup; i++) run();
    backend.reset();
    let output: BenchmarkOutputs = {};
    const start = performance.now();
    for (let i = 0; i < iterations; i++) output = run();
    const total = performance.now() - start;
    if (!Number.isFinite(total) || total <= 0) throw new Error("Unresolvable benchmark timing");
    const receipt = backend.finish(iterations);
    const verification = { schema_version: 1, outputs: verificationOutputs(output, kernels) };
    console.log(
      JSON.stringify({
        function: name,
        mean_ms: total / iterations,
        iterations,
        total_ms: total,
        ...receipt,
        scope: "kernel",
        fixture,
        warmup,
        measurement:
          "kernel bridge; input/result conversions and Rust call-counter overhead included; setup and verification excluded",
        verification,
      }),
    );
  } finally {
    backend.restore();
  }
}
