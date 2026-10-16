# Conservative States agent skills

Agent skills for building on [Conservative States](https://my.conservativestates.app) — the state legislative-tracking and advocacy platform. Install them into Claude Code, Cursor, Codex, GitHub Copilot and other agents that read [Agent Skills](https://skills.sh).

```bash
npx skills add conservative-states/skills
```

or, without GitHub, from our own domain:

```bash
npx skills add https://my.conservativestates.app
```

## Skills

| Skill | What it teaches an agent |
| --- | --- |
| [`conservative-states-api`](skills/conservative-states-api/SKILL.md) | The Partner REST API (`cs_org_` keys) for CRM sync of supporters and advocacy actions, signed webhooks and event replay, and the MCP server for AI assistants. |

## Documentation

- Interactive API reference: https://my.conservativestates.app/developers
- Partner API guide: https://my.conservativestates.app/docs/partner-api
- OpenAPI document: https://my.conservativestates.app/api/partner/v1/openapi.json
- Connect an AI assistant (MCP): https://my.conservativestates.app/docs/mcp

## About this repository

This repository is generated from the Conservative States application source so that every endpoint, limit, event type and tool listed here matches what is deployed. Please open an issue rather than a pull request; changes are made upstream and published here.

Licensed under the [MIT License](LICENSE).
