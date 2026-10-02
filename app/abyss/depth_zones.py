"""Depth-zone reference data for Abyss's Depth Descent experience. Zone
boundaries and the pressure formula are real oceanography/physics; the
species listed per zone are a human-curated sample of real, documented
species known to inhabit that depth range (not AI-inferred) — each one
resolvable to its real WoRMS taxonomy and OBIS occurrence records via the
existing /api/abyss/species endpoints. Depth Descent never invents a species
or a measurement; it only ever points at real ones."""

import random

from app.abyss.http import envelope

ZONES = [
    {
        "id": "sunlight",
        "label": "Sunlight Zone",
        "minMeters": 0,
        "maxMeters": 200,
        "lightPercent": 100,
        "tempRangeC": "~26 to 20°C",
        "description": "Bright, photosynthesis-capable ocean — reefs, turtles, sharks.",
        "species": [
            {"scientificName": "Chelonia mydas", "commonName": "Green sea turtle"},
            {"scientificName": "Amphiprion ocellaris", "commonName": "Clownfish"},
            {"scientificName": "Acropora cervicornis", "commonName": "Staghorn coral"},
        ],
    },
    {
        "id": "twilight",
        "label": "Twilight Zone",
        "minMeters": 200,
        "maxMeters": 1000,
        "lightPercent": 1,
        "tempRangeC": "~20 to 8°C",
        "description": "Light fades to near-darkness; bioluminescent organisms begin appearing.",
        "species": [
            {"scientificName": "Vampyroteuthis infernalis", "commonName": "Vampire squid"},
            {"scientificName": "Argyropelecus aculeatus", "commonName": "Deep-sea hatchetfish"},
            {"scientificName": "Benthosema glaciale", "commonName": "Glacier lanternfish"},
        ],
    },
    {
        "id": "midnight",
        "label": "Midnight Zone",
        "minMeters": 1000,
        "maxMeters": 4000,
        "lightPercent": 0,
        "tempRangeC": "~8 to 4°C",
        "description": "No sunlight reaches here — bioluminescence is the primary light source.",
        "species": [
            {"scientificName": "Melanocetus johnsonii", "commonName": "Humpback anglerfish"},
            {"scientificName": "Architeuthis dux", "commonName": "Giant squid"},
            {"scientificName": "Eurypharynx pelecanoides", "commonName": "Gulper eel"},
        ],
    },
    {
        "id": "abyssal",
        "label": "Abyssal Zone",
        "minMeters": 4000,
        "maxMeters": 6000,
        "lightPercent": 0,
        "tempRangeC": "~4 to 2°C",
        "description": "Marine snow drifts down from above; life is sparse and slow.",
        "species": [
            {"scientificName": "Grimpoteuthis", "commonName": "Dumbo octopus"},
            {"scientificName": "Scotoplanes globosa", "commonName": "Sea pig"},
        ],
    },
    {
        "id": "hadal",
        "label": "Hadal Zone",
        "minMeters": 6000,
        "maxMeters": 11000,
        "lightPercent": 0,
        "tempRangeC": "~1 to 4°C",
        "description": "Ocean trenches — extreme pressure, home to the deepest-known fish and amphipods.",
        "species": [
            {"scientificName": "Pseudoliparis swirei", "commonName": "Mariana snailfish"},
            {"scientificName": "Hirondellea gigas", "commonName": "Giant amphipod"},
        ],
    },
]


def pressure_atm(depth_m: float) -> float:
    """Hydrostatic approximation: +1 atm per 10m of seawater, plus 1 atm at
    the surface. A real physical formula, not a measurement — this is why
    describe_depth() reports it as MODELLED rather than OBSERVED."""
    return 1 + depth_m / 10


def zone_for_depth(depth_m: float) -> dict:
    for zone in ZONES:
        if zone["minMeters"] <= depth_m < zone["maxMeters"]:
            return zone
    return ZONES[-1] if depth_m >= ZONES[-1]["minMeters"] else ZONES[0]


def list_zones():
    return envelope("Astilo", "depth_zone_reference", None, {"zones": ZONES}, confidence="CURATED")


def describe_depth(depth_m: float):
    zone = zone_for_depth(depth_m)
    data = {
        "depthMeters": depth_m,
        "zoneId": zone["id"],
        "zoneLabel": zone["label"],
        "lightPercent": zone["lightPercent"],
        "pressureAtm": round(pressure_atm(depth_m), 2),
    }
    return envelope("Astilo", "depth_physics_model", None, data, confidence="MODELLED")


def random_encounter(depth_m: float):
    """A simulated discovery-mode encounter: which real species might be
    nearby is drawn from the curated per-zone list (an honest reference),
    but the specific distance/size here are randomized game flavor, not a
    measurement of any real individual — hence confidence=SIMULATED. The
    frontend resolves the species name to its real WoRMS/OBIS profile
    separately once the user "scans" it."""
    zone = zone_for_depth(depth_m)
    choice = random.choice(zone["species"])
    data = {
        "zoneId": zone["id"],
        "scientificName": choice["scientificName"],
        "commonName": choice["commonName"],
        "distanceMeters": round(random.uniform(3, 25), 1),
        "estimatedSizeCm": round(random.uniform(5, 80), 1),
    }
    return envelope("Astilo", "depth_descent_encounter", None, data, confidence="SIMULATED")
