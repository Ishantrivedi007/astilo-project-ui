"""Shared raw-pixel-array -> browser-viewable-PNG normalization, extracted
from mast.py so New Horizons' pds4_tools-decoded LORRI/MVIC arrays can reuse
the exact same real analysis (not a simplified copy) as MAST's FITS images.

Raw astronomical pixel data has enormous dynamic range (a handful of
saturated pixels next to a faint target), so a naive linear map to 0-255
renders as almost solid black. The percentile-clip + asinh stretch below is
the same family of normalization DS9 (the standard astronomy image viewer)
and astropy's own ZScale+AsinhStretch use — implemented directly on the
percentile/arcsinh math rather than imported from astropy.visualization,
because that subpackage's import chain raises AttributeError under this
backend's astropy 6.1.7 + numpy 2.x combination (see mast.py's original
note; astropy.io.fits itself is unaffected)."""

import base64
import io
import math


def _json_safe_float(v) -> float | None:
    f = float(v)
    return f if math.isfinite(f) else None


def array_to_png_and_stats(data, max_edge: int = 1200, flip_vertical: bool = False):
    """Takes a real 2D numeric pixel array and returns (png_data_uri, stats)
    — stats are computed from the actual finite pixel values, never
    fabricated. `flip_vertical` matches FITS's bottom-up row order; PDS4
    image arrays are already stored top-down and don't need it."""
    import numpy as np
    from PIL import Image

    data = np.asarray(data).astype(float)
    finite = data[np.isfinite(data)]
    stats = {
        "width": int(data.shape[1]),
        "height": int(data.shape[0]),
        "min": _json_safe_float(finite.min()) if finite.size else None,
        "max": _json_safe_float(finite.max()) if finite.size else None,
        "mean": _json_safe_float(finite.mean()) if finite.size else None,
        "std": _json_safe_float(finite.std()) if finite.size else None,
    }

    if finite.size:
        lo, hi = np.percentile(finite, [1.0, 99.0])
    else:
        lo, hi = 0.0, 1.0
    span = (hi - lo) or 1.0
    clipped = np.clip((np.nan_to_num(data, nan=lo) - lo) / span, 0, 1)
    k = 10.0
    normalized = np.arcsinh(k * clipped) / np.arcsinh(k)

    img_array = (normalized * 255).astype(np.uint8)
    if flip_vertical:
        img_array = np.flipud(img_array)

    img = Image.fromarray(img_array, mode="L")
    if max(img.size) > max_edge:
        ratio = max_edge / max(img.size)
        img = img.resize((max(1, int(img.width * ratio)), max(1, int(img.height * ratio))))

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    png_base64 = base64.b64encode(buf.getvalue()).decode("ascii")

    return f"data:image/png;base64,{png_base64}", stats
