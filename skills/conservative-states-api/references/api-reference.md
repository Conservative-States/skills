<!-- Generated from the Conservative States source (lib/partner/openapi, lib/mcp/catalog). Do not edit by hand. -->

# Partner API reference

Base URL `https://my.conservativestates.app/api/partner/v1`. Auth: `Authorization: Bearer cs_org_…`. The live OpenAPI document at https://my.conservativestates.app/api/partner/v1/openapi.json is the contract — fetch it before generating a client.

## Endpoints

| Method | Path | operationId | Scope | Summary |
| --- | --- | --- | --- | --- |
| GET | `/whoami` | `whoami` | any key | Get key metadata |
| GET | `/supporters` | `listSupporters` | `supporters:read` | List supporters |
| GET | `/supporters/lookup` | `lookupSupporter` | `supporters:read` | Look up a supporter by email |
| POST | `/supporters/match` | `matchSupporters` | `supporters:read` | Match supporters by email in batch |
| GET | `/supporters/{supporterId}` | `getSupporter` | `supporters:read` | Get a supporter’s advocacy profile |
| GET | `/actions` | `listActions` | `actions:read` | List actions |
| GET | `/events` | `listEvents` | per event type | Replay webhook events |
| GET | `/webhook-endpoints` | `listWebhookEndpoints` | `webhooks:manage` | List webhook endpoints |
| POST | `/webhook-endpoints` | `createWebhookEndpoint` | `webhooks:manage` | Register a webhook endpoint |
| DELETE | `/webhook-endpoints/{endpointId}` | `deleteWebhookEndpoint` | `webhooks:manage` | Delete a webhook endpoint you registered |
| GET | `/tracked-bills` | `listTrackedBills` | `org_data:read` | List tracked bills |
| GET | `/portfolios` | `listPortfolios` | `org_data:read` | List shared portfolios |
| GET | `/portfolios/{portfolioId}` | `getPortfolio` | `org_data:read` | Get a shared portfolio |
| GET | `/campaigns` | `listCampaigns` | `org_data:read` | List campaigns |
| GET | `/campaigns/{campaignId}` | `getCampaign` | `org_data:read` | Get a campaign |
| GET | `/action-pages` | `listActionPages` | `org_data:read` | List action pages |
| GET | `/action-pages/{actionPageId}` | `getActionPage` | `org_data:read` | Get an action page |
| GET | `/bills/{billId}` | `getBill` | any key | Get a bill |
| GET | `/legislators/{legislatorId}` | `getLegislator` | any key | Get a legislator |
| GET | `/issues` | `listIssues` | any key | Get the issue taxonomies |

### GET /whoami

Get key metadata. `operationId: whoami` · scope: any key · rate bucket: read

The first call to make after pasting a key in: proves auth end to end and answers "who am I, what may I read, and how fast" in one call.

Response `data`: Whoami.

Other statuses: 400, 401, 403, 429, 500, 503.

### GET /supporters

List supporters. `operationId: listSupporters` · scope: supporters:read · rate bucket: read

The full supporter list — the sync and backfill primitive. Ordered by `updated_at` ascending so a long backfill converges: rows touched mid-sync move to the tail and are seen again, never skipped.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `cursor` | query | no | string | Opaque position from the previous page’s `meta.next_cursor`. Cursors do not expire, but one is only meaningful with the same filters (`since`, `updated_since`, `status`, `supporter_id`…) as the request that produced it. A malformed cursor is a 400 — restart the listing, never retry the cursor. |
| `limit` | query | no | integer | Page size, 1–500 (a larger value is clamped). Defaults to 200. |
| `updated_since` | query | no | string (date-time) | ISO 8601. Only supporters whose watermark moved at or after this instant. |
| `status` | query | no | `active`, `inactive`, `unsubscribed` | Filter by supporter status. |

Response `data`: array of Supporter.

Other statuses: 400, 401, 403, 429, 500, 503.

### GET /supporters/lookup

