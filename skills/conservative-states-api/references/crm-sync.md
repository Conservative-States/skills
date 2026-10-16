# CRM sync with the Conservative States Partner API

A correct sync has five layers. Each one covers a failure the previous one cannot.

| Layer | Endpoint | Covers |
| --- | --- | --- |
| 1. Backfill | `GET /supporters`, `GET /actions` (no watermark) | Everything that exists today |
| 2. Incremental pulls | `GET /supporters?updated_since=`, `GET /actions?updated_since=` | Every change since the last run |
| 3. Webhooks | your HTTPS receiver | Latency: react within seconds |
| 4. Event replay | `GET /events?since=` | Webhook downtime, lost deliveries, pull-only deletions |
| 5. Periodic re-page | full `GET /supporters` and every org-data list, weekly | Anything the other layers missed; removals from lists that have no tombstones |

Base URL `https://my.conservativestates.app/api/partner/v1`. Always fetch the live spec first: `curl -s https://my.conservativestates.app/api/partner/v1/openapi.json`.

## Keys and storage

- One `cs_org_` key per integration, created by an organization owner (Settings → Partner API & webhooks). Scopes needed: `supporters:read`, `actions:read`; `org_data:read` for tracked bills, portfolios, campaigns and action pages; add `webhooks:manage` only if the integration registers its own endpoint. Scopes are fixed when a key is created — a key made before `org_data:read` existed does not have it, and the only fix is a new key.
- Keep the key in a server-side secret store. Start every deployment with `GET /whoami` and refuse to run if `is_test` does not match the environment you expect (production CRM ↔ `false`).
- Your tables need: `cs_supporter_id` (unique), `cs_action_id` (unique), a sync-state row holding `supporters_watermark`, `actions_watermark`, `events_watermark`, and a processed-event-id set (or a unique index on event id) for dedupe.

## 1. Backfill

```text
cursor = null
loop:
  page = GET /supporters?limit=500&cursor=<cursor>
  upsert each page.data[i] by id
  remember max(updated_at) seen
  if page.meta.next_cursor is null: break
  cursor = page.meta.next_cursor
supporters_watermark = max(updated_at) seen

same for GET /actions?updated_since=1970-01-01T00:00:00Z  (the change feed, ordered by updated_at)
actions_watermark = max(updated_at) seen
events_watermark  = time the backfill STARTED
```

`/supporters` orders by `updated_at` ascending, so a row edited during a long backfill moves to the tail and is seen again rather than skipped. Pace with `X-RateLimit-Remaining`; a 50k-supporter backfill at 500 per page is 100 requests.

**Linking an existing donor file**: call `POST /supporters/match` with up to 200 emails per request (`Idempotency-Key` header), store the returned supporter `id` on each matched record, and key on `id` from then on. `matched` entries carry an array — one address can match more than one supporter (case variants).

## 2. Incremental pulls (every 5–15 minutes)

```text
OVERLAP = 5 minutes
since = supporters_watermark - OVERLAP
for each page of GET /supporters?updated_since=<since>&limit=500:
  upsert by id                      # idempotent: re-seeing a row is harmless
  newest = max(newest, row.updated_at)
commit writes, THEN supporters_watermark = newest

since = actions_watermark - OVERLAP
for each page of GET /actions?updated_since=<since>&limit=500:
  upsert action by id (replace recipients wholesale)
  newest = max(newest, action.updated_at)
commit, THEN actions_watermark = newest
```

- `updated_since` is **inclusive** (`>=`) and rows can commit slightly out of order, hence the overlap and the upsert.
- Cursors never expire, but a cursor is only valid with the same filters as the request that produced it; keep `since` / `updated_since` / `status` / `supporter_id` fixed while paging.
- Use `/actions?updated_since=` (the change feed), not only `?since=`: a submission reappears whenever a recipient's `delivery.status` settles from `queued` to `delivered` / `failed`. `since` and `updated_since` cannot be combined.
- A submission younger than about a minute is held back until complete — that is expected, not lag.
- The supporter watermark moves on advocacy activity, staff edits and the person's own name, email, address or district changes.

## 3. Webhooks

Subscribe to every event type. On each delivery: verify the signature over the raw body (see `webhooks.md`), insert the event id into the processed set (skip if present), respond 2xx immediately, then process on a queue:

