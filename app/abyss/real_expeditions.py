"""Astilo's Real Expedition Explorer — a curated catalog of real, currently
active ocean exploration programs (blueprint section 46). Each entry's URL
was verified to resolve before being added here; this is reference/pointer
content (program name, category, real URL, operator), not scraped expedition
records, so there's no occurrence-style data license to track — the
License Registry still lists each operator for attribution purposes."""

from app.abyss.http import envelope

PROGRAMS = [
    {
        "id": "noaa-ocean-exploration",
        "name": "NOAA Ocean Exploration — Okeanos Explorer",
        "operator": "NOAA",
        "categories": ["Deep Sea", "Ocean Mapping"],
        "description": "The only U.S. federal vessel dedicated to ocean exploration, mapping and exploring largely unknown deep waters with livestreamed ROV dives.",
        "url": "https://oceanexplorer.noaa.gov/expeditions/",
    },
    {
        "id": "schmidt-ocean-institute",
        "name": "Schmidt Ocean Institute — R/V Falkor (too)",
        "operator": "Schmidt Ocean Institute",
        "categories": ["Deep Sea", "Biodiversity"],
        "description": "A private non-profit providing free ship time to oceanographic researchers worldwide, with a strong focus on biodiversity discovery and open data.",
        "url": "https://schmidtocean.org/",
    },
    {
        "id": "schmidt-ocean-antarctica",
        "name": "Schmidt Ocean Institute — Antarctica Expeditions",
        "operator": "Schmidt Ocean Institute",
        "categories": ["Polar", "Biodiversity"],
        "description": "Polar seafloor mapping and biodiversity documentation around Antarctica.",
        "url": "https://schmidtocean.org/schmidt-ocean-institute-first-expedition-to-antarctica/",
    },
    {
        "id": "nautilus-live",
        "name": "E/V Nautilus — Ocean Exploration Trust",
        "operator": "Ocean Exploration Trust",
        "categories": ["Deep Sea", "Biodiversity"],
        "description": "A non-profit research vessel exploring geology, biology, archaeology and chemistry, with live video feeds from ROV dives year-round.",
        "url": "https://nautiluslive.org/",
    },
    {
        "id": "iodp",
        "name": "International Ocean Discovery Program (IODP)",
        "operator": "IODP / Texas A&M University",
        "categories": ["Ocean Mapping"],
        "description": "International scientific ocean drilling program studying Earth's history recorded in seafloor sediments and rock — the JOIDES Resolution completed 46 expeditions and 599 holes between 2013 and 2024.",
        "url": "https://iodp.tamu.edu/",
    },
    {
        "id": "whoi-expeditions",
        "name": "Woods Hole Oceanographic Institution — Blogs & Expeditions",
        "operator": "WHOI",
        "categories": ["Hydrothermal", "Deep Sea"],
        "description": "WHOI's ongoing deep-sea and hydrothermal vent research expeditions, including Arctic vent studies and deep submersible dives with Alvin.",
        "url": "https://www.whoi.edu/what-we-do/explore/blogs-expeditions/",
    },
]

CATEGORIES = ["Deep Sea", "Coral", "Polar", "Hydrothermal", "Biodiversity", "Ocean Mapping"]


def list_programs():
    return envelope("Astilo curated catalog", "real_expedition_programs", None, {"categories": CATEGORIES, "programs": PROGRAMS}, confidence="CURATED")
