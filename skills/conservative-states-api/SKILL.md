---
name: conservative-states-api
description: Build integrations with Conservative States, the state legislative-tracking and advocacy platform. Covers the Partner REST API (cs_org_ bearer keys) for CRM sync of supporters, advocacy actions, issues and the legislators supporters contacted; signed webhooks (X-CS-Signature) and the /events replay; and the MCP server that gives AI assistants read-only tools over bills, bill text, votes, legislators and committees. Use when writing code or configuration that calls my.conservativestates.app/api/partner/v1, receives Conservative States webhooks, syncs supporters or actions into Salesforce, HubSpot or another CRM, or connects Claude, Cursor, ChatGPT or another MCP client to mcp.conservativestates.app.
license: MIT
---

# Conservative States API

Conservative States is a legislative-tracking and advocacy platform. Advocacy organizations run campaigns and action pages; their supporters write to legislators. Two developer surfaces expose that data:

| Surface | For | Auth | Entry point |
| --- | --- | --- | --- |
| **Partner REST API** | An organization's own systems: CRM sync, data warehouse, dashboards. Supporters, their advocacy actions, issues, delivery status, webhooks, and the organization's own tracked bills, portfolios, campaigns and action pages. | `Authorization: Bearer cs_org_…` (one organization per key, created by an org owner) | `https://my.conservativestates.app/api/partner/v1` |
| **MCP server** | AI assistants answering questions about legislation: bills, full text, amendments, votes, legislators, committees, calendar, the org's own tracked bills. Read-only. | OAuth sign-in from the client, or a pasted `cs_mcp_…` token | `https://mcp.conservativestates.app/mcp` |

## Which one to use

| The task is… | Use |
| --- | --- |
| Copy supporters and their actions into a CRM, keep it current | Partner API: backfill + incremental pulls + webhooks |
| React within seconds when someone takes action | Partner API webhooks (verify the signature), with `/events` as the safety net |
| Enrich a donor record when it is opened | `GET /supporters/lookup?email=` |
| Link an existing donor file to supporters | `POST /supporters/match` (200 emails per call) |
| Ask "what moved this week on our bills?", "how did committee X vote?" | MCP server from an AI client |
| Show the organization's tracked bills, campaigns or action pages in its own systems | Partner API org-data endpoints (see the endpoint table) |
| Search or analyse legislation — full text, votes, committee rosters, session-wide counts | MCP server (any MCP client library speaking Streamable HTTP); the Partner API only looks up the bills and legislators the organization's own data refers to |

## Golden rules

1. **Never trust a cached spec.** Fetch the live OpenAPI document before generating a client or relying on a field: `curl -s https://my.conservativestates.app/api/partner/v1/openapi.json` (or run `scripts/fetch-openapi.sh`). The tables in this skill are a map, not the contract. Ignore fields you do not recognize; additive changes ship without a version bump.
2. **Store the supporter `id` as the durable key.** Email changes, and two case-variant spellings can be two people. Match by email once to link records, then key everything on `id`.
3. **Watermarks are inclusive and commit-order sensitive.** Start every incremental run from the last watermark *minus a few minutes*, and dedupe/upsert on `id`. Persist the new watermark only after the batch is written.
4. **Verify webhook signatures over the raw request body** before parsing JSON, with a constant-time compare and a length check, and reject timestamps older than five minutes. Re-serialized JSON will not verify. See `references/webhooks.md`.
5. **Honor `Retry-After` on 429 and back off on 503.** Read `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` and pace before you hit the wall. Every GET is safe to retry.
6. **Send an `Idempotency-Key` (a UUID) on every POST** and reuse it on retries of the same request.
7. **Upsert actions on `id`.** Actions are not append-only: `action.updated` and the `/actions?updated_since=` change feed resend a submission when a recipient's delivery settles, and `action.updated` can arrive before `supporter.action.completed`.
8. **`imputed_position` is derived, never a stated position.** It is the stance the organization's campaign, action page or tracked bill asked for. `recipients[].letter_stance` is what the letter itself carried. Render "acted with your campaign to support HB 123", never "Jane supports HB 123".
9. **Handle deletion.** `GET /supporters/{id}` answers **410 `supporter_deleted`** and a `supporter.deleted` event (a tombstone: `{ id, deleted_at }`) is sent and replayable. Delete or anonymize your copy; the id never answers again.
10. **`data_sharing` consent is reported, not enforced.** The API returns every supporter; the integrator decides what its own system may do with someone whose `consents.data_sharing` is `false`. `null` means never asked, not a refusal.
11. **No secrets in client-side code.** `cs_org_` keys, `cs_mcp_` tokens and webhook signing secrets (`cswhsec_…`) belong in server-side environment variables or a secret manager, never in a browser bundle, mobile app or repository.
12. **Webhooks are a latency optimization, not the source of truth.** Deliveries can be delayed, duplicated or arrive out of order. Reconcile with the pull API on a schedule.

