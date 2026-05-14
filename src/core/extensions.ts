/**
 * extensions — `pd.api.extensions` namespace, mirroring `pandas.api.extensions`.
 *
 * Provides abstract base classes for building custom array types and dtypes
 * that integrate with tsb DataFrames and Series, as well as accessor
 * registration decorators.
 *
 * @example
 * ```ts
 * import { api } from "tsb";
 * // Access through the api namespace:
 * const { ExtensionDtype, ExtensionArray, registerExtensionDtype } = api.extensions;
 * ```
 *
 * @module
 */

import type { Scalar } from "../types.ts";

// ─── ExtensionDtype ───────────────────────────────────────────────────────────

/**
 * Abstract base class for custom dtypes.
 *
 * Mirrors `pandas.api.extensions.ExtensionDtype`. Custom dtypes must subclass
 * this and implement all abstract members.
 *
 * @example
 * ```ts
 * class IPDtype extends ExtensionDtype {
 *   get name() { return "ip"; }
 *   get type() { return Object; }
 *   get kind() { return "O" as const; }
 *   static construct_array_type() { return IPArray; }
 * }
 * ```
 */
export abstract class ExtensionDtype {
  /** The name of the dtype, e.g. `"ip"` or `"geometry"`. */
  abstract get name(): string;

  /**
   * The scalar type for the array — the JavaScript class that represents
   * individual elements (e.g. `Number`, `String`, or a custom class).
   */
  abstract get type(): abstract new (
    ...args: readonly unknown[]
  ) => unknown;

  /**
   * A single character code that categorises the dtype, following NumPy
   * conventions: `"b"` bool, `"i"` signed int, `"u"` unsigned int,
   * `"f"` float, `"c"` complex, `"m"` timedelta, `"M"` datetime,
   * `"O"` object, `"S"` byte-string, `"U"` unicode string.
   *
   * Custom extension dtypes typically return `"O"`.
   */
  abstract get kind(): string;

  /**
   * Whether this dtype is considered "numeric" for tsb operations.
   * Defaults to `false`.
   */
  get isNumeric(): boolean {
    return false;
  }

  /** Whether the dtype can hold missing values. Defaults to `true`. */
  get naMissingValue(): Scalar | null {
    return null;
  }

  /**
   * Return a string representation of the dtype.
   * Defaults to the value of `name`.
   */
  toString(): string {
    return this.name;
  }

  /**
   * Return the array type associated with this dtype.
   *
   * Used by tsb internally when constructing arrays of this type.
   * Override in subclasses or use {@link registerExtensionDtype}.
   */
  static construct_array_type(): abstract new (data: readonly unknown[]) => ExtensionArray {
    throw new Error("construct_array_type must be overridden in subclasses");
  }

  /**
   * Construct this dtype from a string representation.
   *
   * Override to support dtype strings like `"ip[v4]"`.
   * Returns `null` if the string cannot be parsed by this dtype.
   */
  static construct_from_string(_dtype: string): ExtensionDtype | null {
    return null;
  }
}

// ─── ExtensionArray ───────────────────────────────────────────────────────────

/**
 * Abstract base class for custom 1-D array types.
 *
 * Mirrors `pandas.api.extensions.ExtensionArray`. Custom array types must
 * subclass this and implement the required abstract members to integrate with
 * tsb Series and DataFrames.
 *
 * @example
 * ```ts
 * class IPArray extends ExtensionArray {
 *   readonly _data: readonly string[];
 *   constructor(data: readonly string[]) {
 *     super();
 *     this._data = data;
 *   }
 *   get dtype() { return new IPDtype(); }
 *   get length() { return this._data.length; }
 *   getItem(i: number): string | null { return this._data[i] ?? null; }
 *   slice(start: number, stop: number): IPArray {
 *     return new IPArray(this._data.slice(start, stop));
 *   }
 * }
 * ```
 */
export abstract class ExtensionArray {
  /**
   * The dtype of this array. Must return an instance of a class that extends
   * {@link ExtensionDtype}.
   */
  abstract get dtype(): ExtensionDtype;

  /** The number of elements in the array. */
  abstract get length(): number;

  /**
   * Return the element at index `i`, or `null` / `undefined` for missing.
   * Negative indices count from the end.
   */
  abstract getItem(i: number): unknown;

  /**
   * Return a new ExtensionArray containing elements `[start, stop)`.
   * Both bounds follow standard slice semantics (may be negative).
   */
  abstract slice(start: number, stop: number): ExtensionArray;

  /**
   * Return `true` for each element that is missing (NA).
   *
   * The default implementation checks for `null` and `undefined`.
   */
  isna(): readonly boolean[] {
    const result: boolean[] = [];
    for (let i = 0; i < this.length; i++) {
      const v = this.getItem(i);
      result.push(v === null || v === undefined);
    }
    return result;
  }

  /**
   * Return a copy of the array with missing values filled with `value`.
   *
   * Subclasses should override this for efficient typed filling.
   * The default implementation returns `this` unchanged.
   */
  fillna(_value: unknown): ExtensionArray {
    return this;
  }

