import { waitUntil } from "cloudflare:workers"

import { mcpCorsHeaders } from "./cors"
import type { Env } from "./env"
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./version"

const DOCS_MCP_URL = "https://docs.bilauitmcuti.com/mcp-server"
const X_ROBOTS_NOINDEX = "noindex, nofollow"

function withRobots(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set("X-Robots-Tag", X_ROBOTS_NOINDEX)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function readRpcMethod(request: Request): Promise<string | undefined> {
  if (request.method !== "POST") return undefined
  try {
    const body = (await request.clone().json()) as { method?: string }
    return typeof body.method === "string" ? body.method : undefined
  } catch {
    return undefined
  }
}

function healthResponse(): Response {
  return Response.json(
    { status: "ok", name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    {
      status: 200,
      headers: {
        ...mcpCorsHeaders(),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  )
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (pathname === "/") {
      return withRobots(Response.redirect(DOCS_MCP_URL, 308))
    }

    if (pathname === "/mcp/health") {
      if (request.method === "OPTIONS") {
        return withRobots(new Response(null, { status: 204, headers: mcpCorsHeaders() }))
      }
      if (request.method !== "GET") {
        return withRobots(new Response("Method Not Allowed", { status: 405 }))
      }
      return withRobots(healthResponse())
    }

    if (
      pathname === "/sign-in" ||
      pathname === "/consent" ||
      pathname.startsWith("/.well-known/") ||
      pathname === "/api/auth" ||
      pathname.startsWith("/api/auth/")
    ) {
      const [{ handleAuthMigrate, handleAuthRequest }, { consentPage, signInPage }] = await Promise.all([
        import("./lib/auth-http"),
        import("./lib/auth-pages"),
      ])
      const authRuntime = { backgroundTasks: waitUntil }
      if (pathname === "/sign-in") return withRobots(signInPage())
      if (pathname === "/consent") return withRobots(await consentPage(request, env, authRuntime))
      if (pathname === "/api/auth/__migrate") {
        return withRobots(await handleAuthMigrate(request, env, authRuntime))
      }
      return withRobots(await handleAuthRequest(request, env, authRuntime))
    }

    if (pathname !== "/mcp") {
      return withRobots(new Response("Not Found", { status: 404 }))
    }

    if (request.method === "OPTIONS") {
      return withRobots(
        new Response(null, {
          status: 204,
          headers: {
            ...mcpCorsHeaders(),
            "Access-Control-Max-Age": "86400",
          },
        }),
      )
    }

    if (request.method !== "GET" && request.method !== "POST") {
      return withRobots(new Response("Method Not Allowed", { status: 405 }))
    }

    if (!env.DB || !env.BETTER_AUTH_SECRET?.trim()) {
      return withRobots(
        Response.json(
          { error: "Authentication is not configured" },
          { status: 503, headers: { ...mcpCorsHeaders(), "cache-control": "private, no-store" } },
        ),
      )
    }

    const started = Date.now()
    const rpcMethod = await readRpcMethod(request)
    const { handleProtectedMcp } = await import("./lib/mcp-guard")
    const finalResponse = await handleProtectedMcp(request, env, { backgroundTasks: waitUntil }, rpcMethod)

    console.info("[mcp] request", {
      method: request.method,
      rpcMethod,
      status: finalResponse.status,
      ms: Date.now() - started,
    })
    return withRobots(finalResponse)
  },
}
