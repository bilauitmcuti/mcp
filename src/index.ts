import { createMcpHandler } from "mcp-handler"

import { mcpCorsHeaders } from "./cors"
import type { Env } from "./env"
import { enforceRateLimits } from "./rate-limit"
import { mcpHandlerOptions } from "./server-info"
import { sanitizeToolsListResponseBody } from "./tool-input-schema"
import { registerBilaTools } from "./tools"
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./version"

const DOCS_MCP_URL = "https://docs.bilauitmcuti.com/docs/mcp"
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

    const started = Date.now()
    const rpcMethod = await readRpcMethod(request)
    const rl = await enforceRateLimits(request, env)
    if (!rl.ok) {
      console.warn("[mcp] rate limited", { method: request.method, ms: Date.now() - started })
      return withRobots(rl.response)
    }

    const apiBase = (env.MCP_API_BASE_URL ?? "https://api.bilauitmcuti.com").replace(/\/+$/, "")
    const docsBase = (env.DOCS_BASE_URL ?? "https://docs.bilauitmcuti.com").replace(/\/+$/, "")
    const mcpHandler = createMcpHandler(
      (server) => {
        registerBilaTools(server, apiBase)
      },
      mcpHandlerOptions(docsBase),
    )

    const response = await mcpHandler(request)
    const headers = new Headers(response.headers)
    for (const [key, value] of Object.entries(rl.headers)) headers.set(key, value)
    for (const [key, value] of Object.entries(mcpCorsHeaders())) headers.set(key, value)

    const body = rpcMethod === "tools/list" ? sanitizeToolsListResponseBody(await response.text()) : response.body
    const finalResponse = new Response(body, { status: response.status, headers })

    console.info("[mcp] request", {
      method: request.method,
      rpcMethod,
      status: finalResponse.status,
      ms: Date.now() - started,
    })
    return withRobots(finalResponse)
  },
}
