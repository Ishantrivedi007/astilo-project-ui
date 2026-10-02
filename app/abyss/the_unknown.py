"""The Unknown (blueprint section 38) — Abyss's signature feature showing
users what we genuinely don't know, rather than implying the ocean has been
fully catalogued. Poorly-sampled regions reuse real OBIS statistics (same
data as the Observation Gap Finder); rarely-observed species show real,
live OBIS occurrence counts for a curated list of famously elusive deep-sea
species; unresolved taxonomy is curated educational content, since no
keyless API exposes a live "count of disputed taxa" at useful granularity."""

from app.abyss import obis, ocean_coverage
from app.abyss.http import envelope

RARELY_OBSERVED_CANDIDATES = [
    {"scientificName": "Architeuthis dux", "commonName": "Giant squid"},
    {"scientificName": "Mesonychoteuthis hamiltoni", "commonName": "Colossal squid"},
    {"scientificName": "Megachasma pelagios", "commonName": "Megamouth shark"},
    {"scientificName": "Grimpoteuthis", "commonName": "Dumbo octopus"},
    {"scientificName": "Pseudoliparis swirei", "commonName": "Mariana snailfish"},
    {"scientificName": "Hirondellea gigas", "commonName": "Giant amphipod"},
]

UNRESOLVED_TAXONOMY_EXAMPLES = [
    {
        "topic": "Giant isopods (genus Bathynomus)",
        "note": "Several Bathynomus species have been split, merged, or redescribed over the decades as new specimens surface — deep-sea sampling is so sparse that basic species boundaries remain unsettled for many giant isopods.",
    },
    {
        "topic": "Deep-sea anglerfish (family Ceratiidae and relatives)",
        "note": "Extreme sexual dimorphism (tiny parasitic males versus much larger females) has historically caused males and females of the same species to be described as entirely different species before genetic work corrected the record — a pattern that likely still affects undersampled lineages.",
    },
    {
        "topic": "Xenophyophores (giant single-celled organisms)",
        "note": "Among the largest single-celled organisms on Earth, found on abyssal plains, with a taxonomy that remains actively debated due to how rarely they are collected intact.",
    },
]

SCIENTIFIC_QUESTIONS = [
    "How many species live in the deep ocean that we haven't yet described?",
    "Do hydrothermal vent ecosystems share common ancestry across ocean basins, or did chemosynthetic life evolve independently at each one?",
    "How will deep-sea ecosystems respond to the first large-scale polymetallic nodule mining operations?",
    "What is the full extent of the ocean's \"twilight zone\" biomass, and how much carbon does it transport to the deep sea?",
]


def overview():
    poorly_sampled = ocean_coverage.regional_coverage()
    regions_sorted = sorted(poorly_sampled["data"]["regions"], key=lambda r: r["records"] or 0)[:3]

    rare_species = []
    for candidate in RARELY_OBSERVED_CANDIDATES:
        try:
            occ = obis.search_occurrences(candidate["scientificName"], size=1)
            rare_species.append({**candidate, "obisRecordCount": occ["data"]["total"]})
        except Exception:
            rare_species.append({**candidate, "obisRecordCount": None})
    rare_species.sort(key=lambda s: s["obisRecordCount"] if s["obisRecordCount"] is not None else 10**9)

    data = {
        "poorlySampledRegions": regions_sorted,
        "rarelyObservedSpecies": rare_species,
        "unresolvedTaxonomyExamples": UNRESOLVED_TAXONOMY_EXAMPLES,
        "scientificQuestions": SCIENTIFIC_QUESTIONS,
    }
    return envelope("OBIS (live counts) + Astilo curation", "the_unknown_overview", None, data, confidence="CURATED")
