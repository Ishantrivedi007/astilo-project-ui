"""Astilo Hubble Catalog — a curated, honestly-labeled browse experience
across everything Hubble (HST) has imaged, organized by object category.

MAST's observation catalog has no reliable "this is a planet vs a nebula"
field, so a genuinely exhaustive, auto-categorized "every object Hubble has
ever reached" browser isn't something the underlying data supports without
guessing. Instead this curates a seed list of well-known Hubble targets per
category (the primary browse experience) and falls back to a live SIMBAD
classification for anything the user searches outside that list.

"Monitoring" (check_for_new_observations below) is a real diff against
MAST's own observation counts for a rotating slice of the catalog, polled
by the frontend on an interval — not a simulation of telescope telemetry,
which no public API exposes. It can only ever report what MAST's archive
itself has newly published.

get_position() is a different, separate thing: Hubble's actual physical
location in low Earth orbit (lat/lon/altitude), which genuinely is public,
live-trackable data via CelesTrak's TLE catalog + SGP4 propagation — HST is
NORAD-tracked exactly like the ISS or any other satellite this app already
tracks in CosmosSatelliteTracker. This is *not* the same thing as where the
telescope is pointing/aiming in the sky for a given observation, which no
public API exposes.
"""

import datetime

from app.cosmos import exoplanets, gaia, heasarc, jpl, mast, satellites, simbad, wikipedia
from app.cosmos.cache import cached_fetch
from app.cosmos.http import envelope
from app.db import get_session
from app.models import HubbleMonitorState

CATEGORIES = (
    "planet", "moon", "asteroid", "comet", "star", "exoplanet",
    "nebula", "galaxy", "supernova", "black_hole",
)

