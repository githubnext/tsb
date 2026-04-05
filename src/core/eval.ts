/**
 * eval — expression evaluator and query filter for DataFrame.
 *
 * Mirrors `pandas.DataFrame.eval()` and `pandas.DataFrame.query()`:
 * - `evalDataFrame(df, "a + b")` evaluates a string expression against the
 *   DataFrame's columns and returns a new `Series`.
 * - `queryDataFrame(df, "age > 25")` filters rows where the boolean
 *   expression is true.
 *
 * Supported syntax:
 * - Column references by name (backtick-quoted for names with spaces)
 * - Numeric literals: `42`, `3.14`, `1e-3`
 * - String literals: `'hello'`, `"hello"`
 * - Boolean literals: `true`, `false`
 * - Arithmetic: `+`, `-`, `*`, `/`, `**`, `%`
 * - Comparison: `<`, `>`, `<=`, `>=`, `==`, `!=`
 * - Logical: `and`, `or`, `not`, `&&`, `||`, `!`
 * - Bitwise/nullable: `&`, `|`, `~`
 * - Parentheses for grouping
 *
 * @example
 * ```ts
 * import { DataFrame, evalDataFrame, queryDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 *
 * evalDataFrame(df, "a + b").values;  // [5, 7, 9]
 * queryDataFrame(df, "a > 1").shape;  // [2, 2]
 * ```
 */

import type { Label, Scalar } from "../types.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── token types ─────────────────────────────────────────────────────────────

type TokenKind = "num" | "str" | "ident" | "op" | "lparen" | "rparen" | "eof";

interface Token {
  readonly kind: TokenKind;
  readonly value: string;
}

// ─── AST types ────────────────────────────────────────────────────────────────

type Expr =
  | { readonly type: "num"; readonly value: number }
  | { readonly type: "str"; readonly value: string }
  | { readonly type: "bool"; readonly value: boolean }
  | { readonly type: "null" }
  | { readonly type: "ident"; readonly name: string }
  | { readonly type: "unary"; readonly op: string; readonly expr: Expr }
  | { readonly type: "binary"; readonly op: string; readonly left: Expr; readonly right: Expr };

// ─── regexes (module-top for biome useTopLevelRegex) ─────────────────────────

