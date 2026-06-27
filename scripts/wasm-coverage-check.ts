/**
 * Rust/WASM coverage check script.
 *
 * Verifies that `wasm-coverage.json` contains no unclassified entries and no
 * eligible functions that are missing implementations. Exits with a non-zero
 * code and a descriptive error on any violation.
 *
 * Usage: bun run wasm:coverage
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(__dir, "..", "wasm-coverage.json");

let manifest: unknown;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
} catch (e) {
  console.error(`ERROR: Could not read wasm-coverage.json at ${manifestPath}:`, e);
  process.exit(1);
}

type ManifestEntry = { name: string; status: string; reason?: string };
type ManifestSummary = {
  total_core_entries: number;
  rust_wasm: number;
  ts_only_ineligible: number;
  unclassified: number;
  eligible_missing: number;
};
type Manifest = { entries: ManifestEntry[]; summary: ManifestSummary };

function isManifest(v: unknown): v is Manifest {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return Array.isArray(obj["entries"]) && typeof obj["summary"] === "object";
}

if (!isManifest(manifest)) {
  console.error("ERROR: wasm-coverage.json does not have the expected structure.");
  process.exit(1);
}

const { entries, summary } = manifest;

// ─── validate each entry ──────────────────────────────────────────────────────

const validStatuses = new Set(["rust-wasm", "ts-only-ineligible"]);
const unclassified = entries.filter(
  (e): boolean => !validStatuses.has(e.status),
);
const eligibleMissing = entries.filter(
  (e): boolean =>
    e.status === "rust-wasm" &&
    (typeof e.reason === "string" && e.reason.toLowerCase().includes("todo")),
);

// ─── validate summary ─────────────────────────────────────────────────────────

const countedRustWasm = entries.filter((e) => e.status === "rust-wasm").length;
const countedTsOnly = entries.filter((e) => e.status === "ts-only-ineligible").length;

// ─── report ───────────────────────────────────────────────────────────────────

let failed = false;

if (unclassified.length > 0) {
  console.error(
    `ERROR: ${unclassified.length} entries have unrecognised status values:\n` +
      unclassified.map((e) => `  - ${e.name}: "${e.status}"`).join("\n"),
  );
  failed = true;
}

if (summary.unclassified !== 0) {
  console.error(`ERROR: summary.unclassified is ${summary.unclassified}, expected 0.`);
  failed = true;
}

if (summary.eligible_missing !== 0) {
  console.error(
    `ERROR: summary.eligible_missing is ${summary.eligible_missing}, expected 0.` +
      "\n  All rust-wasm entries must have WASM implementations (no todo/planned entries).",
  );
  failed = true;
}

if (summary.total_core_entries <= 0) {
  console.error(`ERROR: summary.total_core_entries is ${summary.total_core_entries}, must be > 0.`);
  failed = true;
}

if (countedRustWasm !== summary.rust_wasm) {
  console.error(
    `ERROR: summary.rust_wasm=${summary.rust_wasm} but actual rust-wasm entries=${countedRustWasm}.`,
  );
  failed = true;
}

if (countedTsOnly !== summary.ts_only_ineligible) {
  console.error(
    `ERROR: summary.ts_only_ineligible=${summary.ts_only_ineligible} but actual=${countedTsOnly}.`,
  );
  failed = true;
}

if (entries.length !== summary.total_core_entries) {
  console.error(
    `ERROR: manifest has ${entries.length} entries but summary.total_core_entries=${summary.total_core_entries}.`,
  );
  failed = true;
}

if (failed) {
  process.exit(1);
}

// ─── success ──────────────────────────────────────────────────────────────────

console.log(`✓ Rust/WASM coverage manifest is valid.`);
console.log(`  Total core entries : ${summary.total_core_entries}`);
console.log(`  rust-wasm          : ${summary.rust_wasm}`);
console.log(`  ts-only-ineligible : ${summary.ts_only_ineligible}`);
console.log(`  unclassified       : ${summary.unclassified}`);
console.log(`  eligible_missing   : ${summary.eligible_missing}`);
