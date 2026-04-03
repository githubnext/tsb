/**
 * tsb — A TypeScript port of pandas, built from first principles.
 *
 * @packageDocumentation
 */

// Core exports will be added here as features are implemented.
// Each module is imported and re-exported from its feature file in src/.
//
// Planned export structure (mirrors pandas top-level API):
//   export * from "./core/frame.ts";        // DataFrame
//   export * from "./core/series.ts";       // Series
//   export * from "./core/index.ts";        // Index types
//   export * from "./core/dtypes.ts";       // Dtype system
//   export * from "./io/read_csv.ts";       // I/O utilities
//   ... (see .autoloop/memory/migration-plan.md for full roadmap)

export const TSB_VERSION = "0.0.1";

export type { } from "./types.ts";
