"""Microbial Ocean & Plankton Universe (blueprint sections 32-33) — curated
reference content on the microbial and planktonic world, since there is no
keyless API providing this kind of taxonomic-group overview. Every named
genus/group is real and independently verifiable."""

from app.abyss.http import envelope

MICROBIAL_GROUPS = [
    {"id": "bacteria", "label": "Bacteria", "exampleGenus": "Pelagibacter", "description": "The most abundant organisms in the ocean by cell count — SAR11 bacteria (genus Pelagibacter) alone may be the most numerous organism on Earth, playing a central role in recycling dissolved organic carbon."},
    {"id": "archaea", "label": "Archaea", "exampleGenus": "Nitrosopumilus", "description": "Single-celled microbes distinct from bacteria, abundant in the deep ocean; ammonia-oxidizing archaea are major players in the marine nitrogen cycle."},
    {"id": "cyanobacteria", "label": "Cyanobacteria", "exampleGenus": "Prochlorococcus", "description": "Photosynthetic bacteria — Prochlorococcus is the smallest and most abundant photosynthetic organism on Earth, responsible for a significant fraction of global oxygen production."},
    {"id": "viruses", "label": "Viruses (Virioplankton)", "exampleGenus": "Bacteriophage", "description": "The ocean's most numerous biological entities by far; marine bacteriophages regulate bacterial populations and drive nutrient cycling by bursting their hosts (the \"viral shunt\")."},
    {"id": "protists", "label": "Protists", "exampleGenus": "Foraminifera", "description": "A diverse group of single-celled eukaryotes including foraminifera (which build shells used to reconstruct ancient ocean conditions) and radiolarians."},
    {"id": "phytoplankton", "label": "Phytoplankton", "exampleGenus": "Diatom", "description": "Photosynthetic plankton forming the base of most marine food webs; diatoms alone are estimated to generate roughly a fifth of the oxygen produced on Earth annually."},
]

PLANKTON_CATEGORIES = [
    {"id": "phytoplankton", "label": "Phytoplankton", "description": "Photosynthetic plankton — primary producers at the base of the marine food web."},
    {"id": "zooplankton", "label": "Zooplankton", "description": "Animal plankton, from microscopic copepods to jellyfish, that graze on phytoplankton and feed larger predators."},
    {"id": "bacterioplankton", "label": "Bacterioplankton", "description": "Free-floating bacteria that drive the \"microbial loop\", recycling dissolved organic matter back into the food web."},
    {"id": "mycoplankton", "label": "Mycoplankton", "description": "Planktonic fungi, a less-studied component of marine microbial communities involved in decomposition."},
    {"id": "virioplankton", "label": "Virioplankton", "description": "Free viral particles, the most numerous biological entities in seawater by far."},
]

CONCEPTS = [
    {"id": "microbial-loop", "label": "Microbial loop", "description": "The pathway by which dissolved organic carbon, otherwise unavailable to larger organisms, is returned to the food web via bacteria that are in turn consumed by protists and zooplankton."},
    {"id": "nutrient-cycling", "label": "Nutrient cycling", "description": "Microbes drive the ocean's nitrogen, phosphorus and sulfur cycles — fixing, converting and recycling nutrients essential to all marine life."},
    {"id": "primary-production", "label": "Primary production", "description": "The conversion of carbon dioxide into organic matter by phytoplankton and cyanobacteria, the energetic foundation nearly all ocean life depends on."},
    {"id": "carbon-cycling", "label": "Carbon cycling", "description": "The \"biological pump\" — organic carbon fixed by phytoplankton sinks as marine snow, sequestering carbon in the deep ocean and seafloor sediments for centuries to millennia."},
    {"id": "decomposition", "label": "Decomposition", "description": "Bacteria and fungi break down dead organisms and waste, releasing nutrients back into the water column to fuel new primary production."},
]


def overview():
    data = {"microbialGroups": MICROBIAL_GROUPS, "planktonCategories": PLANKTON_CATEGORIES, "concepts": CONCEPTS}
    return envelope("Astilo curated reference", "microbial_ocean_overview", None, data, confidence="CURATED")
