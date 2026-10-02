"""Astilo's Reef Digital Twin — an illustrative model of coral reef health
under user-chosen stressors, not a forecast of any real reef (blueprint rule
#10/#15). The stress thresholds used (bleaching risk rising sharply above
~1°C of warming, acidification reducing calcification as pH drops) reflect
well-established reef science, but the specific numbers this model outputs
are illustrative teaching output, never a site-specific prediction."""

from app.abyss.http import envelope

BASELINE = {"temperatureC": 27.0, "ph": 8.1, "coralCoverPercent": 76.0, "fishBiomassPercent": 83.0}


def simulate(temp_delta: float, ph_delta: float, pollution_percent: float, fishing_percent: float, years: int):
    temp_delta = max(min(temp_delta, 5.0), -5.0)
    ph_delta = max(min(ph_delta, 1.0), -1.0)
    pollution_percent = max(min(pollution_percent, 100.0), 0.0)
    fishing_percent = max(min(fishing_percent, 100.0), 0.0)
    years = max(min(years, 50), 1)

    # Bleaching stress ramps sharply above +1C (real degree-heating-week
    # dynamics), a simplified version of that curve.
    bleaching_stress = max(0.0, temp_delta - 1.0) * 18 + max(0.0, temp_delta) * 4
    acidification_stress = max(0.0, -ph_delta) * 40
    pollution_stress = pollution_percent * 0.35
    fishing_stress = fishing_percent * 0.25

    annual_decline = (bleaching_stress + acidification_stress + pollution_stress) / 100
    coral_cover = BASELINE["coralCoverPercent"]
    fish_biomass = BASELINE["fishBiomassPercent"]
    timeline = []
    for year in range(1, years + 1):
        coral_cover *= max(0.0, 1 - annual_decline * 0.12)
        fish_biomass *= max(0.0, 1 - (annual_decline * 0.08 + fishing_stress / 100 * 0.1))
        timeline.append({"year": year, "coralCoverPercent": round(coral_cover, 1), "fishBiomassPercent": round(fish_biomass, 1)})

    data = {
        "baseline": BASELINE,
        "inputs": {
            "temperatureDeltaC": temp_delta,
            "phDelta": ph_delta,
            "pollutionPercent": pollution_percent,
            "fishingPercent": fishing_percent,
            "years": years,
        },
        "timeline": timeline,
    }
    return envelope("Astilo", "reef_digital_twin_simulation", None, data, confidence="SIMULATED")
