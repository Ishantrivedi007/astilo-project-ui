"""Astilo's Build-a-Creature — a rule-based ecological-fit heuristic for a
user-designed organism under chosen environmental constraints. A simplified
teaching tool, not a biological prediction (blueprint rule #10/#30); every
rule below is grounded in a real, well-known deep-sea adaptation, but
combining them into one "fit score" is Astilo's own simplification."""

from app.abyss.http import envelope


def evaluate(environment: dict, traits: dict):
    depth = float(environment.get("depthMeters", 0))
    light = float(environment.get("lightPercent", 100))
    food = environment.get("foodAvailability", "moderate")  # scarce | moderate | abundant
    pressure_atm = 1 + depth / 10

    score = 50.0
    notes: list[str] = []

    bioluminescence = bool(traits.get("bioluminescence", False))
    if light < 10 and bioluminescence:
        score += 15
        notes.append("Bioluminescence is a strong adaptation for near-total darkness.")
    elif light >= 50 and bioluminescence:
        score -= 10
        notes.append("Bioluminescence offers little benefit in well-lit water and may attract predators.")

    eyes = traits.get("eyeSize", "medium")  # none | small | medium | large
    if light < 10 and eyes == "large":
        score += 10
        notes.append("Large eyes help gather what little light (or bioluminescent flashes) exists at depth.")
    if light < 1 and eyes == "none":
        score += 8
        notes.append("In total darkness, some real deep-sea species reduce or lose eyes entirely, relying on other senses.")

    skeleton = traits.get("skeleton", "rigid")  # rigid | reduced | none
    if pressure_atm > 200 and skeleton == "rigid":
        score -= 15
        notes.append("Rigid skeletons are structurally disadvantaged under extreme hadal pressure.")
    if pressure_atm > 200 and skeleton in ("reduced", "none"):
        score += 12
        notes.append("Reduced or absent rigid skeletal structure matches real hadal-zone adaptations.")

    metabolism = traits.get("metabolism", "normal")  # slow | normal | fast
    if food == "scarce" and metabolism == "slow":
        score += 12
        notes.append("A slow metabolism suits a food-scarce environment, as seen in many real deep-sea organisms.")
    if food == "scarce" and metabolism == "fast":
        score -= 15
        notes.append("A fast metabolism is a poor fit where food is scarce.")

    feeding = traits.get("feedingStrategy", "active-hunter")  # active-hunter | ambush | filter-feeder | scavenger
    if food == "scarce" and feeding == "ambush":
        score += 8
        notes.append("Ambush predation conserves energy — a good fit for low-food environments.")

    score = max(0.0, min(100.0, score))
    verdict = "Well-adapted" if score >= 70 else "Plausible, with tradeoffs" if score >= 45 else "Poorly adapted"

    data = {
        "ecologicalFitScore": round(score, 1),
        "verdict": verdict,
        "notes": notes,
        "pressureAtm": round(pressure_atm, 1),
    }
    return envelope("Astilo", "build_a_creature_evaluation", None, data, confidence="SIMULATED")
