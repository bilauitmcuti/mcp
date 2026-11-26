import { describe, expect, it } from "vitest"

/**
 * Native CIMD clients (Better Auth `findRegisteredRedirectUri`, non-web):
 * a loopback redirect may use any port when the registered URI has none.
 * Path and host must still match. HTTPS redirects match exactly.
 */
function stripLoopbackRedirectPort(uri: string): string | undefined {
  let parsed: URL
  try {
    parsed = new URL(uri)
  } catch {
    return undefined
  }
  const isLoopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]"
  if (parsed.protocol !== "http:" || !isLoopback) return undefined
  const schemeSeparatorIndex = uri.indexOf("://")
  const authorityStart = schemeSeparatorIndex + 3
  const authorityEndOffset = uri.slice(authorityStart).search(/[/?#]/u)
  const authorityEnd = authorityEndOffset >= 0 ? authorityStart + authorityEndOffset : uri.length
  const authority = uri.slice(authorityStart, authorityEnd)
  const portStart = authority.lastIndexOf(":")
  if (portStart < 0) return uri
  const port = authority.slice(portStart + 1)
  if (!/^\d*$/u.test(port)) return undefined
  return `${uri.slice(0, authorityStart + portStart)}${uri.slice(authorityEnd)}`
}

function matchesNativeRedirect(registered: readonly string[], requested: string): boolean {
  const requestedWithoutPort = stripLoopbackRedirectPort(requested)
  return registered.some((url) => {
    if (url === requested) return true
    if (!requestedWithoutPort) return false
    return stripLoopbackRedirectPort(url) === requestedWithoutPort
  })
}

const clients = {
  cursor: ["http://localhost:8787/callback", "http://127.0.0.1:8787/callback", "https://www.cursor.com/bot/mcp/oauth/callback"],
  claudeCode: ["http://localhost/callback", "http://127.0.0.1/callback"],
  vscode: ["http://127.0.0.1:33418/", "https://vscode.dev/redirect"],
  codex: ["http://127.0.0.1/callback", "http://localhost/callback"],
  opencode: ["http://127.0.0.1/callback", "http://localhost/callback"],
  grok: ["https://grok.com/connectors-oauth-exchange-code/"],
} as const

describe("CIMD redirect allowlist", () => {
  it("accepts each remote client's published callback, including any loopback port", () => {
    expect(matchesNativeRedirect(clients.cursor, "http://localhost:8787/callback")).toBe(true)
    expect(matchesNativeRedirect(clients.cursor, "https://www.cursor.com/bot/mcp/oauth/callback")).toBe(true)
    expect(matchesNativeRedirect(clients.claudeCode, "http://127.0.0.1:54321/callback")).toBe(true)
    expect(matchesNativeRedirect(clients.vscode, "http://127.0.0.1:33418/")).toBe(true)
    expect(matchesNativeRedirect(clients.vscode, "https://vscode.dev/redirect")).toBe(true)
    expect(matchesNativeRedirect(clients.codex, "http://127.0.0.1:49876/callback")).toBe(true)
    expect(matchesNativeRedirect(clients.opencode, "http://127.0.0.1:52817/callback")).toBe(true)
    expect(matchesNativeRedirect(clients.grok, "https://grok.com/connectors-oauth-exchange-code/")).toBe(true)
  })

  it("rejects mcp-remote's /oauth/callback", () => {
    expect(matchesNativeRedirect(clients.cursor, "http://127.0.0.1:16289/oauth/callback")).toBe(false)
    expect(matchesNativeRedirect(clients.claudeCode, "http://127.0.0.1:16289/oauth/callback")).toBe(false)
  })
})
