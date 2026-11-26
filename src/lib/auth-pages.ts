import { verifyOAuthQueryParams } from "@better-auth/oauth-provider"

import type { Env } from "../env"

import { createAuth, isAuthConfigured, type AuthRuntimeHooks } from "./auth"

const GOOGLE_MARK = `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>`

function page(title: string, body: string): Response {
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <script>
    document.documentElement.classList.toggle("dark", matchMedia("(prefers-color-scheme: dark)").matches)
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
      document.documentElement.classList.toggle("dark", event.matches)
    })
  </script>
  <style>
    :root {
      --background: oklch(1 0 0);
      --foreground: oklch(0.145 0 0);
      --card: oklch(1 0 0);
      --card-foreground: oklch(0.145 0 0);
      --popover: oklch(1 0 0);
      --popover-foreground: oklch(0.145 0 0);
      --primary: oklch(0.488 0.243 264.376);
      --primary-foreground: oklch(0.97 0.014 254.604);
      --secondary: oklch(0.967 0.001 286.375);
      --secondary-foreground: oklch(0.21 0.006 285.885);
      --muted: oklch(0.97 0 0);
      --muted-foreground: oklch(0.556 0 0);
      --accent: oklch(0.97 0 0);
      --accent-foreground: oklch(0.205 0 0);
      --destructive: oklch(0.577 0.245 27.325);
      --border: oklch(0.922 0 0);
      --input: oklch(0.922 0 0);
      --ring: oklch(0.708 0 0);
      --chart-1: oklch(0.87 0 0);
      --chart-2: oklch(0.556 0 0);
      --chart-3: oklch(0.439 0 0);
      --chart-4: oklch(0.371 0 0);
      --chart-5: oklch(0.269 0 0);
      --radius: 0.625rem;
      --sidebar: oklch(0.985 0 0);
      --sidebar-foreground: oklch(0.145 0 0);
      --sidebar-primary: oklch(0.546 0.245 262.881);
      --sidebar-primary-foreground: oklch(0.97 0.014 254.604);
      --sidebar-accent: oklch(0.97 0 0);
      --sidebar-accent-foreground: oklch(0.205 0 0);
      --sidebar-border: oklch(0.922 0 0);
      --sidebar-ring: oklch(0.708 0 0);
      color-scheme: light;
    }
    .dark {
      --background: oklch(0.145 0 0);
      --foreground: oklch(0.985 0 0);
      --card: oklch(0.205 0 0);
      --card-foreground: oklch(0.985 0 0);
      --popover: oklch(0.205 0 0);
      --popover-foreground: oklch(0.985 0 0);
      --primary: oklch(0.424 0.199 265.638);
      --primary-foreground: oklch(0.97 0.014 254.604);
      --secondary: oklch(0.274 0.006 286.033);
      --secondary-foreground: oklch(0.985 0 0);
      --muted: oklch(0.269 0 0);
      --muted-foreground: oklch(0.708 0 0);
      --accent: oklch(0.269 0 0);
      --accent-foreground: oklch(0.985 0 0);
      --destructive: oklch(0.704 0.191 22.216);
      --border: oklch(1 0 0 / 10%);
      --input: oklch(1 0 0 / 15%);
      --ring: oklch(0.556 0 0);
      --chart-1: oklch(0.87 0 0);
      --chart-2: oklch(0.556 0 0);
      --chart-3: oklch(0.439 0 0);
      --chart-4: oklch(0.371 0 0);
      --chart-5: oklch(0.269 0 0);
      --sidebar: oklch(0.205 0 0);
      --sidebar-foreground: oklch(0.985 0 0);
      --sidebar-primary: oklch(0.623 0.214 259.815);
      --sidebar-primary-foreground: oklch(0.97 0.014 254.604);
      --sidebar-accent: oklch(0.269 0 0);
      --sidebar-accent-foreground: oklch(0.985 0 0);
      --sidebar-border: oklch(1 0 0 / 10%);
      --sidebar-ring: oklch(0.556 0 0);
      color-scheme: dark;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, sans-serif;
      background: var(--background);
      color: var(--foreground);
    }
    main { max-width: 32rem; margin: 0 auto; padding: 2.5rem 1.25rem 3rem; }
    h1.host { margin: 0 0 1.25rem; font-size: 1.35rem; line-height: 1.25; letter-spacing: -0.02em; font-weight: 650; }
    h1.host strong { font-weight: 650; }
    .card {
      background: var(--card);
      color: var(--card-foreground);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.35rem 1.25rem 1.25rem;
    }
    h2 { font-size: 1.35rem; line-height: 1.25; margin: 0 0 0.75rem; letter-spacing: -0.02em; font-weight: 650; }
    p { line-height: 1.5; margin: 0 0 0.85rem; }
    .notice {
      background: var(--muted);
      border-radius: var(--radius);
      padding: 0.75rem 0.85rem;
      font-size: 0.92rem;
    }
    .fine, .quiet { color: var(--muted-foreground); font-size: 0.875rem; }
    .error { color: var(--destructive); min-height: 1.25em; font-size: 0.875rem; }
    code { font-size: 0.85em; overflow-wrap: anywhere; }
    button {
      font: inherit;
      font-weight: 560;
      padding: 0.7rem 0.95rem;
      border-radius: var(--radius);
      cursor: pointer;
    }
    button:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
    .google {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.65rem;
      width: 100%;
      margin: 0.25rem 0 1rem;
      background: #fff;
      color: #1f1f1f;
      border: 1px solid #747775;
    }
    .actions { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
    .actions button { flex: 1; }
    .primary { background: var(--primary); color: var(--primary-foreground); border: 0; }
    .ghost { background: var(--card); color: var(--foreground); border: 1px solid var(--border); }
    footer { display: flex; gap: 1rem; margin-top: 1.25rem; font-size: 0.875rem; }
    footer a { color: var(--muted-foreground); }
    footer a:hover { color: var(--foreground); }
  </style>
</head>
<body>
<main>
  <h1 class="host">You are on <strong>mcp.bilauitmcuti.com</strong></h1>
  <section class="card">${body}</section>
  <footer>
    <a href="https://docs.bilauitmcuti.com/mcp-server/privacy">Privacy</a>
    <a href="https://docs.bilauitmcuti.com/mcp-server/terms">Terms</a>
    <a href="https://docs.bilauitmcuti.com/mcp-server">Docs</a>
  </footer>
</main>
</body>
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
    `<h2>Sign in</h2>
<p>Read-only access to the UiTM academic calendar and Malaysia public holidays. Your client opened this page so it can connect to the server.</p>
<p class="notice">Unofficial, and not affiliated with UiTM. Check any date that matters before you rely on it.</p>
<button class="google" id="google" type="button">${GOOGLE_MARK}Continue with Google</button>
<p class="fine">Any Google account can sign in. You do not need a UiTM email. <code>@student.uitm.edu.my</code> gets 120 requests / 60 seconds. Any other Google account gets 10 requests / 10 seconds.</p>
<p class="fine">This server stores your account, session, and encrypted OAuth tokens. Tool calls only read the public calendar API.</p>
<p id="error" class="error" role="alert"></p>
<p id="hint" class="fine"></p>
<script>
  const params = new URLSearchParams(location.search)
  const signed = params.get("sig") ? location.search.slice(1) : ""
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  async function resume() {
    if (!signed) return
    const hint = document.getElementById("hint")
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const session = await fetch("/api/auth/get-session", { credentials: "include" }).then((response) => response.json()).catch(() => null)
      if (session?.user) {
        const authorize = new URLSearchParams(signed)
        for (const key of ["sig", "exp", "ba_param"]) authorize.delete(key)
        location.href = "/api/auth/oauth2/authorize?" + authorize.toString()
        return
      }
      await sleep(350)
    }
    if (hint) {
      hint.textContent =
        "Google sign-in may have succeeded in another window. Open this page in Safari or Chrome (copy the URL), click Continue with Google once, then return to Cursor or Grok."
    }
  }
  document.getElementById("google").onclick = async () => {
    document.getElementById("error").textContent = ""
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
  if (!isAuthConfigured(env)) return page("Sign-in is not configured — Bila UiTM Cuti", "<h2>Sign-in is not configured</h2>")
  const url = new URL(request.url)
  const oauthQuery = signedQuery(url)
  if (!oauthQuery) {
    return page(
      "Start again — Bila UiTM Cuti",
      "<h2>Start again from your MCP client</h2><p>This page needs an authorization request from Cursor, Claude, Grok, or another client.</p>",
    )
  }

  const auth = createAuth(request, env, hooks)
  const { secret } = await auth.$context
  if (!(await verifyOAuthQueryParams(oauthQuery, secret))) {
    return page(
      "Request expired — Bila UiTM Cuti",
      "<h2>This authorization request expired</h2><p>Start the connection again from your MCP client.</p>",
    )
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
    "Allow this app to connect — Bila UiTM Cuti",
    `<h2>Allow this app to connect</h2>
<p><strong>${escapeHtml(clientName)}</strong> wants to connect.</p>
${clientHost ? `<p class="quiet">This app says it is <code>${escapeHtml(clientHost)}</code>.</p>` : ""}
<p>Allowing this lets that app call the read-only calendar and holiday tools for you. It cannot change the calendar.</p>
<p class="quiet">Response goes to <code>${escapeHtml(redirectUri || "the client")}</code>.</p>
<p class="quiet">Requested access: <code>${escapeHtml(scope || "none")}</code></p>
<div class="actions">
  <button class="primary" id="allow" type="button">Allow</button>
  <button class="ghost" id="deny" type="button">Deny</button>
</div>
<p id="error" class="error" role="alert"></p>
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
