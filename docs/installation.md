# Install a client

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

Sign-in, stored data, and rate limits: [authentication.md](authentication.md).

## Cursor

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

## Claude Code

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

## VS Code (GitHub Copilot)

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

## Codex

```bash
codex mcp add bilauitmcuti --url https://mcp.bilauitmcuti.com/mcp
```

Or in `~/.codex/config.toml`:

```toml
[mcp_servers.bilauitmcuti]
url = "https://mcp.bilauitmcuti.com/mcp"
```

## OpenCode

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

## Claude, Grok, and Grok Bot

Use a custom connector and choose OAuth when the client asks. Sign in with Google on `https://mcp.bilauitmcuti.com`.

- **Claude:** Settings → Connectors → **Add custom connector**. Name `Bila UiTM Cuti`, URL `https://mcp.bilauitmcuti.com/mcp`. When Claude asks how to authenticate, choose **OAuth**. Disconnect does not change that choice. Delete the connector and add it again if you picked no sign-in earlier. See [Claude remote MCP connectors](https://support.anthropic.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).
- **Grok (web chat):** [grok.com/connectors](https://grok.com/connectors) → **New Connector** → **Custom**, URL `https://mcp.bilauitmcuti.com/mcp`. Complete OAuth in the popup (allow popups for grok.com). Grok web and Grok Bot store sign-in separately. Delete the old connector and add it again if it still thinks sign-in is off. See [xAI Connectors](https://docs.x.ai/grok/connectors).
- **Grok Bot (Cursor's cloud agent):** in chat, say `Add this MCP server: https://mcp.bilauitmcuti.com/mcp`, then confirm. See [Grok Bot — Connect an app](https://docs.x.ai/grok-bot/computer-and-apps).

## Claude plugin

`plugin/bila-uitm-cuti` is an optional Claude install of the same workflow. Zip that folder and upload it under Customize → Plugins, or from this repo run `claude --plugin-dir plugin/bila-uitm-cuti`. Other clients do not need the plugin. A connected client gets the server instructions: which tool to call, that a session id has to come from `get_academic_meta`, and how to phrase the answer.

## Check the host

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
| Rate limited (`429`) | Wait for `Retry-After`, then retry. See [authentication.md](authentication.md). |
