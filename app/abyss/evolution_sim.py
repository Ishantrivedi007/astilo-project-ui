"""Astilo's Evolution Simulator — a simplified teaching model of selection
pressure and trait drift across generations, explicitly not a reconstruction
of any real species' evolutionary history (blueprint rule #31). Two toy
traits (mean size, mean speed) drift under user-chosen pressures plus random
mutation each generation; nothing here is calibrated to real genetics."""

import random

from app.abyss.http import envelope


def run(generations: int, pressures: dict):
    generations = max(1, min(generations, 100000))
    temp_pressure = max(-1.0, min(1.0, float(pressures.get("temperature", 0.0))))
    oxygen_pressure = max(-1.0, min(1.0, float(pressures.get("oxygen", 0.0))))
    food_pressure = max(-1.0, min(1.0, float(pressures.get("food", 0.0))))
    predator_pressure = max(-1.0, min(1.0, float(pressures.get("predators", 0.0))))

    mean_size = 50.0
    mean_speed = 50.0
    population = 1000
    sample_every = max(1, generations // 20)
    history = []

    for gen in range(1, generations + 1):
        size_drift = -temp_pressure * 1.2 - food_pressure * 0.8 + random.uniform(-1, 1)
        speed_drift = predator_pressure * 1.5 - oxygen_pressure * 0.6 + random.uniform(-1, 1)
        mean_size = max(0.0, min(100.0, mean_size + size_drift))
        mean_speed = max(0.0, min(100.0, mean_speed + speed_drift))

        pressure_load = abs(temp_pressure) + abs(oxygen_pressure) + abs(food_pressure) + abs(predator_pressure)
        survival_rate = max(0.85, 1.0 - 0.02 * pressure_load)
        population = max(10, int(population * survival_rate * random.uniform(0.98, 1.05)))

        if gen % sample_every == 0 or gen == generations:
            history.append({"generation": gen, "meanSize": round(mean_size, 1), "meanSpeed": round(mean_speed, 1), "population": population})

    data = {"generations": generations, "pressures": pressures, "history": history}
    return envelope("Astilo", "evolution_simulation", None, data, confidence="SIMULATED")
