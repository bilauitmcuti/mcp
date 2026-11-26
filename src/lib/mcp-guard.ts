import { requireMcpAuth } from "@better-auth/mcp"
import type { JWTPayload } from "jose"

import { mcpCorsHeaders } from "../cors"
import type { Env } from "../env"
import { createCalendarMcpHandler } from "../mcp-app"
import { enforceRateLimits, isStudentAccount } from "../rate-limit"
import { sanitizeToolsListResponseBody } from "../tool-input-schema"

import { authPublicOrigin, createAuth, mcpResourceUrl, type AuthRuntimeHooks } from "./auth"

async function callerEmail(env: Env, claims: JWTPayload): Promise<{ email?: string; hostedDomain?: string }> {
  const email = typeof claims.email === "string" ? claims.email : undefined
  const hostedDomain = typeof claims.hd === "string" ? claims.hd : undefined
  if (email || !env.DB || typeof claims.sub !== "string") return { email, hostedDomain }
  const row = await env.DB.prepare("SELECT email FROM user WHERE id = ?").bind(claims.sub).first<{ email: string }>()
  return { email: row?.email, hostedDomain }
}

export async function handleProtectedMcp(
  request: Request,
  env: Env,
  hooks: AuthRuntimeHooks | undefined,
  rpcMethod: string | undefined,
): Promise<Response> {
  const auth = createAuth(request, env, hooks)
  const resource = mcpResourceUrl(authPublicOrigin(request, env))
  const apiBase = (env.MCP_API_BASE_URL ?? "https://api.bilauitmcuti.com").replace(/\/+$/, "")
  const docsBase = (env.DOCS_BASE_URL ?? "https://docs.bilauitmcuti.com").replace(/\/+$/, "")
  const mcpHandler = createCalendarMcpHandler(apiBase, docsBase)

  const guarded = requireMcpAuth(
    auth,
    async (authedRequest, claims) => {
      const sub = typeof claims.sub === "string" ? claims.sub : "anonymous"
      const { email, hostedDomain } = await callerEmail(env, claims)
      const studentEmail = isStudentAccount(email) || hostedDomain?.toLowerCase() === "student.uitm.edu.my" ? email ?? "student@student.uitm.edu.my" : email
      const limited = await enforceRateLimits(authedRequest, env, { sub, email: studentEmail })
      if (!limited.ok) return limited.response

      const response = await mcpHandler(authedRequest)
      const headers = new Headers(response.headers)
      for (const [key, value] of Object.entries(limited.headers)) headers.set(key, value)
      for (const [key, value] of Object.entries(mcpCorsHeaders())) headers.set(key, value)
      const body = rpcMethod === "tools/list" ? sanitizeToolsListResponseBody(await response.text()) : response.body
      return new Response(body, { status: response.status, headers })
    },
    { resource },
  )

  const response = await guarded(request)
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(mcpCorsHeaders())) headers.set(key, value)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
