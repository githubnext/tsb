/**
 * Benchmark: registerOption — register custom options with the tsb options system.
 *
 * Mirrors pandas `pd.core.config.register_option` which allows users to
 * register custom options with validators and defaults.
 *
 * Covers:
 *   - registerOption(key, default, doc)           → register without validator
 *   - registerOption(key, default, doc, validator) → register with validator
 *   - getOption / setOption / resetOption on custom keys
 *
 * Outputs JSON: {"function": "register_option", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { registerOption, getOption, setOption, resetOption } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 1_000;

// Register options outside the loop (registration is one-time setup)
// Use unique keys per run to avoid conflicts with repeated registrations.
let keyCounter = 0;

function registerAndExercise(): void {
  const key = `bench.custom_${keyCounter++}`;
  registerOption(key, 42, "A custom numeric option for benchmarking.");
  getOption(key);
  setOption(key, 99);
  resetOption(key);
}

function registerWithValidator(): void {
  const key = `bench.validated_${keyCounter++}`;
  registerOption(key, 10, "A validated numeric option.", (val) => {
    if (typeof val !== "number" || val < 0) return "must be a non-negative number";
    return undefined;
  });
  setOption(key, 50);
  resetOption(key);
}

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  registerAndExercise();
  registerWithValidator();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  registerAndExercise();
  registerWithValidator();
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "register_option",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total_ms,
  }),
);
