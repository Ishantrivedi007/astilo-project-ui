"""Astilo Bot — a real, functional (not simulated-AI) chat bot: it responds
to explicit slash-commands using genuine free/keyless data sources already
in this codebase (Wikipedia, JokeAPI) rather than generating fabricated
conversational replies. Returns None when it has nothing to say, so it
doesn't spam every message in the channel.
"""

import datetime

from app import jokes
from app.cosmos import wikipedia

HELP_TEXT = (
    "Commands: `/wiki <topic>` — a real Wikipedia summary · `/joke` — a "
    "random joke · `/time` — the current server time · `/help` — this list."
)


def handle_message(body: str) -> str | None:
    text = body.strip()
    if not text.startswith("/"):
        if "@bot" in text.lower() or "@astilo" in text.lower():
            return HELP_TEXT
        return None

    parts = text[1:].split(maxsplit=1)
    command = parts[0].lower() if parts else ""
    arg = parts[1].strip() if len(parts) > 1 else ""

    if command == "help":
        return HELP_TEXT

    if command == "joke":
        try:
            return jokes.random_joke()
        except Exception:
            return "Couldn't reach the joke API just now — try again in a bit."

    if command == "time":
        return f"Server time: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"

    if command == "wiki":
        if not arg:
            return "Usage: `/wiki <topic>` — e.g. `/wiki Saturn`"
        try:
            result = wikipedia.research_summary(arg)
            data = result.get("data") or {}
            extract = data.get("extract")
            if not extract:
                return f"Couldn't find a Wikipedia article for \"{arg}\"."
            url = data.get("pageUrl")
            return f"{extract}" + (f"\n\n{url}" if url else "")
        except Exception:
            return "Couldn't reach Wikipedia just now — try again in a bit."

    return f"Unknown command `/{command}`. " + HELP_TEXT
