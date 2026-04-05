/**
 * read_xml — parse an XML string and extract tabular data into a DataFrame.
 *
 * Mirrors `pandas.read_xml`: scans an XML string, selects row elements via an
 * optional XPath-like selector, and returns a single DataFrame whose columns
 * are the child-element names / attribute keys of the row elements.
 *
 * @example
 * ```ts
 * import { readXml } from "tsb";
 * const xml = `<root><row><a>1</a><b>foo</b></row><row><a>2</a><b>bar</b></row></root>`;
 * const df = readXml(xml);
 * df.col("a").values; // [1, 2]
 * ```
 */

import { DataFrame } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link readXml}. */
export interface ReadXmlOptions {
  /** XPath-like selector for row elements. Supports `//tagName` and `/a/b`. */
  xpath?: string;
  /** Include only child element text values (ignore attributes). Default: false */
  elemsOnly?: boolean;
  /** Include only attributes (ignore child element text). Default: false */
  attrsOnly?: boolean;
  /** Column names to override auto-detected names. */
  names?: string[];
  /** Strings to treat as NA. Default: `["", "NA", "N/A", "NaN", "null", "NULL", "None"]` */
  naValues?: string[];
}

// ─── internal types ───────────────────────────────────────────────────────────

type TokenType = "open" | "close" | "selfclose" | "text";

interface Token {
  type: TokenType;
  tag?: string;
  attrs?: Record<string, string>;
  text?: string;
}

interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

// ─── top-level regex constants ────────────────────────────────────────────────

/** Strip XML/HTML processing instructions: `<?…?>`. */
const RE_PROC_INSTR = /<\?[\s\S]*?\?>/g;

/** Strip XML/HTML comments: `<!-- … -->`. */
const RE_COMMENT = /<!--[\s\S]*?-->/g;

/** Strip DOCTYPE declarations. */
const RE_DOCTYPE = /<!DOCTYPE[^>]*>/gi;

/** Strip CDATA sections (keep the text content). */
const RE_CDATA = /<!\[CDATA\[([\s\S]*?)]]>/g;

/** Match a self-closing tag: `<tag …/>`. */
const RE_SELF_CLOSE = /^<([A-Za-z_][\w:.-]*)([\s\S]*?)\/>$/;

/** Match an opening tag: `<tag …>`. */
const RE_OPEN_TAG = /^<([A-Za-z_][\w:.-]*)([\s\S]*?)>$/;

/** Match a closing tag: `</tag>`. */
const RE_CLOSE_TAG = /^<\/([A-Za-z_][\w:.-]*)>$/;

/** Match attribute: name="value" or name='value'. */
const RE_ATTR = /([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

/** Match a numeric string. */
const RE_NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

// ─── defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_NA_VALUES: ReadonlySet<string> = new Set([
  "",
  "NA",
  "N/A",
  "NaN",
  "null",
  "NULL",
  "None",
]);

// ─── strip declarations ───────────────────────────────────────────────────────

/** Remove processing instructions, comments, DOCTYPE, and unwrap CDATA. */
function stripDeclarations(xml: string): string {
  let s = xml.replace(RE_PROC_INSTR, "");
  s = s.replace(RE_COMMENT, "");
  s = s.replace(RE_DOCTYPE, "");
  s = s.replace(RE_CDATA, "$1");
  return s;
}

// ─── attribute parser ──────────────────────────────────────────────────────────

/** Parse attributes from the attribute string of a tag. */
function parseAttrs(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  RE_ATTR.lastIndex = 0;
  let m = RE_ATTR.exec(attrStr);
  while (m !== null) {
    const name = m[1] ?? "";
    const val = m[2] !== undefined ? m[2] : (m[3] ?? "");
    if (name) {
      attrs[name] = val;
    }
    m = RE_ATTR.exec(attrStr);
  }
  return attrs;
}

// ─── tokenizer ────────────────────────────────────────────────────────────────

