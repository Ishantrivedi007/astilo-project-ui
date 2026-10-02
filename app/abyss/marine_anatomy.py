"""Marine Anatomy Explorer — real, license-verified anatomical diagrams
resolved live from Wikimedia Commons full-text search (see
species_images.search_commons_images), not a single article's lead image
(which is rarely an anatomical diagram). True interactive 3D models aren't
attempted here — there is no library of open-licensed 3D marine-anatomy
assets, and procedurally authoring anatomically accurate meshes isn't
something Astilo can do reliably, so this stays a real-image 2D explorer.

Each diagram is tagged with a body system only when its own real filename
or description names one (a genuine, if imperfect, signal) — otherwise it's
labeled "General anatomy" rather than guessed into a system bucket."""

from app.abyss import species_images
from app.abyss.http import envelope

SPECIES = [
    {"id": "shark", "label": "Shark", "searchQuery": "shark anatomy diagram"},
    {"id": "octopus", "label": "Octopus", "searchQuery": "octopus anatomy diagram"},
    {"id": "fish", "label": "Bony fish", "searchQuery": "fish anatomy diagram"},
    {"id": "sea-turtle", "label": "Sea turtle", "searchQuery": "sea turtle anatomy diagram"},
    {"id": "jellyfish", "label": "Jellyfish", "searchQuery": "jellyfish anatomy diagram"},
    {"id": "whale", "label": "Whale", "searchQuery": "whale anatomy diagram"},
]

SYSTEM_KEYWORDS = {
    "skeleton": "Skeleton",
    "skelet": "Skeleton",
    "muscl": "Muscles",
    "circulat": "Circulatory",
    "heart": "Circulatory",
    "respirat": "Respiratory",
    "gill": "Respiratory",
    "lung": "Respiratory",
    "digest": "Digestive",
    "stomach": "Digestive",
    "nerv": "Nervous",
    "brain": "Nervous",
    "sensor": "Sensory",
    "eye": "Sensory",
    "echolocation": "Sensory",
}


def _tag_system(page_title: str) -> str:
    lowered = page_title.lower()
    for keyword, system in SYSTEM_KEYWORDS.items():
        if keyword in lowered:
            return system
    return "General anatomy"


def list_species():
    return envelope("Astilo curated species list", "marine_anatomy_species", None, {"species": SPECIES}, confidence="CURATED")


def diagrams_for_species(species_id: str):
    sp = next((s for s in SPECIES if s["id"] == species_id), None)
    if sp is None:
        return None
    images = species_images.search_commons_images(sp["searchQuery"], limit=10)
    tagged = [{**img, "system": _tag_system(img["pageTitle"])} for img in images]
    data = {"speciesLabel": sp["label"], "diagrams": tagged}
    return envelope("Wikimedia Commons", f"search: {sp['searchQuery']}", species_id, data, confidence="OBSERVED")
