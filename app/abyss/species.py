"""Composes WoRMS + OBIS into Astilo's unified species view (blueprint
section 55/56) — the frontend shouldn't care which provider a given field
came from, only that each field is independently traceable back to one via
its own envelope."""

from app.abyss import obis, worms


def search_species(query: str, limit: int = 10):
    return worms.search_by_name(query, limit=limit)


def species_profile(aphia_id: int):
    taxonomy = worms.record_by_id(aphia_id)
    if taxonomy is None:
        return None

    scientific_name = taxonomy["data"]["scientificName"]
    return {
        "taxonomy": taxonomy,
        "classification": worms.classification_by_id(aphia_id),
        "distribution": worms.distributions_by_id(aphia_id),
        "occurrences": obis.search_occurrences(scientific_name, size=50),
    }
