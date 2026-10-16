<!-- Generated from the Conservative States source (lib/partner/openapi, lib/mcp/catalog). Do not edit by hand. -->

# Partner API schemas

Every documented key is always present in responses (null when absent) unless marked not required. New keys may be added at any time — ignore unknown ones. Meanings and caveats: `data-model.md`.

## Meta

Response metadata. New keys may be added at any time.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `request_id` | string | yes | Unique per request. Quote it when reporting a problem. |

## MatchMeta

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `request_id` | string | yes | Unique per request. Quote it when reporting a problem. |
| `requested` | integer | yes | Distinct addresses after trimming, lowercasing and removing duplicates. |
| `matched` | integer | yes | Entries in `data.matched`. |

## WebhookEndpointListMeta

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `request_id` | string | yes | Unique per request. Quote it when reporting a problem. |
| `count` | integer | yes | Endpoints listed (every endpoint of the organization; the list is not paged). |

## IssuesMeta

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `request_id` | string | yes | Unique per request. Quote it when reporting a problem. |
| `cache_seconds` | integer | yes | How long the dictionary may be cached. |

## MatchRequest

A batch of email addresses to link to supporters.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `emails` | array of string (email) | yes | 1–200 addresses. Each is trimmed and lowercased before matching; duplicates (including case variants of one address) are matched once. |

## WebhookEndpointCreate

A webhook endpoint to register.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string (uri) | yes | Public HTTPS receiver. Private, loopback and non-HTTPS addresses are refused (400). |
| `event_types` | array of `supporter.created`, `supporter.updated`, `supporter.deleted`, `supporter.action.completed`, `supporter.unsubscribed`, `action.updated` | no | Defaults to every event type that exists at registration. Unknown names are dropped; a list with none left is a 400. Event types added later are not subscribed automatically. |
| `description` | string | no | Shown to the organization’s owners in Settings. Defaults to "Registered by <key name>". |

## ListMeta

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `request_id` | string | yes | Unique per request. Quote it when reporting a problem. |
| `count` | integer | yes | Items in this page. |
| `has_more` | boolean | yes | Whether another page exists. |
| `next_cursor` | string or null | yes | Pass back as `?cursor=` to continue. Null on the last page. |

## EventListMeta

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `request_id` | string | yes | Unique per request. Quote it when reporting a problem. |
| `count` | integer | yes | Events in this page (an event whose subject is gone is omitted, so it can be below the limit). |
| `has_more` | boolean | yes | Whether another page exists. |
| `next_cursor` | string or null | yes | Pass back as `?cursor=` to continue. Null on the last page. |
| `event_types` | array of string | yes | The event types this listing covers. |

## Error

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `error` | object | yes |  |
| `error.code` | `unauthorized`, `key_expired`, `key_revoked`, `forbidden_scope`, `partner_api_disabled`, `invalid_request`, `not_found`, `supporter_deleted`, `idempotency_key_reused`, `idempotency_key_in_progress`, `rate_limited`, `internal`, `service_unavailable` | yes | Stable machine-readable code. |
| `error.message` | string | yes | Human-readable explanation. |
| `error.details` | object | no | Optional structured context, e.g. which argument failed. |
| `request_id` | string | yes |  |

## Address

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `street` | string or null | yes |  |
| `city` | string or null | yes |  |
| `state` | string or null | yes | Two-letter state abbreviation. |
| `zip` | string or null | yes |  |
| `county` | string or null | yes |  |
| `latitude` | number or null | yes | From geocoding; null until the address has been geocoded. |
| `longitude` | number or null | yes |  |

## Consents