  /**
   * Return an array of raw JavaScript values (one per element).
   * Used by tsb when it needs a plain array representation.
   */
  toArray(): readonly unknown[] {
    const out: unknown[] = [];
    for (let i = 0; i < this.length; i++) {
      out.push(this.getItem(i));
    }
    return out;
  }

  /**
   * Human-readable string representation.
   */
  toString(): string {
    return `${this.constructor.name}(length=${this.length}, dtype=${this.dtype})`;
  }
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/** Map from dtype name → ExtensionDtype subclass constructor. */
const _dtypeRegistry = new Map<string, { new (): ExtensionDtype } & typeof ExtensionDtype>();

/**
 * Register a custom {@link ExtensionDtype} subclass so that tsb can
 * resolve it from a dtype string.
 *
 * Mirrors `pandas.api.extensions.register_extension_dtype`.
 *
 * @example
 * ```ts
 * registerExtensionDtype(IPDtype);
 * // Now Dtype.from("ip") will try IPDtype.construct_from_string("ip")
 * ```
 */
export function registerExtensionDtype(
  dtypeClass: { new (): ExtensionDtype } & typeof ExtensionDtype,
): void {
  const instance = new dtypeClass();
  _dtypeRegistry.set(instance.name, dtypeClass);
}

/**
 * Attempt to construct an {@link ExtensionDtype} from a string using all
 * registered extension dtypes.
 *
 * Returns `null` if no registered dtype can handle the string.
 */
export function constructExtensionDtypeFromString(dtypeStr: string): ExtensionDtype | null {
  for (const dtypeClass of _dtypeRegistry.values()) {
    const result = dtypeClass.construct_from_string(dtypeStr);
    if (result !== null) {
      return result;
    }
  }
  return null;
}

// ─── Accessor Registration ────────────────────────────────────────────────────

/**
 * Registered custom accessors keyed by target ("series" | "dataframe" | "index")
 * and accessor name.
 */
const _accessorRegistry = new Map<string, Map<string, new (obj: unknown) => unknown>>();

function _getAccessorMap(target: string): Map<string, new (obj: unknown) => unknown> {
  let m = _accessorRegistry.get(target);
  if (m === undefined) {
    m = new Map();
    _accessorRegistry.set(target, m);
  }
  return m;
}

/**
 * Register a custom accessor class on `Series` objects.
 *
 * Mirrors `pandas.api.extensions.register_series_accessor`.
 *
 * After registration, `series.<name>` returns an instance of `accessorClass`
 * constructed with the Series as its argument. Note: tsb does not yet
 * dynamically attach properties at runtime — use the registry programmatically
 * via {@link getRegisteredAccessors}.
 *
 * @example
 * ```ts
 * registerSeriesAccessor("geo", GeoSeriesAccessor);
 * ```
 */
export function registerSeriesAccessor(
  name: string,
  accessorClass: new (obj: unknown) => unknown,
): void {
  _getAccessorMap("series").set(name, accessorClass);
}

/**
 * Register a custom accessor class on `DataFrame` objects.
 *
 * Mirrors `pandas.api.extensions.register_dataframe_accessor`.
 *
 * @example
 * ```ts
 * registerDataFrameAccessor("plot", PlotAccessor);
 * ```
 */
export function registerDataFrameAccessor(
  name: string,
  accessorClass: new (obj: unknown) => unknown,
): void {
  _getAccessorMap("dataframe").set(name, accessorClass);
}

/**
 * Register a custom accessor class on `Index` objects.
 *
 * Mirrors `pandas.api.extensions.register_index_accessor`.
 *
 * @example
 * ```ts
 * registerIndexAccessor("geo", GeoIndexAccessor);
 * ```
 */
export function registerIndexAccessor(
  name: string,
  accessorClass: new (obj: unknown) => unknown,
): void {
  _getAccessorMap("index").set(name, accessorClass);
}

/**
 * Return all accessor registrations for the given target.
 *
 * `target` must be one of `"series"`, `"dataframe"`, or `"index"`.
 * Returns a `Map<name, accessorClass>`, or an empty map if none are registered.
 */
export function getRegisteredAccessors(
  target: "series" | "dataframe" | "index",
): ReadonlyMap<string, new (obj: unknown) => unknown> {
  return _getAccessorMap(target);
}

// ─── api.extensions namespace object ─────────────────────────────────────────

/**
 * The `api.extensions` sub-namespace — mirrors `pandas.api.extensions`.
 */
export const apiExtensions = {
  ExtensionDtype,
  ExtensionArray,
  registerExtensionDtype,
  constructExtensionDtypeFromString,
  registerSeriesAccessor,
  registerDataFrameAccessor,
  registerIndexAccessor,
  getRegisteredAccessors,
} as const;

export type ApiExtensions = typeof apiExtensions;

// ─── Utility types ────────────────────────────────────────────────────────────

/** Type-level helper: any concrete subclass of {@link ExtensionDtype}. */
export type ExtensionDtypeConstructor = { new (): ExtensionDtype } & typeof ExtensionDtype;

/** Type-level helper: any concrete subclass of {@link ExtensionArray}. */
export type ExtensionArrayConstructor = new (data: readonly unknown[]) => ExtensionArray;
