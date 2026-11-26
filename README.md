# Bila UiTM Cuti MCP server

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version 1.0.2](https://img.shields.io/badge/version-1.0.2-blue)](package.json)
![Remote MCP, Google sign-in](https://img.shields.io/badge/MCP-remote_%7C_Google_sign--in-2ea44f)

A hosted [Model Context Protocol](https://modelcontextprotocol.io) server for the UiTM academic calendar and Malaysia public holidays. It is read-only. Clients sign in with Google before they can call tools.

**URL:** `https://mcp.bilauitmcuti.com/mcp` (Streamable HTTP)

Docs: [docs.bilauitmcuti.com/mcp-server](https://docs.bilauitmcuti.com/mcp-server)

The data is unofficial and not affiliated with UiTM. Check any date that matters before you rely on it.

## What you can ask

- Which sessions and programs are published, and when lectures, breaks, registration, and exams fall
- Whether a date is a class day, a break, an exam week, or a study week
- Week 1–14 dates for one session
- Malaysia public holidays for a year, nationwide or for one state

## Connect

Point a remote MCP client at `https://mcp.bilauitmcuti.com/mcp`. On the first call, the server answers **401** with a `WWW-Authenticate` challenge. The client opens a browser for Google sign-in and OAuth consent. After that it sends a **Bearer** access token on each `/mcp` request.

Most clients need only that URL. Cursor also needs the client id in [Cursor](#cursor). Do not put API keys or bearer tokens in the config.

This host identifies clients with a Client ID Metadata Document. It does not offer Dynamic Client Registration. Do not use [`mcp-remote`](https://www.npmjs.com/package/mcp-remote). It listens on `/oauth/callback` at a derived port. That URI is not in these documents, so authorize returns `/api/auth/error?error=invalid_redirect`.

A port on `http://127.0.0.1` or `http://localhost` may differ when the published URI has no port ([RFC 8252](https://www.rfc-editor.org/rfc/rfc8252.html#section-8.3)). Any other path is `invalid_redirect`.

| Client | What you configure | Client metadata URL | Redirect this server accepts |
| --- | --- | --- | --- |
| Cursor | [Config below](#cursor) | `https://cursor.com/oauth/mcp-client.json` | `http://localhost:8787/callback`, `http://127.0.0.1:8787/callback` |
| Claude chat | Custom connector, choose **OAuth** | `https://claude.ai/oauth/mcp-oauth-client-metadata` | `https://claude.ai/api/mcp/auth_callback` |
| Claude Code | `claude mcp add --transport http` | `https://claude.ai/oauth/claude-code-client-metadata` | `http://127.0.0.1:<port>/callback` or `http://localhost:<port>/callback` |
| VS Code (Copilot) | `.vscode/mcp.json` | `https://vscode.dev/oauth/client-metadata.json` | `http://127.0.0.1:33418/` or `https://vscode.dev/redirect` |
| Codex | `codex mcp add --url` | `https://chatgpt.com/oauth/codex/client.json` | `http://127.0.0.1:<port>/callback` or `http://localhost:<port>/callback` |
| OpenCode | `mcp.servers` remote URL, then `/mcps` | `https://opencode.ai/oauth/opencode/client.json` | `http://127.0.0.1:<port>/callback` or `http://localhost:<port>/callback` |
| Grok web | grok.com custom connector | `https://grok.com/oauth/mcp-client.json` | `https://grok.com/connectors-oauth-exchange-code/` |
| Grok Bot | “Add this MCP server” in chat | `https://cursor.com/oauth/mcp-client.json` | `https://www.cursor.com/bot/mcp/oauth/callback` |

### Cursor

Save as `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global). Turn the server on under **Cursor Settings → MCP**, then quit Cursor and open it again. Keep port **8787** free. That is Cursor’s callback.

Cursor still tries Dynamic Client Registration when the config has only the URL. This server has no registration endpoint, so connect fails before Google sign-in with `Incompatible auth server: does not support dynamic client registration`. Set `auth.CLIENT_ID` to Cursor’s metadata URL so it skips registration.

```json
{
  "mcpServers": {
    "bilauitmcuti": {
      "url": "https://mcp.bilauitmcuti.com/mcp",
      "auth": {
        "CLIENT_ID": "https://cursor.com/oauth/mcp-client.json"
      }
    }
  }
}
```

If an older entry is already saved, remove it under **Cursor Settings → MCP**, save this config, quit Cursor, then choose **Connect**.

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

If the server needs sign-in, run `/mcps` and authenticate, or `opencode mcp auth bilauitmcuti`. Current OpenCode puts remote servers under `mcp.servers`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "bilauitmcuti": {
        "type": "remote",
        "url": "https://mcp.bilauitmcuti.com/mcp"
      }
    }
  }
}
```

### Claude, Grok, and Grok Bot

Use a custom connector and choose OAuth when the client asks. Sign in with Google on `https://mcp.bilauitmcuti.com`.

- **Claude:** Settings → Connectors → **Add custom connector**. Name `Bila UiTM Cuti`, URL `https://mcp.bilauitmcuti.com/mcp`. When Claude asks how to authenticate, choose **OAuth**. Disconnect does not change that choice. Delete the connector and add it again if you picked no sign-in earlier. See [Claude remote MCP connectors](https://support.anthropic.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).
- **Grok (web chat):** [grok.com/connectors](https://grok.com/connectors) → **New Connector** → **Custom**, URL `https://mcp.bilauitmcuti.com/mcp`. Complete OAuth in the popup (allow popups for grok.com). Grok web and Grok Bot store sign-in separately. Delete the old connector and add it again if it still thinks sign-in is off. See [xAI Connectors](https://docs.x.ai/grok/connectors).
- **Grok Bot (Cursor's cloud agent):** in chat, say `Add this MCP server: https://mcp.bilauitmcuti.com/mcp`, then confirm. See [Grok Bot — Connect an app](https://docs.x.ai/grok-bot/computer-and-apps).

### Claude plugin

`plugin/bila-uitm-cuti` is an optional Claude install of the same workflow. Zip that folder and upload it under Customize → Plugins, or from this repo run `claude --plugin-dir plugin/bila-uitm-cuti`. Other clients do not need the plugin. A connected client gets the server instructions: which tool to call, that a session id has to come from `get_academic_meta`, and how to phrase the answer.

### Check the host

Health check (no sign-in, not rate limited):

```bash
curl -sS 'https://mcp.bilauitmcuti.com/mcp/health'
```

```json
{"status":"ok","name":"bilauitmcuti","version":"1.0.2"}
```

`name` and `version` come from this server (`bilauitmcuti`, `1.0.2`).

List tools after sign-in. A plain `curl` without a Bearer token gets **401**:

```bash
npx @modelcontextprotocol/inspector https://mcp.bilauitmcuti.com/mcp
```

Opening `/mcp` in a browser is not a tool call. MCP calls use `POST`. `GET /mcp/health` checks that the host is up. This server returns `405` for methods other than `GET`, `POST`, and `OPTIONS` on `/mcp`.

## Sign-in

`POST` and `GET` on `/mcp` require a valid OAuth access token. **Google sign-in** is the only social provider when the operator has configured Google OAuth secrets on the Worker. Production at `mcp.bilauitmcuti.com` has this. Auth uses [Better Auth](https://www.better-auth.com) with the MCP and OAuth plugins (`@better-auth/mcp`, CIMD for client metadata).

- Put `https://mcp.bilauitmcuti.com/mcp` in your MCP config. Cursor also needs `auth.CLIENT_ID`. Do not put repo secrets or manual bearer tokens in JSON.
- The first tool call without a token returns **401** and `WWW-Authenticate`. The client should start OAuth.
- In a browser, [Sign in](https://mcp.bilauitmcuti.com/sign-in) uses **Continue with Google**, then `/consent` approves the MCP client.
- Chat connectors (Claude, Grok): choose **OAuth** when asked, then sign in with Google on `https://mcp.bilauitmcuti.com`.
- Any Google account can sign in. The OAuth consent screen is in **Production**. You do not need a UiTM email. `@student.uitm.edu.my` only changes the [rate limit](#rate-limit).

### OAuth steps

1. The MCP client calls `/mcp` without `Authorization`.
2. The server responds **401** with `WWW-Authenticate` pointing at this host’s OAuth protected-resource metadata (`/.well-known/`).
3. The client resolves itself with a Client ID Metadata Document and starts the authorization code flow. This host does not offer Dynamic Client Registration. Cursor must be given its metadata URL as `CLIENT_ID`, or it stops at this step.
4. You sign in with Google and accept the consent screen.
5. The client stores the access token and refresh token, then retries `/mcp` with `Authorization: Bearer <access_token>`.

`GET /mcp/health` stays open for uptime checks.

### Routes

| Path | Auth required | Role |
| --- | --- | --- |
| `/mcp` | Yes (Bearer) | MCP Streamable HTTP |
| `/mcp/health` | No | Health JSON |
| `/sign-in` | No | Google sign-in page |
| `/consent` | No | OAuth consent for MCP clients |
| `/api/auth/*` | Varies | Better Auth (sessions, OAuth, `callback/google`, and the rest) |
| `/.well-known/*` | No | OAuth and OIDC discovery for MCP clients |
| `/` | No | Redirects to the docs |

If `BETTER_AUTH_SECRET` or the D1 `DB` binding is missing, `/mcp` returns **503** `Authentication is not configured` instead of **401**. The public hosted URL is configured. This mainly affects forks or local dev without secrets.

### What the server stores

After sign-in, Better Auth stores accounts, sessions, and **encrypted** OAuth tokens in D1. Tool calls still forward read-only query parameters to the public `api.bilauitmcuti.com` API.

This server logs:

- Each request: HTTP method, JSON-RPC method, status, and elapsed time
- Each tool call: tool name and elapsed time. On failure, the upstream status
- A rate-limit rejection: the path and the first 12 characters of the client address

The client address is `cf-connecting-ip`, otherwise the first `X-Forwarded-For` value, otherwise `anonymous`. The full address is the rate-limit key. Only the rate-limit log line stores the 12-character prefix.

- [Privacy](https://docs.bilauitmcuti.com/mcp-server/privacy)
- [Terms](https://docs.bilauitmcuti.com/mcp-server/terms)

### Rate limit

Signed-in calls to `/mcp` are counted per Google account (the token subject).

| Account | Limit |
| --- | --- |
| `@student.uitm.edu.my` | 120 requests / 60 seconds |
| Any other Google account | 10 requests / 10 seconds |

The student match includes a Google Workspace hosted domain of `hd=student.uitm.edu.my`. Cloudflare rate-limit windows are 10 seconds or 60 seconds, so the other-account pace matches 30 requests per 30 seconds.

`GET /mcp/health` stays public and is not limited. Uptime monitors should use it and expect `200`.

Allowed responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`. A `429` response also includes `Retry-After` (seconds until the window resets). Wait that long, then try again.

## Tools

Six tools. Each one is read-only. A successful call returns indented JSON text. A non-array object is also `structuredContent`. Any other payload is wrapped as `{ "result": ... }`.

Call `get_academic_meta` before a calendar or lecture-week tool when you need a session id. Call `get_public_holiday_meta` before a holiday tool when you need a published year or state. Session ids change each term.

Omitted optional fields are not sent.

Each call reads calendar and holiday data from [`https://api.bilauitmcuti.com`](https://api.bilauitmcuti.com) (`GET /api/v1/...`).

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

### Example questions

Session ids in the examples go stale. Take the current id from `get_academic_meta`.

- What UiTM sessions are available for Group A?
- When does lecture week 1 start for session B-20264?
- Is 2026-03-09 a class day for Group B Diploma?
- Which exam activities are on the calendar for that session?
- List Malaysia public holidays in Selangor for 2026.
- Which of those holidays are nationwide?

## Troubleshooting

| What you see | What to do |
| --- | --- |
| Tools don't show up | Remove the existing `bilauitmcuti` server or connector, add it again with `https://mcp.bilauitmcuti.com/mcp`, complete Google sign-in and consent, then restart the client and refresh the tools list. For Cursor, use the [config with `CLIENT_ID`](#cursor). |
| **401** on `/mcp` | Expected until OAuth finishes. Let the client open the browser challenge, or sign in at `https://mcp.bilauitmcuti.com/sign-in` and reconnect. |
| Consent page says request expired | Start again from the MCP client. Do not bookmark `/consent`. |
| Works in one client, fails in another | Same server for Cursor, Claude, Grok, Codex, VS Code, and OpenCode. Remove that client's connector and add the URL again so it starts a fresh OAuth session. Cursor also needs `CLIENT_ID`. |
| Claude: “set up as **not requiring sign-in**, but the server asked for sign-in (401)” | The connector still has the old **no sign-in** setting. **Delete** the custom connector, add `https://mcp.bilauitmcuti.com/mcp` again, and choose **OAuth**. Turn-off or disconnect is not enough. An Anthropic support ref (for example `ofid_…`) is for their side if it still fails after re-adding. |
| Cursor: `Incompatible auth server: does not support dynamic client registration` | The config has the URL only. Add `"auth": { "CLIENT_ID": "https://cursor.com/oauth/mcp-client.json" }`, quit Cursor, and connect again. See [Cursor](#cursor). |
| Cursor red error, or no sign-in button | Use the [Cursor config](#cursor), not `mcp-remote`. Remove the server in **Cursor Settings → MCP**, quit Cursor, add it again, then **Connect**. OAuth returns to `http://localhost:8787/callback`. Nothing else should use port **8787**. |
| Grok web “Finishing sign-in…” or sign-in could not be completed | **Delete** the connector at grok.com/connectors, add the URL again, allow the **popup**, then finish Google and consent. Grok Bot can work while grok.com chat still has a stale connector. Fix both separately. |
| Claude works, Cursor or Grok web does not | Each app stores its own auth. Re-add the connector that failed. Cursor also needs `CLIENT_ID`. |
| `invalid_client` while fetching client metadata | The Worker could not load that client's HTTPS metadata URL. Retry from the client. This is not a per-client allowlist. |
| `invalid_redirect` or `invalid redirect uri` with `mcp-remote` | Cursor’s metadata does not list `mcp-remote`’s `/oauth/callback` port. Drop the proxy and use the [Cursor config](#cursor). |
| Can't connect | Use Streamable HTTP with `type: "http"` where the client supports it, and the exact URL `https://mcp.bilauitmcuti.com/mcp`. |
| Rate limited (`429`) | Wait for `Retry-After`, then retry. See [Rate limit](#rate-limit). |

## Sponsors

This server is free to use. If it helps you, you can support the work:

- [GitHub Sponsors](https://github.com/sponsors/shahrulestar)
- [Sponsor via DuitNow](https://shahrulestar.com/sponsor)

## Support and licence

Questions: [hello@bilauitmcuti.com](mailto:hello@bilauitmcuti.com)

- [Privacy](https://docs.bilauitmcuti.com/mcp-server/privacy)
- [Terms](https://docs.bilauitmcuti.com/mcp-server/terms)

Licensed under the [MIT License](LICENSE).
