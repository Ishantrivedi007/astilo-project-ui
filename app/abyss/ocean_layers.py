"""Catalog of keyless, tile-based ocean map layers — NASA GIBS satellite
imagery and EMODnet Bathymetry WMS. The browser fetches the actual map tiles
directly from these providers (the request volume is far too high to proxy
through this backend, same as Cosmos linking directly to NASA image URLs),
but the catalog itself is served from here so every layer's provider,
attribution and license stay in one traceable place rather than hardcoded
into frontend components."""

import datetime

from app.abyss.http import envelope

GIBS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best"
EMODNET_BATHYMETRY_WMS = "https://ows.emodnet-bathymetry.eu/wms"


def _recent_date(days_back: int) -> str:
    # GIBS "best available" layers typically lag a few days behind today;
    # the frontend lets a user pick a different date, this is just a default
    # that's likely to already have imagery published.
    return (datetime.date.today() - datetime.timedelta(days=days_back)).isoformat()


def list_layers():
    layers = [
        {
            "id": "true-color",
            "label": "True color (MODIS Terra)",
            "kind": "xyz",
            "tileUrlTemplate": f"{GIBS_BASE}/MODIS_Terra_CorrectedReflectance_TrueColor/default/{{time}}/GoogleMapsCompatible_Level9/{{z}}/{{y}}/{{x}}.jpg",
            "defaultTime": _recent_date(3),
            "source": "NASA GIBS",
            "attribution": "NASA EOSDIS GIBS / MODIS Terra",
            "confidence": "OBSERVED",
        },
        {
            "id": "sea-surface-temperature",
            "label": "Sea surface temperature",
            "kind": "xyz",
            "tileUrlTemplate": f"{GIBS_BASE}/GHRSST_L4_MUR_Sea_Surface_Temperature/default/{{time}}/GoogleMapsCompatible_Level7/{{z}}/{{y}}/{{x}}.png",
            "defaultTime": _recent_date(3),
            "source": "NASA GIBS",
            "attribution": "NASA EOSDIS GIBS / GHRSST Level 4 MUR",
            "confidence": "OBSERVED",
        },
        {
            "id": "chlorophyll",
            "label": "Chlorophyll concentration",
            "kind": "xyz",
            "tileUrlTemplate": f"{GIBS_BASE}/VIIRS_SNPP_L2_Chlorophyll_A/default/{{time}}/GoogleMapsCompatible_Level7/{{z}}/{{y}}/{{x}}.png",
            "defaultTime": _recent_date(5),
            "source": "NASA GIBS",
            "attribution": "NASA EOSDIS GIBS / VIIRS SNPP",
            "confidence": "OBSERVED",
        },
        {
            "id": "bathymetry",
            "label": "Bathymetry",
            "kind": "wms",
            "wmsBaseUrl": EMODNET_BATHYMETRY_WMS,
            "wmsLayer": "emodnet:mean",
            "source": "EMODnet Bathymetry",
            "attribution": "EMODnet Bathymetry Consortium",
            "confidence": "OBSERVED",
        },
    ]
    return envelope("Astilo", "ocean_layer_catalog", None, {"layers": layers}, confidence="CURATED")