## Partner API quick start

```bash
export CS_API_KEY=cs_org_...          # from Settings → Partner API & webhooks (owner only, shown once)
curl -s -H "Authorization: Bearer $CS_API_KEY" https://my.conservativestates.app/api/partner/v1/whoami
```

`/whoami` proves the key end to end and returns the organization, the key's scopes, counts, live rate limits and `is_test` (a test organization with synthetic data — point a staging CRM at it).

- Success: `{ "data": …, "meta": { "request_id", … } }`; lists add `meta.count`, `meta.has_more`, `meta.next_cursor`.
- Error: `{ "error": { "code", "message", "details"? }, "request_id" }`. Branch on `error.code`, never on `message`.
- Pagination: pass `meta.next_cursor` back as `?cursor=` until it is null. A cursor belongs to the query that produced it; a malformed cursor is 400 — restart the listing, never retry the cursor.
- Scopes: `supporters:read`, `actions:read`, `org_data:read`, `webhooks:manage`. `webhooks:manage` is never on a key by default.

### Endpoints

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

Full parameters, error codes and headers: `references/api-reference.md`. Every response schema field: `references/schemas.md`.

### Rate limits

| Bucket | Limit |
| --- | --- |
| Reads, per key | 300/minute |
| Email lookup and match, per key | 60/minute |
| Organization total, all keys | 1200/minute |

Measured over 60-second windows (default limits; `GET /whoami` and the `X-RateLimit-*` headers report the live ones). Extra keys do not raise the organization ceiling.

### Retry recipe

```text
on 429:  sleep(Retry-After seconds) then retry
on 503:  exponential backoff with jitter (1s, 2s, 4s … cap 60s); same Idempotency-Key
on 5xx:  same as 503, at most ~5 attempts, log X-Request-Id
on 4xx:  do not retry (fix the request); 409 idempotency_key_in_progress → retry shortly
always:  if X-RateLimit-Remaining is 0, wait until X-RateLimit-Reset
```

## Webhooks in one paragraph

Register an HTTPS endpoint in Settings or with `POST /webhook-endpoints` (scope `webhooks:manage`; check `GET /webhook-endpoints` for `registered_by_this_key` first so reconnecting does not duplicate). Each POST carries `X-CS-Event`, `X-CS-Event-Id` (dedupe on it), `X-CS-Timestamp` and `X-CS-Signature: t=<unix>,v1=<hex>` where `v1 = HMAC-SHA256(secret, "<t>.<raw body>")`. Acknowledge with a 2xx within 10 seconds and process afterwards. Failures are retried: 31 attempts over about 24 hours (30 seconds after the first failure, doubling each time, at most an hour apart). **Never answer 410** unless you mean it — it permanently disables the endpoint. After downtime, replay with `GET /events?since=…` (same envelope, same `id`).

| Event | When | Replay needs |
| --- | --- | --- |
| `supporter.created` | A person became a supporter of your organization — through an action page, a signup, or a subscriber entering your org’s public flow. | `supporters:read` |
| `supporter.updated` | A supporter’s record changed: staff edits, or the person’s own name, email, address or districts. | `supporters:read` |
| `supporter.deleted` | The person deleted their account. | `supporters:read` |
| `supporter.action.completed` | A supporter completed a submission. | `supporters:read` and `actions:read` |
| `supporter.unsubscribed` | A supporter opted out — via the unsubscribe link, a spam complaint, or staff marking them unsubscribed. | `supporters:read` |
| `action.updated` | A submission changed after it was reported: a recipient’s letter was delivered or failed (`recipients[].delivery`). | `supporters:read` and `actions:read` |
| `ping` | The test delivery the Send Test button produces. | not replayed |

Verification code for Node, Python, Go and Ruby: `references/webhooks.md`. Ready-made verifiers: `scripts/verify-webhook.ts`, `scripts/verify-webhook.py`.

## CRM sync

The pattern — backfill, then incremental pulls with inclusive watermarks, then webhooks for latency, `/events` replay for gaps, and a periodic full re-page — with pseudo-code and Salesforce / HubSpot mapping suggestions is in `references/crm-sync.md`. Field meanings (consents, districts, engagement, delivery, positions) are in `references/data-model.md`.

## MCP server

