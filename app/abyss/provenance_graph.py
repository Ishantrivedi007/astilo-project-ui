"""Scientific Provenance Graph — answers Abyss's "where did this information
come from?" question (blueprint section 42) by composing the species
profile's existing provenance envelopes into an explicit node/edge graph,
each dataset node joined against the License Registry for its real
license/citation, rather than just listing sources as flat text (as the
Species Profile's Sources tab already does)."""

from app.abyss import gbif, species as species_module
from app.abyss.http import envelope
from app.db import get_session
from app.models import DataSource


def _registry_entry(provider_hint: str) -> dict | None:
    with get_session() as session:
        row = session.query(DataSource).filter(DataSource.provider.ilike(f"%{provider_hint}%")).first()
        return row.to_dict() if row else None


def build_graph(aphia_id: int):
    profile = species_module.species_profile(aphia_id)
    if profile is None:
        return None

    taxonomy = profile["taxonomy"]
    occurrences = profile["occurrences"]
    gbif_env = None
    try:
        gbif_env = gbif.search_occurrences(taxonomy["data"]["scientificName"], limit=1)
    except Exception:
        gbif_env = None

    nodes = [{"id": "species", "label": taxonomy["data"]["scientificName"], "kind": "species"}]
    edges = []

    def add_branch(node_id: str, label: str, env: dict, registry_hint: str):
        registry = _registry_entry(registry_hint)
        nodes.append({
            "id": node_id,
            "label": label,
            "kind": "dataset",
            "source": env["source"],
            "sourceDataset": env["sourceDataset"],
            "confidence": env["confidence"],
            "retrievedAt": env["retrievedAt"],
            "license": registry["license"] if registry else None,
            "citationUrl": registry["sourceUrl"] if registry else None,
            "termsUrl": registry["termsUrl"] if registry else None,
        })
        edges.append({"from": "species", "to": node_id})

    add_branch("taxonomy", "Taxonomy", taxonomy, "WoRMS")
    add_branch("occurrences-obis", "Occurrences (OBIS)", occurrences, "OBIS")
    if gbif_env:
        add_branch("occurrences-gbif", "Occurrences (GBIF)", gbif_env, "GBIF")

    data = {"nodes": nodes, "edges": edges}
    return envelope("Astilo", "provenance_graph", str(aphia_id), data, confidence="CURATED")
