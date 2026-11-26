# Sign-in, privacy, and rate limits

`POST` and `GET` on `/mcp` require a valid OAuth access token. **Google sign-in** is the only social provider when the operator has configured Google OAuth secrets on the Worker. Production at `mcp.bilauitmcuti.com` has this. Auth uses [Better Auth](https://www.better-auth.com) with the MCP and OAuth plugins (`@better-auth/mcp`, CIMD for client metadata).

Client setup is in [installation.md](installation.md).

## For people connecting

- Put `https://mcp.bilauitmcuti.com/mcp` in your MCP config. Cursor also needs `auth.CLIENT_ID`. See [installation.md](installation.md). Do not put repo secrets or manual bearer tokens in JSON.
- The first tool call without a token returns **401** and `WWW-Authenticate`. The client should start OAuth.
- In a browser, [Sign in](https://mcp.bilauitmcuti.com/sign-in) uses **Continue with Google**, then `/consent` approves the MCP client.
- Chat connectors (Claude, Grok): choose **OAuth** when asked, then sign in with Google on `https://mcp.bilauitmcuti.com`.
- Any Google account can sign in. The OAuth consent screen is in **Production**. You do not need a UiTM email. `@student.uitm.edu.my` only changes the [rate limit](#rate-limit).

## OAuth steps

1. The MCP client calls `/mcp` without `Authorization`.
2. The server responds **401** with `WWW-Authenticate` pointing at this host’s OAuth protected-resource metadata (`/.well-known/`).
3. The client resolves itself with a Client ID Metadata Document and starts the authorization code flow. This host does not offer Dynamic Client Registration. Cursor must be given its metadata URL as `CLIENT_ID`, or it stops at this step.
4. You sign in with Google and accept the consent screen.
5. The client stores the access token and refresh token, then retries `/mcp` with `Authorization: Bearer <access_token>`.

`GET /mcp/health` stays open for uptime checks.

## Routes

| Path | Auth required | Role |
| --- | --- | --- |
| `/mcp` | Yes (Bearer) | MCP Streamable HTTP |
| `/mcp/health` | No | Health JSON |
| `/sign-in` | No | Google sign-in page |
| `/consent` | No | OAuth consent for MCP clients |
| `/api/auth/*` | Varies | Better Auth (sessions, OAuth, `callback/google`, and the rest) |
| `/.well-known/*` | No | OAuth and OIDC discovery for MCP clients |
| `/` | No | Redirects to the docs |

If `BETTER_AUTH_SECRET` or the D1 `DB` binding is missing, `/mcp` returns **503** `Authentication is not configured` instead of **401**. The public hosted URL is configured. This mainly affects forks or local dev without secrets. Operator setup is in [develop.md](develop.md).

## What the server stores

After sign-in, Better Auth stores accounts, sessions, and **encrypted** OAuth tokens in D1. Tool calls still forward read-only query parameters to the public `api.bilauitmcuti.com` API.

This server logs:

- Each request: HTTP method, JSON-RPC method, status, and elapsed time
- Each tool call: tool name and elapsed time. On failure, the upstream status
- A rate-limit rejection: the path and the first 12 characters of the client address

The client address is `cf-connecting-ip`, otherwise the first `X-Forwarded-For` value, otherwise `anonymous`. The full address is the rate-limit key. Only the rate-limit log line stores the 12-character prefix.

- [Privacy](https://docs.bilauitmcuti.com/mcp-server/privacy)
- [Terms](https://docs.bilauitmcuti.com/mcp-server/terms)

## Rate limit

After sign-in, `/mcp` is limited by the token subject. `@student.uitm.edu.my` accounts get **120 requests per 60 seconds**. The match includes a Google Workspace hosted domain of `hd=student.uitm.edu.my`. Other Google accounts get **10 requests per 10 seconds**. Cloudflare rate-limit windows are 10 seconds or 60 seconds, so that pace matches 30 requests per 30 seconds.

`GET /mcp/health` stays public and is not limited. Uptime monitors should use it and expect `200`.

Allowed responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`. A `429` response also includes `Retry-After` (seconds until the window resets). Wait that long, then try again.
