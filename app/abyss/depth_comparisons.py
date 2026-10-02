"""Curated, well-documented real-world depth and elevation reference points
— lets users compare ocean depths against famous mountains on one shared
scale (e.g. "Everest would still have ~2,000m of water over its peak in the
Challenger Deep"). Figures are widely published, stable facts (not live
data), hence confidence=CURATED; each one is independently verifiable."""

from app.abyss.http import envelope

DEPTHS = [
    {"id": "continental-shelf", "label": "Continental shelf edge", "meters": 200},
    {"id": "titanic-wreck", "label": "RMS Titanic wreck", "meters": 3800},
    {"id": "average-ocean-depth", "label": "Average ocean depth", "meters": 3688},
    {"id": "mid-ocean-ridge", "label": "Mid-ocean ridge (typical)", "meters": 2500},
    {"id": "puerto-rico-trench", "label": "Puerto Rico Trench", "meters": 8376},
    {"id": "challenger-deep", "label": "Challenger Deep (Mariana Trench)", "meters": 10935},
]

MOUNTAINS = [
    {"id": "kilimanjaro", "label": "Mount Kilimanjaro", "meters": 5895},
    {"id": "denali", "label": "Denali", "meters": 6190},
    {"id": "aconcagua", "label": "Aconcagua", "meters": 6961},
    {"id": "k2", "label": "K2", "meters": 8611},
    {"id": "everest", "label": "Mount Everest", "meters": 8849},
]


def list_comparisons():
    data = {
        "depths": DEPTHS,
        "mountains": MOUNTAINS,
        "maxScaleMeters": max(DEPTHS, key=lambda d: d["meters"])["meters"],
        "note": "Mount Everest, placed in the Challenger Deep, would still have roughly 2,086 m of water above its peak.",
    }
    return envelope("Astilo curated reference", "depth_vs_elevation_comparison", None, data, confidence="CURATED")
