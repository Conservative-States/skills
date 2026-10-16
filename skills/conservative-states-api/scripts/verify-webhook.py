"""Reference verifier for Conservative States webhooks (X-CS-Signature).

    X-CS-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>

Pass the RAW request body bytes exactly as received, never re-serialized JSON.
`secrets` holds the current signing secret first and, during a rotation, the
previous one.
"""
from __future__ import annotations

import hashlib
import hmac
import re
import time
from typing import Iterable, Optional

SIGNATURE_TOLERANCE_SECONDS = 300
_HEX64 = re.compile(r"^[0-9a-fA-F]{64}$")


def verify_conservative_states_signature(
    raw_body: bytes,
    header: Optional[str],
    secrets: Iterable[str],
    now: Optional[float] = None,
) -> bool:
    if not header:
        return False
    timestamp: Optional[str] = None
    signatures: list[str] = []
    for part in header.split(","):
        key, sep, value = part.partition("=")
        if not sep:
            continue
        key, value = key.strip(), value.strip()
        if key == "t":
            timestamp = value
        elif key == "v1":
            signatures.append(value)
    if not timestamp or not timestamp.isdigit() or not signatures:
        return False
    current = time.time() if now is None else now
    if abs(current - int(timestamp)) > SIGNATURE_TOLERANCE_SECONDS:
        return False
    for secret in secrets:
        expected = hmac.new(
            secret.encode("utf-8"), timestamp.encode("ascii") + b"." + raw_body, hashlib.sha256
        ).hexdigest()
        for signature in signatures:
            if _HEX64.match(signature) and hmac.compare_digest(signature.lower(), expected):
                return True
    return False


def sign_for_test(secret: str, raw_body: bytes, timestamp: int) -> str:
    """Sign a body the way Conservative States does, for your own tests."""
    v1 = hmac.new(secret.encode("utf-8"), str(timestamp).encode("ascii") + b"." + raw_body,
                  hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={v1}"
