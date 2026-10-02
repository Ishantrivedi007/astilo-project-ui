"""Nereus — Astilo Abyss's contextual AI assistant, running entirely through
a local Ollama instance (no paid LLM API, per Abyss build rule #1). It is
always given real retrieved context (see nereus_context.py) and instructed
to answer only from that context, rather than its own training memory (rule
#8); the retrieved sources are returned alongside the answer so the UI can
show them (rule #9). When Ollama isn't reachable, Nereus degrades to a clear
"offline" response instead of fabricating an answer (rule #14) — this is the
expected state on any machine without Ollama installed and running."""

import requests

from app.config import config
from app.abyss.http import envelope

MODES = ["ask", "learn", "scientist", "guide", "quiz", "explain", "compare"]

_SYSTEM_PROMPTS = {
    "ask": "You are Nereus, Astilo Abyss's ocean-science assistant. Answer concisely and only from the provided context. If the context doesn't cover the question, say so plainly instead of guessing.",
    "learn": "You are Nereus in Learn mode: explain the topic simply and educationally, as if teaching a curious student, using only the provided context.",
    "scientist": "You are Nereus in Scientist mode: give a precise, technical answer using correct scientific terminology, grounded only in the provided context.",
    "guide": "You are Nereus in Guide mode: narrate what the user is currently seeing in an immersive second-person voice (e.g. \"You've crossed 1,000 metres...\"), grounded only in the provided context.",
    "quiz": "You are Nereus in Quiz mode: turn the provided context into one short multiple-choice question with four options, clearly marking the correct one at the end.",
    "explain": "You are Nereus in Explain mode: explain the requested topic as if the user is 10 years old, using only the provided context.",
    "compare": "You are Nereus in Compare mode: compare the things the user names, point by point, using only the provided context.",
}


def status():
    online = _ollama_reachable()
    data = {"online": online, "model": config.NEREUS_MODEL, "baseUrl": config.NEREUS_OLLAMA_BASE_URL, "modes": MODES}
    return envelope("Astilo Nereus", "status", None, data, confidence="CURATED")


def _ollama_reachable() -> bool:
    try:
        resp = requests.get(f"{config.NEREUS_OLLAMA_BASE_URL}/api/tags", timeout=2)
        return resp.status_code == 200
    except requests.exceptions.RequestException:
        return False


def ask(question: str, mode: str, context_sources: list[dict]):
    mode = mode if mode in MODES else "ask"

    if not _ollama_reachable():
        data = {
            "answer": (
                "Nereus is offline — no local Ollama instance is reachable at "
                f"{config.NEREUS_OLLAMA_BASE_URL}. Install Ollama (ollama.com) and run "
                f"`ollama pull {config.NEREUS_MODEL}` (or set NEREUS_MODEL to a model you've "
                "already pulled) to enable Nereus."
            ),
            "mode": mode,
            "sources": context_sources,
            "offline": True,
        }
        return envelope("Astilo Nereus", "offline", None, data, confidence="UNKNOWN")

    context_text = "\n\n".join(f"[{s['label']}]\n{s['text']}" for s in context_sources) or "No specific context was retrieved for this question."
    prompt = f"{_SYSTEM_PROMPTS[mode]}\n\nCONTEXT:\n{context_text}\n\nQUESTION: {question}\n\nAnswer using only the context above."

    try:
        resp = requests.post(
            f"{config.NEREUS_OLLAMA_BASE_URL}/api/generate",
            json={"model": config.NEREUS_MODEL, "prompt": prompt, "stream": False},
            timeout=120,
        )
        resp.raise_for_status()
        answer = resp.json().get("response", "").strip()
    except requests.exceptions.RequestException as exc:
        data = {"answer": f"Nereus failed to respond: {exc}", "mode": mode, "sources": context_sources, "offline": True}
        return envelope("Astilo Nereus", "error", None, data, confidence="UNKNOWN")

    data = {"answer": answer, "mode": mode, "sources": context_sources, "offline": False}
    return envelope("Astilo Nereus", config.NEREUS_MODEL, None, data, confidence="AI_INFERRED")