/** Scan an XML string and produce a flat Token array. */
function tokenize(xml: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = xml.length;

  while (i < len) {
    const lt = xml.indexOf("<", i);
    if (lt === -1) {
      const textChunk = xml.slice(i).trim();
      if (textChunk) {
        tokens.push({ type: "text", text: textChunk });
      }
      break;
    }
    if (lt > i) {
      const textChunk = xml.slice(i, lt).trim();
      if (textChunk) {
        tokens.push({ type: "text", text: textChunk });
      }
    }
    const gt = xml.indexOf(">", lt);
    if (gt === -1) {
      break;
    }
    const raw = xml.slice(lt, gt + 1);
    tokens.push(classifyTag(raw));
    i = gt + 1;
  }
  return tokens;
}

/** Classify a raw `<…>` string as open/close/selfclose token. */
function classifyTag(raw: string): Token {
  const closeM = RE_CLOSE_TAG.exec(raw);
  if (closeM !== null) {
    const tag = closeM[1];
    if (tag !== undefined) {
      return { type: "close", tag };
    }
  }
  const scM = RE_SELF_CLOSE.exec(raw);
  if (scM !== null) {
    const tag = scM[1];
    if (tag !== undefined) {
      return { type: "selfclose", tag, attrs: parseAttrs(scM[2] ?? "") };
    }
  }
  const openM = RE_OPEN_TAG.exec(raw);
  if (openM !== null) {
    const tag = openM[1];
    if (tag !== undefined) {
      return { type: "open", tag, attrs: parseAttrs(openM[2] ?? "") };
    }
  }
  return { type: "text", text: "" };
}

// ─── tree builder ──────────────────────────────────────────────────────────────

/** Handle a single token while building the tree. */
function applyToken(stack: XmlNode[], tok: Token): void {
  const current = stack.at(-1);
  if (current === undefined) {
    return;
  }
  if (tok.type === "open") {
    const node: XmlNode = { tag: tok.tag ?? "", attrs: tok.attrs ?? {}, children: [], text: "" };
    current.children.push(node);
    stack.push(node);
  } else if (tok.type === "selfclose") {
    const node: XmlNode = { tag: tok.tag ?? "", attrs: tok.attrs ?? {}, children: [], text: "" };
    current.children.push(node);
  } else if (tok.type === "close") {
    if (stack.length > 1) {
      stack.pop();
    }
  } else if (tok.type === "text") {
    current.text += (current.text ? " " : "") + (tok.text ?? "");
  }
}

/** Build an XmlNode tree from a Token array. */
function buildTree(tokens: Token[]): XmlNode | null {
  const rootNode: XmlNode = { tag: "__root__", attrs: {}, children: [], text: "" };
  const stack: XmlNode[] = [rootNode];

  for (const tok of tokens) {
    applyToken(stack, tok);
  }

  return rootNode;
}

// ─── xpath selectors ──────────────────────────────────────────────────────────

/** Collect all descendant nodes with a given tag name. */
function selectByTag(root: XmlNode, tagName: string): XmlNode[] {
  const result: XmlNode[] = [];
  const queue: XmlNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === undefined) {
      break;
    }
    if (node.tag === tagName) {
      result.push(node);
    }
    for (const child of node.children) {
      queue.push(child);
    }
  }
  return result;
}

/** Select nodes using a simple XPath-like expression. */
function selectXPath(root: XmlNode, xpath: string): XmlNode[] {
  if (xpath.startsWith("//")) {
    return selectByTag(root, xpath.slice(2));
  }
  const parts = xpath.split("/").filter((p) => p.length > 0);
  let current: XmlNode[] = [root];
  for (const part of parts) {
    const next: XmlNode[] = [];
    for (const node of current) {
      for (const child of node.children) {
        if (child.tag === part) {
          next.push(child);
        }
      }
    }
    current = next;
  }
  return current;
}

/** Auto-detect row nodes: most common repeated child tag of the XML document root. */
function autoSelectRows(virtualRoot: XmlNode): XmlNode[] {
  const xmlRoot = virtualRoot.children[0];
  if (xmlRoot === undefined) {
    return [];
  }
  const freq = new Map<string, number>();
  for (const child of xmlRoot.children) {
    freq.set(child.tag, (freq.get(child.tag) ?? 0) + 1);
  }
  if (freq.size === 0) {
    return [];
  }
  let bestTag = "";
  let bestCount = 0;
  for (const [tag, count] of freq) {
    if (count > bestCount) {
      bestCount = count;
      bestTag = tag;
    }
  }
  return xmlRoot.children.filter((c) => c.tag === bestTag);
}

