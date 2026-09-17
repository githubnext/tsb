/**
 * Isolated fallback test — issue #496.
 *
 * Bun shares a single module registry across all test files within one
 * `bun test` invocation, so a `loadWasm()` call in `parity.test.ts`'s
 * top-level `beforeAll` would otherwise leak the cached module into every
 * other file (via `getWasm()`) and silently make "fallback" assertions
 * exercise the accelerated path instead. To guarantee true isolation, this
 * test spawns `tests/wasm/fallback-check.ts` in a brand-new `bun run` child
 * process — a process that never imports the loader through any other file —
 * and asserts it exits successfully.
 */

import { describe, expect, test } from "bun:test";

describe("rolling*Accelerated TypeScript fallback (isolated process, wasm never loaded)", () => {
  test("fallback-check.ts passes in a fresh process without loading wasm", async () => {
    const proc = Bun.spawn({
      cmd: ["bun", "run", `${import.meta.dir}/fallback-check.ts`],
      stdout: "pipe",
      stderr: "pipe",
      cwd: `${import.meta.dir}/../..`,
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(exitCode, `stdout:\n${stdout}\nstderr:\n${stderr}`).toBe(0);
    expect(stdout.trim()).toBe("OK");
  });
});
