# Conservative States webhooks

## Delivery

Each event is an HTTPS `POST` to your endpoint:

```http
POST /hooks/conservative-states HTTP/1.1
Content-Type: application/json
User-Agent: ConservativeStates-Webhooks/1
X-CS-Event: supporter.action.completed
X-CS-Event-Id: 6f0d…            ← dedupe on this (same as body.id)
X-CS-Delivery-Id: 98211          ← changes per delivery, not per event
X-CS-Timestamp: 1787000000
X-CS-Signature: t=1787000000,v1=9a3f…

{ "id": "6f0d…", "type": "supporter.action.completed", "api_version": "v1",
  "created_at": "…", "organization": { "id": 12, "slug": "your-org" },
  "data": { "supporter": { … }, "action": { … } } }
```

- `data.supporter` is on every event (a tombstone `{ id, deleted_at }` on `supporter.deleted`); `data.action` is added on action events; `data.message` on `ping`.
- Bodies are built from the data as it is now, not as it was when the event occurred.
- **Ordering is not guaranteed.** `action.updated` can arrive before `supporter.action.completed`. Upsert by id and never let an older record overwrite a newer one (compare `updated_at`).
- **Duplicates happen.** Dedupe on `X-CS-Event-Id` / `body.id` with a unique index; the same id is used by `GET /events`.
- Acknowledge with any 2xx within 10 seconds, then process asynchronously (queue the body). Slow handlers cause timeouts, which cause retries.

## Retries and disabling

- Anything other than a 2xx (or a timeout) is retried: 31 attempts over about 24 hours (30 seconds after the first failure, doubling each time, at most an hour apart). Each attempt is re-signed with a fresh timestamp.
- Responding **410 Gone permanently disables the endpoint.** Do not use 410 for "unknown supporter" or similar — return 200 and ignore.
- 20 consecutive failed deliveries (each after its whole retry window) disable the endpoint until an owner re-enables it in Settings.
- Missed events after an outage: `GET /events?since=<last seen created_at minus a few minutes>` replays the journal in the same envelope.

## Events

| Event | When | Replay needs |
| --- | --- | --- |
| `supporter.created` | A person became a supporter of your organization — through an action page, a signup, or a subscriber entering your org’s public flow. | `supporters:read` |
| `supporter.updated` | A supporter’s record changed: staff edits, or the person’s own name, email, address or districts. | `supporters:read` |
| `supporter.deleted` | The person deleted their account. | `supporters:read` |
| `supporter.action.completed` | A supporter completed a submission. | `supporters:read` and `actions:read` |
| `supporter.unsubscribed` | A supporter opted out — via the unsubscribe link, a spam complaint, or staff marking them unsubscribed. | `supporters:read` |
| `action.updated` | A submission changed after it was reported: a recipient’s letter was delivered or failed (`recipients[].delivery`). | `supporters:read` and `actions:read` |
| `ping` | The test delivery the Send Test button produces. | not replayed |

## Signature verification

`X-CS-Signature` is `t=<unix seconds>,v1=<hex>`, where `v1 = hex(HMAC-SHA256(secret, "<t>.<raw body>"))` and `secret` is the endpoint's signing secret (`cswhsec_…`, shown once at creation or rotation).

Rules every implementation must follow:

