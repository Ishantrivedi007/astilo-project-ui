"""Evolution Explorer — real sibling/relative relationships from WoRMS
taxonomy (shared parent = same clade), distinct from the Evolution
Simulator's trait-drift teaching model. Approximate divergence times are
shown only for a small curated set of well-documented clades (published
molecular-clock/fossil-calibration estimates) — per blueprint rule "don't
have AI invent divergence dates", every other pair correctly reports
UNKNOWN rather than a guess."""

from app.abyss import taxonomy_tree
from app.abyss.http import envelope

DIVERGENCE_ESTIMATES = {
    ("Octopoda", "Decapodiformes"): {
        "myaRange": "~270 Mya",
        "note": "Approximate divergence of octopuses from the squid/cuttlefish lineage, per molecular phylogenetic studies of Coleoidea.",
    },
    ("Mysticeti", "Odontoceti"): {
        "myaRange": "~34 Mya",
        "note": "Baleen whales and toothed whales diverged in the Oligocene, per cetacean molecular phylogenies.",
    },
    ("Elasmobranchii", "Holocephali"): {
        "myaRange": "~400 Mya",
        "note": "Sharks/rays and chimaeras diverged in the Devonian, based on fossil and molecular evidence.",
    },
}


def relatives(parent_aphia_id: int):
    """The real sibling taxa sharing a parent — this clade's evolutionary
    relatives, per WoRMS."""
    siblings_env = taxonomy_tree.children(parent_aphia_id)
    return envelope("WoRMS", "AphiaChildrenByAphiaID (siblings)", str(parent_aphia_id), siblings_env["data"], confidence="OBSERVED")


def divergence(taxon_a: str, taxon_b: str):
    estimate = DIVERGENCE_ESTIMATES.get((taxon_a, taxon_b)) or DIVERGENCE_ESTIMATES.get((taxon_b, taxon_a))
    if estimate is None:
        data = {"taxonA": taxon_a, "taxonB": taxon_b, "myaRange": None, "note": "No curated divergence estimate is available for this pair — Astilo does not estimate dates itself."}
        return envelope("Astilo", "divergence_estimate", None, data, confidence="UNKNOWN")
    data = {"taxonA": taxon_a, "taxonB": taxon_b, **estimate}
    return envelope("Astilo curated reference (published phylogenetic studies)", "divergence_estimate", None, data, confidence="CURATED")