# A human curator's list, not an API result — extend freely over time.
# `mastName` is the exact string form MAST's target_name field actually
# matches for that object (verified against the live API — MAST does an
# exact/substring match on whatever string the original observer entered,
# which is very often a catalog designation like "M-31" or "NGC224" rather
# than the common name); omitted where no working alias was found, in which
# case the target simply won't have a thumbnail rather than guessing one.
SEED_TARGETS = [
    {"targetId": "jupiter", "name": "Jupiter", "category": "planet", "mastName": "Jupiter"},
    {"targetId": "saturn", "name": "Saturn", "category": "planet", "mastName": "Saturn"},
    {"targetId": "uranus", "name": "Uranus", "category": "planet", "mastName": "Uranus"},
    {"targetId": "neptune", "name": "Neptune", "category": "planet", "mastName": "Neptune"},
    {"targetId": "mars", "name": "Mars", "category": "planet", "mastName": "Mars"},
    {"targetId": "venus", "name": "Venus", "category": "planet", "mastName": "Venus"},
    {"targetId": "pluto", "name": "Pluto", "category": "planet", "mastName": "Pluto"},
    {"targetId": "europa", "name": "Europa", "category": "moon", "mastName": "Europa"},
    {"targetId": "ganymede", "name": "Ganymede", "category": "moon", "mastName": "Ganymede"},
    {"targetId": "titan", "name": "Titan", "category": "moon", "mastName": "Titan"},
    {"targetId": "triton", "name": "Triton", "category": "moon", "mastName": "Triton"},
    {"targetId": "enceladus", "name": "Enceladus", "category": "moon", "mastName": "Enceladus"},
    {"targetId": "io", "name": "Io", "category": "moon", "mastName": "Io"},
    {"targetId": "callisto", "name": "Callisto", "category": "moon", "mastName": "Callisto"},
    {"targetId": "rhea", "name": "Rhea", "category": "moon", "mastName": "Rhea"},
    {"targetId": "dione", "name": "Dione", "category": "moon", "mastName": "Dione"},
    {"targetId": "tethys", "name": "Tethys", "category": "moon", "mastName": "Tethys"},
    {"targetId": "mimas", "name": "Mimas", "category": "moon", "mastName": "Mimas"},
    {"targetId": "miranda", "name": "Miranda", "category": "moon", "mastName": "Miranda"},
    {"targetId": "ariel", "name": "Ariel", "category": "moon", "mastName": "Ariel"},
    {"targetId": "oberon", "name": "Oberon", "category": "moon", "mastName": "Oberon"},
    {"targetId": "charon", "name": "Charon", "category": "moon", "mastName": "Charon"},
    {"targetId": "phobos", "name": "Phobos", "category": "moon", "mastName": "Phobos"},
    {"targetId": "ceres", "name": "Ceres", "category": "asteroid", "mastName": "Ceres"},
    {"targetId": "vesta", "name": "Vesta", "category": "asteroid", "mastName": "Vesta"},
    {"targetId": "pallas", "name": "Pallas", "category": "asteroid", "mastName": "Pallas"},
    {"targetId": "eros", "name": "Eros", "category": "asteroid"},
    {"targetId": "psyche", "name": "Psyche", "category": "asteroid", "mastName": "Psyche"},
    {"targetId": "bennu", "name": "Bennu", "category": "asteroid", "mastName": "Bennu"},
    {"targetId": "eugenia", "name": "Eugenia", "category": "asteroid", "mastName": "Eugenia"},
    {"targetId": "chiron", "name": "Chiron", "category": "asteroid", "mastName": "Chiron"},
    {"targetId": "halley", "name": "Halley", "category": "comet"},
    {"targetId": "hale-bopp", "name": "Hale-Bopp", "category": "comet", "mastName": "Hale-Bopp"},
    {"targetId": "shoemaker-levy-9", "name": "Shoemaker-Levy 9", "category": "comet"},
    {"targetId": "encke", "name": "Encke", "category": "comet", "mastName": "Encke"},
    {"targetId": "borrelly", "name": "Borrelly", "category": "comet", "mastName": "Borrelly"},
    {"targetId": "betelgeuse", "name": "Betelgeuse", "category": "star", "mastName": "Betelgeuse"},
    {"targetId": "sirius", "name": "Sirius", "category": "star", "mastName": "Sirius"},
    {"targetId": "proxima-centauri", "name": "Proxima Centauri", "category": "star", "mastName": "PROXIMA-CEN"},
    {"targetId": "vy-canis-majoris", "name": "VY Canis Majoris", "category": "star"},
    {"targetId": "eta-carinae", "name": "Eta Carinae", "category": "star"},
    {"targetId": "polaris", "name": "Polaris", "category": "star", "mastName": "POLARIS"},
    {"targetId": "vega", "name": "Vega", "category": "star", "mastName": "Vega"},
    {"targetId": "altair", "name": "Altair", "category": "star", "mastName": "Altair"},
    {"targetId": "procyon", "name": "Procyon", "category": "star", "mastName": "Procyon"},
    {"targetId": "capella", "name": "Capella", "category": "star", "mastName": "Capella"},
    {"targetId": "fomalhaut", "name": "Fomalhaut", "category": "star", "mastName": "Fomalhaut"},
    {"targetId": "trappist-1e", "name": "TRAPPIST-1 e", "category": "exoplanet", "mastName": "TRAPPIST-1"},
    {"targetId": "hd-209458-b", "name": "HD 209458 b", "category": "exoplanet", "mastName": "HD209458"},
    {"targetId": "kepler-186f", "name": "Kepler-186 f", "category": "exoplanet"},
    {"targetId": "wasp-121-b", "name": "WASP-121 b", "category": "exoplanet", "mastName": "WASP-121"},
    {"targetId": "hd-189733-b", "name": "HD 189733 b", "category": "exoplanet", "mastName": "HD189733"},
    {"targetId": "k2-18-b", "name": "K2-18 b", "category": "exoplanet", "mastName": "K2-18"},
    {"targetId": "lhs-1140-b", "name": "LHS 1140 b", "category": "exoplanet", "mastName": "LHS1140"},
    {"targetId": "crab-nebula", "name": "Crab Nebula", "category": "nebula", "mastName": "Crab"},
    {"targetId": "orion-nebula", "name": "Orion Nebula", "category": "nebula", "mastName": "M-42"},
    {"targetId": "eagle-nebula", "name": "Eagle Nebula", "category": "nebula"},
    {"targetId": "ring-nebula", "name": "Ring Nebula", "category": "nebula", "mastName": "M-57"},
    {"targetId": "helix-nebula", "name": "Helix Nebula", "category": "nebula", "mastName": "NGC7293"},
    {"targetId": "carina-nebula", "name": "Carina Nebula", "category": "nebula"},
    {"targetId": "bubble-nebula", "name": "Bubble Nebula", "category": "nebula", "mastName": "NGC7635"},
    {"targetId": "cats-eye-nebula", "name": "Cat's Eye Nebula", "category": "nebula", "mastName": "NGC6543"},
    {"targetId": "cone-nebula", "name": "Cone Nebula", "category": "nebula", "mastName": "NGC2264"},
    {"targetId": "butterfly-nebula", "name": "Butterfly Nebula", "category": "nebula", "mastName": "NGC6302"},
    {"targetId": "southern-ring-nebula", "name": "Southern Ring Nebula", "category": "nebula", "mastName": "NGC3132"},
    {"targetId": "andromeda-galaxy", "name": "Andromeda Galaxy", "category": "galaxy", "mastName": "NGC224"},
    {"targetId": "whirlpool-galaxy", "name": "Whirlpool Galaxy", "category": "galaxy", "mastName": "M-51"},
    {"targetId": "sombrero-galaxy", "name": "Sombrero Galaxy", "category": "galaxy", "mastName": "NGC4594"},
    {"targetId": "pinwheel-galaxy", "name": "Pinwheel Galaxy", "category": "galaxy", "mastName": "NGC5457"},
    {"targetId": "cartwheel-galaxy", "name": "Cartwheel Galaxy", "category": "galaxy"},
    {"targetId": "triangulum-galaxy", "name": "Triangulum Galaxy", "category": "galaxy", "mastName": "M-33"},
    {"targetId": "centaurus-a", "name": "Centaurus A", "category": "galaxy", "mastName": "NGC5128"},
    {"targetId": "bodes-galaxy", "name": "Bode's Galaxy", "category": "galaxy", "mastName": "M-81"},
    {"targetId": "black-eye-galaxy", "name": "Black Eye Galaxy", "category": "galaxy", "mastName": "NGC4826"},
    {"targetId": "sculptor-galaxy", "name": "Sculptor Galaxy", "category": "galaxy", "mastName": "NGC253"},
    {"targetId": "sunflower-galaxy", "name": "Sunflower Galaxy", "category": "galaxy", "mastName": "NGC5055"},
    {"targetId": "sn-1987a", "name": "SN 1987A", "category": "supernova", "mastName": "SN1987A"},
    {"targetId": "cassiopeia-a", "name": "Cassiopeia A", "category": "supernova"},
    {"targetId": "tycho-supernova-remnant", "name": "Tycho Supernova Remnant", "category": "supernova"},
    {"targetId": "cygnus-x-1", "name": "Cygnus X-1", "category": "black_hole"},
    {"targetId": "m87", "name": "M87", "category": "black_hole", "mastName": "M87"},
    {"targetId": "sagittarius-a-star", "name": "Sagittarius A*", "category": "black_hole", "mastName": "SGR-A"},
    {"targetId": "a0620-00", "name": "A0620-00", "category": "black_hole", "mastName": "A0620-00"},
]

