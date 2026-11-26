import { CACHE_CONTROL_ERROR, mcpCorsHeaders } from "./cors"
import type { Env, RateLimitBinding } from "./env"

export const RATE_LIMIT_CONFIG = {
  endpoint: { limit: 500, period: 60 },
  // Cloudflare rate-limit periods are only 10s or 60s. 10/10s is the same rate as 30/30s.
  standard: { limit: 10, period: 10 },
} as const

const STUDENT_EMAIL_SUFFIX = "@student.uitm.edu.my"

export interface McpCaller {
  sub: string
  email?: string
}

interface LimitConfig {
  limit: number
  period: number
}

export function isStudentAccount(email: string | undefined): boolean {
  return email?.trim().toLowerCase().endsWith(STUDENT_EMAIL_SUFFIX) ?? false
}

function policyHeader(config: LimitConfig): string {
  return `"endpoint";q=${config.limit};w=${config.period}`
}

const localCounters = new Map<string, { windowId: number; count: number }>()

export type RateLimitOutcome =
  | { ok: true; headers: Record<string, string> }
  | { ok: false; response: Response }

function windowResetUnix(nowSec: number, period: number): number {
  return (Math.floor(nowSec / period) + 1) * period
}

function secondsUntilWindowReset(period: number, nowSec = Math.floor(Date.now() / 1000)): number {
  return Math.max(1, windowResetUnix(nowSec, period) - nowSec)
}

function windowIdForPeriod(period: number, nowSec = Math.floor(Date.now() / 1000)): number {
  return Math.floor(nowSec / period)
}

function pruneLocalCounters(activeWindowId: number): void {
  for (const [key, entry] of localCounters) {
    if (entry.windowId !== activeWindowId) localCounters.delete(key)
  }
}

export function getClientKey(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip")
  if (cf?.trim()) return cf.trim()
  const xff = request.headers.get("x-forwarded-for")
  const first = xff?.split(",")[0]?.trim()
  if (first) return first
  return "anonymous"
}

function bumpLocalCounter(key: string, config: LimitConfig): number {
  const { limit, period } = config
  const windowId = windowIdForPeriod(period)
  pruneLocalCounters(windowId)
  const entry = localCounters.get(key)
  if (!entry) {
    localCounters.set(key, { windowId, count: 1 })
    return limit - 1
  }
  entry.count += 1
  return Math.max(0, limit - entry.count)
}

function buildRateLimitHeaders(
  config: LimitConfig = RATE_LIMIT_CONFIG.endpoint,
  remaining?: number,
  nowSec = Math.floor(Date.now() / 1000),
): Record<string, string> {
  const { limit, period } = config
  const reset = windowResetUnix(nowSec, period)
  const retryAfter = Math.max(1, reset - nowSec)
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Reset": String(reset),
    "RateLimit-Policy": policyHeader(config),
    RateLimit: remaining === undefined ? `"endpoint";t=${retryAfter}` : `"endpoint";r=${remaining};t=${retryAfter}`,
  }
  if (remaining !== undefined) headers["X-RateLimit-Remaining"] = String(remaining)
  return headers
}

async function limitOrPass(limiter: RateLimitBinding | undefined, key: string): Promise<boolean> {
  if (!limiter) return true
  const { success } = await limiter.limit({ key })
  return success
}

function rateLimitResponse(config: LimitConfig = RATE_LIMIT_CONFIG.endpoint): Response {
  const retryAfter = secondsUntilWindowReset(config.period)
  const headers = {
    ...mcpCorsHeaders(),
    ...buildRateLimitHeaders(config, 0),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": CACHE_CONTROL_ERROR,
    "Retry-After": String(retryAfter),
  }
  return Response.json(
    {
      error: "Too many requests",
      detail: "Rate limit exceeded. Try again later.",
      retryAfter,
    },
    { status: 429, headers },
  )
}

export async function enforceRateLimits(
  request: Request,
  env: Env,
  caller?: McpCaller,
): Promise<RateLimitOutcome> {
  try {
    const pathname = new URL(request.url).pathname
    const student = caller ? isStudentAccount(caller.email) : false
    const config = caller && !student ? RATE_LIMIT_CONFIG.standard : RATE_LIMIT_CONFIG.endpoint
    const limiter = caller && !student ? env.STANDARD_RATE_LIMIT : env.API_RATE_LIMIT
    const client = caller ? `${student ? "student" : "standard"}:${caller.sub}` : getClientKey(request)
    const baseKey = `${client}:${pathname}`
    pruneLocalCounters(windowIdForPeriod(config.period))

    if (!(await limitOrPass(limiter, baseKey))) {
      console.warn("[mcp] rate limit exceeded", { pathname, client: client.slice(0, 12) })
      return { ok: false, response: rateLimitResponse(config) }
    }

    if (limiter) return { ok: true, headers: buildRateLimitHeaders(config) }

    return { ok: true, headers: buildRateLimitHeaders(config, bumpLocalCounter(baseKey, config)) }
  } catch (error) {
    console.warn("[mcp] rate limiter unavailable (fail-open)", { error })
    return { ok: true, headers: { "RateLimit-Policy": policyHeader(RATE_LIMIT_CONFIG.endpoint) } }
  }
}
