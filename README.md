# Bila UiTM Cuti — MCP Server

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version 1.0.2](https://img.shields.io/badge/version-1.0.2-blue)](package.json)
![Remote MCP, no authentication](https://img.shields.io/badge/MCP-remote_%7C_no_auth-2ea44f)

A hosted [Model Context Protocol](https://modelcontextprotocol.io) server for the **UiTM academic calendar** and **Malaysia public holidays**. It is read-only and public: connect a client to the URL, with no API key and no account.

**URL:** `https://mcp.bilauitmcuti.com/mcp` (Streamable HTTP)

Docs: [docs.bilauitmcuti.com/docs/mcp](https://docs.bilauitmcuti.com/docs/mcp)

It answers:

- Which sessions and programs are published, and when lectures, breaks, registration, and exams fall
- Whether a date is a class day, a break, an exam week, or a study week
- Week 1–14 dates for one session
- Malaysia public holidays for a year, nationwide or for one state

Data is unofficial and not affiliated with UiTM. Verify important dates before you rely on them.

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

`.cursor/mcp.json`:

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

```json
{
  "mcp": {
    "bilauitmcuti": {
      "type": "remote",
      "url": "https://mcp.bilauitmcuti.com/mcp",
      "enabled": true
    }
  }
}
```

### ChatGPT and Claude on the web

Add a custom connector with URL `https://mcp.bilauitmcuti.com/mcp` and no authentication.

- [ChatGPT — custom connectors](https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt-beta)
- [Claude — remote MCP connectors](https://support.anthropic.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)

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

---

## Tools

Six tools. Each one is read-only. A successful call returns indented JSON text. A non-array object is also `structuredContent`. Any other payload is wrapped as `{ "result": ... }`.

Call `get_academic_meta` before calendar or lecture-week tools when you need a session id. Call `get_public_holiday_meta` before holiday tools when you need a published year or state. Session ids change each term.

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

`get_calendar` and `get_public_holidays` accept `limit` and `compact`. Those arguments trim the reply in this server before it is returned.

| Tool | Arrays trimmed |
| --- | --- |
| `get_calendar` | `activities`, `sessions`, `data` |
| `get_public_holidays` | `holidays`, `data`, `items` |

- `limit` slices each of those arrays to that many items.
- `compact: true` removes `description`, `notes`, and `detail` from each object row. Other rows are left as they are.
- When `limit` is set and an array is longer than `limit`, the result also includes `truncated: true`, `returned` (items kept), and `total` (length before the slice).
- If more than one of those arrays is longer than `limit`, `returned` and `total` come from the last trimmed array, in the order listed above.
- `compact` on its own does not add `truncated`, `returned`, or `total`.

### `get_academic_meta`

List sessions and programs. Use this first for session ids.

Upstream: `GET /api/v1/meta` on `https://api.bilauitmcuti.com`.

| Parameter | Required | Notes |
| --- | --- | --- |
| `group` | no | `A` or `B`. Omit it and the field is not sent. The parameter description says that uses the default group. |
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

Whether a date is a class day, a break, an exam week, or a study week. `group` is required. Omit `date` to use today.

Upstream: `GET /api/v1/today`.

| Parameter | Required | Notes |
| --- | --- | --- |
| `group` | yes | `A` or `B`. |
| `date` | no | `YYYY-MM-DD`. Omit it and the field is not sent. The parameter description says that means today. |
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

Public holidays for a year, optionally nationwide or for one state. Use `limit` and `compact` when the reply is large.

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

A failed call is an error result. The text is the message, plus `detail` and `Retry-After` seconds when the upstream API sent them. An API error's `structuredContent` includes `error`, `detail`, `status`, and `retryAfter`.

---

## Example questions

Session ids in examples go stale. Take the current id from `get_academic_meta`.

- What UiTM sessions are available for Group A?
- When does lecture week 1 start for session B-20264?
- Is 2026-03-09 a class day for Group B Diploma?
- Which exam activities are on the calendar for that session?
- List Malaysia public holidays in Selangor for 2026.
- Which of those holidays are nationwide?

---

## Data

Calendar and holiday data is read from [`https://api.bilauitmcuti.com`](https://api.bilauitmcuti.com) (`GET /api/v1/...`) on each call.

The project is unofficial and not affiliated with UiTM. The published session list changes each term, so resolve session ids with `get_academic_meta` instead of reusing an old id. Confirm dates that matter before you rely on them.

---

## Privacy

No authentication and no user accounts. Tool arguments are forwarded as query parameters to the public API.

Logs in this server record:

- Each request: HTTP method, JSON-RPC method, status, and elapsed time
- Each tool call: tool name and elapsed time; on failure, the upstream status
- A rate-limit rejection: the path and the first 12 characters of the client address

The client address is `cf-connecting-ip`, otherwise the first `X-Forwarded-For` value, otherwise `anonymous`. The full address is the rate-limit key. Only the rate-limit log line stores the 12-character prefix.

- [Privacy](https://docs.bilauitmcuti.com/docs/mcp/privacy)
- [Terms](https://docs.bilauitmcuti.com/docs/mcp/terms)

---

## Rate limit

`/mcp` allows **500 requests per 60-second window per client IP** (the key also includes the path). `GET /mcp/health` is not limited.

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
| Tools don't show up | Restart the client and confirm the URL is `https://mcp.bilauitmcuti.com/mcp` with no authentication. |
| Can't connect | Use Streamable HTTP and the `/mcp` path. |
| Browser open of `/mcp` | MCP calls use `POST`. Use `GET /mcp/health` to check that the host is up. This server returns `405` for methods other than `GET`, `POST`, and `OPTIONS` on `/mcp`. |
| Rate limited (`429`) | Wait for `Retry-After`, then retry. |

---

## Sponsors

This server is free to use. If it helps you, you can support the work:

- [GitHub Sponsors](https://github.com/sponsors/shahrulestar)
- [Sponsor via DuitNow](https://shahrulestar.com/sponsor)

---

## Support and license

Questions: [hello@bilauitmcuti.com](mailto:hello@bilauitmcuti.com)

- [Privacy](https://docs.bilauitmcuti.com/docs/mcp/privacy)
- [Terms](https://docs.bilauitmcuti.com/docs/mcp/terms)

Licensed under the [MIT License](LICENSE).