_SEED_BY_ID = {t["targetId"]: t for t in SEED_TARGETS}

# SIMBAD's otype_txt is one of its compact object-type codes (e.g. "s*r" for
# a red supergiant, "SNR" for a supernova remnant, "HXB" for a high-mass
# X-ray binary), not a human-readable label — classification below matches
# on substrings/prefixes of the actual code set rather than an exact-string
# dict, since star/galaxy subtypes alone span dozens of distinct codes.
def _classify_simbad_otype(code: str | None) -> str:
    if not code:
        return "uncategorized"
    c = code.strip()
    cl = c.lower()
    if c == "Pl" or cl.startswith("pl"):
        return "exoplanet"
    if "snr" in cl or cl.startswith("sn"):
        return "supernova"
    if c in ("PN", "HII", "MoC", "DNe", "RNe", "Cl*", "SFR", "glb"):
        return "nebula"
    if c in ("HXB", "LXB", "X", "BH", "BH?"):
        return "black_hole"
    if c in ("G", "AGN", "SyG", "Sy1", "Sy2", "QSO", "BLL", "LIN", "H2G", "EmG", "rG", "IG"):
        return "galaxy"
    if "*" in c or c in ("Psr", "PM*", "WD*", "RG*", "cC*"):
        return "star"
    return "uncategorized"


