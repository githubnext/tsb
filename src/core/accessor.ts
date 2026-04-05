/**
 * Accessor registration API — mirrors `pandas.api.extensions`.
 *
 * Provides decorator-style functions to register custom accessors on
 * `DataFrame`, `Series`, and `Index` objects, mirroring pandas'
 * `register_dataframe_accessor`, `register_series_accessor`, and
 * `register_index_accessor`.
 *
 * @example
 * ```ts
 * const geo = registerSeriesAccessor("geo", (s) => new GeoAccessor(s));
 * // s.geo.distance(...)
 * ```
 */

import type { Label, Scalar } from "../types.ts";
import type { Index } from "./base-index.ts";
import type { DataFrame } from "./frame.ts";
import type { Series } from "./series.ts";

// ─── accessor factories ───────────────────────────────────────────────────────

/** Factory function that builds an accessor from a `Series`. */
export type SeriesAccessorFactory<T> = (series: Series<Scalar>) => T;

/** Factory function that builds an accessor from a `DataFrame`. */
export type DataFrameAccessorFactory<T> = (frame: DataFrame) => T;

/** Factory function that builds an accessor from an `Index`. */
export type IndexAccessorFactory<T> = (index: Index<Label>) => T;

// ─── registry ──────────────────────────────────────────────────────────────────

/** Registered Series accessors: name → factory. */
const _seriesRegistry = new Map<string, SeriesAccessorFactory<unknown>>();

/** Registered DataFrame accessors: name → factory. */
const _dataFrameRegistry = new Map<string, DataFrameAccessorFactory<unknown>>();

/** Registered Index accessors: name → factory. */
const _indexRegistry = new Map<string, IndexAccessorFactory<unknown>>();

// ─── registration helpers ─────────────────────────────────────────────────────

/**
 * Register a custom accessor for `Series` objects.
 *
 * The accessor is lazily instantiated on first access via `getSeriesAccessor`.
 *
 * @param name - Attribute name for the accessor.
 * @param factory - Factory that receives the `Series` and returns the accessor.
 *
 * @example
 * ```ts
 * registerSeriesAccessor("geo", (s) => ({ lat: () => s.iloc(0) }));
 * ```
 */
export function registerSeriesAccessor<T>(name: string, factory: SeriesAccessorFactory<T>): void {
  if (_seriesRegistry.has(name)) {
    throw new Error(`Series accessor '${name}' is already registered.`);
  }
  _seriesRegistry.set(name, factory as SeriesAccessorFactory<unknown>);
}

/**
 * Register a custom accessor for `DataFrame` objects.
 *
 * @param name - Attribute name for the accessor.
 * @param factory - Factory that receives the `DataFrame` and returns the accessor.
 */
export function registerDataFrameAccessor<T>(
  name: string,
  factory: DataFrameAccessorFactory<T>,
): void {
  if (_dataFrameRegistry.has(name)) {
    throw new Error(`DataFrame accessor '${name}' is already registered.`);
  }
  _dataFrameRegistry.set(name, factory as DataFrameAccessorFactory<unknown>);
}

/**
 * Register a custom accessor for `Index` objects.
 *
 * @param name - Attribute name for the accessor.
 * @param factory - Factory that receives the `Index` and returns the accessor.
 */
export function registerIndexAccessor<T>(name: string, factory: IndexAccessorFactory<T>): void {
  if (_indexRegistry.has(name)) {
    throw new Error(`Index accessor '${name}' is already registered.`);
  }
  _indexRegistry.set(name, factory as IndexAccessorFactory<unknown>);
}

// ─── accessor lookups ─────────────────────────────────────────────────────────

/**
 * Retrieve a registered Series accessor instance for a given series.
 *
 * @throws If `name` has not been registered.
 */
export function getSeriesAccessor<T>(name: string, series: Series<Scalar>): T {
  const factory = _seriesRegistry.get(name);
  if (factory === undefined) {
    throw new Error(`No Series accessor registered under '${name}'.`);
  }
  return factory(series) as T;
}

/**
 * Retrieve a registered DataFrame accessor instance for a given frame.
 *
 * @throws If `name` has not been registered.
 */
export function getDataFrameAccessor<T>(name: string, frame: DataFrame): T {
  const factory = _dataFrameRegistry.get(name);
  if (factory === undefined) {
    throw new Error(`No DataFrame accessor registered under '${name}'.`);
  }
  return factory(frame) as T;
}

/**
 * Retrieve a registered Index accessor instance for a given index.
 *
 * @throws If `name` has not been registered.
 */
export function getIndexAccessor<T>(name: string, index: Index<Label>): T {
  const factory = _indexRegistry.get(name);
  if (factory === undefined) {
    throw new Error(`No Index accessor registered under '${name}'.`);
  }
  return factory(index) as T;
}

// ─── deregistration (testing / overrides) ────────────────────────────────────

/**
 * Remove all registered accessors.  Primarily for use in tests.
 */
export function clearAccessorRegistry(): void {
  _seriesRegistry.clear();
  _dataFrameRegistry.clear();
  _indexRegistry.clear();
}

/**
 * Remove a named Series accessor from the registry.
 */
export function deregisterSeriesAccessor(name: string): void {
  _seriesRegistry.delete(name);
}

/**
 * Remove a named DataFrame accessor from the registry.
 */
export function deregisterDataFrameAccessor(name: string): void {
  _dataFrameRegistry.delete(name);
}

/**
 * Remove a named Index accessor from the registry.
 */
export function deregisterIndexAccessor(name: string): void {
  _indexRegistry.delete(name);
}

// ─── introspection ────────────────────────────────────────────────────────────

/** Return the names of all registered Series accessors. */
export function listSeriesAccessors(): string[] {
  return [..._seriesRegistry.keys()];
}

/** Return the names of all registered DataFrame accessors. */
export function listDataFrameAccessors(): string[] {
  return [..._dataFrameRegistry.keys()];
}

/** Return the names of all registered Index accessors. */
export function listIndexAccessors(): string[] {
  return [..._indexRegistry.keys()];
}