Look up a supporter by email. `operationId: lookupSupporter` · scope: supporters:read · rate bucket: lookup

Case-insensitive single-email enrichment — the "a donor record was just opened" path. Returns an ARRAY of supporters (two case-variant spellings of one address can be two people). No match is a 200 with `matched: false`, never a 404 — a CRM iterating its donor file must not treat absence as an error.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `email` | query | yes | string (email) | The address to match. |

Response `data`: LookupResult.

Other statuses: 400, 401, 403, 429, 500, 503.

### POST /supporters/match

Match supporters by email in batch. `operationId: matchSupporters` · scope: supporters:read · rate bucket: lookup

The backfill primitive: one request matches up to 200 addresses, so a 50,000-donor file is 250 requests instead of 50,000. Addresses are trimmed and lowercased, duplicates collapse to one entry, and both `matched[].email` and `unmatched[]` carry the LOWERCASED form — map back to your records case-insensitively. Each matched entry is an array of supporters (two case-variant spellings of one address can be two people). Deleted accounts never match.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `Idempotency-Key` | header | no | string | Optional, 1–255 printable characters (a UUID is ideal). The first successful (2xx) response is stored for 24 hours and replayed — same status, same body, with `Idempotent-Replayed: true` — to any retry with the same key. The same key with a different body or on another endpoint is 409 `idempotency_key_reused`; a retry while the first request is still running is 409 `idempotency_key_in_progress`. A failed request is not stored, so the corrected retry may reuse its key. |

Request body (JSON, `MatchRequest`):

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `emails` | array of string (email) | yes | 1–200 addresses. Each is trimmed and lowercased before matching; duplicates (including case variants of one address) are matched once. |

Response `data`: MatchResult.

Other statuses: 400, 401, 403, 409, 429, 500, 503.

### GET /supporters/{supporterId}

Get a supporter’s advocacy profile. `operationId: getSupporter` · scope: supporters:read · rate bucket: read

The one endpoint that answers "who is this donor as an advocate": identity, districts, elected officials, activity rolled up by issue with imputed positions, per-bill history, alert email engagement, and the five most recent submissions.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `supporterId` | path | yes | integer | The supporter id from any list or lookup response. |

Response `data`: object.

Other statuses: 400, 401, 403, 404, 410, 429, 500, 503.

### GET /actions

List actions. `operationId: listActions` · scope: actions:read · rate bucket: read

The submission-grouped activity stream, ascending. A message sent to a 12-member committee is ONE action with 12 recipients, never 12 actions. `since` plus the cursor streams new submissions by when they began. `updated_since` plus the cursor is the change feed: ordered by `updated_at`, it returns a submission again whenever one of its recipients changes — a letter the platform delivers to an office settles `delivered` or `failed` minutes after the submission. A submission still arriving (rows younger than about a minute) is held back until it is complete. Submissions of deleted accounts are not listed.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `since` | query | no | string (date-time) | ISO 8601. Only submissions that began at or after this instant. Not with `updated_since`. |
| `updated_since` | query | no | string (date-time) | ISO 8601. The change feed: submissions any of whose recipients changed at or after this instant, ordered by `updated_at`. Not with `since`. |
| `cursor` | query | no | string | Opaque position from the previous page’s `meta.next_cursor`. Cursors do not expire, but one is only meaningful with the same filters (`since`, `updated_since`, `status`, `supporter_id`…) as the request that produced it. A malformed cursor is a 400 — restart the listing, never retry the cursor. |
| `limit` | query | no | integer | Page size, 1–500 (a larger value is clamped). Defaults to 200. |
| `supporter_id` | query | no | integer | Restrict to one supporter. |

Response `data`: array of Action.

Other statuses: 400, 401, 403, 429, 500, 503.

### GET /events

Replay webhook events. `operationId: listEvents` · scope: per event type · rate bucket: read

Scope: per event type — supporter events need `supporters:read`; action events (`supporter.action.completed`, `action.updated`) need `supporters:read` and `actions:read`. A key holding neither is 403 `forbidden_scope`.

