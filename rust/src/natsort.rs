/*!
 * Natural-order sort accelerators.
 *
 * Mirrors the TypeScript `natCompare`, `natSorted`, and `natArgSort` functions
 * in `src/core/natsort.ts`.
 *
 * The algorithm tokenises each string into alternating text and digit chunks
 * and compares them chunk-by-chunk:
 * - Digit chunks compared numerically (so "file10" > "file9").
 * - Text chunks compared lexicographically (optionally case-folded).
 */

use wasm_bindgen::prelude::*;

// ─── token type ──────────────────────────────────────────────────────────────

/// A single token: either a text segment or a parsed non-negative integer.
#[derive(Debug, PartialEq, Eq)]
enum Token {
    Text(String),
    Num(u64),
}

/// Split `s` into alternating text and digit tokens.
///
/// Mirrors the TypeScript `tokenize` function:
/// - `"file10.txt"` → `[Text("file"), Num(10), Text(".txt")]`
/// - `"007"` → `[Num(7)]`
fn tokenize(s: &str) -> Vec<Token> {
    let mut tokens: Vec<Token> = Vec::new();
    let chars: Vec<char> = s.chars().collect();
    let n = chars.len();
    let mut i = 0;
    while i < n {
        if chars[i].is_ascii_digit() {
            // Consume the run of digits
            let start = i;
            while i < n && chars[i].is_ascii_digit() {
                i += 1;
            }
            let digit_str: String = chars[start..i].iter().collect();
            let num: u64 = digit_str.parse().unwrap_or(0);
            tokens.push(Token::Num(num));
        } else {
            // Consume non-digit characters
            let start = i;
            while i < n && !chars[i].is_ascii_digit() {
                i += 1;
            }
            let text: String = chars[start..i].iter().collect();
            tokens.push(Token::Text(text));
        }
    }
    tokens
}

/// Compare two token sequences, optionally case-folding text tokens.
fn compare_tokens(ta: &[Token], tb: &[Token], ignore_case: bool) -> std::cmp::Ordering {
    let len = ta.len().min(tb.len());
    for i in 0..len {
        let ord = match (&ta[i], &tb[i]) {
            (Token::Num(a), Token::Num(b)) => a.cmp(b),
            (Token::Text(a), Token::Text(b)) => {
                if ignore_case {
                    a.to_lowercase().cmp(&b.to_lowercase())
                } else {
                    a.cmp(b)
                }
            }
            // Mixed types: compare string representations
            (Token::Num(a), Token::Text(b)) => a.to_string().cmp(b),
            (Token::Text(a), Token::Num(b)) => a.as_str().cmp(b.to_string().as_str()),
        };
        if ord != std::cmp::Ordering::Equal {
            return ord;
        }
    }
    ta.len().cmp(&tb.len())
}

// ─── public WASM exports ─────────────────────────────────────────────────────

/// Compare two strings using natural order.
///
/// Returns a negative number when `a < b`, zero when `a == b`, and a positive
/// number when `a > b` (matching the TypeScript contract for a compare
/// function).
///
/// `ignore_case`: fold text tokens to lower-case before comparing.
/// `reverse`: invert the result.
#[wasm_bindgen]
pub fn nat_compare(a: &str, b: &str, ignore_case: bool, reverse: bool) -> i32 {
    let ta = tokenize(a);
    let tb = tokenize(b);
    let ord = compare_tokens(&ta, &tb, ignore_case);
    let result = match ord {
        std::cmp::Ordering::Less => -1,
        std::cmp::Ordering::Equal => 0,
        std::cmp::Ordering::Greater => 1,
    };
    if reverse { -result } else { result }
}

/// Sort `arr` of strings in natural order and return the sorted copy.
///
/// `ignore_case`: fold text tokens to lower-case.
/// `reverse`: sort in descending natural order.
#[wasm_bindgen]
pub fn nat_sorted(mut arr: Vec<String>, ignore_case: bool, reverse: bool) -> Vec<String> {
    arr.sort_by(|a, b| {
        let ta = tokenize(a);
        let tb = tokenize(b);
        let ord = compare_tokens(&ta, &tb, ignore_case);
        if reverse { ord.reverse() } else { ord }
    });
    arr
}

/// Return the indices that would sort `arr` in natural order.
#[wasm_bindgen]
pub fn nat_argsort(arr: Vec<String>, ignore_case: bool, reverse: bool) -> Vec<u32> {
    let keys: Vec<Vec<Token>> = arr.iter().map(|s| tokenize(s)).collect();
    let mut indices: Vec<u32> = (0..arr.len() as u32).collect();
    indices.sort_by(|&i, &j| {
        let ord = compare_tokens(&keys[i as usize], &keys[j as usize], ignore_case);
        if reverse { ord.reverse() } else { ord }
    });
    indices
}

// ─── unit tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tokenize_mixed() {
        assert_eq!(
            tokenize("file10.txt"),
            vec![
                Token::Text("file".to_string()),
                Token::Num(10),
                Token::Text(".txt".to_string()),
            ]
        );
        assert_eq!(tokenize("007"), vec![Token::Num(7)]);
        assert_eq!(tokenize("abc"), vec![Token::Text("abc".to_string())]);
    }

    #[test]
    fn test_nat_compare_numeric_order() {
        // "file10" > "file9" (natural order)
        assert!(nat_compare("file10", "file9", false, false) > 0);
        // "file2" < "file10"
        assert!(nat_compare("file2", "file10", false, false) < 0);
        // equal
        assert_eq!(nat_compare("abc", "abc", false, false), 0);
    }

    #[test]
    fn test_nat_compare_ignore_case() {
        assert_eq!(nat_compare("Apple", "apple", true, false), 0);
        assert!(nat_compare("banana", "Cherry", true, false) < 0);
    }

    #[test]
    fn test_nat_compare_reverse() {
        let forward = nat_compare("file10", "file9", false, false);
        let reversed = nat_compare("file10", "file9", false, true);
        assert_eq!(forward, -reversed);
    }

    #[test]
    fn test_nat_sorted() {
        let arr = vec![
            "file10".to_string(),
            "file2".to_string(),
            "file1".to_string(),
            "file20".to_string(),
        ];
        let sorted = nat_sorted(arr, false, false);
        assert_eq!(
            sorted,
            vec!["file1", "file2", "file10", "file20"]
        );
    }

    #[test]
    fn test_nat_sorted_reverse() {
        let arr = vec!["b".to_string(), "a".to_string(), "c".to_string()];
        let sorted = nat_sorted(arr, false, true);
        assert_eq!(sorted, vec!["c", "b", "a"]);
    }

    #[test]
    fn test_nat_argsort() {
        let arr = vec![
            "file10".to_string(),
            "file2".to_string(),
            "file1".to_string(),
        ];
        let idx = nat_argsort(arr, false, false);
        assert_eq!(idx, vec![2, 1, 0]); // file1, file2, file10
    }
}
