import { CACHE_CONTROL_ERROR, mcpCorsHeaders } from "./cors"
import type { Env, RateLimitBinding } from "./env"

export const RATE_LIMIT_CONFIG = {
  endpoint: { limit: 500, period: 60 },
} as const

const RATE_LIMIT_POLICY_HEADER = `"endpoint";q=${RATE_LIMIT_CONFIG.endpoint.limit};w=${RATE_LIMIT_CONFIG.endpoint.period}`

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

function bumpLocalCounter(key: string): number {
  const { limit, period } = RATE_LIMIT_CONFIG.endpoint
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

function buildRateLimitHeaders(remaining?: number, nowSec = Math.floor(Date.now() / 1000)): Record<string, string> {
  const { limit, period } = RATE_LIMIT_CONFIG.endpoint
  const reset = windowResetUnix(nowSec, period)
  const retryAfter = Math.max(1, reset - nowSec)
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Reset": String(reset),
    "RateLimit-Policy": RATE_LIMIT_POLICY_HEADER,
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

function rateLimitResponse(): Response {
  const retryAfter = secondsUntilWindowReset(RATE_LIMIT_CONFIG.endpoint.period)
  const headers = {
    ...mcpCorsHeaders(),
    ...buildRateLimitHeaders(0),
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

export async function enforceRateLimits(request: Request, env: Env): Promise<RateLimitOutcome> {
  try {
    const pathname = new URL(request.url).pathname
    const client = getClientKey(request)
    const baseKey = `${client}:${pathname}`
    pruneLocalCounters(windowIdForPeriod(RATE_LIMIT_CONFIG.endpoint.period))

    if (!(await limitOrPass(env.API_RATE_LIMIT, baseKey))) {
      console.warn("[mcp] rate limit exceeded", { pathname, client: client.slice(0, 12) })
      return { ok: false, response: rateLimitResponse() }
    }

    // The Workers binding only returns success, so its remaining count is not this Map.
    if (env.API_RATE_LIMIT) return { ok: true, headers: buildRateLimitHeaders() }

    return { ok: true, headers: buildRateLimitHeaders(bumpLocalCounter(baseKey)) }
  } catch (error) {
    console.warn("[mcp] rate limiter unavailable (fail-open)", { error })
    return { ok: true, headers: { "RateLimit-Policy": RATE_LIMIT_POLICY_HEADER } }
  }
}