The webhook journal for your organization, oldest first: every event your key may read, each in the exact envelope a webhook POST carries (`id` is the same event id, so dedupe across push and pull on it). Bodies are built from current data. An event whose subject has since gone — a supporter who deleted their account — is omitted, except the `supporter.deleted` tombstone itself. Events are released about three minutes after they occur (the one-minute action debounce plus a margin for writes still committing), and a page stops at the first event not yet released — so a submission is never replayed half-sent and the cursor never passes an event that has not appeared yet. The listing is in journal order; the cursor is opaque and positions on the last event returned.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `since` | query | no | string (date-time) | ISO 8601. Start from events that occurred at or after this instant. Applies to the first page; with a cursor the cursor alone positions the listing. |
| `cursor` | query | no | string | Opaque position from the previous page’s `meta.next_cursor`. Cursors do not expire, but one is only meaningful with the same filters (`since`, `updated_since`, `status`, `supporter_id`…) as the request that produced it. A malformed cursor is a 400 — restart the listing, never retry the cursor. |
| `limit` | query | no | integer | Page size, 1–100. Defaults to 100. |
| `types` | query | no | string | Comma-separated event types to include. Defaults to every type the key may read; naming a type the key may not read is 403. |

Response `data`: array of WebhookEnvelope.

Other statuses: 400, 401, 403, 429, 500, 503.

### GET /webhook-endpoints

List webhook endpoints. `operationId: listWebhookEndpoints` · scope: webhooks:manage · rate bucket: read

Every endpoint the organization has, with `registered_by_this_key` marking your own — check it before registering, so reconnecting is idempotent instead of accumulating duplicates.

Response `data`: array of RegisteredEndpoint.

Other statuses: 400, 401, 403, 429, 500, 503.

### POST /webhook-endpoints

Register a webhook endpoint. `operationId: createWebhookEndpoint` · scope: webhooks:manage · rate bucket: read

Self-service onboarding: register your receiver and store the signing secret in one call. The URL must be public HTTPS. A signed verification ping is dispatched immediately, so a misconfigured receiver fails now rather than at the first real event. Duplicate URLs and the per-organization endpoint cap come back as 400 with `error.details.reason` of `duplicate_url` or `endpoint_limit`. The `webhooks:manage` scope is granted by an owner at key creation — it is never on a key by default.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `Idempotency-Key` | header | no | string | Optional, 1–255 printable characters (a UUID is ideal). The first successful (2xx) response is stored for 24 hours and replayed — same status, same body, with `Idempotent-Replayed: true` — to any retry with the same key. The same key with a different body or on another endpoint is 409 `idempotency_key_reused`; a retry while the first request is still running is 409 `idempotency_key_in_progress`. A failed request is not stored, so the corrected retry may reuse its key. |

Request body (JSON, `WebhookEndpointCreate`):

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string (uri) | yes | Public HTTPS receiver. Private, loopback and non-HTTPS addresses are refused (400). |
| `event_types` | array of `supporter.created`, `supporter.updated`, `supporter.deleted`, `supporter.action.completed`, `supporter.unsubscribed`, `action.updated` | no | Defaults to every event type that exists at registration. Unknown names are dropped; a list with none left is a 400. Event types added later are not subscribed automatically. |
| `description` | string | no | Shown to the organization’s owners in Settings. Defaults to "Registered by <key name>". |

Response `data`: WebhookRegistration.

Other statuses: 400, 401, 403, 409, 429, 500, 503.

### DELETE /webhook-endpoints/{endpointId}

Delete a webhook endpoint you registered. `operationId: deleteWebhookEndpoint` · scope: webhooks:manage · rate bucket: read

Removes an endpoint THIS KEY registered. Endpoints created by staff or by other keys are 404 — indistinguishable from nonexistence, so one integration can never tear down another’s plumbing. Organization owners can delete anything from Settings.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `endpointId` | path | yes | string (uuid) | From the register or list response (a UUID). |

