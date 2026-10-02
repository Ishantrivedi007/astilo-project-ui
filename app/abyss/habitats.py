"""Habitat Explorer — curated reference environments (blueprint section 11).
No keyless API profiles per-habitat environmental summaries at this
granularity, so these descriptions are Astilo's own curated writing; the
organisms listed are real, WoRMS-resolvable species names, and images are
resolved live via the license-gated species_images lookup, not embedded
here directly."""

from app.abyss.http import envelope

HABITATS = [
    {
        "id": "coral-reef",
        "label": "Coral Reef",
        "depthRange": "0-40 m (typically)",
        "temperatureRange": "~23 to 29°C",
        "salinityPsu": "~34 to 36",
        "description": (
            "Among the most biodiverse ecosystems on Earth, built by colonial coral polyps that secrete calcium "
            "carbonate skeletons over centuries. Reefs cover under 1% of the ocean floor but support roughly a "
            "quarter of all known marine species."
        ),
        "threats": ["Ocean warming (coral bleaching)", "Ocean acidification", "Pollution", "Overfishing"],
        "exampleSpecies": ["Acropora cervicornis", "Amphiprion ocellaris", "Chelonia mydas"],
        "imageTopic": "Coral reef",
    },
    {
        "id": "kelp-forest",
        "label": "Kelp Forest",
        "depthRange": "2-30 m",
        "temperatureRange": "~5 to 20°C",
        "salinityPsu": "~33 to 35",
        "description": (
            "Dense underwater forests of giant kelp — among the fastest-growing organisms on Earth — form a "
            "three-dimensional habitat structure supporting countless fish and invertebrates in temperate coastal "
            "waters."
        ),
        "threats": ["Warming waters", "Sea urchin overgrazing from lost sea otter predation", "Pollution"],
        "exampleSpecies": ["Enhydra lutris", "Strongylocentrotus purpuratus"],
        "imageTopic": "Kelp forest",
    },
    {
        "id": "mangrove",
        "label": "Mangrove",
        "depthRange": "Intertidal",
        "temperatureRange": "~20 to 30°C",
        "salinityPsu": "Variable — brackish to full marine",
        "description": (
            "Salt-tolerant trees forming coastal forests that stabilize shorelines, filter pollutants, and serve "
            "as critical nurseries for juvenile fish and crustaceans."
        ),
        "threats": ["Coastal development", "Conversion to aquaculture ponds", "Sea level rise"],
        "exampleSpecies": ["Rhizophora mangle"],
        "imageTopic": "Mangrove",
    },
    {
        "id": "seagrass-meadow",
        "label": "Seagrass Meadow",
        "depthRange": "0-50 m",
        "temperatureRange": "~15 to 30°C",
        "salinityPsu": "~30 to 38",
        "description": (
            "Underwater flowering plants forming vast meadows that stabilize sediment and sequester carbon at "
            "rates exceeding tropical rainforests per unit area, while providing critical grazing habitat."
        ),
        "threats": ["Nutrient runoff / eutrophication", "Coastal development", "Trawling damage"],
        "exampleSpecies": ["Chelonia mydas"],
        "imageTopic": "Seagrass",
    },
    {
        "id": "open-ocean",
        "label": "Open Ocean (Pelagic)",
        "depthRange": "0-200 m (epipelagic)",
        "temperatureRange": "~2 to 30°C (highly variable)",
        "salinityPsu": "~34 to 36",
        "description": (
            "The vast sunlit water column far from shore, dominated by phytoplankton primary production "
            "supporting open-water predators that roam enormous distances."
        ),
        "threats": ["Overfishing", "Plastic pollution", "Climate-driven range shifts"],
        "exampleSpecies": ["Thunnus albacares", "Carcharodon carcharias"],
        "imageTopic": "Pelagic zone",
    },
    {
        "id": "polar-ocean",
        "label": "Polar Ocean",
        "depthRange": "0 m to abyssal",
        "temperatureRange": "~-2 to 5°C",
        "salinityPsu": "~32 to 35",
        "description": (
            "Ice-covered or ice-adjacent seas at high latitudes, supporting ice-algae-based food webs and highly "
            "specialized cold-adapted species found nowhere else."
        ),
        "threats": ["Sea ice loss", "Ocean warming", "Ocean acidification (faster in cold water)"],
        "exampleSpecies": ["Balaenoptera musculus", "Euphausia superba"],
        "imageTopic": "Sea ice",
    },
    {
        "id": "hydrothermal-vent",
        "label": "Hydrothermal Vent",
        "depthRange": "~1,500-4,000 m (typical)",
        "temperatureRange": "Ambient ~2°C; vent fluid up to ~400°C",
        "salinityPsu": "Variable near vents",
        "description": (
            "Mineral-rich, superheated water erupting from the seafloor along tectonic spreading centers, "
            "supporting ecosystems that run entirely on chemosynthesis rather than sunlight."
        ),
        "threats": ["Deep-sea mining exploration", "Otherwise limited direct human impact due to depth"],
        "exampleSpecies": ["Riftia pachyptila"],
        "imageTopic": "Hydrothermal vent",
    },
    {
        "id": "abyssal-plain",
        "label": "Abyssal Plain",
        "depthRange": "3,000-6,000 m",
        "temperatureRange": "~0 to 4°C",
        "salinityPsu": "~34.7",
        "description": (
            "Vast, flat expanses of seafloor covering more of Earth's surface than any other single habitat type, "
            "blanketed in fine sediment and sustained by marine snow drifting down from the surface."
        ),
        "threats": ["Deep-sea mining (polymetallic nodules)", "Climate-driven changes in surface productivity"],
        "exampleSpecies": ["Scotoplanes globosa"],
        "imageTopic": "Abyssal plain",
    },
]


def list_habitats():
    return envelope("Astilo curated reference", "habitat_catalog", None, {"habitats": HABITATS}, confidence="CURATED")
