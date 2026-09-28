# Bila UiTM Cuti — MCP Server

A hosted [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI assistants read the **UiTM academic calendar** and **Malaysia public holidays**.

It is read-only, needs no API key, and cannot change any data. The data is unofficial and not affiliated with UiTM — verify important dates before you rely on them.

> *"When does lecture week 1 start for session B-20264?"*
> *"List the public holidays in Selangor for 2026."*

**Connect:** `https://mcp.bilauitmcuti.com/mcp`

Docs: [docs.bilauitmcuti.com/docs/mcp](https://docs.bilauitmcuti.com/docs/mcp)

---

## Quick start

```json
{
  "mcpServers": {
    "bilauitmcuti": {
      "url": "https://mcp.bilauitmcuti.com/mcp"
    }
  }
}
```

The server is already hosted. Point any client that supports remote MCP (Streamable HTTP) at that URL.

---

## What you can ask

| Tool | What it does |
| --- | --- |
| `get_academic_meta` | List sessions and programs. Call this first for valid session IDs. |
| `get_calendar` | Lectures, breaks, exams, and other activities for a session or group. |
| `get_today_status` | Whether a date is a class day, break, exam week, or study week. Group is required. |
| `get_lecture_weeks` | Week 1–14 dates for one session. |
| `get_public_holiday_meta` | Years, coverage options, and Malaysia state slugs. |
| `get_public_holidays` | Public holidays by year, coverage, and state. |

`get_calendar` and `get_public_holidays` accept `limit` and `compact` when the result is large.

---

## Client setup

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

---

## Limits

No API key. Tools only read data.

The MCP endpoint allows **500 requests per minute per IP**. `GET /mcp/health` is not limited. A bare `GET /mcp` in a browser returns `405` — clients use `POST`.

If you get `429`, wait the seconds in `Retry-After`, then try again.

---

## Check that it works

```bash
npx @modelcontextprotocol/inspector https://mcp.bilauitmcuti.com/mcp
```

Or list tools:

```bash
curl -s -X POST 'https://mcp.bilauitmcuti.com/mcp' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Try asking:

- When does lecture week 1 start for session B-20264?
- Is 2026-03-09 a class day for Group B Diploma?
- List Malaysia public holidays in Selangor for 2026.
- What UiTM sessions are available for Group A?

---

## Troubleshooting

| What you see | What to do |
| --- | --- |
| Tools don't show up | Restart the client, clear its MCP cache, and confirm the URL. |
| Can't connect | Use Streamable HTTP and the exact `/mcp` URL. |
| `GET /mcp` returns 405 | Expected. Clients send `POST`. |
| Rate limited (429) | Wait for `Retry-After`, then retry. |

---

## Sponsors

This server is free to use. If it helps you, you can support the work:

- [GitHub Sponsors](https://github.com/sponsors/shahrulestar)
- [Sponsor via DuitNow](https://shahrulestar.com/sponsor)

---

## Legal

- [Privacy](https://docs.bilauitmcuti.com/docs/mcp/privacy)
- [Terms](https://docs.bilauitmcuti.com/docs/mcp/terms)
- [hello@bilauitmcuti.com](mailto:hello@bilauitmcuti.com)

Licensed under the [MIT License](LICENSE).
