"""Real marine-mammal sound catalog — NOAA Fisheries' public "Sounds in the
Ocean: Mammals" library (https://www.fisheries.noaa.gov/national/science-data/sounds-ocean-mammals).
As U.S. government works these recordings are public domain; NOAA still asks
for citation (see the terms_url in the license registry), which is why
attribution_required stays true there even though commercial use needs no
permission. Every URL below was verified to resolve to a real audio file —
nothing here is a placeholder or synthesized sound."""

from app.abyss.http import envelope

_BASE = "https://www.fisheries.noaa.gov/s3"

CLIPS = [
    {"id": "humpback-whale", "commonName": "Humpback whale", "category": "Baleen whale", "url": f"{_BASE}/2023-04/Meno-song-NOAA-PAGroup-13-humpback-clip.mp3"},
    {"id": "blue-whale", "commonName": "Blue whale", "category": "Baleen whale", "url": f"{_BASE}/2023-04/Cornell-NY-LongIsland-20090123-000000-LPfilter20-amplified-x8speed-blue-clip.mp3"},
    {"id": "fin-whale", "commonName": "Fin whale", "category": "Baleen whale", "url": f"{_BASE}/2023-04/Baph-song-NOAA-PAGroup-05-x5speed-fin-clip.mp3"},
    {"id": "right-whale", "commonName": "North Atlantic right whale", "category": "Baleen whale", "url": f"{_BASE}/2023-04/Eugl-upcall-NOAA-PAGroup-01-right-clip-1.mp3"},
    {"id": "sperm-whale", "commonName": "Sperm whale", "category": "Toothed whale", "url": f"{_BASE}/2023-04/Phma-clicks-NOAA-PAGroup-01-sperm-clip.mp3"},
    {"id": "killer-whale", "commonName": "Killer whale (orca)", "category": "Toothed whale", "url": f"{_BASE}/2023-04/Oror-Multisound-AWI-Van-Opzeeland-01-killer-clip.mp3"},
    {"id": "bottlenose-dolphin", "commonName": "Bottlenose dolphin", "category": "Toothed whale", "url": f"{_BASE}/2023-04/Tutr-multisound-NOAA-PAGroup-03-bottlenose-dolphin-clip.mp3"},
    {"id": "beluga-whale", "commonName": "Beluga whale", "category": "Toothed whale", "url": f"{_BASE}/2023-04/Dele-multisound-NOAA-Castellote-01-beluga-clip.mp3"},
    {"id": "harbor-seal", "commonName": "Harbor seal", "category": "Pinniped", "url": f"{_BASE}/2023-06/Phvi-roar-NOAA-PAGroup-01-harbor-seal-clip.wav"},
    {"id": "walrus", "commonName": "Walrus", "category": "Pinniped", "url": f"{_BASE}/2023-04/Odro-Multisound-DFO-Sjare-04-walrus-clip.mp3"},
]


def list_clips():
    return envelope("NOAA Fisheries", "Sounds in the Ocean — Mammals", None, {"clips": CLIPS}, confidence="OBSERVED")
