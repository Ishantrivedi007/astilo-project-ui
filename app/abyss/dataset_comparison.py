"""Compares real OBIS and GBIF occurrence counts for the same species —
Abyss's Dataset Contradiction Explorer (blueprint section 41). Neither
source is declared "wrong"; this simply shows how two real, independently
aggregated databases differ in coverage for the same species."""

from app.abyss import gbif, obis
from app.abyss.http import envelope


def compare(scientific_name: str):
    obis_env = obis.search_occurrences(scientific_name, size=1)
    gbif_env = gbif.search_occurrences(scientific_name, limit=1)
    data = {
        "scientificName": scientific_name,
        "obisTotal": obis_env["data"]["total"],
        "gbifTotal": gbif_env["data"]["total"],
        "gbifExcludedByLicense": gbif_env["data"]["excludedByLicense"],
    }
    return envelope("OBIS + GBIF", "occurrence totals comparison", scientific_name, data, confidence="OBSERVED")