def _thumbnail_for(name: str) -> tuple[str | None, int]:
    """Best-effort HST preview image + observation count for a target, via
    MAST's own (cached) observation search — a lightweight enrichment step,
    not a per-target detail fetch."""
    try:
        result = mast.search_observations(name, mission="HST", limit=5)
    except Exception:
        return None, 0
    rows = result.get("data", {}).get("results", [])
    count = result.get("data", {}).get("count", 0)
    for row in rows:
        if row.get("previewImageUrl"):
            return row["previewImageUrl"], count
    return None, count


def browse_targets(category: str | None, limit: int = 40, offset: int = 0):
    def fetch():
        targets = SEED_TARGETS
        if category:
            targets = [t for t in targets if t["category"] == category]
        page = targets[offset:offset + limit]
        results = []
        for t in page:
            thumbnail_url, obs_count = _thumbnail_for(t.get("mastName", t["name"]))
            results.append({
                "targetId": t["targetId"],
                "name": t["name"],
                "category": t["category"],
                "thumbnailUrl": thumbnail_url,
                "obsCount": obs_count,
                "hasImages": bool(thumbnail_url),
            })
        return {"count": len(targets), "results": results}

    data = cached_fetch(
        "hubble_catalog", {"category": category, "limit": limit, "offset": offset}, fetch, ttl_seconds=6 * 3600
    )
    return envelope("Astilo Hubble Catalog", "curated+MAST", None, data, None)


def search_targets(query: str, limit: int = 20):
    """Free-text lookup for targets outside the curated seed list — resolves
    and classifies via SIMBAD's own object-type field rather than guessing."""
    seed_matches = [
        t for t in SEED_TARGETS
        if query.lower() in t["name"].lower()
    ][:limit]
    if seed_matches:
        results = [{
            "targetId": t["targetId"], "name": t["name"], "category": t["category"],
            "thumbnailUrl": None, "obsCount": 0, "hasImages": False,
        } for t in seed_matches]
        return envelope("Astilo Hubble Catalog", "curated", None, {"count": len(results), "results": results}, None)

    try:
        simbad_result = simbad.lookup_object(query)
    except Exception:
        simbad_result = None

    if simbad_result is None:
        return envelope("Astilo Hubble Catalog", "curated+SIMBAD", None, {"count": 0, "results": []}, None)

    data = simbad_result["data"]
    category = _classify_simbad_otype(data.get("rawObjectType"))
    result = {
        # The original query text, not the resolved main_id — `target` is
        # re-looked-up by exactly this string in _resolve_target, and
        # SIMBAD designations (e.g. "* alf Sco") don't round-trip cleanly
        # through a slug the way the query the user already typed does.
        "targetId": query,
        "name": data.get("commonName") or data.get("name") or query,
        "category": category,
        "thumbnailUrl": None,
        "obsCount": 0,
        "hasImages": False,
    }
    return envelope("Astilo Hubble Catalog", "curated+SIMBAD", None, {"count": 1, "results": [result]}, None)


def _resolve_target(target_id: str) -> dict:
    """Seed entries are looked up by id; anything else is treated as a raw
    name (from a search-result click) and classified live via SIMBAD."""
    seeded = _SEED_BY_ID.get(target_id)
    if seeded:
        return seeded
    try:
        simbad_result = simbad.lookup_object(target_id)
    except Exception:
        simbad_result = None
    if simbad_result:
        data = simbad_result["data"]
        category = _classify_simbad_otype(data.get("rawObjectType"))
        name = data.get("commonName") or data.get("name") or target_id
        return {"targetId": target_id, "name": name, "category": category, "mastName": data.get("name") or name}
    return {"targetId": target_id, "name": target_id, "category": "uncategorized"}


