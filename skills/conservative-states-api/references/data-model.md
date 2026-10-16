# Conservative States data model (Partner API)

Every field, type and enum is listed in `schemas.md` (generated from the live OpenAPI components). This file explains what the fields *mean* and how to use them safely. The live spec at `https://my.conservativestates.app/api/partner/v1/openapi.json` is the contract.

## Scope

A `cs_org_` key reads exactly one organization. There is no cross-organization access; the same person who supports two organizations is two unrelated supporter ids.

## Supporter

One person as the organization knows them.

| Field | Meaning |
| --- | --- |
| `id` | Integer, stable, scoped to the organization. **Your durable key.** |
| `email` | Can change. Two case-variant spellings can be two people. Never key on it. |
| `status` | `active`, `inactive`, `unsubscribed`. `unsubscribed` → stop mailing in your system too. |
| `opted_in_updates` | Whether they asked for updates when they signed up. |
| `consents.email_updates` / `action_alerts` / `data_sharing` | `true` granted, `false` declined or revoked, **`null` never asked** (not a refusal). |
| `consents.data_sharing` | **Reported, not enforced.** Every supporter is returned regardless; the organization (the data controller) decides what its CRM may do with someone who has `false`. |
| `engagement.score` / `tier` | 0–100 from action volume, recency and opt-in, recomputed on read; tier `high` ≥ 67, `medium` ≥ 34, else `low`. It changes without the record changing — do not use it as a change signal. |
| `action_count`, `first_action_at`, `last_action_at` | Distinct submissions — a multi-recipient letter counts once. |
| `districts.state_house` / `state_senate` / `congressional` | One unpadded label per type, as text, not numbers: `"7"`, `"12A"` (a seat letter), `"A"` (a lettered district). Where an address lies in several districts of one type, the first the address lookup listed. Store as strings. |
| `districts_all.state_house` / `state_senate` / `congressional` | Every district of each type, as an array of the same labels (empty when unknown) — several for a New Hampshire base district plus its floterial. `districts.*` is the first element. |
| `address` | Street, city, state, zip, county; `latitude`/`longitude` are null until geocoded. |
| `attribution` | Where the supporter **first** came from (UTM, embedding site, referrer host). Set once. |
| `updated_at` | The incremental-sync watermark; moves on advocacy activity, staff edits and the person's own identity edits. |

