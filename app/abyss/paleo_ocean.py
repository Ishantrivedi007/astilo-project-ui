"""Astilo's Paleo Ocean timeline — curated, well-established paleontology
reference content. Per the Abyss build rules ("use curated datasets/content
for this rather than letting an LLM manufacture paleoecological facts"),
this is static and hand-written, not fetched from a live API or generated —
every taxon named is a real, documented fossil group, and every date range
reflects the standard geologic timescale. `illustrativeTaxon` names a real
Wikipedia-resolvable topic the frontend fetches a license-verified image for
via /api/abyss/species-image, rather than embedding an unverified image URL
directly here."""

from app.abyss.http import envelope

ERAS = [
    {
        "id": "cambrian",
        "label": "Cambrian Sea",
        "myaRange": "541-485",
        "description": (
            "The Cambrian Explosion — in a geologically short span, nearly every major animal body plan alive today "
            "appears in the fossil record for the first time. Shallow seas filled with armored arthropods, early "
            "predators, and bizarre experimental forms, many of which left no modern descendants."
        ),
        "taxa": ["Trilobites", "Anomalocaris", "Early arthropods", "Hallucigenia"],
        "illustrativeTaxon": "Trilobite",
    },
    {
        "id": "ordovician",
        "label": "Ordovician",
        "myaRange": "485-443",
        "description": (
            "Marine biodiversity expanded dramatically in the Great Ordovician Biodiversification Event, with "
            "reef-building organisms and diverse cephalopods flourishing in warm shallow seas — before the period "
            "closed with one of the five major mass extinctions in Earth's history, likely tied to glaciation."
        ),
        "taxa": ["Nautiloid cephalopods", "Graptolites", "Early corals", "Trilobites"],
        "illustrativeTaxon": "Orthoceras",
    },
    {
        "id": "devonian",
        "label": "Devonian",
        "myaRange": "419-359",
        "description": (
            "Known as the \"Age of Fishes\", jawed fish diversified rapidly into an enormous range of forms, "
            "including Dunkleosteus — an armored predator exceeding 6 metres that used powerful bony plates "
            "instead of teeth to crush prey. Ammonoids also first appear in this period."
        ),
        "taxa": ["Dunkleosteus", "Early sharks", "Lobe-finned fish", "Ammonoids"],
        "illustrativeTaxon": "Dunkleosteus",
    },
    {
        "id": "carboniferous",
        "label": "Carboniferous",
        "myaRange": "359-299",
        "description": (
            "Sharks diversified extensively in shallow seas during this period, sometimes called the \"Golden Age "
            "of Sharks\", alongside early bony fish, crinoids (sea lilies) and brachiopods that carpeted the seafloor."
        ),
        "taxa": ["Stethacanthus", "Xenacanthus", "Crinoids", "Brachiopods"],
        "illustrativeTaxon": "Stethacanthus",
    },
    {
        "id": "triassic",
        "label": "Triassic",
        "myaRange": "252-201",
        "description": (
            "Marine reptiles emerged and diversified in the aftermath of the end-Permian mass extinction — the "
            "most severe extinction event in Earth's history, which wiped out an estimated 90%+ of marine species "
            "and left ecological niches wide open for new predators to fill."
        ),
        "taxa": ["Ichthyosaurs", "Nothosaurs", "Ammonites"],
        "illustrativeTaxon": "Ichthyosaurus",
    },
    {
        "id": "jurassic",
        "label": "Jurassic",
        "myaRange": "201-145",
        "description": (
            "Large marine reptiles dominated the oceans: dolphin-shaped ichthyosaurs and long-necked plesiosaurs "
            "hunted among abundant coiled ammonites and squid-like belemnites, which are among the most common "
            "marine fossils from this period."
        ),
        "taxa": ["Ichthyosaurs", "Plesiosaurs", "Ammonites", "Belemnites"],
        "illustrativeTaxon": "Plesiosaur",
    },
    {
        "id": "cretaceous",
        "label": "Cretaceous",
        "myaRange": "145-66",
        "description": (
            "Mosasaurs — enormous marine lizards related to modern monitor lizards — became apex predators of the "
            "Late Cretaceous oceans, growing up to 17 metres long, before the end-Cretaceous mass extinction (the "
            "same event that ended the non-avian dinosaurs) closed the age of marine reptiles."
        ),
        "taxa": ["Mosasaurs", "Plesiosaurs", "Ammonites", "Early sharks"],
        "illustrativeTaxon": "Mosasaurus",
    },
]


def list_eras():
    return envelope("Astilo (curated paleontology reference)", "paleo_ocean_timeline", None, {"eras": ERAS}, confidence="CURATED")
