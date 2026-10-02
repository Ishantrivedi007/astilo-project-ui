"""Curated, approximate ocean chemistry reference values by depth zone —
generalized published oceanographic ranges (surface pH ~8.1, the ~200-1000m
oxygen minimum zone, near-uniform deep salinity, deep pH decline from
dissolved CO2), not a live measurement at any specific point in time or
space. Hence confidence=CURATED — for a real point reading, Ocean Explorer's
NASA GIBS / EMODnet layers are the OBSERVED source."""

from app.abyss.depth_zones import ZONES
from app.abyss.http import envelope

_CHEMISTRY = {
    "sunlight": {"salinityPsu": "~34 to 36", "phApprox": "~8.1", "dissolvedOxygenMgL": "~6 to 8"},
    "twilight": {"salinityPsu": "~34 to 35", "phApprox": "~7.9", "dissolvedOxygenMgL": "~2 to 5 (oxygen minimum zone)"},
    "midnight": {"salinityPsu": "~34.5", "phApprox": "~7.8", "dissolvedOxygenMgL": "~3 to 5"},
    "abyssal": {"salinityPsu": "~34.7", "phApprox": "~7.8", "dissolvedOxygenMgL": "~4 to 6"},
    "hadal": {"salinityPsu": "~34.7", "phApprox": "~7.7", "dissolvedOxygenMgL": "~4 to 6"},
}


def list_chemistry():
    data = {
        "zones": [
            {"zoneId": zone["id"], "zoneLabel": zone["label"], **_CHEMISTRY[zone["id"]]}
            for zone in ZONES
        ]
    }
    return envelope("Astilo", "ocean_chemistry_reference", None, data, confidence="CURATED")
