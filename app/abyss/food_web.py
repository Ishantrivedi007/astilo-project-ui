"""Astilo's Interactive Food Web + Ecosystem Disruption Simulator — a
teaching model of trophic relationships, not a forecast of any real
ecosystem (blueprint rule #10/#14). Node names are real trophic groups; the
cascade math below is a simplified, illustrative propagation model, not a
calibrated ecological prediction."""

from app.abyss.http import envelope

NODES = [
    {"id": "sun", "label": "Sun", "level": 0},
    {"id": "phytoplankton", "label": "Phytoplankton", "level": 1},
    {"id": "zooplankton", "label": "Zooplankton", "level": 2},
    {"id": "small-fish", "label": "Small fish", "level": 3},
    {"id": "tuna", "label": "Tuna", "level": 4},
    {"id": "shark", "label": "Shark", "level": 5},
]
EDGES = [
    ("sun", "phytoplankton"),
    ("phytoplankton", "zooplankton"),
    ("zooplankton", "small-fish"),
    ("small-fish", "tuna"),
    ("tuna", "shark"),
]


def graph():
    data = {"nodes": NODES, "edges": [{"from": a, "to": b} for a, b in EDGES]}
    return envelope("Astilo", "food_web_reference", None, data, confidence="CURATED")


def simulate(changes: dict[str, float]):
    """changes: {nodeId: populationPercentChange}, e.g. {"shark": -60} for
    "remove sharks" or {"phytoplankton": -60} per the blueprint's example.

    A decline in prey cascades forward as a damped decline in its predators
    (0.5x per trophic level, each level further up); a decline in a predator
    cascades backward as a damped *release* (increase) in its prey (0.3x per
    level, weaker than direct predation pressure — a simplification, not a
    calibrated rate)."""
    levels = {n["id"]: n["level"] for n in NODES}
    result = {}
    for nid, lvl in levels.items():
        total = 0.0
        for src, v in changes.items():
            src_lvl = levels.get(src)
            if src_lvl is None:
                continue
            if nid == src:
                total += v
            elif lvl > src_lvl:
                total += v * (0.5 ** (lvl - src_lvl))
            else:
                total += -v * (0.3 ** (src_lvl - lvl))
        result[nid] = round(max(min(total, 100.0), -100.0), 1)

    data = {"inputs": changes, "populationChangePercent": result}
    return envelope("Astilo", "ecosystem_disruption_simulation", None, data, confidence="SIMULATED")
