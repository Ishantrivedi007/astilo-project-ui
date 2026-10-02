"""Astilo's Mystery Species Laboratory — a simulated reasoning puzzle, not a
real identification tool. The candidate pool is Abyss's curated depth-zone
species list (the same real, WoRMS-resolvable names used by Depth Descent),
but which evidence is "available" each round and which species is correct
are randomly chosen — hence confidence=SIMULATED for the puzzle itself.
Resolving the revealed answer to its real taxonomy is a separate, OBSERVED
call through the existing /api/abyss/species endpoints.

Puzzle answers are kept server-side (in-memory, per-process) so a client
can't just read the answer out of the GET response — the frontend player
only learns it by submitting a guess."""

import random

from app.abyss.depth_zones import ZONES
from app.abyss.http import envelope

EVIDENCE_TYPES = ["Image", "DNA", "Sonar", "Sound", "Depth", "Temperature", "Physical sample"]

_PUZZLES: dict[str, str] = {}  # puzzleId -> answer scientificName


def _all_species():
    pool = []
    for zone in ZONES:
        for sp in zone["species"]:
            pool.append({**sp, "zoneId": zone["id"], "zoneLabel": zone["label"]})
    return pool


def new_puzzle():
    pool = _all_species()
    answer = random.choice(pool)
    distractors = random.sample([s for s in pool if s["scientificName"] != answer["scientificName"]], k=3)
    options = distractors + [answer]
    random.shuffle(options)

    puzzle_id = str(random.randint(100000, 999999))
    _PUZZLES[puzzle_id] = answer["scientificName"]

    # The blueprint's own example always withholds a photo and a physical
    # sample — the rest are randomly available each round.
    available = {"Image": False, "Physical sample": False}
    for key in ["DNA", "Sonar", "Sound", "Depth", "Temperature"]:
        available[key] = random.random() > 0.3

    data = {
        "puzzleId": puzzle_id,
        "zoneLabel": answer["zoneLabel"],
        "evidence": [{"type": t, "available": available[t]} for t in EVIDENCE_TYPES],
        "options": [{"scientificName": o["scientificName"], "commonName": o["commonName"]} for o in options],
    }
    return envelope("Astilo", "mystery_species_puzzle", puzzle_id, data, confidence="SIMULATED")


def guess(puzzle_id: str, scientific_name: str):
    answer = _PUZZLES.get(puzzle_id)
    if answer is None:
        return None
    correct = answer == scientific_name
    data = {"puzzleId": puzzle_id, "correct": correct, "answerScientificName": answer}
    return envelope("Astilo", "mystery_species_guess", puzzle_id, data, confidence="SIMULATED")