The detail endpoint `GET /supporters/{id}` adds `representatives` (every sitting member of each of their districts — a multi-member district gives several entries per type; each has `people_id` when matched, and most fields can be null), `issues` (activity rolled up by the flat issue vocabulary, with a position mix), `policy_issues` (the hierarchical taxonomy; coverage is partial — absence means "not tagged", not "does not care"), `bills` (per-bill history with `imputed_position` and the org's own tracked stance), `email_engagement` (alert delivery / open / click aggregates) and `recent_actions` (five newest).

### Deleted supporters

When a person deletes their account they leave every list, lookup and match; their submissions leave `/actions`; `GET /supporters/{id}` answers **410** `supporter_deleted` with `error.details.deleted_at`; a `supporter.deleted` event carries only `{ id, deleted_at }`, and undelivered webhooks about them are dropped. Delete or anonymize your copy.

## Action (a submission)

One submission by one supporter. A letter sent to a 12-member committee is **one** action with **12 recipients**, never 12 actions.

| Field | Meaning |
| --- | --- |
| `id` | Opaque string (`grp_…`), stable and unique within the organization. Upsert on it; do not parse it. |
| `occurred_at` | When the submission started (`?since=` filters on it). |
| `updated_at` | When any recipient last changed (`?updated_since=` change feed). |
| `action_type` | `email_legislator`, `email_committee`, `email_governor`, `email_custom`, `signup`, `pledge` — the live enum is in the spec. |
| `delivery_method` | How it was sent: `oauth_google` / `oauth_microsoft` (from the supporter's own mailbox through the platform), `mailto` (their mail app — self-attested), `cwc` / `scwc` (the platform delivered to a congressional office through the House / Senate delivery API), `webform`, `webform_manual` (the supporter pasted it into an official's form — self-attested). |
| `message_source` | `suggested`, `ai_generated`, `edited`. |
| `subject` | The only message content available. **Letter bodies are never exposed.** |
| `recipients[]` | Each official: `name`, `email`, `legislator_id` (null for executive officials and custom recipients), `party`, `role`, `district` (e.g. `HD-007`), `status`, `letter_stance`, `delivery`. |
| `recipients[].delivery` | `status`: `queued` → `delivered` / `failed`, or `not_applicable` when the supporter sent it themselves; `channel`; `delivered_at`; `failure_reason` (`rejected`, `undeliverable`, `office_unavailable`, `send_failed`, `unknown`). Changes after submission → `action.updated`. |
| `bill` | `ls_bill_id`, `bill_number` (each legislature's own form: `HB0123` in Tennessee, `HB45` in Alabama), `state` (`US` for Congress), `title` (the statutory caption, "AN ACT to amend…"), `short_summary` (one sentence — **display this**). **Null** for an issue page with no bill. |
| `issues[]` | The flat issue vocabulary for the bill; empty when there is no bill. |
| `campaign`, `action_page` | The organization assets that drove the action, when known. |
| `attributed_alert_id` | The alert email whose link led here, when known. |
| `attribution` | The visit that sent this submission (UTM, embed origin, referrer host, issue-page round). |

## Positions: `imputed_position` vs `letter_stance`

Supporters never state positions in Conservative States. Two fields describe the **organization's ask**:

| | `imputed_position` (on actions and supporter bills) | `recipients[].letter_stance` |
| --- | --- | --- |
| What | The stance the organization's campaign, action page or tracked bill carries, resolved most specific first | The stance the letter carried when it was sent, recorded with the letter |
| Values | `value`: `support`, `oppose`, `neutral`, `unknown`; plus `basis` (`campaign_bill`, `action_page`, `org_tracked`, `none`), `basis_raw`, `confidence` (`high`, `medium`, `low`, `none`) | `support`, `oppose`, or null (issue page, page without a stance, signup) |
| Changes later? | Yes — computed at read time from current stances | Never |

Basis and confidence: `campaign_bill` (the campaign's stance on this exact bill, high); `action_page` (high for a single-bill page, low for a multi-bill page); `org_tracked` (the org's canonical position, medium — `amend` reads as `neutral`, `monitor` as `unknown` with confidence `none`); `none` (`unknown`).

Render either as "acted with your campaign to support HB 123" or "sent a letter supporting HB 123 through your action page" — **never** as "their position on HB 123".

## Issues

`GET /issues` is the dictionary behind every `issues[]` and `policy_issues[]` id: `issues` (flat, broad bill coverage) and `policy_issues` (hierarchical, sparser). Cache it for an hour and map by `id`/`slug`, not by display name.

## Organization data (`org_data:read`)

| Object | Meaning |
| --- | --- |
| Tracked bill | A bill on the organization's tracked list: `stance`, `priority`, public `position_statement`, website flag, and the SHARED portfolios holding it. Internal notes are never exposed. `updated_at` moves when its stance, priority, statement or website flag changes, or when it joins or leaves a shared portfolio. |
| Portfolio | A SHARED Issue Portfolio (a named set of bills; no stance of its own). Private portfolios are never exposed — absent from lists, 404 by id. |
| Campaign | Every campaign, archived included, with its bills and its stance on each (`watch` = no ask yet), action page ids and current letter round. `kind` is `issue` when no bill is named. |
| Action page | Every page — draft, published, unpublished, archived — with bills, stance, `url` (published only) and `submission_count`. A page supporters used is archived, never deleted, so every `action_page.id` in `/actions` resolves. |

None of these lists has tombstones: reconcile with a periodic full listing. `GET /bills/{id}` and `GET /legislators/{id}` (any key) resolve the bills and legislators the organization's data refers to, limited to its jurisdiction (a state organization also sees its state's members of Congress).

## Test organizations

`GET /whoami` → `is_test: true` means the organization is a platform test org with synthetic supporters and actions. Use one for staging; guard production syncs against it.

## Versioning

The path carries `v1`; payloads carry `api_version`. New fields, endpoints, enum values and event types are added without a version bump — ignore what you do not recognize and do not fail on unknown enum values. Breaking changes get a new path.