def _distance_from_earth(category: str, simbad_data: dict | None, exoplanet_data: dict | None, gaia_data: dict | None) -> dict:
    """Normalizes whichever distance signal applies to this category into one
    consistent shape. Explicitly marks unavailable/uncertain values instead
    of fabricating a number."""
    if category == "exoplanet" and exoplanet_data and exoplanet_data.get("distanceParsecs"):
        pc = exoplanet_data["distanceParsecs"]
        return {"valuePc": pc, "valueLy": round(pc * 3.26156, 2), "method": "NASA Exoplanet Archive (sy_dist)", "confidence": "measured"}

    parallax_mas = None
    if gaia_data and gaia_data.get("parallaxMas"):
        parallax_mas = gaia_data["parallaxMas"]
        method = "Gaia DR3 parallax"
    elif simbad_data and simbad_data.get("parallaxMas"):
        parallax_mas = simbad_data["parallaxMas"]
        method = "SIMBAD parallax"

    if parallax_mas and parallax_mas > 0:
        pc = 1000.0 / parallax_mas
        return {"valuePc": round(pc, 2), "valueLy": round(pc * 3.26156, 2), "method": method, "confidence": "measured"}

    if simbad_data and simbad_data.get("redshift") and simbad_data["redshift"] > 0:
        # Rough Hubble-law estimate (v = cz, d = v/H0) — order-of-magnitude
        # only, explicitly labeled as an approximation, not a precise figure.
        # Only valid for a positive (receding) redshift; a blueshifted
        # object (e.g. Andromeda, which is falling toward us) isn't
        # dominated by cosmic expansion at all, so the formula doesn't
        # apply — falls through to "unavailable" rather than a nonsensical
        # negative distance.
        z = simbad_data["redshift"]
        c_km_s = 299792.458
        h0 = 70.0  # km/s/Mpc, a standard round-number assumption
        d_mpc = (z * c_km_s) / h0
        return {
            "valuePc": round(d_mpc * 1_000_000, 0), "valueLy": round(d_mpc * 3.26156e6, 0),
            "method": "Redshift-based estimate (Hubble's law, H0=70)", "confidence": "approximate",
        }

    return {"valuePc": None, "valueLy": None, "method": None, "confidence": "unavailable"}


def get_target_detail(target_id: str):
    def fetch():
        target = _resolve_target(target_id)
        name, category = target["name"], target["category"]
        mast_name = target.get("mastName", name)
        source_envelopes: dict = {}

        observations = []
        try:
            obs_result = mast.search_observations(mast_name, mission="HST", limit=12)
            source_envelopes["observations"] = obs_result
            observations = obs_result.get("data", {}).get("results", [])
        except Exception:
            pass

        simbad_data = None
        try:
            simbad_result = simbad.lookup_object(name)
            if simbad_result:
                source_envelopes["classification"] = simbad_result
                simbad_data = simbad_result["data"]
        except Exception:
            pass

        exoplanet_data = None
        if category == "exoplanet":
            try:
                exoplanet_data = exoplanets.get_planet(name)
                if exoplanet_data:
                    source_envelopes["exoplanet"] = envelope(
                        "NASA Exoplanet Archive", "pscomppars", name, exoplanet_data, None
                    )
            except Exception:
                pass

        gaia_data = None
        if category == "star":
            try:
                gaia_result = gaia.search_star(name)
                if gaia_result:
                    source_envelopes["star"] = gaia_result
                    gaia_data = gaia_result["data"]
            except Exception:
                pass

        sbdb_data = None
        if category in ("asteroid", "comet"):
            try:
                sbdb_result = jpl.sbdb_lookup(name)
                if sbdb_result:
                    source_envelopes["orbitalData"] = sbdb_result
                    sbdb_data = sbdb_result["data"]
            except Exception:
                pass

        high_energy_data = None
        if category == "black_hole":
            try:
                he_result = heasarc.search_observations(name, "numaster", 0.2, 5)
                if he_result:
                    source_envelopes["highEnergy"] = he_result
                    high_energy_data = he_result.get("data")
            except Exception:
                pass

        composition = {"extract": None, "detailedExtract": None, "articleImages": [], "pageUrl": None}
        try:
            wiki_result = wikipedia.research_summary(name)
            source_envelopes["composition"] = wiki_result
            wiki_data = wiki_result.get("data", {})
            composition = {
                "extract": wiki_data.get("extract"),
                "detailedExtract": wiki_data.get("detailedExtract"),
                "articleImages": wiki_data.get("articleImages") or [],
                "pageUrl": wiki_data.get("pageUrl"),
            }
        except Exception:
            pass

        distance = _distance_from_earth(category, simbad_data, exoplanet_data, gaia_data)

        classification = {
            "objectType": (simbad_data or {}).get("objectType"),
            "spectralType": (simbad_data or {}).get("spectralType") or (exoplanet_data or {}).get("hostStarSpectralType"),
            "morphologicalType": (simbad_data or {}).get("morphologicalType"),
            "orbitClass": (sbdb_data or {}).get("orbitClass"),
        }

        return {
            "target": {"targetId": target_id, "name": name, "category": category},
            "classification": classification,
            "distance": distance,
            "composition": composition,
            "physicalProperties": {
                "exoplanet": exoplanet_data,
                "star": gaia_data,
                "smallBody": sbdb_data,
                "highEnergy": high_energy_data,
            },
            "images": observations,
            "sourceEnvelopes": source_envelopes,
        }

    data = cached_fetch("hubble_target_detail", {"targetId": target_id}, fetch, ttl_seconds=12 * 3600)
    return envelope("Astilo Hubble Research", "aggregate", target_id, data, None)