const NUM_RE = /^\d+(\.\d+)?([eE][+-]?\d+)?/;
const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*/;
const STR_SQ_RE = /^'(?:[^'\\]|\\.)*'/;
const STR_DQ_RE = /^"(?:[^"\\]|\\.)*"/;
const BACKTICK_RE = /^`(?:[^`])*`/;
const SPACES_RE = /^\s+/;

// ─── tokenizer ───────────────────────────────────────────────────────────────

/** Extract the next token starting at position `pos` in `src`. */
function nextToken(src: string, pos: number): { token: Token; end: number } | null {
  const rest = src.slice(pos);
  if (rest.length === 0) {
    return { token: { kind: "eof", value: "" }, end: pos };
  }

  // Skip whitespace
  const wsMatch = SPACES_RE.exec(rest);
  if (wsMatch !== null) {
    return nextToken(src, pos + wsMatch[0].length);
  }

  // Backtick-quoted identifier
  const btMatch = BACKTICK_RE.exec(rest);
  if (btMatch !== null) {
    return {
      token: { kind: "ident", value: btMatch[0].slice(1, -1) },
      end: pos + btMatch[0].length,
    };
  }

  // String literals
  const sqMatch = STR_SQ_RE.exec(rest);
  if (sqMatch !== null) {
    return {
      token: { kind: "str", value: sqMatch[0].slice(1, -1).replace(/\\'/g, "'") },
      end: pos + sqMatch[0].length,
    };
  }
  const dqMatch = STR_DQ_RE.exec(rest);
  if (dqMatch !== null) {
    return {
      token: { kind: "str", value: dqMatch[0].slice(1, -1).replace(/\\"/g, '"') },
      end: pos + dqMatch[0].length,
    };
  }

  // Number
  const numMatch = NUM_RE.exec(rest);
  if (numMatch !== null) {
    return {
      token: { kind: "num", value: numMatch[0] },
      end: pos + numMatch[0].length,
    };
  }

  // Identifier / keyword
  const idMatch = IDENT_RE.exec(rest);
  if (idMatch !== null) {
    return {
      token: { kind: "ident", value: idMatch[0] },
      end: pos + idMatch[0].length,
    };
  }

  // Multi-char operators first
  const twoChar = rest.slice(0, 2);
  if (["<=", ">=", "==", "!=", "**", "&&", "||"].includes(twoChar)) {
    return { token: { kind: "op", value: twoChar }, end: pos + 2 };
  }

  // Single-char operators
  const one = rest[0] ?? "";
  if ("+-*/%<>&|~!".includes(one)) {
    return { token: { kind: "op", value: one }, end: pos + 1 };
  }
  if (one === "(") {
    return { token: { kind: "lparen", value: "(" }, end: pos + 1 };
  }
  if (one === ")") {
    return { token: { kind: "rparen", value: ")" }, end: pos + 1 };
  }

  throw new SyntaxError(`Unexpected character '${one}' at position ${pos}`);
}

/** Tokenize a full expression string. */
function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  for (;;) {
    const result = nextToken(src, pos);
    if (result === null) {
      break;
    }
    tokens.push(result.token);
    if (result.token.kind === "eof") {
      break;
    }
    pos = result.end;
  }
  return tokens;
}

// ─── parser ───────────────────────────────────────────────────────────────────

class Parser {
  private readonly tokens: readonly Token[];
  private pos = 0;

  constructor(tokens: readonly Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { kind: "eof", value: "" };
  }

  private consume(): Token {
    const tok = this.peek();
    this.pos++;
    return tok;
  }

  private expect(kind: TokenKind, value?: string): Token {
    const tok = this.peek();
    if (tok.kind !== kind || (value !== undefined && tok.value !== value)) {
      throw new SyntaxError(
        `Expected ${kind}${value !== undefined ? ` '${value}'` : ""}, got '${tok.value}'`,
      );
    }
    return this.consume();
  }

  parse(): Expr {
    const expr = this.parseOr();
    const leftover = this.peek();
    if (leftover.kind !== "eof") {
      throw new SyntaxError(`Unexpected token '${leftover.value}'`);
    }
    return expr;
  }

  private parseOr(): Expr {
    let left = this.parseAnd();
    for (;;) {
      const tok = this.peek();
      const isOr =
        (tok.kind === "ident" && tok.value === "or") || (tok.kind === "op" && tok.value === "||");
      if (!isOr) {
        break;
      }
      this.consume();
      const right = this.parseAnd();
      left = { type: "binary", op: "or", left, right };
    }
    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseNot();
    for (;;) {
      const tok = this.peek();
      const isAnd =
        (tok.kind === "ident" && tok.value === "and") || (tok.kind === "op" && tok.value === "&&");
      if (!isAnd) {
        break;
      }
      this.consume();
      const right = this.parseNot();
      left = { type: "binary", op: "and", left, right };
    }
    return left;
  }

  private parseNot(): Expr {
    const tok = this.peek();
    const isNot =
      (tok.kind === "ident" && tok.value === "not") || (tok.kind === "op" && tok.value === "!");
    if (isNot) {
      this.consume();
      return { type: "unary", op: "not", expr: this.parseNot() };
    }
    return this.parseCompare();
  }

  private parseCompare(): Expr {
    const left = this.parseAdd();
    const tok = this.peek();
    if (tok.kind === "op" && ["<", ">", "<=", ">=", "==", "!="].includes(tok.value)) {
      this.consume();
      const right = this.parseAdd();
      return { type: "binary", op: tok.value, left, right };
    }
    return left;
  }

  private parseAdd(): Expr {
    let left = this.parseMul();
    for (;;) {
      const tok = this.peek();
      if (tok.kind !== "op" || (tok.value !== "+" && tok.value !== "-")) {
        break;
      }
      this.consume();
      const right = this.parseMul();
      left = { type: "binary", op: tok.value, left, right };
    }
    return left;
  }

  private parseMul(): Expr {
    let left = this.parsePow();
    for (;;) {
      const tok = this.peek();
      if (tok.kind !== "op" || !["*", "/", "%", "&", "|"].includes(tok.value)) {
        break;
      }
      this.consume();
      const right = this.parsePow();
      left = { type: "binary", op: tok.value, left, right };
    }
    return left;
  }

  private parsePow(): Expr {
    const base = this.parseUnary();
    const tok = this.peek();
    if (tok.kind === "op" && tok.value === "**") {
      this.consume();
      const exp = this.parseUnary();
      return { type: "binary", op: "**", left: base, right: exp };
    }
    return base;
  }

  private parseUnary(): Expr {
    const tok = this.peek();
    if (tok.kind === "op" && (tok.value === "-" || tok.value === "~")) {
      this.consume();
      return { type: "unary", op: tok.value, expr: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expr {
    const tok = this.peek();

    if (tok.kind === "num") {
      this.consume();
      return { type: "num", value: Number(tok.value) };
    }
    if (tok.kind === "str") {
      this.consume();
      return { type: "str", value: tok.value };
    }
    if (tok.kind === "ident") {
      this.consume();
      if (tok.value === "true") {
        return { type: "bool", value: true };
      }
      if (tok.value === "false") {
        return { type: "bool", value: false };
      }
      if (tok.value === "null" || tok.value === "None") {
        return { type: "null" };
      }
      if (tok.value === "nan" || tok.value === "NaN") {
        return { type: "num", value: Number.NaN };
      }
      return { type: "ident", name: tok.value };
    }
    if (tok.kind === "lparen") {
      this.consume();
      const inner = this.parseOr();
      this.expect("rparen");
      return inner;
    }

    throw new SyntaxError(`Unexpected token '${tok.value}' (kind: ${tok.kind})`);
  }
}

// ─── evaluator ───────────────────────────────────────────────────────────────

/** Evaluate arithmetic operators (+, -, *, /, %, **). */
function evalArith(op: string, lv: Scalar, rv: Scalar): Scalar | undefined {
  const l = lv as number;
  const r = rv as number;
  if (op === "+") {
    return l + r;
  }
  if (op === "-") {
    return l - r;
  }
  if (op === "*") {
    return l * r;
  }
  if (op === "/") {
    return l / r;
  }
  if (op === "%") {
    return l % r;
  }
  if (op === "**") {
    return l ** r;
  }
  return undefined;
}

/** Evaluate comparison operators (<, >, <=, >=, ==, !=). */
function evalCompare(op: string, lv: Scalar, rv: Scalar): Scalar | undefined {
  // null/undefined propagation for ordering comparisons
  if (op === "==" ) { return lv === rv; }
  if (op === "!=" ) { return lv !== rv; }
  if (lv === null || lv === undefined || rv === null || rv === undefined) { return null; }
  const l = lv as number | string;
  const r = rv as number | string;
  if (op === "<") { return l < r; }
  if (op === ">") { return l > r; }
  if (op === "<=") { return l <= r; }
  if (op === ">=") { return l >= r; }
  return undefined;
}

/** Evaluate a binary operation on two scalars. */
function evalBinaryOp(op: string, lv: Scalar, rv: Scalar): Scalar {
  const arith = evalArith(op, lv, rv);
  if (arith !== undefined) {
    return arith;
  }
  const cmp = evalCompare(op, lv, rv);
  if (cmp !== undefined) {
    return cmp;
  }
  if (op === "and" || op === "&&") {
    return Boolean(lv) && Boolean(rv);
  }
  if (op === "or" || op === "||") {
    return Boolean(lv) || Boolean(rv);
  }
  if (op === "&") {
    return (lv as number) & (rv as number);
  }
  if (op === "|") {
    return (lv as number) | (rv as number);
  }
  throw new Error(`Unknown operator: '${op}'`);
}

/** Evaluate a single expression node against a row binding. */
function evalNode(node: Expr, row: ReadonlyMap<string, Scalar>): Scalar {
  switch (node.type) {
    case "num":
      return node.value;
    case "str":
      return node.value;
    case "bool":
      return node.value;
    case "null":
      return null;
    case "ident": {
      if (!row.has(node.name)) {
        throw new ReferenceError(`Column '${node.name}' not found`);
      }
      return row.get(node.name) as Scalar;
    }
    case "unary": {
      const v = evalNode(node.expr, row);
      if (node.op === "-") {
        return -(v as number);
      }
      if (node.op === "~") {
        return ~(v as number);
      }
      if (node.op === "not" || node.op === "!") {
        return !v;
      }
      throw new Error(`Unknown unary op: '${node.op}'`);
    }
    case "binary": {
      const lv = evalNode(node.left, row);
      const rv = evalNode(node.right, row);
      return evalBinaryOp(node.op, lv, rv);
    }
    default: {
      const _exhaustive: never = node;
      throw new Error(`Unknown node type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Evaluate a string expression against the columns of a `DataFrame`.
 *
 * Each row is evaluated independently.  Column names are resolved from the
 * DataFrame's column axis.  The result is a `Series` with the same index as
 * the DataFrame.
 *
 * @param df   - Source DataFrame.
 * @param expr - Expression string.
 * @returns    A `Series<Scalar>` with one value per row.
 * @throws {SyntaxError}    if the expression cannot be parsed.
 * @throws {ReferenceError} if a column referenced in the expression is not found.
 */
