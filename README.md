# Tsessebe

A TypeScript port of [pandas](https://github.com/pandas-dev/pandas), built from first principles.

**Package name:** `tsb` — all imports and internal usage use `tsb`, not `tsessebe`.

## Stack

- **Runtime & tooling:** [Bun](https://bun.sh)
- **Language:** TypeScript — strict mode, no `any`, zero escape hatches
- **Dependencies:** None for core library. External deps only where absolutely required for non-core functionality (e.g. WASM compilation toolchain).
- **Linting:** Strictest possible config — Biome or equivalent, zero warnings tolerated
- **Testing:** 100% coverage across unit tests, property-based tests, fuzz tests, and Playwright e2e tests for the web playground

## Goals

- **Full feature parity with pandas** — identical APIs adapted to TypeScript conventions and idiomatic structures. Every pandas feature is built from scratch, ground up, first principles. No ports of existing JS/TS data libraries.
- **Interactive web playground** — every feature ships with a rich, interactive tutorial, deployed to GitHub Pages. WASM where needed and useful.
- **Performance** — aggressive optimization throughout. Speed is a first-class concern.
- **Exhaustive testing** — pandas' own test suite as a baseline, extended with property-based testing, fuzzing, and e2e coverage. Target: 100%.

## Approach

This port is being built using [autoloop](https://github.com/githubnext/autoloop) to systematically migrate pandas' Python codebase to TypeScript.
