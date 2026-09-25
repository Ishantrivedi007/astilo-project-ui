"""Parses a pasted git host URL into {provider, linkType, label} for
display — no API calls, no auth, just pattern matching on well-known
GitHub/GitLab/Bitbucket URL shapes. Anything else falls back to a generic
"other" link labeled by hostname."""

import re
from urllib.parse import urlparse

_PATTERNS = [
    ("github", r"^github\.com$", "pull_request", r"^/([^/]+)/([^/]+)/pull/(\d+)"),
    ("github", r"^github\.com$", "issue", r"^/([^/]+)/([^/]+)/issues/(\d+)"),
    ("github", r"^github\.com$", "commit", r"^/([^/]+)/([^/]+)/commit/([0-9a-f]{7,40})"),
    ("github", r"^github\.com$", "branch", r"^/([^/]+)/([^/]+)/tree/([^/]+)"),
    ("gitlab", r"^gitlab\.com$", "pull_request", r"^/([^/]+)/([^/]+)/-/merge_requests/(\d+)"),
    ("gitlab", r"^gitlab\.com$", "issue", r"^/([^/]+)/([^/]+)/-/issues/(\d+)"),
    ("gitlab", r"^gitlab\.com$", "commit", r"^/([^/]+)/([^/]+)/-/commit/([0-9a-f]{7,40})"),
    ("gitlab", r"^gitlab\.com$", "branch", r"^/([^/]+)/([^/]+)/-/tree/([^/]+)"),
    ("bitbucket", r"^bitbucket\.org$", "pull_request", r"^/([^/]+)/([^/]+)/pull-requests/(\d+)"),
    ("bitbucket", r"^bitbucket\.org$", "commit", r"^/([^/]+)/([^/]+)/commits/([0-9a-f]{7,40})"),
    ("bitbucket", r"^bitbucket\.org$", "branch", r"^/([^/]+)/([^/]+)/branch/([^/]+)"),
]

_LABEL_FORMAT = {
    "pull_request": lambda owner, repo, ref: f"{owner}/{repo}#{ref}",
    "issue": lambda owner, repo, ref: f"{owner}/{repo}#{ref}",
    "commit": lambda owner, repo, ref: f"{repo}@{ref[:7]}",
    "branch": lambda owner, repo, ref: f"{repo}:{ref}",
}


def parse_git_url(url: str) -> dict:
    url = (url or "").strip()
    try:
        parsed = urlparse(url)
    except ValueError:
        parsed = None

    if not parsed or not parsed.scheme or not parsed.netloc:
        return {"provider": "other", "linkType": "other", "label": url[:80] or "Link"}

    host = parsed.netloc.lower()
    for provider, host_pattern, link_type, path_pattern in _PATTERNS:
        if not re.match(host_pattern, host):
            continue
        match = re.match(path_pattern, parsed.path)
        if match:
            owner, repo, ref = match.groups()
            label = _LABEL_FORMAT[link_type](owner, repo, ref)
            return {"provider": provider, "linkType": link_type, "label": label}

    for provider, host_pattern in (("github", r"^github\.com$"), ("gitlab", r"^gitlab\.com$"), ("bitbucket", r"^bitbucket\.org$")):
        if re.match(host_pattern, host):
            return {"provider": provider, "linkType": "other", "label": (parsed.path.strip("/") or host)[:80]}

    return {"provider": "other", "linkType": "other", "label": (host + parsed.path)[:80]}
