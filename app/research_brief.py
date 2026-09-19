"""Builds the automated part of a Research note: key points pulled from the
real Wikipedia summary, and a checklist of further-research directions.

Nothing here is invented data — "key points" are sentences taken directly
from the fetched Wikipedia extract, and "further research" items are either
template prompts standard to that object type (e.g. "check for follow-up
transit observations" for exoplanets) or driven by which of the object's own
fields came back empty (a real, observable gap — not a guess).
"""

import re

# Field -> human-readable gap prompt, checked against the object's own data.
FIELD_GAP_PROMPTS: dict[str, str] = {
    "massEarthMasses": "Mass hasn't been measured yet — check for newer radial-velocity or TTV studies.",
    "massKg": "Mass is unknown — look for updated mass-determination studies.",
    "radiusEarthRadii": "Radius is unknown — check for newer transit photometry.",
    "rotationPeriodHours": "Rotation period is unknown — check for photometric light-curve studies.",
    "albedo": "Albedo (reflectivity) is unknown — check for thermal infrared observations.",
    "equilibriumTemperatureK": "Equilibrium temperature hasn't been modeled — check recent atmosphere studies.",
    "eccentricity": "Orbital eccentricity is unknown — check for refined orbit-fit solutions.",
    "distanceParsecs": "Distance is unknown — check for updated parallax measurements (e.g. Gaia DR3).",
    "hostStarTeffK": "Host star temperature is unknown — check the host star's own catalog entry.",
    "discoveryMethod": "Discovery method isn't recorded — check the discovery paper.",
}

TYPE_PROMPTS: dict[str, list[str]] = {
    "asteroid": [
        "Check JPL Horizons for the latest close-approach and orbit-refinement data.",
        "Look up its spectral classification to infer likely composition.",
        "Check whether it's on any active impact-risk monitoring list (Sentry, NEODyS).",
    ],
    "exoplanet": [
        "Check whether it's a JWST or other space-telescope atmosphere-characterization target.",
        "Compare its equilibrium temperature and radius against the habitable-zone boundaries for its host star.",
        "Look for follow-up radial-velocity or transit-timing studies that refine its mass/orbit.",
    ],
    "star": [
        "Check for known exoplanets or a debris disk around this star.",
        "Look up its variability classification and spectral type in SIMBAD.",
        "Check whether it has a resolved binary/multiple companion.",
    ],
    "galaxy": [
        "Check its morphological classification (spiral, elliptical, irregular) and any recent redshift survey data.",
        "Look for active galactic nucleus (AGN) or starburst activity reports.",
        "Check for known satellite galaxies or interaction/merger history.",
    ],
    "supernova": [
        "Check for the progenitor star type and explosion mechanism (Type Ia vs. core-collapse).",
        "Look for a known remnant (e.g. pulsar, nebula) at this location today.",
        "Check the estimated distance and whether it's been used as a standard candle.",
    ],
    "observation": [
        "Check the mission's archive for other observations of the same target across wavelengths.",
        "Compare against earlier observations of the same target to look for change over time.",
    ],
    "planet": [
        "Check for the latest orbital elements and any upcoming close-approach or opposition dates.",
        "Look for recent atmospheric or surface composition studies.",
    ],
    "image": [
        "Check the mission/instrument page for the full observation program this image belongs to.",
        "Look for a scientific paper that analyzes this specific observation.",
    ],
}

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z(])")


def key_points_from_extract(extract: str | None, max_points: int = 5) -> list[str]:
    if not extract:
        return []
    # Multi-paragraph extracts come back with real newlines between
    # paragraphs — flatten those before sentence-splitting.
    flat = extract.replace("\n", " ")
    sentences = [s.strip() for s in _SENTENCE_SPLIT.split(flat) if s.strip()]
    points = sentences[:max_points]
    # Wikipedia's char-capped extract can cut off mid-sentence (sometimes
    # marked with a trailing "..."); drop a trailing fragment that isn't a
    # genuine complete sentence rather than show a truncated one.
    if points and (points[-1].endswith("...") or not points[-1].endswith((".", "!", "?", "…"))):
        points = points[:-1]
    return points


def further_research(object_type: str, data: dict | None) -> list[str]:
    items = list(TYPE_PROMPTS.get(object_type, []))
    for field, prompt in FIELD_GAP_PROMPTS.items():
        if data and field in data and data.get(field) in (None, ""):
            items.append(prompt)
    return items