1. Use the **raw request body bytes**, exactly as received. Parsing and re-serializing JSON changes whitespace and key order and the signature will not match. Read the raw body *before* any JSON middleware.
2. Parse the header by splitting on `,` and then on the **first** `=`. Accept any `v1` entry if several are present.
3. Compare in **constant time**, and check lengths first where the comparison function requires equal lengths (Node's `timingSafeEqual` throws otherwise).
4. Reject if `|now − t| > 300` seconds (replay protection).
5. Only then parse the JSON and trust its contents.

An owner rotates the secret in Settings. The new secret signs every delivery attempt from that moment — retries of earlier events included — and the old one is never used again (there is no overlap period). To rotate without losing events, let the receiver accept a list of secrets: rotate, add the new secret to the list, then remove the old one. Deliveries that fail verification in between are simply retried on the schedule above. An integration that registered its own endpoint and lost the secret deletes the endpoint, registers again (a new secret, returned once) and replays the gap from `GET /events`.

### Node.js / TypeScript

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

const TOLERANCE_SECONDS = 300;

export function verifyConservativeStatesSignature(
  rawBody: string | Buffer,
  header: string | null | undefined,
  secrets: string[],                       // current secret first; old one during rotation
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!header) return false;
  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (key === 't') timestamp = value;
    else if (key === 'v1') signatures.push(value);
  }
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > TOLERANCE_SECONDS) return false;

  const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
  for (const secret of secrets) {
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.`)
      .update(body)
      .digest();                                   // 32 bytes
    for (const sig of signatures) {
      if (!/^[0-9a-f]{64}$/i.test(sig)) continue;  // length check before timingSafeEqual
      if (timingSafeEqual(Buffer.from(sig, 'hex'), expected)) return true;
    }
  }
  return false;
}
```

Getting the raw body:

```ts
// Express — mount BEFORE express.json() for this route
app.post('/hooks/cs', express.raw({ type: 'application/json' }), (req, res) => {
  if (!verifyConservativeStatesSignature(req.body, req.get('X-CS-Signature'), [process.env.CS_WEBHOOK_SECRET!])) {
    return res.status(401).end();
  }
  res.status(200).end();                 // ack first
  queue.add(JSON.parse(req.body.toString('utf8')));
});

// Next.js App Router (app/api/hooks/cs/route.ts)
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyConservativeStatesSignature(raw, req.headers.get('x-cs-signature'), [process.env.CS_WEBHOOK_SECRET!])) {
    return new Response(null, { status: 401 });
  }
  await enqueue(JSON.parse(raw));
  return new Response(null, { status: 200 });
}
```

### Python

```python
import hashlib
import hmac
import re
import time

TOLERANCE_SECONDS = 300
_HEX64 = re.compile(r"^[0-9a-fA-F]{64}$")

def verify_conservative_states_signature(raw_body: bytes, header: str | None,
                                          secrets: list[str], now: float | None = None) -> bool:
    if not header:
        return False
    timestamp, signatures = None, []
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
    if abs((now or time.time()) - int(timestamp)) > TOLERANCE_SECONDS:
        return False
    for secret in secrets:
        expected = hmac.new(secret.encode(), timestamp.encode() + b"." + raw_body,
                            hashlib.sha256).hexdigest()
        for sig in signatures:
            if _HEX64.match(sig) and hmac.compare_digest(sig.lower(), expected):
                return True
    return False
```

Raw body: Flask `request.get_data()`; FastAPI / Starlette `await request.body()`; Django `request.body`.

### Go

```go
package cswebhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"strings"
	"time"
)

const tolerance = 300 * time.Second

// Verify checks X-CS-Signature against the raw body. secrets: current first.
func Verify(rawBody []byte, header string, secrets []string, now time.Time) bool {
	var ts string
	var sigs [][]byte
	for _, part := range strings.Split(header, ",") {
		key, value, ok := strings.Cut(strings.TrimSpace(part), "=")
		if !ok {
			continue
		}
		switch key {
		case "t":
			ts = value
		case "v1":
			if b, err := hex.DecodeString(value); err == nil && len(b) == sha256.Size {
				sigs = append(sigs, b)
			}
		}
	}
	sec, err := strconv.ParseInt(ts, 10, 64)
	if err != nil || len(sigs) == 0 {
		return false
	}
	if d := now.Sub(time.Unix(sec, 0)); d > tolerance || d < -tolerance {
		return false
	}
	for _, secret := range secrets {
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write([]byte(ts + "."))
		mac.Write(rawBody)
		expected := mac.Sum(nil)
		for _, sig := range sigs {
			if hmac.Equal(sig, expected) { // constant time
				return true
			}
		}
	}
	return false
}
```

Raw body: `body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))`.

### Ruby

```ruby
require "openssl"

module ConservativeStatesWebhook
  TOLERANCE = 300

  def self.verify(raw_body, header, secrets, now: Time.now.to_i)
    return false if header.nil? || header.empty?
    timestamp = nil
    signatures = []
    header.split(",").each do |part|
      key, value = part.strip.split("=", 2)
      next if value.nil?
      timestamp = value if key == "t"
      signatures << value if key == "v1"
    end
    return false unless timestamp&.match?(/\A\d+\z/) && signatures.any?
    return false if (now - timestamp.to_i).abs > TOLERANCE

    secrets.any? do |secret|
      expected = OpenSSL::HMAC.hexdigest("SHA256", secret, "#{timestamp}.#{raw_body}")
      signatures.any? do |sig|
        sig.bytesize == expected.bytesize &&                       # fixed_length_secure_compare raises otherwise
          OpenSSL.fixed_length_secure_compare(sig.downcase, expected)
      end
    end
  end
end
```

Raw body: Rails `request.raw_post`; Sinatra / Rack `request.body.read` (then `rewind`).

## Testing a receiver

- Settings → Partner API & webhooks → **Send test** delivers a signed `ping`; `POST /webhook-endpoints` sends one automatically at registration.
- Unit-test the verifier with a body you sign yourself: `t=<now>`, `v1=hex(hmac_sha256(secret, "<t>.<body>"))`. Assert that a changed byte, a stale timestamp, a wrong-length signature and a missing header all fail.
- Deliveries and manual redelivery are visible in the same Settings section.
