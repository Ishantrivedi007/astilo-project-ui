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

# Yahoo's chart/search endpoints (no API key) reject requests without a
# browser-like User-Agent.
_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; AstiloMarkets/1.0)"}


def markets_get(url: str, params: dict | None = None, timeout: int = 15):
    return _session.get(url, params=params or {}, timeout=timeout, headers=_HEADERS)


def envelope(source: str, source_dataset: str, symbol: str | None, data: dict):
    return {
        "source": source,
        "sourceDataset": source_dataset,
        "symbol": symbol,
        "retrievedAt": datetime.datetime.utcnow().isoformat() + "Z",
        "data": data,
    }
