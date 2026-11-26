import { verifyOAuthQueryParams } from "@better-auth/oauth-provider"

import type { Env } from "../env"

import { createAuth, isAuthConfigured, type AuthRuntimeHooks } from "./auth"

function page(title: string, body: string): Response {
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #f6f7f4; color: #1c1917; }
    main { max-width: 28rem; margin: 4rem auto; padding: 1.5rem; background: #fff; border: 1px solid #e7e5e4; border-radius: 12px; }
    button { font: inherit; padding: 0.6rem 0.9rem; border-radius: 8px; border: 0; cursor: pointer; }
    .primary { background: #1c1917; color: #fff; }
    .ghost { background: #fff; border: 1px solid #d6d3d1; margin-left: 0.5rem; }
    p { line-height: 1.5; }
    code { font-size: 0.85em; }
  </style>
</head>
<body><main>${body}</main></body>
</html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  )
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }
    return entities[char] ?? char
  })
}

function signedQuery(url: URL): string | undefined {
  const params = url.searchParams
  if (!params.get("sig")) return undefined
  const signed = new Set(["sig", "ba_param", ...params.getAll("ba_param")])
  return new URLSearchParams([...params].filter(([key]) => signed.has(key))).toString()
}

export function signInPage(): Response {
  return page(
    "Sign in — Bila UiTM Cuti",
    `<h1>Sign in</h1>
<p>Use Google to connect this MCP server in Cursor or Claude.</p>
<button class="primary" id="google" type="button">Continue with Google</button>
<p id="error"></p>
<script>
  const params = new URLSearchParams(location.search)
  const signed = params.get("sig") ? location.search.slice(1) : ""
  async function resume() {
    if (!signed) return
    const session = await fetch("/api/auth/get-session", { credentials: "include" }).then((response) => response.json()).catch(() => null)
    if (!session?.user) return
    const authorize = new URLSearchParams(signed)
    for (const key of ["sig", "exp", "ba_param"]) authorize.delete(key)
    location.href = "/api/auth/oauth2/authorize?" + authorize.toString()
  }
  document.getElementById("google").onclick = async () => {
    const body = { provider: "google", callbackURL: location.href }
    if (signed) body.oauth_query = signed
    const response = await fetch("/api/auth/sign-in/social", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({}))
    if (payload.url) location.href = payload.url
    else document.getElementById("error").textContent = payload.message || "Google sign-in is not configured."
  }
  resume()
</script>`,
  )
}

export async function consentPage(request: Request, env: Env, hooks?: AuthRuntimeHooks): Promise<Response> {
  if (!isAuthConfigured(env)) return page("Consent", "<h1>Auth is not configured</h1>")
  const url = new URL(request.url)
  const oauthQuery = signedQuery(url)
  if (!oauthQuery) return page("Consent", "<h1>Missing authorization request</h1>")

  const auth = createAuth(request, env, hooks)
  const { secret } = await auth.$context
  if (!(await verifyOAuthQueryParams(oauthQuery, secret))) {
    return page("Consent", "<h1>This authorization request expired</h1><p>Start the connection again from your MCP client.</p>")
  }

  const query = new URLSearchParams(oauthQuery)
  const clientId = query.get("client_id") ?? ""
  const scope = query.get("scope") ?? ""
  const redirectUri = query.get("redirect_uri") ?? ""
  let clientName = clientId
  try {
    const client = await auth.api.getOAuthClientPublic({
      query: { client_id: clientId },
      headers: request.headers,
    })
    if (client && typeof client === "object" && "client_name" in client && typeof client.client_name === "string") {
      clientName = client.client_name
    }
  } catch {
    clientName = clientId
  }

  const clientHost = clientId.startsWith("https://") ? new URL(clientId).host : ""
  return page(
    "Allow access — Bila UiTM Cuti",
    `<h1>Allow access</h1>
<p><strong>${escapeHtml(clientName)}</strong>${clientHost ? ` says it is <code>${escapeHtml(clientHost)}</code>` : ""}.</p>
<p>Response goes to <code>${escapeHtml(redirectUri || "the client")}</code>.</p>
<p>Scopes: <code>${escapeHtml(scope || "none")}</code></p>
<button class="primary" id="allow" type="button">Allow</button>
<button class="ghost" id="deny" type="button">Deny</button>
<p id="error"></p>
<script>
  const oauthQuery = ${JSON.stringify(oauthQuery)}
  async function choose(accept) {
    const response = await fetch("/api/auth/oauth2/consent", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accept, oauth_query: oauthQuery }),
    })
    const payload = await response.json().catch(() => ({}))
    if (payload.url) location.href = payload.url
    else document.getElementById("error").textContent = payload.message || "Could not finish consent."
  }
  document.getElementById("allow").onclick = () => choose(true)
  document.getElementById("deny").onclick = () => choose(false)
</script>`,
  )
}
