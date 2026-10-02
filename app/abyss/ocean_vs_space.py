"""Compares Earth's abyssal ocean with the hypothesized subsurface oceans on
Europa and Enceladus — real NASA/Cassini/Galileo mission findings for the
astronomical facts, with extraterrestrial biology explicitly labeled
Unknown/Hypothetical per the Abyss build rule: "clearly label
extraterrestrial biology as hypothetical." Connects Cosmos and Abyss
(blueprint section 47).

Europa's and Enceladus's images are specific, well-known NASA mission
photographs (public domain as U.S. government works) hardcoded here with
their real catalog IDs rather than looked up generically — PIA19048 is
Galileo's highest-resolution color mosaic of Europa, and PIA12733 is a
Cassini image of Enceladus's south-polar plumes, both verified live against
NASA's asset server before being added. Earth's image is resolved
dynamically via the same license-gated Wikipedia lookup used elsewhere
(see species_images.py), since there's no single iconic mission photo to
hardcode for "Earth's abyssal zone"."""

from app.abyss.http import envelope

WORLDS = [
    {
        "id": "earth-abyss",
        "label": "Earth — Abyssal Zone",
        "water": "Liquid, global ocean",
        "sunlight": "None below ~1,000 m",
        "temperatureC": "~2 to 4°C",
        "pressureAtm": "~400-600 atm",
        "energySource": "Chemosynthesis at hydrothermal vents; marine snow sinking from the sunlit surface",
        "knownLife": "Confirmed — chemosynthetic ecosystems, deep-sea fish, cephalopods, countless invertebrates",
        "lifeStatus": "CONFIRMED",
        "confidence": "OBSERVED",
        "imageTopic": "Hydrothermal vent",
        "summary": (
            "Earth's abyssal zone (4,000-6,000 m) is the best-understood deep ocean environment we have — directly "
            "sampled by submersibles, ROVs and decades of oceanographic expeditions. Despite crushing pressure and "
            "total darkness, it hosts thriving ecosystems powered not by sunlight but by chemosynthesis: bacteria "
            "at hydrothermal vents oxidize hydrogen sulfide and methane to produce energy, supporting giant tube "
            "worms, vent crabs and a food web entirely independent of the sun."
        ),
    },
    {
        "id": "europa",
        "label": "Europa (moon of Jupiter)",
        "water": "Subsurface global ocean beneath an ice shell — strong evidence from Galileo magnetometer data",
        "sunlight": "None (ocean lies beneath roughly 15-25 km of ice)",
        "temperatureC": "Surface ~-160°C; ocean likely just above 0°C near any heat source",
        "pressureAtm": "Not precisely known; likely substantial at the ocean floor",
        "energySource": "Tidal heating from Jupiter; hydrothermal activity hypothesized but unconfirmed",
        "knownLife": "Unknown — no direct evidence either way; a high-priority astrobiology target (NASA's Europa Clipper mission)",
        "lifeStatus": "UNKNOWN",
        "confidence": "CURATED",
        "imageId": "PIA19048",
        "imageUrl": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia19/pia19048/PIA19048.jpg",
        "imageCredit": "NASA/JPL-Caltech/SETI Institute — Galileo mission (PIA19048)",
        "imageLicense": "Public domain (U.S. government work)",
        "summary": (
            "Europa's icy surface is criss-crossed with reddish-brown fractures, evidence of a dynamic shell "
            "floating on a salty, liquid-water ocean that may contain more water than all of Earth's oceans "
            "combined. NASA's Europa Clipper mission (launched 2024) will study whether conditions beneath the "
            "ice could support life, without landing or directly sampling the ocean itself."
        ),
    },
    {
        "id": "enceladus",
        "label": "Enceladus (moon of Saturn)",
        "water": "Subsurface ocean confirmed via direct plume sampling by the Cassini spacecraft",
        "sunlight": "None",
        "temperatureC": "Surface ~-200°C; ocean near 0°C",
        "pressureAtm": "Not precisely known",
        "energySource": "Hydrothermal activity detected (silica nanoparticles identified in plume samples by Cassini)",
        "knownLife": "Unknown — plumes contain organic molecules and molecular hydrogen, conditions compatible with chemosynthesis in principle, but no life has been detected",
        "lifeStatus": "UNKNOWN",
        "confidence": "CURATED",
        "imageId": "PIA12733",
        "imageUrl": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia12/pia12733/PIA12733.jpg",
        "imageCredit": "NASA/JPL/Space Science Institute — Cassini mission (PIA12733)",
        "imageLicense": "Public domain (U.S. government work)",
        "summary": (
            "Enceladus actively sprays its subsurface ocean into space through fractures nicknamed \"tiger "
            "stripes\" near its south pole — Cassini flew directly through these plumes and detected salts, "
            "organic molecules, molecular hydrogen, and silica grains that form only in hot water in contact "
            "with rock, strong evidence for ongoing hydrothermal activity on the ocean floor."
        ),
    },
]


def list_worlds():
    return envelope("NASA mission data (Galileo, Cassini) + Astilo curation", "ocean_vs_space_comparison", None, {"worlds": WORLDS}, confidence="CURATED")
