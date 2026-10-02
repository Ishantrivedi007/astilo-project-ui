import datetime

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

_session = requests.Session()
_retry = Retry(
    total=3,
    connect=3,
    read=3,
    backoff_factor=0.5,
    status_forcelist=(429, 500, 502, 503, 504),
    allowed_methods=("GET",),
)
_adapter = HTTPAdapter(max_retries=_retry)
_session.mount("https://", _adapter)
_session.mount("http://", _adapter)

# Abyss rule #6 — every value shown to a user must be visibly tagged as one
# of these, so observed fact, model output and simulation never blur
# together. Shared between backend envelopes and the frontend confidence
# badge (see astilo-project-ui/src/lib/abyssApi.ts).
OBSERVED = "OBSERVED"
MODELLED = "MODELLED"
CURATED = "CURATED"
SIMULATED = "SIMULATED"
AI_INFERRED = "AI_INFERRED"
UNKNOWN = "UNKNOWN"
CONFIDENCE_LEVELS = (OBSERVED, MODELLED, CURATED, SIMULATED, AI_INFERRED, UNKNOWN)


def abyss_get(url: str, params: dict | None = None, timeout: int = 15, headers: dict | None = None):
    return _session.get(url, params=params or {}, timeout=timeout, headers=headers)


def envelope(
    source: str,
    source_dataset: str,
    external_id: str | None,
    data: dict,
    raw: dict | None = None,
    confidence: str = OBSERVED,
):
    """Wraps normalized data with its provenance and confidence level, per
    Astilo Abyss's non-negotiable rule: never present external, modelled or
    simulated data without saying where it came from, when it was fetched,
    and how reliable it is."""
    if confidence not in CONFIDENCE_LEVELS:
        raise ValueError(f"Unknown confidence level: {confidence!r}")
    return {
        "source": source,
        "sourceDataset": source_dataset,
        "externalId": external_id,
        "retrievedAt": datetime.datetime.utcnow().isoformat() + "Z",
        "confidence": confidence,
        "data": data,
        "raw": raw,
    }
