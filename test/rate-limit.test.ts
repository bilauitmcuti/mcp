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

  it("uses the 60s window for a student Google account and the 10s window for other accounts", async () => {
    const student = RATE_LIMIT_CONFIG.endpoint
    const standard = RATE_LIMIT_CONFIG.standard
    const studentReset = (Math.floor(NOW_SEC / student.period) + 1) * student.period
    const standardReset = (Math.floor(NOW_SEC / standard.period) + 1) * standard.period
    const req = request("https://mcp.example/mcp")

    const studentOutcome = await enforceRateLimits(req, {}, {
      sub: "student-1",
      email: "2024123456@student.uitm.edu.my",
    })
    const otherOutcome = await enforceRateLimits(req, {}, {
      sub: "other-1",
      email: "person@gmail.com",
    })

    expect(studentOutcome.ok && studentOutcome.headers).toMatchObject({
      "X-RateLimit-Limit": String(student.limit),
      "X-RateLimit-Remaining": String(student.limit - 1),
      "X-RateLimit-Reset": String(studentReset),
      "RateLimit-Policy": `"endpoint";q=${student.limit};w=${student.period}`,
    })
    expect(otherOutcome.ok && otherOutcome.headers).toMatchObject({
      "X-RateLimit-Limit": String(standard.limit),
      "X-RateLimit-Remaining": String(standard.limit - 1),
      "X-RateLimit-Reset": String(standardReset),
      "RateLimit-Policy": `"endpoint";q=${standard.limit};w=${standard.period}`,
    })

    const denied = await enforceRateLimits(
      req,
      { STANDARD_RATE_LIMIT: { limit: async () => ({ success: false }) } },
      { sub: "other-2", email: "person@gmail.com" },
    )
    expect(denied.ok).toBe(false)
    if (denied.ok) return
    expect(denied.response.headers.get("Retry-After")).toBe(String(standardReset - NOW_SEC))
    expect(denied.response.headers.get("X-RateLimit-Limit")).toBe(String(standard.limit))
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
