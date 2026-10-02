"""Hydrothermal Vent Explorer — a dedicated deep dive into vent ecosystems
(blueprint section 12: "this deserves its own experience"). Curated real
content, since no keyless API profiles individual vent fields or features
at this granularity; organism names are real and WoRMS-resolvable."""

from app.abyss.http import envelope

FEATURES = [
    {
        "id": "black-smoker",
        "label": "Black Smoker",
        "description": (
            "Vents emitting iron- and sulfide-rich fluid at up to 400°C, which precipitates into dark mineral "
            "particles on contact with near-freezing seawater, building towering chimneys of metal sulfides."
        ),
    },
    {
        "id": "white-smoker",
        "label": "White Smoker",
        "description": (
            "Cooler vents, typically under 300°C, emitting lighter-colored barium, calcium and silicon compounds "
            "— often found at the periphery of a vent field as it ages."
        ),
    },
    {
        "id": "vent-chimney",
        "label": "Vent Chimney",
        "description": "Mineral structures built up over years to decades as vent fluid precipitates on contact with cold seawater, some growing several stories tall before collapsing.",
    },
    {
        "id": "microbial-mat",
        "label": "Microbial Mat",
        "description": "Dense colonies of chemosynthetic bacteria coating rocks and animals near vents, forming the base of the entire vent food web.",
    },
]

ORGANISMS = [
    {
        "scientificName": "Riftia pachyptila",
        "commonName": "Giant tube worm",
        "note": "Has no mouth, gut, or anus as an adult — it relies entirely on chemosynthetic bacteria living inside its body for nutrition.",
    },
    {
        "scientificName": "Bathymodiolus thermophilus",
        "commonName": "Vent mussel",
        "note": "Hosts chemosynthetic bacteria directly in its gill tissue, similar in concept to the tube worm's symbiosis.",
    },
    {
        "scientificName": "Alvinocaris",
        "commonName": "Vent shrimp",
        "note": "Some related vent shrimp species have light-sensing organs hypothesized to detect the faint thermal glow of vents in total darkness.",
    },
]

CHEMOSYNTHESIS_EXPLAINER = (
    "Away from sunlight, vent ecosystems run on chemosynthesis: bacteria oxidize hydrogen sulfide or methane "
    "dissolved in the vent fluid, using the released energy to build organic molecules from carbon dioxide — the "
    "same basic role photosynthesis plays at the surface, but powered by chemistry instead of light. Tube worms, "
    "mussels and clams host these bacteria internally and depend on them entirely for food."
)


def overview():
    data = {"features": FEATURES, "organisms": ORGANISMS, "chemosynthesisExplainer": CHEMOSYNTHESIS_EXPLAINER}
    return envelope("Astilo curated reference", "hydrothermal_vent_overview", None, data, confidence="CURATED")
