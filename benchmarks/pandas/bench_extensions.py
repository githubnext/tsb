"""Benchmark: pd.api.extensions — ExtensionDtype / ExtensionArray subclassing and
accessor registration.

Mirrors tsb's extensions benchmark:
    - ExtensionDtype subclass construction
    - ExtensionArray subclass instantiation, getitem, slice, dtype access
    - register_extension_dtype()           → tsb registerExtensionDtype()
    - register_series_accessor()           → tsb registerSeriesAccessor()
    - register_dataframe_accessor()        → tsb registerDataFrameAccessor()
    - Accessor registry introspection via hasattr
"""
import json
import time
import numpy as np
import pandas as pd
import pandas.api.extensions as pd_ext

WARMUP = 5
ITERATIONS = 200


@pd_ext.register_extension_dtype
class TagDtype(pd_ext.ExtensionDtype):
    name = "tag"
    type = object
    kind = "O"

    @classmethod
    def construct_array_type(cls):
        return TagArray

    @classmethod
    def construct_from_string(cls, string):
        if string == "tag":
            return cls()
        raise TypeError(f"Cannot construct a 'TagDtype' from '{string}'")


class TagArray(pd_ext.ExtensionArray):
    def __init__(self, data):
        self._data = np.asarray(data, dtype=object)

    @classmethod
    def _from_sequence(cls, scalars, *, dtype=None, copy=False):
        return cls(scalars)

    @classmethod
    def _from_factorized(cls, values, original):
        return cls(values)

    def __getitem__(self, key):
        return self._data[key]

    def __setitem__(self, key, value):
        self._data[key] = value

    def __len__(self):
        return len(self._data)

    @property
    def dtype(self):
        return TagDtype()

    @property
    def nbytes(self):
        return self._data.nbytes

    def isna(self):
        return np.array([v is None for v in self._data])

    def take(self, indices, *, allow_fill=False, fill_value=None):
        return type(self)(self._data.take(indices))

    def copy(self):
        return type(self)(self._data.copy())

    @classmethod
    def _concat_same_type(cls, to_concat):
        return cls(np.concatenate([a._data for a in to_concat]))


@pd_ext.register_series_accessor("geo_bench")
class GeoAccessor:
    def __init__(self, obj):
        self._obj = obj

    def distance(self):
        return 0


@pd_ext.register_dataframe_accessor("geo_bench")
class GeoDataFrameAccessor:
    def __init__(self, obj):
        self._obj = obj

    def distance(self):
        return 0


_TAGS = ["alpha", "beta", "gamma", "delta", "epsilon"]
_s = pd.Series(TagArray(_TAGS))
_df = pd.DataFrame({"a": [1, 2, 3]})


def _run():
    arr = TagArray(_TAGS)
    _len = len(arr)
    _item = arr[2]
    _sliced = arr[1:4]
    _dtype_name = arr.dtype.name
    _numeric = False

    _has_series = hasattr(_s, "geo_bench")
    _has_df = hasattr(_df, "geo_bench")

    return [_len, _item, _sliced, _dtype_name, _numeric, _has_series, _has_df]


for _ in range(WARMUP):
    _run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    _run()
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "extensions",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
