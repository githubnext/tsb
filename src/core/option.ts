/**
 * option — global display and computation options registry.
 *
 * Mirrors `pandas.core.config_init` / `pd.get_option` / `pd.set_option` /
 * `pd.reset_option` / `pd.describe_option`: a lightweight registry of named
 * configuration values that control default behaviour throughout the library
 * (display precision, max rows, etc.).
 *
 * @example
 * ```ts
 * import { getOption, setOption, resetOption } from "tsb";
 *
 * getOption("display.max_rows");           // 60
 * setOption("display.max_rows", 100);
 * getOption("display.max_rows");           // 100
 * resetOption("display.max_rows");
 * getOption("display.max_rows");           // 60
 * ```
 */

import type { Scalar } from "../types.ts";

// ─── option descriptor ────────────────────────────────────────────────────────

/** A single registered option. */
export interface OptionDescriptor {
  /** Short description shown by `describeOption()`. */
  readonly description: string;
  /** Default value. */
  readonly defaultValue: Scalar;
  /** Validator: throw if the proposed value is invalid. */
  readonly validator: (v: Scalar) => void;
}

// ─── validators ───────────────────────────────────────────────────────────────

/** Validates that `v` is a positive integer. */
function positiveInt(v: Scalar): void {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1) {
    throw new TypeError(`Expected a positive integer, got ${String(v)}`);
  }
}

/** Validates that `v` is a non-negative integer or null. */
function nonNegIntOrNull(v: Scalar): void {
  if (v === null) {
    return;
  }
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
    throw new TypeError(`Expected a non-negative integer or null, got ${String(v)}`);
  }
}

/** Validates that `v` is a non-negative integer. */
function nonNegInt(v: Scalar): void {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
    throw new TypeError(`Expected a non-negative integer, got ${String(v)}`);
  }
}

/** Validates that `v` is a string. */
function isString(v: Scalar): void {
  if (typeof v !== "string") {
    throw new TypeError(`Expected a string, got ${String(v)}`);
  }
}

/** Validates that `v` is a boolean. */
function isBool(v: Scalar): void {
  if (typeof v !== "boolean") {
    throw new TypeError(`Expected a boolean, got ${String(v)}`);
  }
}

// ─── registry ─────────────────────────────────────────────────────────────────

/** All registered options. */
const REGISTRY = new Map<string, OptionDescriptor>();

/** Current values (set by `setOption`). */
const CURRENT = new Map<string, Scalar>();

/** Register a new option. Called at module load time. */
function register(key: string, descriptor: OptionDescriptor): void {
  REGISTRY.set(key, descriptor);
}

// ─── built-in options ─────────────────────────────────────────────────────────

register("display.max_rows", {
  description:
    "Maximum number of rows to display in a DataFrame or Series repr. " +
    "If the DataFrame has more rows, it is truncated and a summary is shown.",
  defaultValue: 60,
  validator: positiveInt,
});

register("display.min_rows", {
  description: "Number of rows to show in the truncated repr (on each side). Defaults to 10.",
  defaultValue: 10,
  validator: positiveInt,
});

register("display.max_columns", {
  description: "Maximum number of columns to display. Excess columns are omitted.",
  defaultValue: 20,
  validator: positiveInt,
});

register("display.width", {
  description:
    "Width of the display in characters. Used when wrapping long lines. " +
    "Set to null to auto-detect terminal width.",
  defaultValue: 80,
  validator: positiveInt,
});

register("display.precision", {
  description: "Floating-point output precision (number of decimal places).",
  defaultValue: 6,
  validator: nonNegInt,
});

register("display.max_colwidth", {
  description:
    "Maximum width in characters of a column in the repr output. " +
    "When null, the column width is unlimited.",
  defaultValue: 50,
  validator: nonNegIntOrNull,
});

register("display.na_rep", {
  description: "String representation of missing values (NaN/null).",
  defaultValue: "NaN",
  validator: isString,
});

register("display.float_format", {
  description:
    "Format string for floating-point numbers (e.g. '{:.2f}'). " +
    "When null, the default repr is used.",
  defaultValue: null,
  validator: (v): void => {
    if (v !== null && typeof v !== "string") {
      throw new TypeError(`Expected a string or null, got ${String(v)}`);
    }
  },
});

register("display.show_dimensions", {
  description: "Whether to print DataFrame dimensions (rows × cols) after the truncated repr.",
  defaultValue: true,
  validator: isBool,
});

register("mode.chained_assignment", {
  description:
    "Warn, raise or ignore when a chained assignment is detected. " +
    "Accepted values: 'warn', 'raise', 'none'.",
  defaultValue: "warn",
  validator: (v): void => {
    if (v !== "warn" && v !== "raise" && v !== "none") {
      throw new TypeError(`Expected 'warn', 'raise', or 'none', got ${String(v)}`);
    }
  },
});

// ─── public API ───────────────────────────────────────────────────────────────

/** Thrown when accessing an unregistered option key. */
export class OptionError extends Error {
  constructor(key: string) {
    super(`No such option: '${key}'. Call listOptions() to see all registered options.`);
    this.name = "OptionError";
  }
}

/** Return the descriptor for `key`, or throw `OptionError`. */
function getDescriptor(key: string): OptionDescriptor {
  const desc = REGISTRY.get(key);
  if (desc === undefined) {
    throw new OptionError(key);
  }
  return desc;
}

/**
 * Retrieve the current value of option `key`.
 *
 * @throws {OptionError} if `key` is not a registered option.
 */
export function getOption(key: string): Scalar {
  const desc = getDescriptor(key);
  return CURRENT.has(key) ? (CURRENT.get(key) as Scalar) : desc.defaultValue;
}

/**
 * Set option `key` to `value`.
 *
 * @throws {OptionError}   if `key` is not a registered option.
 * @throws {TypeError}     if `value` fails the option's validator.
 */
export function setOption(key: string, value: Scalar): void {
  const desc = getDescriptor(key);
  desc.validator(value);
  CURRENT.set(key, value);
}

/**
 * Reset option `key` to its default value.
 *
 * @throws {OptionError} if `key` is not a registered option.
 */
export function resetOption(key: string): void {
  getDescriptor(key); // validate key
  CURRENT.delete(key);
}

/**
 * Reset **all** registered options to their default values.
 */
export function resetAllOptions(): void {
  CURRENT.clear();
}

/**
 * Print a description of option `key` to a string.
 *
 * @throws {OptionError} if `key` is not a registered option.
 */
export function describeOption(key: string): string {
  const desc = getDescriptor(key);
  const current = getOption(key);
  const lines = [
    `${key}`,
    `  Description : ${desc.description}`,
    `  Default     : ${String(desc.defaultValue)}`,
    `  Current     : ${String(current)}`,
  ];
  return lines.join("\n");
}

/**
 * Return the names of all registered options.
 */
export function listOptions(): readonly string[] {
  return [...REGISTRY.keys()];
}

/**
 * Register a custom option.
 *
 * Allows library extensions and user code to add their own options to the
 * shared registry.
 *
 * @param key        - Dot-separated option path (e.g. `"mylib.my_option"`).
 * @param descriptor - Option metadata and validator.
 * @throws {Error} if `key` is already registered.
 */
export function registerOption(key: string, descriptor: OptionDescriptor): void {
  if (REGISTRY.has(key)) {
    throw new Error(`Option '${key}' is already registered.`);
  }
  register(key, descriptor);
}
