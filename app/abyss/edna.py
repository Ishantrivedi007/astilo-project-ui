"""Astilo's eDNA Detective — a simulated educational workflow, not a real
sequencing pipeline (Astilo has no wet-lab or sequencer integration). Every
candidate species name is real and independently resolvable via WoRMS, but
the match percentages and which candidates appear in a given "sample" are
randomly generated. Per blueprint rule #25, this must never be presented as
an observed scientific fact — hence confidence=SIMULATED throughout."""

import random

from app.abyss.http import envelope

_CANDIDATE_POOL = [
    "Vampyroteuthis infernalis",
    "Myctophum punctatum",
    "Architeuthis dux",
    "Calanus finmarchicus",
    "Thunnus albacares",
    "Octopus vulgaris",
    "Chelonia mydas",
    "Carcharodon carcharias",
    "Balaenoptera musculus",
    "Gonatus fabricii",
    "Euphausia superba",
    "Clio pyramidata",
]


def generate_sample():
    sample_id = str(random.randint(1000, 9999))
    picks = random.sample(_CANDIDATE_POOL, k=4)
    remaining = 100
    matches = []
    for i, name in enumerate(picks):
        if i == len(picks) - 1:
            pct = max(min(remaining - 5, random.randint(10, 30)), 5)
        else:
            pct = random.randint(15, max(16, min(45, remaining - 10)))
        remaining -= pct
        matches.append({"scientificName": name, "matchPercent": pct})
    matches.append({"scientificName": None, "matchPercent": max(remaining, 0)})
    matches.sort(key=lambda m: m["matchPercent"], reverse=True)
    data = {"sampleId": sample_id, "matches": matches}
    return envelope("Astilo", "edna_simulation", sample_id, data, confidence="SIMULATED")
