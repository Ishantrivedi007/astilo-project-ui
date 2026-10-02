"""Scale Explorer — a curated, real size-comparison ladder from blue whale
down to a virus (blueprint section 34). Figures are well-documented
biological/physical facts (not live data), hence confidence=CURATED."""

from app.abyss.http import envelope

SCALE_POINTS = [
    {"id": "blue-whale", "label": "Blue whale", "meters": 30, "scientificName": "Balaenoptera musculus"},
    {"id": "human", "label": "Human", "meters": 1.7, "scientificName": "Homo sapiens"},
    {"id": "giant-squid", "label": "Giant squid", "meters": 13, "scientificName": "Architeuthis dux"},
    {"id": "krill", "label": "Antarctic krill", "meters": 0.05, "scientificName": "Euphausia superba"},
    {"id": "copepod", "label": "Copepod", "meters": 0.002, "scientificName": "Calanus finmarchicus"},
    {"id": "diatom", "label": "Diatom", "meters": 0.00002, "scientificName": None},
    {"id": "bacterium", "label": "Marine bacterium", "meters": 0.000001, "scientificName": "Pelagibacter ubique"},
    {"id": "virus", "label": "Marine virus (bacteriophage)", "meters": 0.0000001, "scientificName": None},
]


def list_scale():
    data = {"points": sorted(SCALE_POINTS, key=lambda p: p["meters"], reverse=True)}
    return envelope("Astilo curated reference", "scale_explorer", None, data, confidence="CURATED")
