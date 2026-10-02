"""Builds the real-source context Nereus grounds its answers in, instead of
letting the model answer from memory (blueprint rule #8: "Nereus must prefer
retrieved scientific sources over LLM memory"). Every source here traces
back to a real Abyss data call — WoRMS taxonomy, OBIS occurrence counts, or
Abyss's own curated depth-zone/chemistry reference — never invented. If a
lookup fails (unknown species, upstream API down), it's simply omitted
rather than guessed at."""

from app.abyss import depth_zones, knowledge_base, ocean_chemistry, ocean_coverage, species as species_module


def build_context(payload: dict, question: str | None = None) -> list[dict]:
    sources: list[dict] = []

    depth = payload.get("depth")
    aphia_id = payload.get("selectedSpeciesAphiaId")
    scientific_name = payload.get("selectedSpecies")

    if depth is not None:
        try:
            depth_m = float(depth)
            zone = depth_zones.zone_for_depth(depth_m)
            pressure = depth_zones.pressure_atm(depth_m)
            chem_env = ocean_chemistry.list_chemistry()
            chem_zone = next((z for z in chem_env["data"]["zones"] if z["zoneId"] == zone["id"]), None)
            text = (
                f"At {depth_m:.0f}m depth you are in the {zone['label']} "
                f"({zone['minMeters']}-{zone['maxMeters']}m). Light: {zone['lightPercent']}%. "
                f"Representative temperature: {zone['tempRangeC']}. Hydrostatic pressure: "
                f"~{pressure:.1f} atm. {zone['description']}"
            )
            if chem_zone:
                text += (
                    f" Typical chemistry at this depth — salinity {chem_zone['salinityPsu']} PSU, "
                    f"pH {chem_zone['phApprox']}, dissolved oxygen {chem_zone['dissolvedOxygenMgL']} mg/L."
                )
            sources.append({"label": f"Depth zone: {zone['label']}", "text": text})
        except (TypeError, ValueError):
            pass

    if aphia_id:
        try:
            profile = species_module.species_profile(int(aphia_id))
            if profile:
                _append_species_sources(sources, profile)
        except (TypeError, ValueError, KeyError):
            pass
    elif scientific_name:
        try:
            result = species_module.search_species(scientific_name, limit=1)
            match = result["data"]["results"][0] if result["data"]["results"] else None
            if match:
                sources.append({
                    "label": f"WoRMS taxonomy: {match['scientificName']}",
                    "text": (
                        f"{match['scientificName']} ({match.get('authority') or 'unknown authority'}) — "
                        f"Kingdom {match.get('kingdom')}, Phylum {match.get('phylum')}, "
                        f"Class {match.get('className')}, Family {match.get('family')}. "
                        f"Status: {match.get('status')}."
                    ),
                })
        except (KeyError, IndexError):
            pass

    if question:
        try:
            for hit in knowledge_base.retrieve(question, k=3):
                sources.append({
                    "label": f"Wikipedia (local RAG): {hit['title']}",
                    "text": hit["text"],
                    "url": hit["url"],
                })
        except Exception:
            pass

        _append_region_coverage(sources, question)

    return sources


def _append_region_coverage(sources: list[dict], question: str) -> None:
    """If the question names one of Abyss's predefined ocean regions (e.g.
    "the Indian Ocean"), attach its real OBIS sampling-coverage stats —
    ties Nereus to the same real data the Observation Gap Finder uses,
    rather than leaving broad geographic questions unanswerable."""
    lowered = question.lower()
    for region in ocean_coverage.REGIONS:
        # "indian-ocean" -> "indian ocean"
        if region["label"].lower() in lowered or region["id"].replace("-", " ") in lowered:
            try:
                stats = ocean_coverage.regional_coverage()
                match = next((r for r in stats["data"]["regions"] if r["id"] == region["id"]), None)
                if match and match["records"]:
                    sources.append({
                        "label": f"OBIS regional coverage: {match['label']}",
                        "text": (
                            f"OBIS has {match['records']:,} real occurrence records, {match['species']:,} species "
                            f"and {match['datasets']} datasets for the {match['label']} region, spanning "
                            f"{match['yearRange'][0]}-{match['yearRange'][1]}."
                        ),
                    })
            except Exception:
                pass
            break


def _append_species_sources(sources: list[dict], profile: dict) -> None:
    tax = profile["taxonomy"]["data"]
    sources.append({
        "label": f"WoRMS taxonomy: {tax['scientificName']}",
        "text": (
            f"{tax['scientificName']} ({tax.get('authority') or 'unknown authority'}) — "
            f"Kingdom {tax.get('kingdom')}, Phylum {tax.get('phylum')}, Class {tax.get('className')}, "
            f"Family {tax.get('family')}. Status: {tax.get('status')}."
        ),
    })
    occ = profile["occurrences"]["data"]
    sources.append({
        "label": "OBIS occurrence records",
        "text": f"{occ['total']} real occurrence records exist in OBIS for {tax['scientificName']}.",
    })