| Event | Do |
| --- | --- |
| `supporter.created` / `supporter.updated` | upsert `data.supporter` by id |
| `supporter.unsubscribed` | upsert; stop mailing them in your system |
| `supporter.deleted` | delete or anonymize by `data.supporter.id` |
| `supporter.action.completed` / `action.updated` | upsert `data.action` by `data.action.id` (and `data.supporter`) |
| `ping` | nothing — it is the verification / test delivery |

Event bodies are built from current data. Ordering is not guaranteed: never let an older event overwrite newer state — compare `updated_at` before writing, or simply re-fetch the record.

## 4. Event replay (hourly, and after any outage)

```text
since = events_watermark - OVERLAP
for each page of GET /events?since=<since>&limit=100:
  for each event: if event.id not in processed set → handle exactly as a webhook
  newest = max(newest, event.created_at)
events_watermark = newest
```

The replay uses the same envelope and the same `id` as the webhook POST, so one dedupe set covers both. A key sees supporter events with `supporters:read` and action events with `supporters:read` + `actions:read`. A pull-only integration (no webhooks) learns of deletions only here.

## 5. Weekly re-page

Walk `GET /supporters` with no watermark and upsert everything. Any `cs_supporter_id` you hold that was not returned and for which `GET /supporters/{id}` answers 410 is a deletion you missed; 404 means it was never this organization's.

Do the same for `/tracked-bills`, `/portfolios`, `/campaigns` and `/action-pages`: they have **no tombstones** — an untracked bill, a portfolio made private or deleted, or a deleted draft page simply stops being listed — so anything you hold that a full listing no longer returns is gone. Their `updated_since` watermark only covers changes to records that still exist (including portfolio membership: a bill added to or removed from a shared portfolio moves both the portfolio and the tracked bill).

## Error handling

| Status / code | Action |
| --- | --- |
| 401 `unauthorized` / `key_expired` / `key_revoked` | Stop the sync and alert a human; the key needs replacing |
| 403 `forbidden_scope` | Key lacks a scope; alert a human |
| 403 `partner_api_disabled` | The owner switched the API off or the org is not active; pause and retry hourly |
| 400 on a cursor | Restart that listing from the watermark |
| 410 `supporter_deleted` | Delete or anonymize locally |
| 429 | Sleep `Retry-After`, continue |
| 503 / 500 | Back off and retry; quote `request_id` if it persists |

## Mapping suggestions

These are starting points — adapt to the organization's CRM conventions.

**Salesforce**

| Conservative States | Salesforce |
| --- | --- |
| Supporter | Contact (match on email once, then External ID field `CS_Supporter_Id__c`, unique) |
| `districts.*`, `engagement.score/tier`, `status`, `consents.*` | Custom Contact fields |
| Action (submission) | Custom object `Advocacy_Action__c` (External ID `CS_Action_Id__c`), lookup to Contact |
| `recipients[]` | Child object `Advocacy_Action_Recipient__c` (or a long-text summary if volume matters) |
| `bill.bill_number` + `bill.short_summary` | Fields on the action; optionally a `Bill__c` object keyed by `ls_bill_id` |
| `campaign` | Campaign (keyed by campaign id), action as CampaignMember-like association |
| `imputed_position` | Fields `Campaign_Ask__c` + `Ask_Basis__c` + `Ask_Confidence__c` — label it as the ask |

Use the `upsert` API on the External ID fields so retries are idempotent.

**HubSpot**

| Conservative States | HubSpot |
| --- | --- |
| Supporter | Contact; custom unique property `cs_supporter_id` |
| Districts, engagement, status, consents | Contact properties (prefix `cs_`) |
| Action | Custom object "Advocacy action" with unique `cs_action_id`, associated to the Contact — or a timeline event if custom objects are not available |
| `supporter.unsubscribed` | Update a `cs_status` property; do not change HubSpot's own subscription status without the org deciding to |
| `supporter.deleted` | GDPR-delete or anonymize the contact, per the org's policy |

## Things that go wrong

- Treating `/actions?since=` as the only feed — delivery outcomes never arrive.
- Saving the watermark before the writes commit — a crash skips rows forever.
- Keying on email — an address change creates a duplicate person.
- Showing `imputed_position` as the supporter's opinion — it is the organization's ask.
- Treating a `null` consent as "no" — it means the supporter was never asked.
- Expecting message bodies — the API never exposes letter text; `subject` is the only content.
