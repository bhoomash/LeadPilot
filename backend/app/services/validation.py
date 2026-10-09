"""Email and URL validation / normalization using only the standard library."""

import re
from urllib.parse import urlparse

# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------

# Intentionally simple regex — catches the vast majority of valid addresses
# without requiring a third-party library.
_EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$"
)


def is_valid_email(email: str | None) -> bool:
    """Return True when *email* looks like a syntactically valid address."""
    if not email or not isinstance(email, str):
        return False
    email = email.strip()
    if len(email) > 254:
        return False
    return bool(_EMAIL_RE.match(email))


def normalize_email(email: str | None) -> str | None:
    """Lower-case and strip whitespace.  Returns None for empty values."""
    if not email or not isinstance(email, str):
        return None
    email = email.strip().lower()
    return email if email else None


# ---------------------------------------------------------------------------
# URL / Domain
# ---------------------------------------------------------------------------

def normalize_url(url: str | None) -> str | None:
    """Best-effort URL cleanup.  Adds scheme when missing."""
    if not url or not isinstance(url, str):
        return None
    url = url.strip()
    if not url:
        return None
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


def extract_domain(url: str | None) -> str | None:
    """Extract a normalised bare domain from a URL string.

    - Strips protocol, www prefix, trailing slashes, and port numbers.
    - Returns None when no useful domain can be extracted.
    """
    if not url or not isinstance(url, str):
        return None
    url = url.strip()
    if not url:
        return None
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        parsed = urlparse(url)
        domain = parsed.hostname
        if not domain:
            return None
        domain = domain.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        return domain if domain else None
    except Exception:
        return None


def is_valid_url(url: str | None) -> bool:
    """Very lightweight URL validity check."""
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    if not url:
        return False
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        result = urlparse(url)
        return bool(result.hostname) and "." in result.hostname
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Company name
# ---------------------------------------------------------------------------

_COMPANY_SUFFIXES = re.compile(
    r"\b(inc\.?|incorporated|llc|ltd\.?|limited|corp\.?|corporation|co\.?|company|plc|gmbh|ag|sa)\b",
    re.IGNORECASE,
)
_EXTRA_SPACES = re.compile(r"\s+")


def normalize_company_name(name: str | None) -> str | None:
    """Produce a canonical company name for duplicate detection.

    - Lower-case
    - Strip common legal suffixes (Inc, LLC, Ltd, …)
    - Collapse whitespace
    """
    if not name or not isinstance(name, str):
        return None
    name = name.strip().lower()
    name = _COMPANY_SUFFIXES.sub("", name)
    name = re.sub(r"[^\w\s]", "", name)  # remove punctuation
    name = _EXTRA_SPACES.sub(" ", name).strip()
    return name if name else None
