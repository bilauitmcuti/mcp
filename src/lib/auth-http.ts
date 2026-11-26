import { mcpCorsHeaders } from "../cors"
import type { Env } from "../env"

import { AUTH_BASE_PATH, createAuth, isAuthConfigured, type AuthRuntimeHooks } from "./auth"
import { runAuthMigrations } from "./auth-migrate"

const AUTH_TABLES = [
  "user",
  "session",
  "account",
  "verification",
  "apikey",
  "jwks",
  "oauthClient",
  "oauthResource",
  "oauthClientResource",
  "oauthRefreshToken",
  "oauthAccessToken",
  "oauthConsent",
  "oauthClientAssertion",
  "rateLimit",
] as const

async function authTablesPresent(db: D1Database): Promise<boolean> {
  const placeholders = AUTH_TABLES.map(() => "?").join(", ")
  const rows = await db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${placeholders})`)
    .bind(...AUTH_TABLES)
    .all<{ name: string }>()
  const found = new Set(rows.results.map((row) => row.name))
  return AUTH_TABLES.every((name) => found.has(name))
}

function authUnavailableResponse(): Response {
  return Response.json(
    {
      error: "Authentication is not configured",
      detail: "Set BETTER_AUTH_SECRET, bind D1 (DB), and optional Google OAuth secrets.",
    },
    {
      status: 503,
      headers: {
        ...mcpCorsHeaders(),
        "Cache-Control": "private, no-store",
      },
    },
  )
}

export async function handleAuthMigrate(
  request: Request,
  env: Env,
  hooks?: AuthRuntimeHooks,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  const migrateSecret = env.AUTH_MIGRATE_SECRET?.trim()
  if (!migrateSecret) {
    return new Response("Not Found", { status: 404 })
  }

  const authHeader = request.headers.get("Authorization")
  const [type, token] = authHeader?.split(" ") ?? []
  if (type?.toLowerCase() !== "bearer" || token !== migrateSecret) {
    return new Response("Unauthorized", { status: 401 })
  }

  if (!isAuthConfigured(env)) return authUnavailableResponse()

  try {
    const auth = createAuth(request, env, hooks)
    const result = await runAuthMigrations(auth.options)
    return Response.json(
      {
        status: "ok",
        created: result.toBeCreated.map((t) => t.table),
        altered: result.toBeAdded.map((t) => t.table),
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("SQLITE_AUTH") && env.DB && (await authTablesPresent(env.DB))) {
      return Response.json(
        {
          status: "ok",
          created: [],
          altered: [],
          detail: "Schema already present. D1 blocks introspection of internal tables, so this endpoint did not re-run DDL.",
        },
        { headers: { "Cache-Control": "no-store" } },
      )
    }
    console.error("[auth] migrate failed", error)
    return Response.json({ error: "Migration failed" }, { status: 500 })
  }
}

export async function handleAuthRequest(
  request: Request,
  env: Env,
  hooks?: AuthRuntimeHooks,
): Promise<Response> {
  if (!isAuthConfigured(env)) return authUnavailableResponse()

  try {
    const auth = createAuth(request, env, hooks)
    return auth.handler(request)
  } catch (error) {
    console.error("[auth] handler error", error)
    return Response.json({ error: "Authentication handler failed" }, { status: 500 })
  }
}

export function isAuthPath(pathname: string): boolean {
  return pathname === AUTH_BASE_PATH || pathname.startsWith(`${AUTH_BASE_PATH}/`)
}