Endpoint: `https://mcp.conservativestates.app/mcp` (Streamable HTTP, OAuth 2.1 discovery at `/.well-known/oauth-protected-resource`). It needs a Conservative States organization account with external AI access switched on by an owner, and a role allowed to use it (owner or editor).

- **Sign in from the client** (OAuth: paste the URL, approve in the browser) — the only way to reach the organization's own tracked bills and positions.
- **Paste a token** (`cs_mcp_…` from Settings → MCP connections) — public legislative data only; for clients that cannot open a browser.

```bash
claude mcp add --transport http conservative-states https://mcp.conservativestates.app/mcp
```

Nineteen read-only tools:

| Tool | Cost | What it answers |
| --- | --- | --- |
| `search_bills` | standard | Find bills by structured filters: policy issue, sponsor, committee, status, filing date, significance, whether the bill is currently moving, whether it grows or shrinks government authority, and which way it leans. |
| `semantic_search_legislation` | expensive | Searches the full text of bills, amendments, and fiscal notes by meaning, for when a bill addresses a topic without using its obvious words. |
| `get_bill` | standard | Full detail for one bill: sponsors, committee, status, action history, companions, policy tags, key provisions, scores, and which way the bill leans with the reasoning behind it. |
| `get_bill_text` | standard | The actual text of a bill or amendment, by section and page, in every state. |
| `get_bill_changes` | standard | Amendments filed against a bill, what each does, and whether it was adopted, withdrawn, or is still pending. |
| `get_bill_statute_changes` | standard | What a bill changes about the law that already exists — the current statute text, the proposed text, and a redline between them, per cited code section. |
| `compare_bills` | standard | Two to five bills aligned side by side — provisions, statutes touched, status, scores — plus which are companions and how textually similar they are. |
| `get_similar_bills` | standard | Bills whose text and policy resemble a given bill, ranked, with companions labelled. |
| `get_votes` | standard | Totals by chamber and party, who voted against, who was absent, and any party defectors. |
| `get_legislator` | standard | A member’s profile plus sponsorship and voting activity this session: bills they lead and bills naming them a prime sponsor, top policy areas, and how often they vote against their own party. |
| `get_legislator_dissents` | expensive | The specific roll calls where a member voted against their own party — the bill, the date, how they voted, what their party voted, what the other party voted, and which way the bill leans. |
| `get_vote_alignment` | expensive | How closely two voting records agree — one member against another, a whole caucus ranked by how often they vote with someone, or every member ranked against your own recorded support and oppose positions. |
| `get_committee` | standard | Membership with chair and vice chair, bills pending before it, and scheduled hearings. |
| `get_policy_framework` | cheap | The conservative position framework this organization measures legislation against — scope, principles, the bright-line support and oppose rules, the state’s legal landscape where one has been written for it, and the traps — across 13 policy domains. |
| `get_recent_legislative_activity` | standard | Bills filed, actions taken, votes recorded, amendments filed, hearings scheduled. |
| `get_legislative_calendar` | standard | What is scheduled and when, across every bill at once — committee and floor calendars, filterable to a committee, an issue, named bills, or just the ones your organization tracks. |
| `aggregate_legislative_data` | expensive | Counts, averages, and outcome rates across the session, computed in the database rather than sampled from a page of results — grouped by issue, committee, lead sponsor, every prime sponsor, party, status, month, or which way bills lean. |
| `get_org_portfolio` | cheap | Your organization’s own tracked bills, issue portfolios, and positions — what you support, what you oppose, and how much you care. |
| `get_org_legislator_intel` | standard | What your organization knows about one legislator that the public record does not — the notes your staff recorded, how many of your supporters live in their district and how many have contacted them, and how they voted on the bills you took a position on. |

Results come back as `{ data, citations[], metadata }` — cite from `citations`, report `metadata.truncated` and `processingState`, page with `metadata.nextCursor`. Client setup (Claude Desktop, Claude Code, Cursor, ChatGPT, Codex), envelope, errors and tool-selection tips: `references/mcp.md`. Every tool's arguments, notes, limits and worked chains: `references/mcp-tools.md`.

## Links

- Interactive API reference: https://my.conservativestates.app/developers
- Partner API guide: https://my.conservativestates.app/docs/partner-api
- OpenAPI document (live): https://my.conservativestates.app/api/partner/v1/openapi.json
- MCP setup guide: https://my.conservativestates.app/docs/mcp · tool reference: https://my.conservativestates.app/docs/mcp/tools
- This skill: `npx skills add conservative-states/skills` or https://my.conservativestates.app/.well-known/skills/index.json
