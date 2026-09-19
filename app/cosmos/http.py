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


def cosmos_get(url: str, params: dict | None = None, timeout: int = 15):
    return _session.get(url, params=params or {}, timeout=timeout)


def envelope(source: str, source_dataset: str, external_id: str, data: dict, raw: dict | None = None):
    """Wraps normalized data with its provenance, per Astilo's source-
    attribution rule for Cosmos: never present external data without saying
    where it came from and when it was fetched."""
    return {
        "source": source,
        "sourceDataset": source_dataset,
        "externalId": external_id,
        "retrievedAt": datetime.datetime.utcnow().isoformat() + "Z",
        "data": data,
        "raw": raw,
    }