def check_for_new_observations(limit_targets: int = 12):
    """Checks a rotating slice of the seed catalog against MAST's current
    observation counts and reports which targets have grown since their
    last check — a real diff against MAST's own archive, not a simulated
    feed. Picks the least-recently-checked targets each call (new/never
    -checked ones first) so repeated polling sweeps the whole catalog over
    several calls instead of hammering all ~80 targets every time.

    `mast.search_observations` itself carries a 6h cache, so within that
    window repeated polls of the same target legitimately see no change —
    that's the real update cadence of an observation archive, not a bug.
    """
    with get_session() as session:
        states = {s.target_id: s for s in session.query(HubbleMonitorState).all()}

        def last_checked(t: dict) -> datetime.datetime:
            state = states.get(t["targetId"])
            return state.last_checked_at if state and state.last_checked_at else datetime.datetime.min

        targets_to_check = sorted(SEED_TARGETS, key=last_checked)[:limit_targets]

        findings = []
        checked_ids = []
        for t in targets_to_check:
            mast_name = t.get("mastName", t["name"])
            try:
                result = mast.search_observations(mast_name, mission="HST", limit=5)
                current_count = result["data"]["count"]
            except Exception:
                continue

            checked_ids.append(t["targetId"])
            state = states.get(t["targetId"])
            previous_count = state.last_obs_count if state else 0
            # A brand-new (never-checked) target isn't a "finding" — there's
            # nothing to have changed relative to, it's just the first look.
            if state is not None and current_count > previous_count:
                findings.append({
                    "targetId": t["targetId"],
                    "name": t["name"],
                    "category": t["category"],
                    "previousCount": previous_count,
                    "currentCount": current_count,
                    "newObservations": current_count - previous_count,
                })

            if state is None:
                state = HubbleMonitorState(target_id=t["targetId"], last_obs_count=current_count)
                session.add(state)
            else:
                state.last_obs_count = current_count
            state.last_checked_at = datetime.datetime.utcnow()

        session.flush()
        catalog_progress = session.query(HubbleMonitorState).count()

    return envelope("Astilo Hubble Monitor", "mast-diff", None, {
        "checkedTargetIds": checked_ids,
        "findings": findings,
        "targetsEverChecked": catalog_progress,
        "totalTargetsInCatalog": len(SEED_TARGETS),
        "checkedAt": datetime.datetime.utcnow().isoformat() + "Z",
    }, None)


def get_position():
    """Hubble's real current position in low Earth orbit — resolved as the
    NORAD-tracked satellite "HST" and propagated live via SGP4, the exact
    same mechanism CosmosSatelliteTracker already uses for the ISS. Not
    cached: a satellite moving at ~7.6 km/s is stale within seconds, so
    every call recomputes from the current TLE (itself refreshed by
    CelesTrak roughly daily and cached accordingly in satellites.py)."""
    result = satellites.satellite_position("HST", "science")
    if result is None:
        return envelope("CelesTrak", "gp", "HST", None, None)
    return result
