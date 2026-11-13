# Bila UiTM Cuti MCP server

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version 1.0.2](https://img.shields.io/badge/version-1.0.2-blue)](package.json)
![Remote MCP, no authentication](https://img.shields.io/badge/MCP-remote_%7C_no_auth-2ea44f)

A hosted [Model Context Protocol](https://modelcontextprotocol.io) server for the UiTM academic calendar and Malaysia public holidays. It is read-only and public. Point a client at the URL. No API key, no account.

**URL:** `https://mcp.bilauitmcuti.com/mcp` (Streamable HTTP)

Docs: [docs.bilauitmcuti.com/mcp-server](https://docs.bilauitmcuti.com/mcp-server)

You can ask it:

- Which sessions and programs are published, and when lectures, breaks, registration, and exams fall
- Whether a date is a class day, a break, an exam week, or a study week
- Week 1–14 dates for one session
- Malaysia public holidays for a year, nationwide or for one state

The data is unofficial and not affiliated with UiTM. Check any date that matters before you rely on it.

---

## Connect

Point a remote MCP client at `https://mcp.bilauitmcuti.com/mcp`. Leave authentication empty.

```json
{
  "mcpServers": {
    "bilauitmcuti": {
      "url": "https://mcp.bilauitmcuti.com/mcp"
    }
  }
}
```

### Cursor

Save as `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global). Turn the server on under **Cursor Settings → MCP**, then restart Cursor.

```json
{
  "mcpServers": {
    "bilauitmcuti": {
      "url": "https://mcp.bilauitmcuti.com/mcp"
    }
  }
}
```

### Claude Code

```bash
claude mcp add --transport http bilauitmcuti https://mcp.bilauitmcuti.com/mcp
```

Or in `.mcp.json`:

```json
{
  "mcpServers": {
    "bilauitmcuti": {
      "type": "http",
      "url": "https://mcp.bilauitmcuti.com/mcp"
    }
  }
}
```

### VS Code (GitHub Copilot)

`.vscode/mcp.json`:

```json
{
  "servers": {
    "bilauitmcuti": {
      "type": "http",
      "url": "https://mcp.bilauitmcuti.com/mcp"
    }
  }
}
```

### Codex

```bash
codex mcp add bilauitmcuti --url https://mcp.bilauitmcuti.com/mcp
```

Or in `~/.codex/config.toml`:

```toml
[mcp_servers.bilauitmcuti]
url = "https://mcp.bilauitmcuti.com/mcp"
```

### OpenCode

```bash
opencode mcp add bilauitmcuti --url https://mcp.bilauitmcuti.com/mcp
```

Or in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "bilauitmcuti": {
      "type": "remote",
      "url": "https://mcp.bilauitmcuti.com/mcp",
      "enabled": true
    }
  }
}
```

### Connect in chat (Claude, Grok, Grok Bot)

Use a custom connector and choose **None** for authentication.

- **Claude:** Settings → Connectors → **Add custom connector**. Name `Bila UiTM Cuti`, URL `https://mcp.bilauitmcuti.com/mcp`, leave OAuth empty, then turn it on in chat. See [Claude — remote MCP connectors](https://support.anthropic.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).
- **Grok:** [grok.com/connectors](https://grok.com/connectors) → **New Connector** → **Custom**, paste the URL. See [xAI Connectors](https://docs.x.ai/grok/connectors).
- **Grok Bot (Cursor's cloud agent):** in chat, say `Add this MCP server: https://mcp.bilauitmcuti.com/mcp`, then confirm. See [Grok Bot — Connect an app](https://docs.x.ai/grok-bot/computer-and-apps).

### Clients without remote MCP

A client that only speaks stdio can proxy the hosted server with [`mcp-remote`](https://www.npmjs.com/package/mcp-remote):

```bash
npx mcp-remote https://mcp.bilauitmcuti.com/mcp
```

```json
{
  "mcpServers": {
    "bilauitmcuti": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.bilauitmcuti.com/mcp"]
    }
  }
}
```

### Agent workflow

When a client connects to this URL, it gets the server instructions: which tool to call, that a session id has to come from `get_academic_meta`, and how to phrase the answer. That text is on the host only after the next deploy. Until then, a connected client still gets the shorter instructions.

`plugin/bila-uitm-cuti` is the optional Claude install of the same workflow. Zip that folder and upload it under Customize → Plugins, or from this repo run `claude --plugin-dir plugin/bila-uitm-cuti`. Other clients do not need the plugin.

---

## Tools

Six tools. Each one is read-only. A successful call returns indented JSON text. A non-array object is also `structuredContent`. Any other payload is wrapped as `{ "result": ... }`.

Call `get_academic_meta` before a calendar or lecture-week tool when you need a session id. Call `get_public_holiday_meta` before a holiday tool when you need a published year or state. Session ids change each term.

Omitted optional fields are not sent.

### Allowed values

| Name | Values |
| --- | --- |
| `group` | `A`, `B` |
| `program` | `All`, `PreDiploma`, `Diploma`, `DiplomaPartTime`, `Bachelor`, `BachelorPartTime`, `Master`, `PhD` |
| `type` | `lecture`, `break`, `examination`, `registration`, `other` |
| `coverage` | `all` (every holiday), `nationwide` (federal only) |
| `state` | `johor`, `kedah`, `kelantan`, `melaka`, `negeri-sembilan`, `pahang`, `perak`, `perlis`, `pulau-pinang`, `sabah`, `sarawak`, `selangor`, `terengganu`, `kuala-lumpur`, `labuan`, `putrajaya` |
| `date` | `YYYY-MM-DD` (pattern `^\d{4}-\d{2}-\d{2}$`) |
| `year` | Integer from 2000 to 2100 |
| `limit` | Integer from 1 to 500 |

`program` is mainly a Group B filter. `state` is ignored when `coverage` is `all`.

### Large results

`get_calendar` and `get_public_holidays` take `limit` and `compact`. This server trims the reply with those arguments before it sends it back.

| Tool | Arrays trimmed |
| --- | --- |
| `get_calendar` | `activities`, `sessions`, `data` |
| `get_public_holidays` | `holidays`, `data`, `items` |

- `limit` keeps that many items from each of those arrays.
- `compact: true` drops `description`, `notes`, and `detail` from each object row. Other rows stay as they are.
- When `limit` is set and an array is longer than `limit`, the result also includes `truncated: true`, `returned` (items kept), and `total` (length before the slice).
- If more than one of those arrays is longer than `limit`, `returned` and `total` come from the last trimmed array, in the order listed above.
- `compact` on its own does not add `truncated`, `returned`, or `total`.

### `get_academic_meta`

Lists sessions and programs. Call this first when you need a session id.

Upstream: `GET /api/v1/meta` on `https://api.bilauitmcuti.com`.

| Parameter | Required | Notes |
| --- | --- | --- |
| `group` | no | `A` or `B`. Leave it out and the field is not sent. The parameter description says that uses the default group. |
| `all` | no | Boolean. `true` returns sessions and programs for every group. |

Ask: "What UiTM sessions and programs are published for every group?"

### `get_calendar`

Lectures, breaks, exams, registration, and other activities for a session or group. Prefer one session from `get_academic_meta`. Use `limit` and `compact` when the reply is large.

Upstream: `GET /api/v1/calendar`.

| Parameter | Required | Notes |
| --- | --- | --- |
| `session` | no | Session id from `get_academic_meta` (`sessionOptions`). The published set changes each term. |
| `group` | no | `A` or `B`. |
| `program` | no | See allowed values. Mainly Group B. |
| `type` | no | See allowed values. |
| `allSessions` | no | Boolean. `true` includes every session in the selected group. |
| `all` | no | Boolean. `true` returns the full calendar dataset (large). Prefer a specific session. |
| `limit` | no | Integer from 1 to 500. |
| `compact` | no | Boolean. See [Large results](#large-results). |

Ask: "List lecture activities for the current Group B session, and keep the list short."

### `get_today_status`

Says whether a date is a class day, a break, an exam week, or a study week. `group` is required. Leave `date` out to use today.

Upstream: `GET /api/v1/today`.

| Parameter | Required | Notes |
| --- | --- | --- |
| `group` | yes | `A` or `B`. |
| `date` | no | `YYYY-MM-DD`. Leave it out and the field is not sent. The parameter description says that means today. |
| `session` | no | Session id from `get_academic_meta`. The published set changes each term. |
| `program` | no | See allowed values. Mainly Group B. |

Ask: "Is 2026-03-09 a class day for Group B Diploma?"

### `get_lecture_weeks`

Week 1–14 start and end dates for one session.

Upstream: `GET /api/v1/lecture-weeks`.

| Parameter | Required | Notes |
| --- | --- | --- |
| `session` | yes | Session id from `get_academic_meta`. The published set changes each term. |

Ask: "When does lecture week 1 start for this session?"

### `get_public_holiday_meta`

Years, coverage options, and Malaysia state slugs for holiday queries. No parameters.

Upstream: `GET /api/v1/public-holiday/meta`.

Ask: "Which years and states can I use for Malaysia public holidays?"

### `get_public_holidays`

Public holidays for a year, nationwide or for one state. Use `limit` and `compact` when the reply is large.

Upstream: `GET /api/v1/public-holiday`.

| Parameter | Required | Notes |
| --- | --- | --- |
| `year` | no | Integer from 2000 to 2100. Take published years from `get_public_holiday_meta` (`yearOptions`). |
| `coverage` | no | `all` or `nationwide`. |
| `state` | no | State slug. Ignored when `coverage` is `all`. |
| `limit` | no | Integer from 1 to 500. |
| `compact` | no | Boolean. See [Large results](#large-results). |

Ask: "List public holidays in Selangor for 2026."

### Errors

A failed call comes back as an error result. The text is the message, plus `detail` and `Retry-After` seconds when the upstream API sent them. An API error's `structuredContent` includes `error`, `detail`, `status`, and `retryAfter`.

---

## Example questions

Session ids in the examples go stale. Take the current id from `get_academic_meta`.

- What UiTM sessions are available for Group A?
- When does lecture week 1 start for session B-20264?
- Is 2026-03-09 a class day for Group B Diploma?
- Which exam activities are on the calendar for that session?
- List Malaysia public holidays in Selangor for 2026.
- Which of those holidays are nationwide?

---

## Data

Each call reads calendar and holiday data from [`https://api.bilauitmcuti.com`](https://api.bilauitmcuti.com) (`GET /api/v1/...`).

The project is unofficial and not affiliated with UiTM. The published session list changes each term, so get the session id from `get_academic_meta` instead of reusing an old one. Check any date that matters before you rely on it.

---

## Privacy

No authentication and no user accounts. Tool arguments are sent on as query parameters to the public API.

This server logs:

- Each request: HTTP method, JSON-RPC method, status, and elapsed time
- Each tool call: tool name and elapsed time; on failure, the upstream status
- A rate-limit rejection: the path and the first 12 characters of the client address

The client address is `cf-connecting-ip`, otherwise the first `X-Forwarded-For` value, otherwise `anonymous`. The full address is the rate-limit key. Only the rate-limit log line stores the 12-character prefix.

- [Privacy](https://docs.bilauitmcuti.com/mcp-server/privacy)
- [Terms](https://docs.bilauitmcuti.com/mcp-server/terms)

---

## Rate limit

`/mcp` shares the public API limits: **500 requests per 60-second window per client IP** (the key also includes the path), plus a heavy bucket for full-dataset queries. See [Rate limits](https://docs.bilauitmcuti.com/getting-started#rate-limits). `GET /mcp/health` is not limited. Uptime monitors should use it and expect `200`.

Allowed responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`. A `429` response also includes `Retry-After` (seconds until the window resets). Wait that long, then try again.

---

## Check the connection

Health check (not rate limited):

```bash
curl -sS 'https://mcp.bilauitmcuti.com/mcp/health'
```

```json
{"status":"ok","name":"bilauitmcuti","version":"1.0.2"}
```

That body is what `GET /mcp/health` returned from the hosted server. `name` and `version` come from this server (`bilauitmcuti`, `1.0.2`).

List tools:

```bash
curl -sS -X POST 'https://mcp.bilauitmcuti.com/mcp' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Or open the hosted URL in the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector https://mcp.bilauitmcuti.com/mcp
```

---

## Troubleshooting

| What you see | What to do |
| --- | --- |
| Tools don't show up | Remove the existing `bilauitmcuti` server or connector, add it again with `https://mcp.bilauitmcuti.com/mcp`, then restart the client and refresh the tools list. |
| Can't connect | Use Streamable HTTP with `type: "http"` where supported, and the exact `https://mcp.bilauitmcuti.com/mcp` URL. |
| Browser open of `/mcp` | MCP calls use `POST`. Use `GET /mcp/health` to check that the host is up. This server returns `405` for methods other than `GET`, `POST`, and `OPTIONS` on `/mcp`. |
| Rate limited (`429`) | Wait for `Retry-After`, then retry. |

---

## Changelog

- **1.0.2** — server instructions and Blue B connector icons; privacy and terms under `/mcp-server/`.
- **1.0.1** — improved tool titles and parameter descriptions.
- **1.0.0** — remote Streamable HTTP server with calendar and public-holiday tools.

---

## Sponsors

This server is free to use. If it helps you, you can support the work:

- [GitHub Sponsors](https://github.com/sponsors/shahrulestar)
- [Sponsor via DuitNow](https://shahrulestar.com/sponsor)

---

## Support and license

Questions: [hello@bilauitmcuti.com](mailto:hello@bilauitmcuti.com)

- [Privacy](https://docs.bilauitmcuti.com/mcp-server/privacy)
- [Terms](https://docs.bilauitmcuti.com/mcp-server/terms)

Licensed under the [MIT License](LICENSE).