// ─── record extraction ────────────────────────────────────────────────────────

/** Extract a flat string record from a row node. */
function nodeToRecord(
  node: XmlNode,
  elemsOnly: boolean,
  attrsOnly: boolean,
): Record<string, string> {
  const record: Record<string, string> = {};
  if (!attrsOnly) {
    for (const child of node.children) {
      const textVal = child.text || (child.children[0]?.text ?? "");
      record[child.tag] = textVal;
    }
  }
  if (!elemsOnly) {
    for (const [k, v] of Object.entries(node.attrs)) {
      record[k] = v;
    }
  }
  return record;
}

// ─── scalar inference ─────────────────────────────────────────────────────────

/** Convert a raw string value to a typed Scalar. */
function inferScalar(s: string, naValues: ReadonlySet<string>): Scalar {
  if (naValues.has(s)) {
    return null;
  }
  if (RE_NUMBER.test(s) && s !== "") {
    const n = Number(s);
    if (!Number.isNaN(n)) {
      return n;
    }
  }
  return s;
}

// ─── public API ───────────────────────────────────────────────────────────────

/** Collect column names in order of first appearance across all row nodes. */
function collectColOrder(rows: XmlNode[], elemsOnly: boolean, attrsOnly: boolean): string[] {
  const colOrder: string[] = [];
  const colSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(nodeToRecord(row, elemsOnly, attrsOnly))) {
      if (!colSet.has(key)) {
        colSet.add(key);
        colOrder.push(key);
      }
    }
  }
  return colOrder;
}

/** Fill column arrays from row nodes. */
function fillColArrays(
  rows: XmlNode[],
  usedNames: string[],
  colOrder: string[],
  elemsOnly: boolean,
  attrsOnly: boolean,
  naSet: ReadonlySet<string>,
): Record<string, Scalar[]> {
  const colArrays: Record<string, Scalar[]> = {};
  for (const name of usedNames) {
    colArrays[name] = [];
  }
  for (const row of rows) {
    const rec = nodeToRecord(row, elemsOnly, attrsOnly);
    for (let ci = 0; ci < usedNames.length; ci++) {
      const colName = usedNames[ci];
      const srcKey = colOrder[ci] ?? colName ?? "";
      if (colName === undefined) {
        continue;
      }
      const raw = rec[srcKey] ?? "";
      const arr = colArrays[colName];
      if (arr !== undefined) {
        arr.push(inferScalar(raw, naSet));
      }
    }
  }
  return colArrays;
}

/**
 * Parse an XML string and return a DataFrame with one row per matched element.
 *
 * @param xml     - Raw XML string.
 * @param options - Parsing options.
 *
 * @example
 * ```ts
 * const xml = `<data><row><x>1</x><y>a</y></row><row><x>2</x><y>b</y></row></data>`;
 * const df = readXml(xml);
 * df.col("x").values; // [1, 2]
 * ```
 */
export function readXml(xml: string, options?: ReadXmlOptions): DataFrame {
  const elemsOnly = options?.elemsOnly ?? false;
  const attrsOnly = options?.attrsOnly ?? false;
  const customNames = options?.names;
  const naSet: ReadonlySet<string> = options?.naValues
    ? new Set([...DEFAULT_NA_VALUES, ...options.naValues])
    : DEFAULT_NA_VALUES;

  const cleaned = stripDeclarations(xml);
  const tokens = tokenize(cleaned);
  const root = buildTree(tokens);
  if (root === null) {
    return DataFrame.fromColumns({});
  }

  const rows: XmlNode[] =
    options?.xpath !== undefined ? selectXPath(root, options.xpath) : autoSelectRows(root);

  if (rows.length === 0) {
    return DataFrame.fromColumns({});
  }

  const colOrder = collectColOrder(rows, elemsOnly, attrsOnly);
  const usedNames = customNames ?? colOrder;
  const colArrays = fillColArrays(rows, usedNames, colOrder, elemsOnly, attrsOnly, naSet);

  return DataFrame.fromColumns(colArrays);
}