Response `data`: object.

Other statuses: 400, 401, 403, 404, 429, 500, 503.

### GET /tracked-bills

List tracked bills. `operationId: listTrackedBills` · scope: org_data:read · rate bucket: read

Every bill on your organization’s tracked list with your position on it — stance, priority, public position statement, website flag — the SHARED portfolios holding it, and the bill’s status. Ordered by the tracked row’s `updated_at` ascending; `updated_since` returns the rows whose position changed or whose shared portfolios changed (added to or removed from one, one renamed, made private or deleted). An untracked bill leaves the list (there is no tombstone): reconcile with a full listing.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `cursor` | query | no | string | Opaque position from the previous page’s `meta.next_cursor`. Cursors do not expire, but one is only meaningful with the same filters (`since`, `updated_since`, `status`, `supporter_id`…) as the request that produced it. A malformed cursor is a 400 — restart the listing, never retry the cursor. |
| `limit` | query | no | integer | Page size, 1–500 (a larger value is clamped). Defaults to 200. |
| `updated_since` | query | no | string (date-time) | ISO 8601. Only rows whose position or shared portfolios changed at or after this instant. |

Response `data`: array of TrackedBill.

Other statuses: 400, 401, 403, 429, 500, 503.

### GET /portfolios

List shared portfolios. `operationId: listPortfolios` · scope: org_data:read · rate bucket: read

Your organization’s SHARED Issue Portfolios, active and archived. A staff member’s private portfolio is never listed, whoever owns it. `updated_since` returns portfolios whose details or bills changed. A portfolio made private or deleted leaves the list (there is no tombstone): reconcile with a full listing.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `cursor` | query | no | string | Opaque position from the previous page’s `meta.next_cursor`. Cursors do not expire, but one is only meaningful with the same filters (`since`, `updated_since`, `status`, `supporter_id`…) as the request that produced it. A malformed cursor is a 400 — restart the listing, never retry the cursor. |
| `limit` | query | no | integer | Page size, 1–500 (a larger value is clamped). Defaults to 200. |
| `updated_since` | query | no | string (date-time) | ISO 8601. Only portfolios changed at or after this instant. |

Response `data`: array of Portfolio.

Other statuses: 400, 401, 403, 429, 500, 503.

### GET /portfolios/{portfolioId}

Get a shared portfolio. `operationId: getPortfolio` · scope: org_data:read · rate bucket: read

One shared portfolio with the ids of its bills (read each with `/tracked-bills` or `/bills/{billId}`).

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `portfolioId` | path | yes | integer | From `/portfolios` or a tracked bill’s `portfolios`. |

Response `data`: PortfolioDetail.

Other statuses: 400, 401, 403, 404, 429, 500, 503.

### GET /campaigns

List campaigns. `operationId: listCampaigns` · scope: org_data:read · rate bucket: read

Every campaign of your organization, archived ones included, with its bills and the stance it takes on each, its action pages and current letter round.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `cursor` | query | no | string | Opaque position from the previous page’s `meta.next_cursor`. Cursors do not expire, but one is only meaningful with the same filters (`since`, `updated_since`, `status`, `supporter_id`…) as the request that produced it. A malformed cursor is a 400 — restart the listing, never retry the cursor. |
| `limit` | query | no | integer | Page size, 1–500 (a larger value is clamped). Defaults to 200. |
| `updated_since` | query | no | string (date-time) | ISO 8601. Only campaigns changed at or after this instant. |
| `status` | query | no | `draft`, `active`, `paused`, `completed`, `archived` | Filter by status. |

Response `data`: array of Campaign.

Other statuses: 400, 401, 403, 429, 500, 503.

### GET /campaigns/{campaignId}

Get a campaign. `operationId: getCampaign` · scope: org_data:read · rate bucket: read

One campaign — the `campaign.id` of any action.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `campaignId` | path | yes | integer | From `/campaigns` or an action’s `campaign`. |

Response `data`: Campaign.