Null means the supporter was NEVER ASKED — it is not a refusal. False means granted-then-revoked or declined.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email_updates` | boolean or null | yes |  |
| `action_alerts` | boolean or null | yes |  |
| `data_sharing` | boolean or null | yes |  |

## Engagement

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `score` | integer | yes | 0–100, computed from action volume, recency, and opt-in. Recomputed on read. |
| `tier` | `high`, `medium`, `low` | yes | high ≥ 67, medium ≥ 34, else low. |

## Districts

One district per type. See `districts_all` for every district.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `state_house` | string or null | yes | District label, unpadded text (e.g. "7", "12A", "A"). One value: where an address lies in more than one district of a type (a New Hampshire floterial), the first the address lookup listed — every one is in `districts_all`. |
| `state_senate` | string or null | yes |  |
| `congressional` | string or null | yes |  |

## DistrictsAll

Every district of each type. Usually one; several where an address lies in more than one district of a type (a New Hampshire base district plus its floterial). `districts` carries the first.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `state_house` | array of string | yes | Every state house district, in the order the address lookup listed them; empty when unknown. |
| `state_senate` | array of string | yes |  |
| `congressional` | array of string | yes |  |

## Supporter

One person, as your organization knows them.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes | Supporter id, scoped to your organization. The `{supporterId}` path key. |
| `email` | string | yes |  |
| `first_name` | string or null | yes |  |
| `last_name` | string or null | yes |  |
| `phone` | string or null | yes | E.164 where normalizable. |
| `address` | Address | yes |  |
| `status` | `active`, `inactive`, `unsubscribed` | yes |  |
| `opted_in_updates` | boolean | yes |  |
| `consents` | Consents | yes |  |
| `engagement` | Engagement | yes |  |
| `action_count` | integer | yes | Distinct submissions — a multi-recipient blast counts once. |
| `first_action_at` | string (date-time) or null | yes |  |
| `last_action_at` | string (date-time) or null | yes |  |
| `districts` | Districts | yes |  |
| `districts_all` | DistrictsAll | yes |  |
| `attribution` | SupporterAttribution | yes |  |
| `created_at` | string (date-time) | yes |  |
| `updated_at` | string (date-time) | yes | The incremental-sync watermark. See the pagination guide. |

## SupporterAttribution

Where the supporter FIRST came from — the visit that created the record. Set once, never updated; each submission carries its own `attribution`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `utm_source` | string or null | yes |  |
| `utm_medium` | string or null | yes |  |
| `utm_campaign` | string or null | yes |  |
| `embed_origin` | string or null | yes | The site whose embedded action page they used, e.g. "https://example.org". |
| `referrer_host` | string or null | yes | The host of the page that linked to the action page, e.g. "www.facebook.com". |

## SupporterTombstone

All that remains of a supporter who deleted their account (`supporter.deleted`).

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes | The supporter id you have on file. |
| `deleted_at` | string (date-time) or null | yes | When the person deleted their account. |

## Representative

One elected official. Every sitting member of each of the supporter's districts is listed, so a multi-member district yields several entries.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `district_type` | `state_house`, `state_senate`, `congressional` | yes |  |
| `chamber` | string or null | yes | `house` or `senate`. |
| `people_id` | integer or null | yes | LegiScan people_id, when the member is matched to LegiScan. |
| `full_name` | string or null | yes |  |
| `party` | string or null | yes |  |
| `email` | string or null | yes |  |
| `phone` | string or null | yes |  |
| `url` | string or null | yes |  |
| `ocd_id` | string or null | yes | Open Civic Data division id: the supporter's district of this type, or the state for a U.S. Senator. Null when the address lies in several districts of the type. |

## ImputedPosition

THE POSITION YOUR ORGANIZATION ASKED THE SUPPORTER TO TAKE — not a position the supporter stated. Render it as "acted with your campaign to support HB123", never as "their position on HB123".

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `value` | `support`, `oppose`, `neutral`, `unknown` | yes |  |
| `basis` | `campaign_bill`, `action_page`, `org_tracked`, `none` | yes | Which organization asset supplied the stance, most specific first. |
| `basis_raw` | string or null | yes | The stored stance before normalization. `watch` and `amend` fold into `neutral`; `monitor` (tracked, no position) is `unknown`. |
| `confidence` | `high`, `medium`, `low`, `none` | yes |  |

## PositionMix

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `support` | integer | yes |  |
| `oppose` | integer | yes |  |
| `neutral` | integer | yes |  |
| `unknown` | integer | yes |  |

## Issue

The supporter’s activity rolled up by issue (broad-coverage taxonomy).

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes |  |
| `slug` | string | yes | Stable identifier; safe to key on. |
| `name` | string | yes |  |
| `action_count` | integer | yes | Distinct submissions on bills carrying this issue. |
| `bill_count` | integer | yes |  |
| `share` | number | yes | This issue’s fraction of all the supporter’s submissions (issue-campaign letters without a bill included), 0–1. |
| `first_action_at` | string (date-time) or null | yes |  |
| `last_action_at` | string (date-time) or null | yes |  |
| `dominant_position` | `support`, `oppose`, `neutral`, `unknown`, `mixed` | yes |  |
| `position_mix` | PositionMix | yes |  |

## PolicyIssue

The hierarchical taxonomy. Coverage is PARTIAL: treat absence as "not tagged", never as evidence the supporter does not care.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `slug` | string | yes |  |
| `label` | string | yes |  |
| `domain_key` | string or null | yes | Top-level domain, e.g. "life", "firearms". |
| `action_count` | integer | yes |  |
| `max_relevance` | number | yes | Highest tag relevance seen, 0–1. |

## BillCampaign

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes |  |
| `title` | string or null | yes |  |

## BillActionPage

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes |  |
| `slug` | string or null | yes |  |
| `title` | string or null | yes |  |

## SupporterBill

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `ls_bill_id` | integer | yes | LegiScan bill id. |
| `bill_number` | string or null | yes | e.g. "HB0123". |
| `title` | string or null | yes | The statutory caption ("AN ACT to amend…"). Display short_summary instead. |
| `short_summary` | string or null | yes | One-sentence AI summary (20 words max, verb-first) of what the bill does — the caption to show people. |
| `state` | string or null | yes |  |
| `action_count` | integer | yes | Distinct submissions on this bill. |
| `first_action_at` | string (date-time) | yes |  |
| `last_action_at` | string (date-time) | yes |  |
| `imputed_position` | ImputedPosition | yes |  |
| `org_tracked_stance` | string or null | yes | Your organization’s canonical stance on the bill, if tracked, as stored: `support`, `oppose`, `amend`, `neutral`, or `monitor` (tracked, no position). |
| `campaigns` | array of BillCampaign | yes |  |
| `action_pages` | array of BillActionPage | yes |  |

## EmailEngagement

How this supporter engages with your organization’s alert emails.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `alerts_sent` | integer | yes |  |
| `delivered` | integer | yes |  |
| `opened` | integer | yes | Distinct alerts opened at least once. |
| `clicked` | integer | yes |  |
| `open_rate` | number or null | yes | opened / alerts_sent, 0–1. Null when nothing was sent. |
| `click_rate` | number or null | yes |  |
| `bounced` | integer | yes |  |
| `complained` | integer | yes | Spam complaints. Treat any nonzero value seriously. |
| `last_opened_at` | string (date-time) or null | yes |  |
| `last_clicked_at` | string (date-time) or null | yes |  |

## ActionRecipient

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string or null | yes |  |
| `email` | string or null | yes |  |
| `legislator_id` | integer or null | yes | LegiScan people_id when the recipient is a legislator; null for an executive official (the Governor, a statewide officer) or a recipient the organization added itself. |
| `party` | string or null | yes | Single-letter party abbreviation. |
| `role` | string or null | yes | e.g. "Representative", "Senator"; for a recipient who is not a legislator, their title ("Governor", "Attorney General", "District Attorney") or "Other recipient". |
| `district` | string or null | yes | As LegiScan renders it, e.g. "HD-007". |
| `status` | `completed`, `failed` | yes | `failed` when the platform could not deliver the letter (see `delivery`); otherwise `completed`. |
| `letter_stance` | `support`, `oppose` or null | yes | The stance the LETTER carried — the position the action page asked for on this bill when the supporter sent it, recorded with the letter. Null for an issue page, a bill page without a stance, or a signup. Unlike `imputed_position` (worked out at read time from your current campaign, page and tracked-bill stances, with a basis and confidence), it never changes afterwards. Neither is a position the supporter stated in their own words. |
| `delivery` | RecipientDelivery | yes |  |

## RecipientDelivery

Whether this recipient got the letter. Changes after the submission: watch `action.updated`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | `queued`, `delivered`, `failed`, `not_applicable` | yes | `queued` until the platform has delivered it; `delivered`; `failed`; `not_applicable` when the supporter sent it themselves from their own mail app or an official’s web form, so we cannot know. |
| `channel` | string or null | yes | `cwc` / `scwc` (House / Senate delivery API), `webform`, `email` (the supporter’s own mailbox, sent through us or from their mail app), `webform_manual`. |
| `delivered_at` | string (date-time) or null | yes | When it was delivered (for `email` sent through us: when it was sent). |
| `failure_reason` | `rejected`, `undeliverable`, `office_unavailable`, `send_failed`, `unknown` or null | yes | Coarse class, only when `failed`: `rejected` (the office’s system refused it), `undeliverable` (every retry failed), `office_unavailable` (the office could not take letters through the channel for a day), `send_failed` (the supporter’s mailbox send failed), `unknown`. |

## ActionAttribution

The visit that sent this submission.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `utm_source` | string or null | yes |  |
| `utm_medium` | string or null | yes |  |
| `utm_campaign` | string or null | yes |  |
| `embed_origin` | string or null | yes | The site whose embedded action page sent it. |
| `referrer_host` | string or null | yes | The host of the page that linked to the action page. |
| `campaign_round` | integer or null | yes | An issue page’s round when the organization re-opened it for another round of letters; null on bill pages. |

## ActionBill

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `ls_bill_id` | integer | yes |  |
| `bill_number` | string or null | yes |  |
| `state` | string or null | yes | Two-letter jurisdiction of the bill (`US` for Congress). |
| `title` | string or null | yes | The statutory caption ("AN ACT to amend…"). Display short_summary instead. |
| `short_summary` | string or null | yes | One-sentence AI summary (20 words max, verb-first) of what the bill does — the caption to show people. |

## ActionIssue

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes |  |
| `slug` | string | yes |  |
| `name` | string | yes |  |

## Action

One SUBMISSION — a message to a 12-member committee is one action with 12 recipients, never 12 actions.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Opaque, stable submission id (`grp_…`), unique within your organization — upsert on it. Do not parse it: its inner format is not part of the contract. |
| `supporter_id` | integer | yes |  |
| `occurred_at` | string (date-time) | yes | When the submission started. |
| `action_type` | `email_legislator`, `email_committee`, `email_governor`, `email_custom`, `signup`, `pledge` | yes |  |
| `delivery_method` | string or null | yes | oauth_google \| oauth_microsoft \| mailto when an email was sent; cwc \| scwc when the platform delivered the letter to a congressional office through the House or Senate delivery API; webform for a legislature contact form; webform_manual when the supporter pasted the letter into an official’s own web form (self-attested, like mailto). |
| `message_source` | string or null | yes | suggested \| ai_generated \| edited. |
| `subject` | string or null | yes | The message subject. Bodies are never available through this API. |
| `recipient_count` | integer | yes |  |
| `recipients` | array of ActionRecipient | yes |  |
| `bill` | ActionBill or null | yes | Null for an action on an issue page (a call to action with no bill); `issues` is then empty and `imputed_position` is `unknown` with basis `none`. |
| `issues` | array of ActionIssue | yes |  |
| `imputed_position` | ImputedPosition | yes |  |
| `campaign` | BillCampaign or null | yes |  |
| `action_page` | BillActionPage or null | yes |  |
| `attributed_alert_id` | integer or null | yes | The alert whose emailed link led here, when known. |
| `attribution` | ActionAttribution | yes |  |
| `updated_at` | string (date-time) | yes | When any recipient of the submission last changed — the `updated_since` watermark. Equals the submission time until a delivery settles. |

## BillSession

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes | LegiScan session id. |
| `name` | string or null | yes | e.g. "114th General Assembly", "2026 First Special Session". |
| `special` | boolean | yes | A special (extraordinary) session. |
| `year_start` | integer or null | yes |  |
| `year_end` | integer or null | yes |  |

## BillSummary

A bill as every org-data endpoint presents it. `GET /bills/{billId}` adds sponsors, documents and more.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes | LegiScan bill id — the `{billId}` of `GET /bills/{billId}` and the `ls_bill_id` in `/actions`. |
| `state` | string | yes | Two-letter jurisdiction: a state, `DC`, or `US` for Congress. |
| `jurisdiction` | string or null | yes | Display name: "Tennessee", "U.S. Congress". |
| `session` | BillSession | yes |  |
| `bill_number` | string | yes | As the legislature numbers it, e.g. "HB0123", "SB 5". |
| `title` | string or null | yes | The statutory caption ("AN ACT to amend…"). Display short_summary instead. |
| `short_summary` | string or null | yes | One-sentence AI summary (20 words max, verb-first) — the caption to show people. |
| `chamber` | `house`, `senate` or null | yes | The chamber the bill was filed in (lower = `house`, upper = `senate`), from the legislature’s own record — never the number prefix. |
| `chamber_name` | string or null | yes | What that chamber is called in the state: "House", "Assembly", "House of Delegates", "Senate", "Legislature". |
| `current_chamber` | `house`, `senate` or null | yes | The chamber the bill sits in now. |
| `current_chamber_name` | string or null | yes |  |
| `status` | string or null | yes | Latest progress step: "Introduced", "Engrossed", "Passed", "Vetoed"… A chamber passage the source has not stamped yet is already counted. |
| `status_event_id` | integer or null | yes | LegiScan progress event id of `status` (1 Introduced, 2 Engrossed, 3 Enrolled, 4 Passed, 5 Vetoed, 6 Failed, …). |
| `last_action_date` | string or null | yes | YYYY-MM-DD of the most recent history entry. |
| `state_url` | string or null | yes | The legislature’s own page for the bill. Never a LegiScan page. |
| `public_url` | string or null | yes | Your organization website’s page for the bill — only while you show the bill on your website, else null. |

## PortfolioRef

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes |  |
| `name` | string | yes |  |

## TrackedPosition

Your organization’s tracked position on a bill.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `stance` | `support`, `oppose`, `amend`, `neutral`, `monitor` | yes | Your organization’s position: `support` (Support), `oppose` (Oppose), `amend` (Amend), `neutral` (Neutral), `monitor` (No position). `amend` means support if amended; `monitor` is tracked with no position. |
| `stance_label` | string | yes | The label your staff see for `stance`. |
| `priority` | `priority`, `high`, `normal`, `low`, `none` | yes | Highest first. `none` is no priority set. |
| `priority_label` | string or null | yes | The label your staff see: Priority, High, Normal, Low; null for `none`. |
| `position_statement` | string or null | yes | The public statement your organization wrote for the bill (website, reports). Internal notes are never exposed. |
| `show_on_website` | boolean | yes | Whether the bill is on your organization’s website. |
| `published_at` | string (date-time) or null | yes | When it was last put on the website. |
| `tracked_at` | string (date-time) | yes | When the bill was added to your tracked list. |
| `updated_at` | string (date-time) | yes | When stance, priority, statement or the website flag last changed. |
| `portfolios` | array of PortfolioRef | yes | SHARED Issue Portfolios holding the bill. Private portfolios never appear. |

## TrackedBill

One bill on your organization’s tracked list, with your position on it.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `bill_id` | integer | yes | LegiScan bill id. |
| `stance` | `support`, `oppose`, `amend`, `neutral`, `monitor` | yes | See TrackedPosition.stance. |
| `stance_label` | string | yes |  |
| `priority` | `priority`, `high`, `normal`, `low`, `none` | yes |  |
| `priority_label` | string or null | yes |  |
| `position_statement` | string or null | yes | Public statement. Internal notes are never exposed. |
| `show_on_website` | boolean | yes |  |
| `published_at` | string (date-time) or null | yes |  |
| `tracked_at` | string (date-time) | yes |  |
| `updated_at` | string (date-time) | yes | The `updated_since` watermark: moves when stance, priority, statement or the website flag change. Portfolio membership and the bill’s own progress do not move it. |
| `portfolios` | array of PortfolioRef | yes | SHARED Issue Portfolios holding the bill. Private portfolios never appear. |
| `bill` | BillSummary | yes |  |

## Portfolio

A SHARED Issue Portfolio — a named set of bills. Portfolios hold no stance: the position is the tracked bill’s. Private portfolios are never exposed.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes |  |
| `name` | string | yes |  |
| `slug` | string | yes |  |
| `description` | string or null | yes |  |
| `color` | string or null | yes |  |
| `icon` | string or null | yes |  |
| `priority` | string | yes | The portfolio’s own priority: `low`, `normal`, `high` or `urgent`. |
| `tags` | array of string | yes |  |
| `status` | `active`, `archived` | yes |  |
| `bill_count` | integer | yes |  |
| `created_at` | string (date-time) | yes |  |
| `updated_at` | string (date-time) | yes |  |

## PortfolioDetail

A shared portfolio with its bills.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes |  |
| `name` | string | yes |  |
| `slug` | string | yes |  |
| `description` | string or null | yes |  |
| `color` | string or null | yes |  |
| `icon` | string or null | yes |  |
| `priority` | string | yes |  |
| `tags` | array of string | yes |  |
| `status` | `active`, `archived` | yes |  |
| `bill_count` | integer | yes |  |
| `created_at` | string (date-time) | yes |  |
| `updated_at` | string (date-time) | yes |  |
| `bill_ids` | array of integer | yes | LegiScan bill ids in the portfolio, in the portfolio’s order. |

## AssetBill

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `bill_id` | integer | yes | LegiScan bill id. |
| `bill_number` | string | yes |  |
| `state` | string | yes | Two-letter jurisdiction (`US` for Congress). |
| `title` | string or null | yes | The statutory caption. Display short_summary instead. |
| `short_summary` | string or null | yes |  |
| `campaign_stance` | `support`, `oppose`, `neutral`, `watch` or null | yes | The campaign’s stance on this bill, as stored (`watch`: no ask yet). Null when the campaign names none. |

## Campaign

An organization campaign. Archived campaigns stay listed with `status: archived`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes |  |
| `title` | string | yes |  |
| `description` | string or null | yes |  |
| `status` | `draft`, `active`, `paused`, `completed`, `archived` | yes |  |
| `kind` | `bill`, `issue` | yes | `bill` when the campaign or any of its action pages names a bill; otherwise `issue`. |
| `portfolio_id` | integer or null | yes | The shared portfolio the campaign belongs to; null when none (or not shared). |
| `current_round` | integer or null | yes | The highest letter round among its live (not archived) action pages; null with none. |
| `bills` | array of AssetBill | yes | The campaign’s bills with its stance on each. |
| `action_page_ids` | array of integer | yes | Every action page of the campaign, archived ones included. |
| `created_at` | string (date-time) | yes |  |
| `launched_at` | string (date-time) or null | yes | When its first action page was published. |
| `updated_at` | string (date-time) | yes |  |

## ActionPage

An action page. Drafts and archived pages are listed with their status.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes | The `action_page.id` in `/actions`. |
| `campaign_id` | integer | yes |  |
| `slug` | string | yes |  |
| `title` | string | yes |  |
| `status` | `draft`, `published`, `unpublished`, `archived` | yes | `draft` (never published), `published` (live), `unpublished` (taken offline), `archived` (removed after supporters acted on it — kept, with its letters, for your records). |
| `kind` | `bill`, `issue` | yes | `issue` for a call to action with no bill. |
| `stance` | `support`, `oppose`, `neutral` or null | yes | The page’s own stance; a campaign stance on a bill (`bills[].campaign_stance`) takes precedence for that bill. |
| `issue_ask` | string or null | yes | An issue page’s ask, shown on the page. Null on bill pages. |
| `target_type` | string | yes | Who letters go to: `legislators`, `committee`, `governor`, `custom`. |
| `letter_round` | integer | yes | The current round; staff can re-open a page for another round of letters. |
| `bills` | array of AssetBill | yes |  |
| `url` | string or null | yes | The live page on your organization’s site — only while `published`. |
| `share_url` | string or null | yes | The address the page’s share buttons use. |
| `view_count` | integer | yes |  |
| `submission_count` | integer | yes | Distinct submissions through the page (a 12-recipient letter counts once), deleted accounts excluded — what `/actions` lists. |
| `last_submission_at` | string (date-time) or null | yes |  |
| `published_at` | string (date-time) or null | yes |  |
| `unpublished_at` | string (date-time) or null | yes |  |
| `archived_at` | string (date-time) or null | yes | When it was archived; null unless `archived`. |
| `created_at` | string (date-time) | yes |  |
| `updated_at` | string (date-time) | yes |  |

## Sponsor

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `legislator_id` | integer | yes | LegiScan people_id — the `{legislatorId}` of `GET /legislators/{legislatorId}` (a committee is not a legislator). |
| `name` | string | yes |  |
| `party` | string or null | yes |  |
| `district` | string or null | yes | As LegiScan stores it, e.g. "HD-012A". |
| `district_label` | string or null | yes | As the state writes it, e.g. "AD 66", "HD 5". |
| `is_committee` | boolean | yes | A committee filed the bill. |

## SponsorGroup

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | string | yes | Stable key, e.g. "author", "coauthors_origin", "committee". |
| `label` | string | yes | The state’s own role name: "Sponsor", "Joint Authors", "Coauthors (Senate)". |
| `lead` | boolean | yes | The group holding the lead sponsor. |
| `cosponsor` | boolean | yes | Supporting names (co-sponsors, coauthors). |
| `from_bill` | object or null | yes | Set when the group comes from the companion bill (Tennessee: the Senate sponsor files SB1031). |
| `members` | array of Sponsor | yes |  |

## BillDocument

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Opaque document id. |
| `type` | `bill_text`, `amendment`, `fiscal_note`, `supplement` | yes |  |
| `label` | string or null | yes | e.g. "Introduced", "Amendment 1 to HB0123", "Fiscal Note". |
| `date` | string or null | yes | YYYY-MM-DD. |
| `amendment_status` | `adopted`, `withdrawn`, `pending` or null | yes | Amendments only. |
| `chaptered` | boolean | yes | The enacted (chaptered) text. |
| `mime_type` | string or null | yes |  |
| `link` | object or null | yes | The original document. Never a LegiScan page. |

## Bill

One bill, in full.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes | LegiScan bill id — the `{billId}` of `GET /bills/{billId}` and the `ls_bill_id` in `/actions`. |
| `state` | string | yes | Two-letter jurisdiction: a state, `DC`, or `US` for Congress. |
| `jurisdiction` | string or null | yes | Display name: "Tennessee", "U.S. Congress". |
| `session` | BillSession | yes |  |
| `bill_number` | string | yes | As the legislature numbers it, e.g. "HB0123", "SB 5". |
| `title` | string or null | yes | The statutory caption ("AN ACT to amend…"). Display short_summary instead. |
| `short_summary` | string or null | yes | One-sentence AI summary (20 words max, verb-first) — the caption to show people. |
| `chamber` | `house`, `senate` or null | yes | The chamber the bill was filed in (lower = `house`, upper = `senate`), from the legislature’s own record — never the number prefix. |
| `chamber_name` | string or null | yes | What that chamber is called in the state: "House", "Assembly", "House of Delegates", "Senate", "Legislature". |
| `current_chamber` | `house`, `senate` or null | yes | The chamber the bill sits in now. |
| `current_chamber_name` | string or null | yes |  |
| `status` | string or null | yes | Latest progress step: "Introduced", "Engrossed", "Passed", "Vetoed"… A chamber passage the source has not stamped yet is already counted. |
| `status_event_id` | integer or null | yes | LegiScan progress event id of `status` (1 Introduced, 2 Engrossed, 3 Enrolled, 4 Passed, 5 Vetoed, 6 Failed, …). |
| `last_action_date` | string or null | yes | YYYY-MM-DD of the most recent history entry. |
| `state_url` | string or null | yes | The legislature’s own page for the bill. Never a LegiScan page. |
| `public_url` | string or null | yes | Your organization website’s page for the bill — only while you show the bill on your website, else null. |
| `latest_action` | object or null | yes |  |
| `placeholder` | object or null | yes | Set when the bill was filed as a placeholder (caption / shell bill) to be rewritten by amendment, or was replaced outright — only in states where the practice is verified. `possible` is a structural maybe. |
| `sponsors` | object | yes |  |
| `sponsors.primary` | Sponsor or null | yes | The lead sponsor by the state’s rules. |
| `sponsors.groups` | array of SponsorGroup | yes | Every sponsor under the state’s role names, the lead’s group first. |
| `documents` | array of BillDocument | yes | Texts, amendments, fiscal notes and other supplements. |
| `tracked` | TrackedPosition or null | yes | Your organization’s position, when the bill is on your tracked list and the key has `org_data:read`; null otherwise (also for a key without that scope). |

## LegislatorCommittee

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes |  |
| `name` | string | yes |  |
| `role` | string or null | yes | e.g. "Chair", "Member". |
| `chamber` | string or null | yes |  |
| `kind` | string or null | yes | joint \| interim \| special \| select \| subcommittee …, when known. |

## Legislator

A legislator. Committees LegiScan lists as sponsors are never returned here.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes | LegiScan people_id. |
| `name` | string | yes |  |
| `first_name` | string or null | yes |  |
| `last_name` | string or null | yes |  |
| `party` | string or null | yes | Abbreviation, e.g. "R", "D". |
| `state` | string | yes | The legislature: a state, `DC`, or `US` for a member of Congress. |
| `jurisdiction` | string or null | yes | "Tennessee", "U.S. Congress". |
| `represents_state` | string | yes | The state the member represents (for a member of Congress, their home state). |
| `chamber` | `house`, `senate` or null | yes | `house` (lower) or `senate` (upper). |
| `chamber_name` | string or null | yes | What the chamber is called in the state. |
| `title` | string or null | yes | The state’s title: "Representative", "Assemblymember", "Delegate", "Senator". |
| `district` | string or null | yes | As LegiScan stores it ("HD-012A", "SD-CHI", "HD-TN-5"). |
| `district_label` | string or null | yes | As the state writes it. |
| `email` | string or null | yes | The address a letter goes to; null when the member has no usable address. |
| `phone` | string or null | yes | Capitol office. |
| `district_phone` | string or null | yes |  |
| `website` | string or null | yes |  |
| `photo_url` | string or null | yes |  |
| `service_status` | `active`, `former` | yes | `former`: no longer in office — still answerable, for history. |
| `former_reason` | string or null | yes |  |
| `left_office_on` | string or null | yes | YYYY-MM-DD. |
| `committees` | array of LegislatorCommittee | yes | Current committee seats. |

## LookupResult

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | yes | The address as you sent it. |
| `matched` | boolean | yes |  |
| `supporters` | array of Supporter | yes | An ARRAY: two case-variant spellings of one address can be two people. |

## MatchEntry

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | yes |  |
| `supporters` | array of Supporter | yes |  |

## MatchResult

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `matched` | array of MatchEntry | yes |  |
| `unmatched` | array of string | yes |  |

## DictionaryIssue

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes |  |
| `slug` | string | yes |  |
| `name` | string | yes |  |
| `sort_order` | integer | yes |  |
| `bill_count` | integer | yes | Bills currently carrying this issue. |

## DictionaryPolicyIssue

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `slug` | string | yes |  |
| `label` | string | yes |  |
| `domain_key` | string or null | yes |  |
| `sort_order` | integer | yes |  |
| `parent_slug` | string or null | yes | Parent issue in the hierarchy, null at the top level. |
| `bill_count` | integer | yes |  |

## IssueDictionary

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `issues` | array of DictionaryIssue | yes |  |
| `policy_issues` | array of DictionaryPolicyIssue | yes |  |

## Whoami

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `api_version` | string | yes |  |
| `organization` | object | yes |  |
| `organization.id` | integer | yes |  |
| `organization.name` | string | yes |  |
| `organization.slug` | string | yes |  |
| `is_test` | boolean | yes | A platform test organization: its supporters and actions are synthetic. Point a staging CRM at it. |
| `api_key` | object | yes |  |
| `api_key.id` | string | yes |  |
| `api_key.name` | string | yes |  |
| `api_key.display_hint` | string or null | yes | The key’s last six characters. |
| `api_key.scopes` | array of string | yes |  |
| `api_key.created_at` | string (date-time) or null | yes |  |
| `api_key.expires_at` | string (date-time) or null | yes |  |
| `counts` | object | yes |  |
| `counts.supporters` | integer | yes |  |
| `counts.supporters_active` | integer | yes |  |
| `counts.actions_last_30d` | integer | yes |  |
| `rate_limits` | object | yes |  |
| `rate_limits.read_per_minute` | integer | yes |  |
| `rate_limits.lookup_per_minute` | integer | yes |  |
| `rate_limits.org_total_per_minute` | integer | yes |  |
| `webhooks` | object | yes |  |
| `webhooks.active_endpoints` | integer | yes |  |
| `webhooks.event_types` | array of string | yes |  |

## RegisteredEndpoint

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes |  |
| `url` | string | yes |  |
| `description` | string or null | yes |  |
| `event_types` | array of string | yes |  |
| `is_active` | boolean | yes |  |
| `secret_hint` | string | yes | The signing secret’s last six characters. |
| `disabled_reason` | string or null | yes | Why the platform disabled it, when it did. |
| `created_at` | string (date-time) | yes |  |
| `registered_by_this_key` | boolean | yes | Whether the presenting key created this endpoint — the one it may delete. |

## WebhookRegistration

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes |  |
| `url` | string | yes |  |
| `event_types` | array of string | yes |  |
| `secret` | string | yes | The signing secret — returned exactly once per secret. Store it now; it signs every delivery, the verification ping included. |
| `secret_hint` | string | yes |  |
| `verification` | object | yes |  |
| `verification.ping_delivery_id` | integer | yes | The signed ping already on its way to the new endpoint. |
| `verification.enqueued` | boolean | yes | False only if the delivery queue was briefly unavailable; the endpoint still exists. |

## WebhookEnvelope

The body of every webhook POST.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Event uid — your idempotency key. You may receive an event twice. |
| `type` | `supporter.created`, `supporter.updated`, `supporter.deleted`, `supporter.action.completed`, `supporter.unsubscribed`, `action.updated`, `ping` | yes | The event type (the same value as the `X-CS-Event` header). `ping` is only ever pushed, never replayed. |
| `api_version` | string | yes |  |
| `created_at` | string (date-time) | yes |  |
| `organization` | object | yes |  |
| `organization.id` | integer | yes |  |
| `organization.slug` | string or null | yes |  |
| `data` | object | yes | `supporter` on every event (a tombstone on supporter.deleted); `action` additionally on supporter.action.completed and action.updated; `message` on ping. |
| `data.supporter` | Supporter or SupporterTombstone | no |  |
| `data.action` | Action | no |  |
| `data.message` | string | no |  |

## SupporterCreatedEvent

The body of a `supporter.created` delivery.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Event uid — dedupe on it. The same id in `GET /events`. |
| `type` | string | yes | Always this event type. |
| `api_version` | string | yes |  |
| `created_at` | string (date-time) | yes | When the event occurred. |
| `organization` | object | yes |  |
| `organization.id` | integer | yes |  |
| `organization.slug` | string or null | yes |  |
| `data` | object | yes |  |
| `data.supporter` | Supporter | yes |  |

## SupporterUpdatedEvent

The body of a `supporter.updated` delivery.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Event uid — dedupe on it. The same id in `GET /events`. |
| `type` | string | yes | Always this event type. |
| `api_version` | string | yes |  |
| `created_at` | string (date-time) | yes | When the event occurred. |
| `organization` | object | yes |  |
| `organization.id` | integer | yes |  |
| `organization.slug` | string or null | yes |  |
| `data` | object | yes |  |
| `data.supporter` | Supporter | yes |  |

## SupporterDeletedEvent

The body of a `supporter.deleted` delivery.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Event uid — dedupe on it. The same id in `GET /events`. |
| `type` | string | yes | Always this event type. |
| `api_version` | string | yes |  |
| `created_at` | string (date-time) | yes | When the event occurred. |
| `organization` | object | yes |  |
| `organization.id` | integer | yes |  |
| `organization.slug` | string or null | yes |  |
| `data` | object | yes |  |
| `data.supporter` | SupporterTombstone | yes |  |

## SupporterActionCompletedEvent

The body of a `supporter.action.completed` delivery.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Event uid — dedupe on it. The same id in `GET /events`. |
| `type` | string | yes | Always this event type. |
| `api_version` | string | yes |  |
| `created_at` | string (date-time) | yes | When the event occurred. |
| `organization` | object | yes |  |
| `organization.id` | integer | yes |  |
| `organization.slug` | string or null | yes |  |
| `data` | object | yes |  |
| `data.supporter` | Supporter | yes |  |
| `data.action` | Action | yes |  |

## SupporterUnsubscribedEvent

The body of a `supporter.unsubscribed` delivery.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Event uid — dedupe on it. The same id in `GET /events`. |
| `type` | string | yes | Always this event type. |
| `api_version` | string | yes |  |
| `created_at` | string (date-time) | yes | When the event occurred. |
| `organization` | object | yes |  |
| `organization.id` | integer | yes |  |
| `organization.slug` | string or null | yes |  |
| `data` | object | yes |  |
| `data.supporter` | Supporter | yes |  |

## ActionUpdatedEvent

The body of a `action.updated` delivery.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Event uid — dedupe on it. The same id in `GET /events`. |
| `type` | string | yes | Always this event type. |
| `api_version` | string | yes |  |
| `created_at` | string (date-time) | yes | When the event occurred. |
| `organization` | object | yes |  |
| `organization.id` | integer | yes |  |
| `organization.slug` | string or null | yes |  |
| `data` | object | yes |  |
| `data.supporter` | Supporter | yes |  |
| `data.action` | Action | yes |  |

## PingEvent

The body of a `ping` delivery.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Delivery-unique id (`ping-…`); pings are never journaled. |
| `type` | string | yes | Always this event type. |
| `api_version` | string | yes |  |
| `created_at` | string (date-time) | yes | When the event occurred. |
| `organization` | object | yes |  |
| `organization.id` | integer | yes |  |
| `organization.slug` | string or null | yes |  |
| `data` | object | yes |  |
| `data.message` | string | yes | A human-readable note. Nothing to process. |
