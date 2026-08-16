# Bila UiTM Cuti — MCP Server

A hosted [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI assistants read the **UiTM academic calendar** and **Malaysia public holidays** in plain language.

It's read-only, sits on top of the public Bila UiTM Cuti API, requires no API key, and can't modify any data.

> Ask things like: *"When does lecture week 1 start for session B-20264?"* or *"List the public holidays in Selangor for 2026."*

---

## Table of contents

- [Quick start](#quick-start)
- [What is MCP?](#what-is-mcp)
- [How it works](#how-it-works)
- [Available tools](#available-tools)
- [Example call](#example-call)
- [Auth & rate limits](#auth--rate-limits)
- [Client setup](#client-setup)
  - [Cursor](#cursor)
  - [Claude Code](#claude-code)
  - [VS Code (GitHub Copilot)](#vs-code-github-copilot)
  - [Codex](#codex)
  - [OpenCode](#opencode)
  - [ChatGPT & Claude (web/mobile)](#chatgpt--claude-webmobile)
- [Verifying the server](#verifying-the-server)
- [Example prompts](#example-prompts)
- [Troubleshooting](#troubleshooting)
- [Changelog](#changelog)
- [Legal](#legal)

---

## Quick start

The server is already hosted — there's nothing to install or run yourself. Point any MCP-compatible client at:

```
https://mcp.bilauitmcuti.com/mcp
```

For clients that use a JSON config (e.g. Cursor), add it like this:

```json
{
  "mcpServers": {
    "bilauitmcuti": {
      "url": "https://mcp.bilauitmcuti.com/mcp"
    }
  }
}
```

---

## What is MCP?

The Model Context Protocol is an open standard for connecting AI assistants to external data sources and tools. Through this server, a connected assistant can look up:

- **Academic calendar** — sessions, activities, breaks, and exam weeks for Groups A and B
- **Lecture weeks** — the 14 teaching weeks of a session
- **Today's status** — what's happening on a given date (class day, break, exam week, etc.)
- **Public holidays** — Malaysia holidays filtered by year, coverage, and state

## How it works

The server runs remotely over the **Streamable HTTP** transport at the `/mcp` endpoint. Your client connects to that URL, and the server translates each MCP tool call into a `GET` request against `/api/v1/*`, returning the result to your assistant. No local process, no installation.

---

## Available tools

| Tool | Endpoint | Description |
|---|---|---|
| `get_academic_meta` | `GET /api/v1/meta` | List UiTM sessions & programs — call this first to get valid session IDs (Group A/B or all). |
| `get_calendar` | `GET /api/v1/calendar` | Get academic calendar activities — lectures, breaks, exams — for a session or group. |
| `get_today_status` | `GET /api/v1/today` | Check whether a date is a class day, break, exam week, or study week (group required). |
| `get_lecture_weeks` | `GET /api/v1/lecture-weeks` | Get lecture week dates (Week 1–14) for one session. |
| `get_public_holiday_meta` | `GET /api/v1/public-holiday/meta` | List public holiday filters — available years, coverage types, and state slugs. |
| `get_public_holidays` | `GET /api/v1/public-holiday` | List Malaysia public holidays by year, coverage, and state. |

Boolean query flags accept real booleans. `get_calendar` and `get_public_holidays` also support `limit` and `compact` params to trim large payloads.

---

## Example call

A typical `tools/call` request sent as the Streamable HTTP POST body:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_today_status",
    "arguments": {
      "group": "B",
      "date": "2026-03-09"
    }
  }
}
```

The response includes both a text block (stringified JSON) and `structuredContent` for clients that prefer typed results.

---

## Auth & rate limits

- **No API key required** — the server is public and read-only; tools only ever issue `GET` requests.
- Calls share the public API's rate limits: **500 requests/minute per IP**, plus a separate, more restrictive bucket for full-dataset queries.
- `GET /mcp/health` is **not** rate limited.

---

## Client setup

Any client that supports a remote (Streamable HTTP) MCP server can connect. Point it at `https://mcp.bilauitmcuti.com/mcp`.

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

From the CLI:

```bash
claude mcp add --transport http bilauitmcuti https://mcp.bilauitmcuti.com/mcp
```

Or commit it to a project via `.mcp.json` (remote servers need `"type": "http"`):

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

> Claude Desktop and Claude web/mobile use **custom connectors** instead of the CLI — see [ChatGPT & Claude (web/mobile)](#chatgpt--claude-webmobile) below.

### VS Code (GitHub Copilot)

`.vscode/mcp.json` uses a `servers` key:

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

From the CLI:

```bash
codex mcp add bilauitmcuti --url https://mcp.bilauitmcuti.com/mcp
```

Or edit `~/.codex/config.toml` directly, then restart Codex:

```toml
[mcp_servers.bilauitmcuti]
url = "https://mcp.bilauitmcuti.com/mcp"
```

### OpenCode

From the CLI:

```bash
opencode mcp add bilauitmcuti --url https://mcp.bilauitmcuti.com/mcp
```

Or add it to `opencode.json` under the `mcp` key:

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

### ChatGPT & Claude (web/mobile)

Both add remote MCP servers as **custom connectors**:

- **ChatGPT**: enable Developer mode under *Settings → Apps & Connectors → Advanced settings*, then create a connector with `https://mcp.bilauitmcuti.com/mcp` and set authentication to **None**. Custom connectors need a paid plan (Plus, Pro, Business, Enterprise, or Edu); on Business/Enterprise/Edu an admin must enable Developer mode first.
- **Claude** (Desktop, web, or mobile):
  1. Go to *Settings → Connectors → Add custom connector*.
  2. Name it `Bila UiTM Cuti`, set the URL to `https://mcp.bilauitmcuti.com/mcp`, leave OAuth empty, and click **Add**.
  3. In chat, enable **Bila UiTM Cuti** under Connectors and start asking about the calendar or holidays.
  4. A connector added on the web also shows up in the mobile apps.

Official setup guides:
- [ChatGPT — Developer mode & custom connectors](https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt-beta)
- [ChatGPT — Connect from ChatGPT (Apps SDK)](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt)
- [Claude — Get started with custom connectors using remote MCP](https://support.anthropic.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
- [MCP — Connect to remote MCP servers](https://modelcontextprotocol.io/docs/2026-07-28/develop/connect-remote-servers) (covers any MCP-compatible client)

---

## Verifying the server

Use the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector):

```bash
npx @modelcontextprotocol/inspector https://mcp.bilauitmcuti.com/mcp
```

Or list available tools directly with `curl` (POST only — a bare `GET /mcp` returns `405`, which is expected):

```bash
curl -s -X POST 'https://mcp.bilauitmcuti.com/mcp' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Uptime monitors (e.g. Better Stack) should target `GET https://mcp.bilauitmcuti.com/mcp/health` and expect `200` — not `GET /mcp`.

---

## Example prompts

Once connected, try asking:

- "When does lecture week 1 start for session B-20264?"
- "Is 2026-03-09 a class day for Group B Diploma?"
- "List Malaysia public holidays in Selangor for 2026."
- "What UiTM sessions are available for Group A?"

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Tools don't show up | Restart the client after changing config, clear any MCP cache, and double-check the URL. |
| Can't connect | Confirm the client is set to Streamable HTTP transport and uses the exact `/mcp` URL. |
| `GET /mcp` returns 405 | Expected — Streamable HTTP requires `POST` (or use the Inspector). |
| Rate limited (429) | Wait the number of seconds given in the `Retry-After` header, then retry. |
| Still stuck | Re-run the [verification steps](#verifying-the-server) with MCP Inspector. |

---

## Changelog

- **1.0.2** — Added server instructions and Blue B connector icons; privacy and terms moved under `/docs/mcp/`.
- **1.0.1** — Improved tool titles and parameter descriptions.
- **1.0.0** — Initial release: remote Streamable HTTP server with calendar and public-holiday tools.

---

## Legal

- [Privacy Policy](https://docs.bilauitmcuti.com/docs/mcp/privacy)
- [Terms of Use](https://docs.bilauitmcuti.com/docs/mcp/terms)
- Contact: hello@bilauitmcuti.com

Full docs: [docs.bilauitmcuti.com/docs/mcp](https://docs.bilauitmcuti.com/docs/mcp)
