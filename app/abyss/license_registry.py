"""Astilo Abyss's license registry — rule #3/#4/#5 made enforceable in code
rather than left as policy prose: every external dataset's license is
recorded, nothing is assumed "free to reuse" just because it's public, and a
dataset whose license conflicts with Astilo's configured policy is flagged
disabled rather than silently ingested.

SEED_DATA_SOURCES below reflects only what's been verified in the project's
own research (see the Abyss blueprint). It is deliberately conservative:
"varies per dataset" providers (GBIF) are seeded as a reminder to check each
dataset's own license before ingestion, not as a blanket license for
everything the provider hosts."""

from app.config import config

SEED_DATA_SOURCES = [
    {
        "module": "abyss",
        "provider": "OBIS",
        "dataset": "Ocean Biodiversity Information System — occurrence records",
        "license": "Varies per dataset (OBIS aggregates from many providers)",
        "commercial_allowed": None,
        "attribution_required": True,
        "enabled": True,
        "source_url": "https://obis.org",
        "terms_url": "https://manual.obis.org/policy.html",
        "notes": (
            "Primary marine biodiversity source. OBIS supports open marine data but "
            "individual datasets retain their own license — check per-record attribution "
            "before reuse beyond display with citation."
        ),
    },
    {
        "module": "abyss",
        "provider": "GBIF",
        "dataset": "Global Biodiversity Information Facility — occurrence records",
        "license": "Varies per dataset: CC0, CC BY, or CC BY-NC",
        "commercial_allowed": None,
        "attribution_required": True,
        "enabled": True,
        "source_url": "https://www.gbif.org",
        "terms_url": "https://www.gbif.org/terms",
        "notes": (
            "Supplementary biodiversity source. Only datasets matching the configured "
            "ABYSS_ALLOW_CC0 / ABYSS_ALLOW_CC_BY / ABYSS_ALLOW_CC_BY_NC policy should be "
            "ingested — filter by license at query time, per dataset."
        ),
    },
    {
        "module": "abyss",
        "provider": "WoRMS",
        "dataset": "World Register of Marine Species — taxonomy",
        "license": "CC BY 4.0 (verify current terms before production use)",
        "commercial_allowed": True,
        "attribution_required": True,
        "enabled": True,
        "source_url": "https://www.marinespecies.org",
        "terms_url": "https://www.marinespecies.org/about.php#terms",
        "notes": "Preferred authority for marine taxonomy, pending API/terms verification at implementation time.",
    },
    {
        "module": "abyss",
        "provider": "Copernicus Marine",
        "dataset": "Copernicus Marine Service — temperature, salinity, currents, biogeochemistry",
        "license": "Free for commercial and non-commercial use with acknowledgement",
        "commercial_allowed": True,
        "attribution_required": True,
        "enabled": True,
        "source_url": "https://marine.copernicus.eu",
        "terms_url": "https://marine.copernicus.eu/user-corner/service-commitments-and-licence",
        "notes": "Free registration required. Primary environmental-ocean-data source.",
    },
    {
        "module": "abyss",
        "provider": "EMODnet",
        "dataset": "European Marine Observation and Data Network — bathymetry, biology, chemistry, physics",
        "license": "Generally CC BY 4.0; source-dataset metadata may impose additional conditions",
        "commercial_allowed": True,
        "attribution_required": True,
        "enabled": True,
        "source_url": "https://emodnet.ec.europa.eu",
        "terms_url": "https://emodnet.ec.europa.eu/en/data-policy",
        "notes": "Check each product's own metadata for additional restrictions before reuse.",
    },
    {
        "module": "abyss",
        "provider": "NASA Earthdata",
        "dataset": "NASA Earth Science — ocean color, SST, sea ice, satellite imagery",
        "license": "Full and open data policy",
        "commercial_allowed": True,
        "attribution_required": True,
        "enabled": True,
        "source_url": "https://earthdata.nasa.gov",
        "terms_url": "https://www.earthdata.nasa.gov/learn/articles/earthdata-cloud-data-use-and-citation-guidance",
        "notes": "Dataset-specific use constraints should still be checked per product.",
    },
    {
        "module": "abyss",
        "provider": "NASA GIBS",
        "dataset": "Global Imagery Browse Services — true color, SST, chlorophyll satellite tile layers",
        "license": "Full and open data policy",
        "commercial_allowed": True,
        "attribution_required": True,
        "enabled": True,
        "source_url": "https://wiki.earthdata.nasa.gov/display/GIBS",
        "terms_url": "https://www.earthdata.nasa.gov/engage/open-data-services-software-policies",
        "notes": "Keyless WMTS tile service — tiles are fetched directly by the browser, not proxied.",
    },
    {
        "module": "abyss",
        "provider": "EMODnet",
        "dataset": "EMODnet Bathymetry — Digital Terrain Model (point depth + tile layer)",
        "license": "Generally CC BY 4.0; source-dataset metadata may impose additional conditions",
        "commercial_allowed": True,
        "attribution_required": True,
        "enabled": True,
        "source_url": "https://emodnet.ec.europa.eu/en/bathymetry",
        "terms_url": "https://emodnet.ec.europa.eu/en/data-policy",
        "notes": "Keyless WMS service, queried live (no caching of point depth lookups).",
    },
    {
        "module": "abyss",
        "provider": "NOAA Fisheries",
        "dataset": "Sounds in the Ocean — Mammals audio library",
        "license": "Public domain (U.S. government work)",
        "commercial_allowed": True,
        "attribution_required": True,
        "enabled": True,
        "source_url": "https://www.fisheries.noaa.gov/national/science-data/sounds-ocean-mammals",
        "terms_url": "https://www.fisheries.noaa.gov/s3/2023-06/SoundsPageCitations-2023-0.pdf",
        "notes": "Public domain, but NOAA requests citation per the linked citation guide — honored here even though not legally required.",
    },
    {
        "module": "abyss",
        "provider": "Global Fishing Watch",
        "dataset": "Global Fishing Watch API",
        "license": "Free for non-commercial use only; commercial use requires separate arrangement",
        "commercial_allowed": False,
        "attribution_required": True,
        "enabled": False,
        "source_url": "https://globalfishingwatch.org",
        "terms_url": "https://globalfishingwatch.org/our-apis/terms",
        "notes": "Excluded from the default Astilo build (see ABYSS_FEATURE_GFW). Opt-in developer feature only.",
    },
]


def is_dataset_allowed(license_label: str) -> bool:
    """Checks a dataset's license string against Astilo's configured
    reuse policy. Used by provider adapters before an external record is
    ever surfaced to the UI, so a license mismatch fails closed."""
    normalized = license_label.strip().upper()
    if "CC0" in normalized:
        return config.ABYSS_ALLOW_CC0
    if "CC BY-NC" in normalized or "CC BY NC" in normalized:
        return config.ABYSS_ALLOW_CC_BY_NC
    if "CC BY" in normalized:
        return config.ABYSS_ALLOW_CC_BY
    # Unrecognized/unverified license strings fail closed rather than being
    # assumed safe to reuse.
    return False
