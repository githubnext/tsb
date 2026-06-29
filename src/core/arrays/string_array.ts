/**
 * StringArray — nullable string extension array.
 *
 * Mirrors `pandas.arrays.StringArray`. Stores string values with a separate
 * mask for missing (NA) values.
 *
 * @example
 * ```ts
 * import { arrays } from "tsb";
 *
 * const a = arrays.StringArray.from(["hello", null, "world"]);
 * a.dtype;               // "string"
 * a.at(1);               // null
 * a.upper().toArray();   // ["HELLO", null, "WORLD"]
 * a.fillna("").toArray(); // ["hello", "", "world"]
 * ```
 *
 * @module
 */

import { BooleanArray } from "./boolean_array.ts";
import { IntegerArray } from "./integer_array.ts";
import { MaskedArray } from "./masked_array.ts";

// ─── StringArray ──────────────────────────────────────────────────────────────

/**
 * A nullable string array.
 *
 * Use {@link StringArray.from} to create instances.
 */
export class StringArray extends MaskedArray<string> {
  // ─── Factory ───────────────────────────────────────────────────────────────

  /**
   * Create a {@link StringArray} from a sequence of string values (or null/undefined).
   *
   * @example
   * ```ts
   * StringArray.from(["a", "b", null, "d"]);
   * ```
   */
  static from(values: Iterable<string | null | undefined>): StringArray {
    const data: string[] = [];
    const mask: boolean[] = [];
    for (const v of values) {
      if (v === null || v === undefined) {
        data.push("");
        mask.push(true);
      } else {
        data.push(String(v));
        mask.push(false);
      }
    }
    return new StringArray(data, mask);
  }

  /** @internal */
  static _fromRaw(data: string[], mask: boolean[]): StringArray {
    return new StringArray(data, mask);
  }

  // ─── Dtype ────────────────────────────────────────────────────────────────

  get dtype(): "string" {
    return "string";
  }

  // ─── String operations ────────────────────────────────────────────────────

  /** Return a new StringArray with all strings uppercased.  NA is preserved. */
  upper(): StringArray {
    return this._mapStr((s) => s.toUpperCase());
  }

  /** Return a new StringArray with all strings lowercased.  NA is preserved. */
  lower(): StringArray {
    return this._mapStr((s) => s.toLowerCase());
  }

  /** Return a new StringArray with leading/trailing whitespace stripped. */
  strip(): StringArray {
    return this._mapStr((s) => s.trim());
  }

  /** Return a new StringArray with leading whitespace stripped. */
  lstrip(): StringArray {
    return this._mapStr((s) => s.trimStart());
  }

  /** Return a new StringArray with trailing whitespace stripped. */
  rstrip(): StringArray {
    return this._mapStr((s) => s.trimEnd());
  }

  /**
   * Return a {@link BooleanArray} where `true` if the element contains `pattern`.
   * NA elements remain NA in the result.
   *
   * @example
   * ```ts
   * StringArray.from(["abc", null, "xyz"]).contains("a");
   * // BooleanArray [true, null, false]
   * ```
   */
  contains(pattern: string | RegExp): BooleanArray {
    const data: boolean[] = [];
    const mask: boolean[] = [];
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        data.push(false);
        mask.push(true);
      } else {
        const s = this._data[i] as string;
        data.push(typeof pattern === "string" ? s.includes(pattern) : pattern.test(s));
        mask.push(false);
      }
    }
    return BooleanArray._fromRaw(data, mask);
  }

  /**
   * Return a BooleanArray where `true` if the element starts with `prefix`.
   */
  startswith(prefix: string): BooleanArray {
    const data: boolean[] = [];
    const mask: boolean[] = [];
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        data.push(false);
        mask.push(true);
      } else {
        data.push((this._data[i] as string).startsWith(prefix));
        mask.push(false);
      }
    }
    return BooleanArray._fromRaw(data, mask);
  }

  /**
   * Return a BooleanArray where `true` if the element ends with `suffix`.
   */
  endswith(suffix: string): BooleanArray {
    const data: boolean[] = [];
    const mask: boolean[] = [];
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        data.push(false);
        mask.push(true);
      } else {
        data.push((this._data[i] as string).endsWith(suffix));
        mask.push(false);
      }
    }
    return BooleanArray._fromRaw(data, mask);
  }

  /**
   * Return a new StringArray with occurrences of `pat` replaced by `repl`.
   */
  replace(pat: string | RegExp, repl: string): StringArray {
    if (typeof pat === "string") {
      return this._mapStr((s) => s.replaceAll(pat, repl));
    }
    // Ensure the regex has the global flag so all occurrences are replaced.
    const globalPat = pat.flags.includes("g") ? pat : new RegExp(pat.source, `${pat.flags}g`);
    return this._mapStr((s) => s.replace(globalPat, repl));
  }

  /** Return a StringArray with strings zero-padded on the left to `width`. */
  zfill(width: number): StringArray {
    return this._mapStr((s) => s.padStart(width, "0"));
  }

  /**
   * String length for each element as an {@link IntegerArray} (NA → NA).
   *
   * @example
   * ```ts
   * StringArray.from(["hi", null, "world"]).len().toArray(); // [2, null, 5]
   * ```
   */
  len(): IntegerArray {
    const data: number[] = [];
    const mask: boolean[] = [];
    for (let i = 0; i < this._data.length; i++) {
      data.push(this._mask[i] ? 0 : (this._data[i] as string).length);
      mask.push(this._mask[i] === true);
    }
    return IntegerArray._fromRaw(data, mask, "Int64");
  }

  /**
   * Concatenate strings element-wise with a separator.
   *
   * @example
   * ```ts
   * StringArray.from(["a", "b"]).cat(" ", StringArray.from(["x", "y"]));
   * // StringArray ["a x", "b y"]
   * ```
   */
  cat(sep: string, other: StringArray): StringArray {
    if (other.size !== this.size) {
      throw new RangeError(`StringArray.cat: size mismatch (${this.size} vs ${other.size})`);
    }
    const data: string[] = [];
    const mask: boolean[] = [];
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i] || other._mask[i]) {
        data.push("");
        mask.push(true);
      } else {
        data.push((this._data[i] as string) + sep + (other._data[i] as string));
        mask.push(false);
      }
    }
    return StringArray._fromRaw(data, mask);
  }

  /**
   * Return a new StringArray with NA elements replaced.
   *
   * @example
   * ```ts
   * StringArray.from(["a", null, "c"]).fillna("x").toArray();
   * // ["a", "x", "c"]
   * ```
   */
  fillna(value: string): StringArray {
    const data = this._data.map((v, i) => (this._mask[i] ? value : v));
    const mask = new Array<boolean>(data.length).fill(false);
    return StringArray._fromRaw(data, mask);
  }

  // ─── Reductions ───────────────────────────────────────────────────────────

  /** Count of non-NA elements. */
  count(): number {
    return this._mask.filter((m) => !m).length;
  }

  // ─── Internal helper ──────────────────────────────────────────────────────

  private _mapStr(fn: (s: string) => string): StringArray {
    const data = this._data.map((v, i) => (this._mask[i] ? "" : fn(v as string)));
    return StringArray._fromRaw(data, this._mask.slice());
  }
}
