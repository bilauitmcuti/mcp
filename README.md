# Bila UiTM Cuti MCP server

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version 1.0.2](https://img.shields.io/badge/version-1.0.2-blue)](package.json)
![Remote MCP, Google sign-in](https://img.shields.io/badge/MCP-remote_%7C_Google_sign--in-2ea44f)

A hosted [Model Context Protocol](https://modelcontextprotocol.io) server for the UiTM academic calendar and Malaysia public holidays. It is read-only. Clients sign in with Google before they can call tools.

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

Point a remote MCP client at `https://mcp.bilauitmcuti.com/mcp`. On the first call, the server answers **401** with a `WWW-Authenticate` challenge; the client opens a browser for Google sign-in and OAuth consent. After that it sends a **Bearer** access token on each `/mcp` request. You do not put API keys in client config—only the URL. See [Authentication](#authentication).

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

Use a custom connector and choose OAuth when the client asks. Sign in with Google on `https://mcp.bilauitmcuti.com`.

- **Claude:** Settings → Connectors → **Add custom connector**. Name `Bila UiTM Cuti`, URL `https://mcp.bilauitmcuti.com/mcp`. When Claude asks how to authenticate, choose **OAuth** (Google sign-in on this host)—not “no sign-in”. **Disconnect alone does not change that choice**; delete the connector and add it again if you picked the wrong option earlier. See [Claude — remote MCP connectors](https://support.anthropic.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).
- **Grok (web chat):** [grok.com/connectors](https://grok.com/connectors) → **New Connector** → **Custom**, URL `https://mcp.bilauitmcuti.com/mcp`. Complete OAuth in the popup (allow popups for grok.com). This is **not** the same setup as **Grok Bot**—delete the old connector and add again if it still thinks sign-in is off. See [xAI Connectors](https://docs.x.ai/grok/connectors).
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

## Authentication

The hosted MCP endpoint (`POST` and `GET` on `/mcp`) requires a valid OAuth access token. **Google sign-in** is the only social provider when the operator has configured Google OAuth secrets on the Worker (production at `mcp.bilauitmcuti.com` has this). Auth is implemented with [Better Auth](https://www.better-auth.com) and the MCP/OAuth plugins (`@better-auth/mcp`, CIMD for client metadata).

### Client users (connect only)

- Put **only** `https://mcp.bilauitmcuti.com/mcp` in your MCP config. No repo secrets, no manual bearer tokens in JSON.
- First tool call without a token → **401** and `WWW-Authenticate`. Your client should start OAuth automatically.
- In browsers: [Sign in](https://mcp.bilauitmcuti.com/sign-in) uses **Continue with Google**, then `/consent` approves the MCP client.
- Chat connectors (Claude, Grok): choose **OAuth** when asked; sign in with Google on `https://mcp.bilauitmcuti.com`.
- Any Google account can sign in on the hosted server (OAuth consent screen is in **Production**). You do **not** need a UiTM email to connect—`@student.uitm.edu.my` only affects [rate limits](#rate-limit).

### OAuth flow (typical)

1. MCP client calls `/mcp` without `Authorization`.
2. Server responds **401** with `WWW-Authenticate` pointing at this host’s OAuth protected-resource metadata (`/.well-known/`).
3. Client registers or resolves itself (CIMD / dynamic client metadata) and starts the authorization code flow.
4. User signs in with Google and accepts the consent screen.
5. Client stores access (and refresh) tokens and retries `/mcp` with `Authorization: Bearer <access_token>`.

`GET /mcp/health` stays **unauthenticated** for uptime checks.

### Auth-related routes

| Path | Auth required | Role |
| --- | --- | --- |
| `/mcp` | Yes (Bearer) | MCP Streamable HTTP |
| `/mcp/health` | No | Health JSON |
| `/sign-in` | No | Google sign-in page |
| `/consent` | No | OAuth consent for MCP clients |
| `/api/auth/*` | Varies | Better Auth (sessions, OAuth, `callback/google`, etc.) |
| `/.well-known/*` | No | OAuth/OIDC discovery for MCP clients |
| `/` | No | Redirects to docs |

### Misconfigured deployments

If `BETTER_AUTH_SECRET` or the D1 `DB` binding is missing, `/mcp` returns **503** `Authentication is not configured` instead of **401**. The public hosted URL is fully configured; this mainly affects forks or local dev without secrets.

### What the server stores

After sign-in, Better Auth persists accounts, sessions, and **encrypted** OAuth tokens in D1. MCP tool calls still forward read-only query parameters to the public `api.bilauitmcuti.com` API—see [Privacy](#privacy).

### Rate limits tied to identity

Limits apply after auth, keyed off the token subject. UiTM student Google accounts (`@student.uitm.edu.my`, or Google Workspace `hd=student.uitm.edu.my`) get the higher tier. Details: [Rate limit](#rate-limit).

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

`/mcp` requires Google OAuth sign-in ([Authentication](#authentication)). Better Auth stores the account, session, and encrypted OAuth tokens in D1. Tool arguments are still sent on as query parameters to the public API.

This server logs:

- Each request: HTTP method, JSON-RPC method, status, and elapsed time
- Each tool call: tool name and elapsed time; on failure, the upstream status
- A rate-limit rejection: the path and the first 12 characters of the client address

The client address is `cf-connecting-ip`, otherwise the first `X-Forwarded-For` value, otherwise `anonymous`. The full address is the rate-limit key. Only the rate-limit log line stores the 12-character prefix.

- [Privacy](https://docs.bilauitmcuti.com/mcp-server/privacy)
- [Terms](https://docs.bilauitmcuti.com/mcp-server/terms)

---

## Rate limit

After sign-in, `/mcp` is limited by the token subject. `@student.uitm.edu.my` accounts get **500 requests per 60 seconds**. Other Google accounts get **10 requests per 10 seconds** (Cloudflare rate-limit windows are 10s or 60s, so this is the same pace as 30 requests per 30 seconds). `GET /mcp/health` stays public and is not limited. Uptime monitors should use it and expect `200`.

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

List tools (requires OAuth; a plain `curl` without a Bearer token gets **401**):

```bash
npx @modelcontextprotocol/inspector https://mcp.bilauitmcuti.com/mcp
```

The inspector walks through sign-in and `tools/list` with a valid token. For a quick host check without auth, use `GET /mcp/health` only.

---

## Troubleshooting

| What you see | What to do |
| --- | --- |
| Tools don't show up | Remove the existing `bilauitmcuti` server or connector, add it again with `https://mcp.bilauitmcuti.com/mcp`, complete Google sign-in and consent, then restart the client and refresh the tools list. |
| **401** on `/mcp` | Expected until OAuth finishes. Let the client open the browser challenge; or sign in at `https://mcp.bilauitmcuti.com/sign-in` and reconnect. |
| Sign-in fails / no Google button | On a self-hosted copy, the operator must set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (Wrangler secrets). Redirect URI must be `https://<host>/api/auth/callback/google`. |
| Consent page says request expired | Start again from the MCP client (do not bookmark `/consent`). |
| **503** `Authentication is not configured` | Worker is missing `BETTER_AUTH_SECRET` or D1 `DB`. Not expected on the public hosted URL. |
| Works in one client, fails in another | Same server for Cursor, Claude, Grok, Codex, VS Code, and `mcp-remote`. Remove that client's connector and add `https://mcp.bilauitmcuti.com/mcp` again so it starts a fresh OAuth session. |
| Claude: “set up as **not requiring sign-in**, but the server asked for sign-in (401)” | The connector still has the old **no sign-in** setting (from before OAuth, or from choosing no auth). **Delete** the custom connector, add `https://mcp.bilauitmcuti.com/mcp` again, and choose **OAuth** when Claude asks. Turn-off / disconnect is not enough. Anthropic support ref (e.g. `ofid_…`) is for their side if it still fails after re-adding. |
| **Cursor** MCP red error / no sign-in button | Remove `bilauitmcuti` from **Cursor Settings → MCP**, quit Cursor fully, add `https://mcp.bilauitmcuti.com/mcp` again, then **Connect** / log in. OAuth returns to **`http://localhost:8787/callback`**—ensure nothing else uses port **8787**. Update Cursor. Fallback: proxy with [`mcp-remote`](#clients-without-remote-mcp) instead of `type: "http"`. |
| **Grok web** “Finishing sign-in…” / sign-in could not be completed | **Delete** the connector at grok.com/connectors, add the URL again, allow the **popup**, complete Google + consent. Grok Bot can work while grok.com chat still has a stale connector—fix both separately. |
| Claude ✅ but Cursor / Grok web ❌ | Expected when only some connectors were re-added with OAuth. Server is the same; each app stores auth mode separately. |
| `invalid_client` while fetching client metadata | The Worker could not load that client's HTTPS metadata URL. Retry from the client. This is not a per-client allowlist. |
| Better Auth dashboard says API key validation failed | Set `BETTER_AUTH_API_KEY` (dashboard “Copy key”) as a Wrangler secret and redeploy. MCP clients do not use this key. |
| Can't connect | Use Streamable HTTP with `type: "http"` where supported, and the exact `https://mcp.bilauitmcuti.com/mcp` URL. |
| Browser open of `/mcp` | MCP calls use `POST`. Use `GET /mcp/health` to check that the host is up. This server returns `405` for methods other than `GET`, `POST`, and `OPTIONS` on `/mcp`. |
| Rate limited (`429`) | Wait for `Retry-After`, then retry. |

---

## Develop and deploy

This repository is public. **Do not commit** `.dev.vars`, production secrets, or live OAuth client values. Use [`.dev.vars.example`](.dev.vars.example) as a template.

### Prerequisites

- Node.js 20+, `npm ci`
- Cloudflare account and [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- D1 database with `binding = "DB"` in [`wrangler.toml`](wrangler.toml) (apply SQL under [`migrations/`](migrations/))
- Google Cloud **OAuth 2.0 Client ID** (Web application) for sign-in

### Secrets and vars

| Name | Where it lives | Notes |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Wrangler secret / `.dev.vars` | Random string, 32+ characters. Signs sessions and encrypts OAuth tokens. |
| `GOOGLE_CLIENT_ID` | Wrangler secret / `.dev.vars` | Never commit. |
| `GOOGLE_CLIENT_SECRET` | Wrangler secret / `.dev.vars` | Never commit. |
| `AUTH_MIGRATE_SECRET` | Wrangler secret / `.dev.vars` | Optional. Bearer for `POST /api/auth/__migrate` only. If unset, that route returns **404**. |
| `BETTER_AUTH_API_KEY` | Wrangler secret / `.dev.vars` | Better Auth dashboard only. Copy from the dashboard onboarding screen. Required for **Retry connection**. MCP clients (Cursor, Claude, Grok, and the rest) never send this key. |
| `BETTER_AUTH_URL` | `wrangler.toml` `[vars]` | Public origin (`https://mcp.bilauitmcuti.com`). Safe to commit. |
| `MCP_API_BASE_URL`, `DOCS_BASE_URL` | `wrangler.toml` `[vars]` | Upstream API and docs. |

Production secrets:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
# optional:
npx wrangler secret put AUTH_MIGRATE_SECRET
# Better Auth dashboard only (not used by MCP clients):
npx wrangler secret put BETTER_AUTH_API_KEY
```

One MCP URL (`https://mcp.bilauitmcuti.com/mcp`) is the client config for Cursor, Claude, Grok, Claude Code, Codex, VS Code, OpenCode, and `mcp-remote`. OAuth uses each client's own metadata URL. There is no per-client secret on the Worker.

Local dev: copy `.dev.vars.example` → `.dev.vars` and fill placeholders.

### Google OAuth console

For each deployment host, add an **Authorized redirect URI**:

```text
https://<your-mcp-host>/api/auth/callback/google
```

Local Wrangler (`npm run dev`) typically uses `http://localhost:8787/api/auth/callback/google`. Match the host shown in the terminal if it differs.

If redirect URIs or client IDs do not match the Worker’s `BETTER_AUTH_URL`, sign-in loops or `redirect_uri_mismatch` errors are common.

### D1 schema

```bash
# local
npx wrangler d1 migrations apply bilauitmcuti-auth --local

# production
npx wrangler d1 migrations apply bilauitmcuti-auth --remote
```

With `AUTH_MIGRATE_SECRET` set, you can also run Better Auth’s migrator once:

```bash
curl -sS -X POST 'https://<your-mcp-host>/api/auth/__migrate' \
  -H 'Authorization: Bearer <your-migrate-secret>'
```

Replace `<your-migrate-secret>` with the value from your secret store—not from the repo.

### Commands

```bash
npm run dev      # wrangler dev
npm run test     # vitest
npm run typecheck
npm run deploy   # wrangler deploy
```

Serving on another public hostname requires adding it to `trustedOrigins` in [`src/lib/auth.ts`](src/lib/auth.ts).

---

## Changelog

- **Docs** — README authentication and develop/deploy sections (no secrets in repo).
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
