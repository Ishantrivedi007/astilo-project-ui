"""Virtual Microscope reference specimens — real, licensed open images
(NOAA/NASA public-domain photomicrographs, one public-domain historical
illustration, one CC BY 4.0 photo), never randomly scraped images. Every
entry carries its own credit and license independently of Abyss's
dataset-level license registry, per blueprint rule #64 ("images... require
their own license records"). All five image URLs were verified live before
being added here.

"Magnification" in this feature is a simulated zoom of the reference image —
Astilo has no live optical microscope hardware — so the frontend must always
caption it as such rather than implying an optical capture at that power."""

from app.abyss.http import envelope

SPECIMENS = [
    {
        "id": "diatom-mixed",
        "category": "diatom",
        "commonName": "Mixed sea-ice diatoms",
        "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/3/31/Diatoms_through_the_microscope.jpg",
        "imageType": "photomicrograph",
        "credit": "Prof. Gordon T. Taylor, Stony Brook University / NOAA Corps Collection",
        "license": "Public domain (NOAA)",
    },
    {
        "id": "phytoplankton-mixed",
        "category": "phytoplankton",
        "commonName": "Mixed phytoplankton",
        "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/9/99/Phytoplankton_-_the_foundation_of_the_oceanic_food_chain.jpg",
        "imageType": "photomicrograph",
        "credit": "NOAA",
        "license": "Public domain (NOAA)",
    },
    {
        "id": "dinoflagellate-ceratium",
        "category": "dinoflagellate",
        "commonName": "Ceratium macroceras",
        "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/5/51/Ceratium_macroceras.png",
        "imageType": "historical illustration (1904)",
        "credit": "Johann Friedrich Oltmanns (1904)",
        "license": "Public domain",
    },
    {
        "id": "bacteria-cyanobacteria",
        "category": "bacteria",
        "commonName": "Cyanobacteria microbial mat",
        "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/c/c0/Cyanobacteria_guerrero_negro.jpg",
        "imageType": "photomicrograph",
        "credit": "NASA",
        "license": "Public domain (NASA)",
    },
    {
        "id": "zooplankton-copepod",
        "category": "zooplankton",
        "commonName": "Live copepods",
        "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/d/d4/Live_Copepods_under_Microscope_%E2%80%93_Black_Background_%28Macro_Photography%29.jpg",
        "imageType": "photomicrograph",
        "credit": "Lion Pods Live Copepods, via Wikimedia Commons",
        "license": "CC BY 4.0",
    },
]

SAMPLES = [
    {"id": "coral-reef", "label": "Coral Reef Water", "categories": ["dinoflagellate", "bacteria", "phytoplankton"]},
    {"id": "open-ocean", "label": "Open Ocean Water", "categories": ["phytoplankton", "diatom", "zooplankton"]},
    {"id": "pond-estuary", "label": "Pond / Estuary Sample", "categories": ["diatom", "zooplankton", "bacteria"]},
    {"id": "deep-sea", "label": "Deep Sea Sample", "categories": ["bacteria", "zooplankton"]},
]

MAGNIFICATIONS = [10, 40, 100, 400, 1000]


def list_samples():
    data = {"samples": SAMPLES, "magnifications": MAGNIFICATIONS}
    return envelope("Astilo", "microscope_sample_catalog", None, data, confidence="CURATED")


def specimens_for_sample(sample_id: str):
    sample = next((s for s in SAMPLES if s["id"] == sample_id), None)
    if sample is None:
        return None
    matches = [s for s in SPECIMENS if s["category"] in sample["categories"]]
    data = {"sampleLabel": sample["label"], "specimens": matches}
    return envelope("Wikimedia Commons / NOAA / NASA", "virtual_microscope_specimens", sample_id, data, confidence="OBSERVED")
