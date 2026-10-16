import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { enforceRateLimits, getClientKey, RATE_LIMIT_CONFIG } from "../src/rate-limit"

const NOW_MS = 1_700_000_030_000
const NOW_SEC = NOW_MS / 1000
const PERIOD = RATE_LIMIT_CONFIG.endpoint.period
const LIMIT = RATE_LIMIT_CONFIG.endpoint.limit
const RESET = (Math.floor(NOW_SEC / PERIOD) + 1) * PERIOD

function request(url: string, headers?: HeadersInit): Request {
  return new Request(url, { headers })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW_MS)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("getClientKey", () => {
  it("prefers cf-connecting-ip, then the first forwarded address", () => {
    expect(
      getClientKey(
        request("https://mcp.example/mcp", {
          "cf-connecting-ip": " 203.0.113.8 ",
          "x-forwarded-for": "198.51.100.4, 203.0.113.8",
        }),
      ),
    ).toBe("203.0.113.8")
    expect(
      getClientKey(request("https://mcp.example/mcp", { "x-forwarded-for": " 198.51.100.4 , 203.0.113.8" })),
    ).toBe("198.51.100.4")
    expect(getClientKey(request("https://mcp.example/mcp"))).toBe("anonymous")
  })
})

describe("enforceRateLimits", () => {
  it("counts a local window and resets it when the period rolls over", async () => {
    const req = request("https://mcp.example/mcp/health", { "cf-connecting-ip": "203.0.113.10" })
    const first = await enforceRateLimits(req, {})
    const second = await enforceRateLimits(req, {})

    expect(first).toEqual({
      ok: true,
      headers: {
        "X-RateLimit-Limit": String(LIMIT),
        "X-RateLimit-Remaining": String(LIMIT - 1),
        "X-RateLimit-Reset": String(RESET),
        "RateLimit-Policy": `"endpoint";q=${LIMIT};w=${PERIOD}`,
        RateLimit: `"endpoint";r=${LIMIT - 1};t=${RESET - NOW_SEC}`,
      },
    })
    expect(second.ok && second.headers["X-RateLimit-Remaining"]).toBe(String(LIMIT - 2))

    vi.setSystemTime(NOW_MS + PERIOD * 1000)
    const rolled = await enforceRateLimits(req, {})
    expect(rolled.ok && rolled.headers["X-RateLimit-Remaining"]).toBe(String(LIMIT - 1))
  })

  it("returns 429 when the binding denies the request", async () => {
    const outcome = await enforceRateLimits(
      request("https://mcp.example/mcp", { "cf-connecting-ip": "203.0.113.11" }),
      { API_RATE_LIMIT: { limit: async () => ({ success: false }) } },
    )

    expect(outcome.ok).toBe(false)
    if (outcome.ok) return

    expect(outcome.response.status).toBe(429)
    expect(outcome.response.headers.get("Retry-After")).toBe(String(RESET - NOW_SEC))
    expect(outcome.response.headers.get("X-RateLimit-Remaining")).toBe("0")
    expect(outcome.response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(await outcome.response.json()).toEqual({
      error: "Too many requests",
      detail: "Rate limit exceeded. Try again later.",
      retryAfter: RESET - NOW_SEC,
    })
  })

  it("fails open when the binding throws", async () => {
    const outcome = await enforceRateLimits(
      request("https://mcp.example/mcp", { "cf-connecting-ip": "203.0.113.12" }),
      {
        API_RATE_LIMIT: {
          limit: async () => {
            throw new Error("binding down")
          },
        },
      },
    )

    expect(outcome).toEqual({
      ok: true,
      headers: { "RateLimit-Policy": `"endpoint";q=${LIMIT};w=${PERIOD}` },
    })
  })
})