export function evalDataFrame(df: DataFrame, expr: string): Series<Scalar> {
  const ast = new Parser(tokenize(expr)).parse();
  const colNames = df.columns.values;
  const colArrays = colNames.map((name) => df.col(name).values);
  const nRows = df.shape[0];

  const results: Scalar[] = [];
  for (let r = 0; r < nRows; r++) {
    const row = new Map<string, Scalar>();
    for (let c = 0; c < colNames.length; c++) {
      row.set(colNames[c] as string, colArrays[c]?.[r] ?? null);
    }
    results.push(evalNode(ast, row));
  }

  return new Series<Scalar>({ data: results, index: df.index });
}

/**
 * Filter a `DataFrame` to rows where the boolean `expr` evaluates to true.
 *
 * @param df   - Source DataFrame.
 * @param expr - Boolean expression string.
 * @returns    A filtered `DataFrame` containing only matching rows.
 * @throws {SyntaxError}    if the expression cannot be parsed.
 * @throws {ReferenceError} if a column referenced in the expression is not found.
 */
export function queryDataFrame(df: DataFrame, expr: string): DataFrame {
  const mask = evalDataFrame(df, expr);
  const keepPositions: number[] = [];
  for (let i = 0; i < mask.size; i++) {
    if (mask.values[i]) {
      keepPositions.push(i);
    }
  }

  const newColData: Record<string, readonly Scalar[]> = {};
  for (const name of df.columns.values) {
    const colVals = df.col(name).values;
    newColData[name] = keepPositions.map((p) => colVals[p] ?? null);
  }

  const oldIndexVals = df.index.values;
  const newIndexVals: Label[] = keepPositions.map((p) => oldIndexVals[p] ?? p);

  return DataFrame.fromColumns(newColData, { index: newIndexVals });
}