Other statuses: 400, 401, 403, 404, 429, 500, 503.

### GET /action-pages

List action pages. `operationId: listActionPages` · scope: org_data:read · rate bucket: read

Every action page, drafts and archived pages included, each with its status, bills and stance, live URL (published pages only) and submission count. A page supporters acted on is archived when staff remove it, never deleted, so every `action_page.id` in `/actions` resolves.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `cursor` | query | no | string | Opaque position from the previous page’s `meta.next_cursor`. Cursors do not expire, but one is only meaningful with the same filters (`since`, `updated_since`, `status`, `supporter_id`…) as the request that produced it. A malformed cursor is a 400 — restart the listing, never retry the cursor. |
| `limit` | query | no | integer | Page size, 1–500 (a larger value is clamped). Defaults to 200. |
| `updated_since` | query | no | string (date-time) | ISO 8601. Only pages changed at or after this instant. |
| `status` | query | no | `draft`, `published`, `unpublished`, `archived` | Filter by status. |
| `campaign_id` | query | no | integer | Only the pages of one campaign. |

Response `data`: array of ActionPage.

Other statuses: 400, 401, 403, 429, 500, 503.

### GET /action-pages/{actionPageId}

Get an action page. `operationId: getActionPage` · scope: org_data:read · rate bucket: read

One action page — the `action_page.id` of any action.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `actionPageId` | path | yes | integer | From `/action-pages` or an action’s `action_page`. |

Response `data`: ActionPage.

Other statuses: 400, 401, 403, 404, 429, 500, 503.

### GET /bills/{billId}

Get a bill. `operationId: getBill` · scope: any key · rate bucket: read

One bill: summary, status, sponsors under the state’s role names, latest action, documents with links (our copy or the legislature’s, never LegiScan), the placeholder flag, and — for a key with `org_data:read` — your organization’s tracked position. Public data: any valid key reads bills in your organization’s jurisdiction. `tracked` (stance, priority, public statement, website flag, shared portfolios) is filled only for a key with `org_data:read` and is null otherwise; such a key also reaches bills on your tracked list outside the jurisdiction, which are a 404 to any other key.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `billId` | path | yes | integer | LegiScan bill id (`ls_bill_id` / `bill_id` elsewhere in this API). |

Response `data`: Bill.

Other statuses: 400, 401, 403, 404, 429, 500, 503.

### GET /legislators/{legislatorId}

Get a legislator. `operationId: getLegislator` · scope: any key · rate bucket: read

One legislator: party, chamber and title as the state names them, district, contact email, photo, service status, committee seats. Covers your organization’s legislature and — for a state organization — its members of Congress: every `legislator_id` an action recipient carries. Public data: any valid key.

| Parameter | In | Required | Type | Description |
| --- | --- | --- | --- | --- |
| `legislatorId` | path | yes | integer | LegiScan people_id (`legislator_id` in `/actions`). |

Response `data`: Legislator.

Other statuses: 400, 401, 403, 404, 429, 500, 503.

### GET /issues

Get the issue taxonomies. `operationId: listIssues` · scope: any key · rate bucket: read

The dictionary behind every `issues[]` and `policy_issues[]` field, so your labels stay stable. `issues` is the flat vocabulary with broad bill coverage; `policy_issues` the hierarchical taxonomy with sparser coverage. Cache for an hour.

Response `data`: IssueDictionary.

Other statuses: 400, 401, 403, 429, 500, 503.

## Errors

Every error is `{ "error": { "code", "message", "details"? }, "request_id" }`. Branch on `error.code`.

