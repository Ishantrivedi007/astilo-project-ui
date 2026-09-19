"""JokeAPI — free, keyless. Used by the chat bot's /joke command."""

from app.cosmos.http import cosmos_get

JOKE_URL = "https://v2.jokeapi.dev/joke/Any"


def random_joke() -> str:
    resp = cosmos_get(JOKE_URL, params={"type": "single", "safe-mode": ""}, timeout=8)
    resp.raise_for_status()
    data = resp.json()
    if data.get("error"):
        return "Couldn't think of one right now — try again?"
    return data.get("joke") or "Couldn't think of one right now — try again?"
