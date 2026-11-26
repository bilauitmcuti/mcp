import { apiKey } from "@better-auth/api-key"
import { cimd } from "@better-auth/cimd"
import { dash } from "@better-auth/infra"
import { mcp } from "@better-auth/mcp"
import { betterAuth } from "better-auth"
import { jwt } from "better-auth/plugins"
import { D1Dialect } from "kysely-d1"
import { Kysely } from "kysely"

import type { Env } from "../env"
import { fetchClientMetadataResource } from "./cimd-fetch"

const AUTH_BASE_PATH = "/api/auth"

export interface AuthRuntimeHooks {
  backgroundTasks?: (promise: Promise<unknown>) => void
}

export function authPublicOrigin(request: Request, env: Env): string {
  const configured = env.BETTER_AUTH_URL?.trim().replace(/\/+$/, "")
  if (configured) return configured

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  const proto = request.headers.get("x-forwarded-proto") ?? "https"
  if (host?.trim()) return `${proto}://${host.split(",")[0]!.trim()}`

  return new URL(request.url).origin
}

export function isAuthConfigured(env: Env): boolean {
  return Boolean(env.DB && env.BETTER_AUTH_SECRET?.trim())
}

export function mcpResourceUrl(baseURL: string): string {
  return `${baseURL.replace(/\/+$/, "")}/mcp`
}

export function createAuth(request: Request, env: Env, hooks?: AuthRuntimeHooks) {
  if (!env.DB) throw new Error("D1 binding DB is not configured")
  const secret = env.BETTER_AUTH_SECRET?.trim()
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not configured")

  const baseURL = authPublicOrigin(request, env)
  const googleId = env.GOOGLE_CLIENT_ID?.trim()
  const googleSecret = env.GOOGLE_CLIENT_SECRET?.trim()

  return betterAuth({
    appName: "Bila UiTM Cuti MCP",
    baseURL,
    basePath: AUTH_BASE_PATH,
    secret,
    disabledPaths: ["/token"],
    account: {
      encryptOAuthTokens: true,
    },
    rateLimit: {
      storage: "database",
    },
    database: {
      type: "sqlite" as const,
      db: new Kysely({
        dialect: new D1Dialect({ database: env.DB }),
      }),
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
      ...(hooks?.backgroundTasks
        ? {
            backgroundTasks: {
              handler: hooks.backgroundTasks,
            },
          }
        : {}),
    },
    trustedOrigins: [
      "https://mcp.bilauitmcuti.com",
      "http://localhost:8787",
      "http://127.0.0.1:8787",
      "https://cursor.com",
      "https://www.cursor.com",
      "https://grok.com",
      "https://console.x.ai",
    ],
    plugins: [
      dash({
        apiKey: env.BETTER_AUTH_API_KEY?.trim() || undefined,
      }),
      apiKey({
        defaultPrefix: "bilauitmcuti",
      }),
      jwt({ disableSettingJwtHeader: true }),
      mcp({
        loginPage: "/sign-in",
        consentPage: "/consent",
        resource: mcpResourceUrl(baseURL),
      }),
      cimd({
        fetchClientMetadataResource,
        metadataProfile: "mcp-2026-07-28",
      }),
    ],
    ...(googleId && googleSecret
      ? {
          socialProviders: {
            google: {
              clientId: googleId,
              clientSecret: googleSecret,
            },
          },
        }
      : {}),
  })
}

export { AUTH_BASE_PATH }