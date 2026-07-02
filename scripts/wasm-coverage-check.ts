/**
 * Rust/WASM coverage check script.
 *
 * Verifies that `wasm-coverage.json`:
 * 1. Contains no unclassified entries and no eligible functions without implementations.
 * 2. Covers every value export from `src/core/index.ts`.
 * 3. Covers every top-level value export from `src/index.ts` whose source is under `src/core/`.
 *
 * Exits with a non-zero code and a descriptive error on any violation.
 *
 * Usage: bun run wasm:coverage
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dir, "..");
const manifestPath = resolve(repoRoot, "wasm-coverage.json");

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

// ─── extract live export surface ─────────────────────────────────────────────

/**
 * Parse value (non-type) export names from a TypeScript barrel file.
 *
 * Recognises patterns:
 *   export { Name1, Name2 } from "...";
 *   export {\n  Name1,\n  Name2,\n} from "...";
 *
 * Skips `export type { ... }` blocks entirely.
 *
 * Optionally filters to only exports whose source path matches a predicate.
 */
function parseValueExports(
  source: string,
  sourceFilter?: (fromPath: string) => boolean,
): Set<string> {
  const result = new Set<string>();
  // Match export blocks (possibly multi-line) with their "from" clause
  const exportBlockRe =
    /^export\s+(type\s+)?\{([\s\S]*?)\}\s*from\s*["']([^"']+)["']/gm;
  let m: RegExpExecArray | null;
  while ((m = exportBlockRe.exec(source)) !== null) {
    const isTypeExport = m[1] !== undefined; // "type " present
    if (isTypeExport) continue;
    const fromPath = m[3];
    if (sourceFilter && !sourceFilter(fromPath)) continue;
    const names = m[2].split(",").map((s) => s.trim()).filter(Boolean);
    for (const name of names) {
      // Skip inline comments and empty tokens
      const clean = name.replace(/\/\/.*$/, "").trim();
      if (!clean || clean.startsWith("//")) continue;
      result.add(clean);
    }
  }
  return result;
}

// All value exports from src/core/index.ts
const coreIndexSource = readFileSync(resolve(repoRoot, "src/core/index.ts"), "utf-8");
const coreIndexExports = parseValueExports(coreIndexSource);

// Top-level value exports from src/index.ts that come from src/core/** paths
// (includes both "./core/index.ts" re-exports and direct "./core/foo.ts" exports)
const indexSource = readFileSync(resolve(repoRoot, "src/index.ts"), "utf-8");
const topLevelCoreExports = parseValueExports(
  indexSource,
  (fromPath) => fromPath.startsWith("./core/"),
);

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

// ─── export-audit: every live export must be in the manifest ─────────────────

const manifestNames = new Set(entries.map((e) => e.name));

// Union of all core exports that the manifest must cover
const requiredNames = new Set([...coreIndexExports, ...topLevelCoreExports]);

const missingFromManifest = [...requiredNames].filter((n) => !manifestNames.has(n));

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

if (missingFromManifest.length > 0) {
  console.error(
    `ERROR: ${missingFromManifest.length} core export(s) are present in the live source but missing from the manifest:\n` +
      missingFromManifest.map((n) => `  - ${n}`).join("\n") +
      "\n  Add each missing name to wasm-coverage.json with a status of rust-wasm or ts-only-ineligible.",
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
console.log(`  live exports audited: ${requiredNames.size} (${coreIndexExports.size} core/index + ${topLevelCoreExports.size} top-level core re-exports, ${requiredNames.size} unique)`);
console.log(`  missing from manifest: 0`);
