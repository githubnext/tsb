/**
 * Flags — metadata flags for DataFrame and Series objects.
 *
 * Mirrors `pandas.core.flags.Flags`. Provides the `allowsDuplicateLabels`
 * flag that controls whether duplicate row/column labels are permitted in the
 * associated DataFrame or Series.
 *
 * @example
 * ```ts
 * import { DataFrame, DuplicateLabelError } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 3] });
 * df.flags.allowsDuplicateLabels; // true (default)
 *
 * df.flags.allowsDuplicateLabels = false;
 * // Setting false on a DataFrame with no duplicates is fine.
 *
 * const dfDup = new DataFrame(
 *   new Map([["a", df.col("a")]]),
 *   df.index.append(df.index), // duplicate index
 * );
 * dfDup.flags.allowsDuplicateLabels = false; // throws DuplicateLabelError
 * ```
 *
 * @packageDocumentation
 */

import { DuplicateLabelError } from "../errors.ts";

// ---------------------------------------------------------------------------
// Structural interfaces (no imports from frame.ts / series.ts)
// ---------------------------------------------------------------------------

/**
 * Minimal structural interface satisfied by any `Index<T>` instance.
 * Defined here (instead of importing from base-index.ts) to avoid circular
 * imports — frame.ts → flags.ts must not require flags.ts → frame.ts.
 */
interface IndexLike {
  readonly values: readonly unknown[];
  readonly size: number;
}

/**
 * Structural interface satisfied by both `DataFrame` and `Series`.
 * Used as the WeakMap key so flags.ts never imports the concrete classes.
 */
export interface FlaggedObject {
  /** Row index of the object. */
  readonly index: IndexLike;
}

// ---------------------------------------------------------------------------
// Internal state registry
// ---------------------------------------------------------------------------

interface FlagsState {
  allowsDuplicateLabels: boolean;
}

const registry = new WeakMap<FlaggedObject, FlagsState>();

function getState(obj: FlaggedObject): FlagsState {
  let state = registry.get(obj);
  if (state === undefined) {
    state = { allowsDuplicateLabels: true };
    registry.set(obj, state);
  }
  return state;
}

// ---------------------------------------------------------------------------
// Flags class
// ---------------------------------------------------------------------------

/**
 * Metadata flags for a `DataFrame` or `Series`.
 *
 * Accessible via `df.flags` or `series.flags`. Mutations are reflected
 * immediately on the underlying object because state is stored in a
 * module-level WeakMap keyed by the object reference.
 *
 * ### pandas reference
 * `pandas.core.flags.Flags`
 */
export class Flags {
  private readonly _obj: FlaggedObject;

  /**
   * @param obj - The DataFrame or Series this Flags object is bound to.
   * @param opts.allowsDuplicateLabels - Initial value for `allowsDuplicateLabels`.
   *   Defaults to `true` when not previously set.
   */
  constructor(obj: FlaggedObject, opts: { allowsDuplicateLabels?: boolean } = {}) {
    this._obj = obj;
    if (opts.allowsDuplicateLabels !== undefined) {
      getState(obj).allowsDuplicateLabels = opts.allowsDuplicateLabels;
    }
  }

  // ── allowsDuplicateLabels ─────────────────────────────────────────────────

  /**
   * Whether duplicate labels (along any axis) are allowed.
   *
   * Defaults to `true`. When set to `false`, any existing duplicate labels
   * trigger a `DuplicateLabelError` immediately. Future operations that would
   * produce duplicate labels also raise.
   *
   * @example
   * ```ts
   * df.flags.allowsDuplicateLabels;       // true
   * df.flags.allowsDuplicateLabels = false;
   * df.flags.allowsDuplicateLabels;       // false
   * ```
   */
  get allowsDuplicateLabels(): boolean {
    return getState(this._obj).allowsDuplicateLabels;
  }

  set allowsDuplicateLabels(value: boolean) {
    getState(this._obj).allowsDuplicateLabels = value;
    if (!value) {
      this._validateNoDuplicates();
    }
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  /**
   * Raise `DuplicateLabelError` if the bound object currently has duplicate
   * row-index labels.
   */
  private _validateNoDuplicates(): void {
    const { values } = this._obj.index;
    const seen = new Set<unknown>();
    for (const label of values) {
      if (seen.has(label)) {
        throw new DuplicateLabelError(`Index has duplicate keys: [${String(label)}]`);
      }
      seen.add(label);
    }
  }

  /**
   * Raise `DuplicateLabelError` if `allowsDuplicateLabels` is `false` and
   * the bound object has duplicate labels. Called by DataFrame/Series methods
   * after operations that could introduce duplicates.
   */
  raiseOnDuplicates(): void {
    if (!this.allowsDuplicateLabels) {
      this._validateNoDuplicates();
    }
  }

  /**
   * Return a copy of this Flags object bound to the **same** underlying object.
   *
   * The returned `Flags` shares state with the original — mutations to either
   * are reflected in both (they both write to the same WeakMap entry).
   */
  copy(): Flags {
    return new Flags(this._obj);
  }

  /** Human-readable representation mirroring pandas' `repr(df.flags)`. */
  toString(): string {
    return `<Flags(allows_duplicate_labels=${this.allowsDuplicateLabels})>`;
  }
}

// ---------------------------------------------------------------------------
// Registry accessor (used by DataFrame.flags / Series.flags getters)
// ---------------------------------------------------------------------------

/**
 * Return (or lazily create) the `Flags` wrapper for the given object.
 *
 * Each call creates a *new* `Flags` wrapper object, but all wrappers for the
 * same `obj` share the same state via the module-level WeakMap registry.
 *
 * @param obj - The DataFrame or Series to get flags for.
 */
export function getFlags(obj: FlaggedObject): Flags {
  return new Flags(obj);
}