| Code | HTTP | Meaning / what to do |
| --- | --- | --- |
| `unauthorized` | 401 | Missing, malformed or unknown key. Do not retry; check the key. |
| `key_expired` | 401 | The key expired. A human must issue a new one. |
| `key_revoked` | 401 | The key was revoked. A human must issue a new one. |
| `forbidden_scope` | 403 | The key lacks the scope this endpoint (or event type) needs. A scope cannot be added to an existing key: an owner issues a new one. |
| `partner_api_disabled` | 403 | An owner switched the partner API off, or the organization is not active. Pause and retry later (hourly). |
| `invalid_request` | 400 | A malformed parameter, body or cursor; see `error.details`. Fix, do not retry as is (a bad cursor: restart the listing). |
| `not_found` | 404 | No such record in this organization (or outside its jurisdiction). |
| `supporter_deleted` | 410 | The person deleted their account; `details.deleted_at`. Delete or anonymize your copy. |
| `idempotency_key_reused` | 409 | Same `Idempotency-Key` with a different body or endpoint. Use a new key. |
| `idempotency_key_in_progress` | 409 | The first request with this key is still running. Retry shortly with the same key. |
| `rate_limited` | 429 | Wait `Retry-After` seconds; `details.bucket` names the ceiling hit. |
| `internal` | 500 | Unexpected error. Retry with backoff; quote `request_id` if it persists. |
| `service_unavailable` | 503 | Paused platform-wide, a dependency is down, or an `Idempotency-Key` could not be honoured. Retry with backoff and the same `Idempotency-Key`. |

## Headers

| Header | Direction | Meaning |
| --- | --- | --- |
| `Authorization: Bearer cs_org_…` | request | The organization API key. |
| `Idempotency-Key` | request (POST) | A UUID; the first 2xx response is stored and replayed to retries with the same key. |
| `X-Request-Id` | response | Same as `meta.request_id`; quote it when reporting a problem. |
| `X-RateLimit-Limit` / `-Remaining` / `-Reset` | response | Budget for this window; Reset is Unix seconds. |
| `Retry-After` | response (429) | Seconds to wait. |
| `Idempotent-Replayed: true` | response (POST) | This is a stored response replayed for a repeated key. |

## Rate limits

| Bucket | Limit |
| --- | --- |
| Reads, per key | 300/minute |
| Email lookup and match, per key | 60/minute |
| Organization total, all keys | 1200/minute |

Measured over 60-second windows (default limits; `GET /whoami` and the `X-RateLimit-*` headers report the live ones). Extra keys do not raise the organization ceiling.

## Webhook events

Delivery: signed POST, acknowledge with 2xx within 10 seconds. Retries: 31 attempts over about 24 hours (30 seconds after the first failure, doubling each time, at most an hour apart). A 410 response permanently disables the endpoint; 20 consecutive failed deliveries disable it until re-enabled.

| Event | Description | Replay needs |
| --- | --- | --- |
| `supporter.created` | A person became a supporter of your organization — through an action page, a signup, or a subscriber entering your org’s public flow. | `supporters:read` |
| `supporter.updated` | A supporter’s record changed: staff edits, or the person’s own name, email, address or districts. | `supporters:read` |
| `supporter.deleted` | The person deleted their account. `data.supporter` is a tombstone — `{ id, deleted_at }`, nothing else. Delete or anonymize your copy. From now on the supporter is absent from every list, lookup and match, `GET /supporters/{id}` answers 410 `supporter_deleted`, their submissions leave `/actions`, and any undelivered webhook about them is dropped rather than sent. | `supporters:read` |
| `supporter.action.completed` | A supporter completed a submission. Sent about a minute after the action so multi-recipient sends arrive as one complete event; `data.action` carries the full recipient list. | `supporters:read` and `actions:read` |
| `supporter.unsubscribed` | A supporter opted out — via the unsubscribe link, a spam complaint, or staff marking them unsubscribed. Stop mailing them. | `supporters:read` |
| `action.updated` | A submission changed after it was reported: a recipient’s letter was delivered or failed (`recipients[].delivery`). `data.action` is the whole submission as it is now. Held about a minute, like supporter.action.completed, so one delivery run is one event; it can arrive before that submission’s supporter.action.completed — upsert on `data.action.id`. | `supporters:read` and `actions:read` |
| `ping` | The test delivery the Send Test button produces. Same envelope and signature as real events. | not replayed |
