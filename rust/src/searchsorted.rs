/*!
 * Binary search (searchsorted) and argsort accelerators.
 *
 * Mirrors the TypeScript `searchsorted`, `searchsortedMany`, and `argsortScalars`
 * functions in `src/core/searchsorted.ts` for pure numeric and string inputs.
 */

use wasm_bindgen::prelude::*;

// ─── f64 searchsorted ────────────────────────────────────────────────────────

/// Binary-search a sorted f64 slice for `value`.
///
/// `side_right = false` returns the leftmost insertion point (equivalent to
/// `side = "left"` in TypeScript); `side_right = true` returns the rightmost
/// (equivalent to `side = "right"`).
///
/// NaN values are treated as greater than all finite/infinite values, matching
/// the TypeScript `compareNumbers` behaviour.
#[wasm_bindgen]
pub fn searchsorted_f64(arr: &[f64], value: f64, side_right: bool) -> u32 {
    let n = arr.len();
    let mut lo: usize = 0;
    let mut hi: usize = n;
    while lo < hi {
        let mid = lo + (hi - lo) / 2;
        // SAFETY: mid < hi <= n, so mid is in bounds.
        let v = arr[mid];
        let cmp = cmp_f64(v, value);
        let advance = if side_right {
            cmp != std::cmp::Ordering::Greater
        } else {
            cmp == std::cmp::Ordering::Less
        };
        if advance {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    lo as u32
}

/// Binary-search a sorted f64 slice for each value in `values`, returning an
/// array of insertion positions.
#[wasm_bindgen]
pub fn searchsorted_many_f64(arr: &[f64], values: &[f64], side_right: bool) -> Vec<u32> {
    values
        .iter()
        .map(|&v| searchsorted_f64(arr, v, side_right))
        .collect()
}

/// Return the indices that would sort `arr` (argsort) for f64 values.
///
/// NaN values are placed last, matching the TypeScript default comparator.
#[wasm_bindgen]
pub fn argsort_f64(arr: &[f64]) -> Vec<u32> {
    let mut indices: Vec<u32> = (0..arr.len() as u32).collect();
    indices.sort_by(|&i, &j| cmp_f64(arr[i as usize], arr[j as usize]));
    indices
}

// ─── string searchsorted ─────────────────────────────────────────────────────

/// Binary-search a sorted array of strings for `value`.
#[wasm_bindgen]
pub fn searchsorted_str(arr: Vec<String>, value: &str, side_right: bool) -> u32 {
    let n = arr.len();
    let mut lo: usize = 0;
    let mut hi: usize = n;
    while lo < hi {
        let mid = lo + (hi - lo) / 2;
        let cmp = arr[mid].as_str().cmp(value);
        if if side_right {
            cmp != std::cmp::Ordering::Greater
        } else {
            cmp == std::cmp::Ordering::Less
        } {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    lo as u32
}

/// Binary-search a sorted string array for each value in `values`.
#[wasm_bindgen]
pub fn searchsorted_many_str(arr: Vec<String>, values: Vec<String>, side_right: bool) -> Vec<u32> {
    values
        .iter()
        .map(|v| searchsorted_str(arr.clone(), v.as_str(), side_right))
        .collect()
}

/// Return the indices that would sort `arr` (argsort) for string values.
#[wasm_bindgen]
pub fn argsort_str(arr: Vec<String>) -> Vec<u32> {
    let mut indices: Vec<u32> = (0..arr.len() as u32).collect();
    indices.sort_by(|&i, &j| arr[i as usize].cmp(&arr[j as usize]));
    indices
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/// Compare two f64 values, treating NaN as greater than all non-NaN values
/// (matches TypeScript `compareNumbers`).
fn cmp_f64(a: f64, b: f64) -> std::cmp::Ordering {
    let a_nan = a.is_nan();
    let b_nan = b.is_nan();
    match (a_nan, b_nan) {
        (true, true) => std::cmp::Ordering::Equal,
        (true, false) => std::cmp::Ordering::Greater,
        (false, true) => std::cmp::Ordering::Less,
        (false, false) => a.partial_cmp(&b).unwrap_or(std::cmp::Ordering::Equal),
    }
}

// ─── unit tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_searchsorted_f64_left() {
        let arr = vec![1.0_f64, 2.0, 3.0, 4.0, 5.0];
        assert_eq!(searchsorted_f64(&arr, 3.0, false), 2);
        assert_eq!(searchsorted_f64(&arr, 0.0, false), 0);
        assert_eq!(searchsorted_f64(&arr, 6.0, false), 5);
        assert_eq!(searchsorted_f64(&arr, 3.5, false), 3);
    }

    #[test]
    fn test_searchsorted_f64_right() {
        let arr = vec![1.0_f64, 2.0, 3.0, 3.0, 4.0];
        assert_eq!(searchsorted_f64(&arr, 3.0, true), 4);
        assert_eq!(searchsorted_f64(&arr, 0.0, true), 0);
        assert_eq!(searchsorted_f64(&arr, 5.0, true), 5);
    }

    #[test]
    fn test_searchsorted_f64_nan_last() {
        // NaN treated as larger than everything
        let arr = vec![1.0_f64, 2.0, f64::NAN];
        assert_eq!(searchsorted_f64(&arr, 1.5, false), 1);
        assert_eq!(searchsorted_f64(&arr, f64::NAN, false), 2);
    }

    #[test]
    fn test_searchsorted_many_f64() {
        let arr = vec![1.0_f64, 2.0, 3.0, 4.0];
        let result = searchsorted_many_f64(&arr, &[0.0, 2.0, 5.0], false);
        assert_eq!(result, vec![0, 1, 4]);
    }

    #[test]
    fn test_argsort_f64() {
        let arr = vec![3.0_f64, 1.0, 4.0, 1.0, 5.0];
        let idx = argsort_f64(&arr);
        // indices that sort arr ascending
        assert_eq!(idx, vec![1, 3, 0, 2, 4]);
    }

    #[test]
    fn test_argsort_f64_nan_last() {
        let arr = vec![2.0_f64, f64::NAN, 1.0];
        let idx = argsort_f64(&arr);
        assert_eq!(idx, vec![2, 0, 1]);
    }

    #[test]
    fn test_searchsorted_str() {
        let arr = vec!["apple".to_string(), "banana".to_string(), "cherry".to_string()];
        assert_eq!(searchsorted_str(arr.clone(), "banana", false), 1);
        assert_eq!(searchsorted_str(arr.clone(), "avocado", false), 1);
        assert_eq!(searchsorted_str(arr.clone(), "date", false), 3);
    }

    #[test]
    fn test_argsort_str() {
        let arr = vec!["cherry".to_string(), "apple".to_string(), "banana".to_string()];
        let idx = argsort_str(arr);
        assert_eq!(idx, vec![1, 2, 0]);
    }
}
