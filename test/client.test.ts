import { afterEach, describe, expect, it, vi } from "vitest"

import { apiGet, buildUrl, McpApiError } from "../src/client"
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../src/version"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("buildUrl", () => {
  it("joins a base and path and serializes query values", () => {
    expect(
      buildUrl("https://api.example.com", "api/v1/meta", {
        group: "A",
        all: true,
        flag: false,
        n: 0,
        empty: "",
        skip: undefined,
        nil: null,
      }),
    ).toBe("https://api.example.com/api/v1/meta?group=A&all=true&flag=false&n=0")
  })

  it("accepts a leading slash and a trailing slash on the base", () => {
    expect(
      buildUrl("https://api.example.com/", "/api/v1/today", { date: "2026-01-02" }),
    ).toBe("https://api.example.com/api/v1/today?date=2026-01-02")
  })

  it("omits the query string when every value is empty", () => {
    expect(buildUrl("https://api.example.com", "/api/v1/meta", { group: "", all: undefined })).toBe(
      "https://api.example.com/api/v1/meta",
    )
  })
})

describe("apiGet", () => {
  it("fetches the url from buildUrl with the mcp user agent", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true }))
    vi.stubGlobal("fetch", fetchMock)
    vi.stubEnv("MCP_API_BASE_URL", "https://env.example/ignored/")

    const query = { group: "B", all: false }
    const body = await apiGet("/api/v1/meta", query, "https://api.example.com/")

    expect(body).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith(buildUrl("https://api.example.com", "/api/v1/meta", query), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": `${MCP_SERVER_NAME}-mcp/${MCP_SERVER_VERSION}`,
      },
    })
  })

  it("uses MCP_API_BASE_URL when no base is passed", async () => {
    const fetchMock = vi.fn(async () => Response.json({ sessions: [] }))
    vi.stubGlobal("fetch", fetchMock)
    vi.stubEnv("MCP_API_BASE_URL", "https://env.example.com///")

    await apiGet("api/v1/meta")

    expect(fetchMock).toHaveBeenCalledWith(
      "https://env.example.com/api/v1/meta",
      expect.objectContaining({ method: "GET" }),
    )
  })

  it("maps a json error body onto McpApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "Unknown session", detail: "Session 1999 is not published." }, { status: 404 }),
      ),
    )

    await expect(apiGet("/api/v1/calendar", undefined, "https://api.example.com")).rejects.toMatchObject({
      name: "McpApiError",
      message: "Unknown session",
      status: 404,
      detail: "Session 1999 is not published.",
      retryAfter: undefined,
    })
  })

  it("uses the response text as detail when the body is not json", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("upstream down", {
            status: 502,
            headers: { "content-type": "text/plain" },
          }),
      ),
    )

    const error = await apiGet("/api/v1/today", undefined, "https://api.example.com").catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(McpApiError)
    expect(error).toMatchObject({
      message: "API request failed (502)",
      status: 502,
      detail: "upstream down",
      retryAfter: undefined,
    })
  })

  it("falls back when a json content type cannot be parsed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("not-json", {
            status: 500,
            headers: { "content-type": "application/json" },
          }),
      ),
    )

    await expect(apiGet("/api/v1/meta", undefined, "https://api.example.com")).rejects.toMatchObject({
      message: "API request failed (500)",
      status: 500,
      detail: undefined,
    })
  })

  it("maps a 429 Retry-After header when the body has no detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(null, {
            status: 429,
            headers: { "Retry-After": "9" },
          }),
      ),
    )

    await expect(apiGet("/api/v1/public-holiday", undefined, "https://api.example.com")).rejects.toMatchObject({
      message: "API request failed (429)",
      status: 429,
      detail: "Rate limited. Retry after 9s.",
      retryAfter: 9,
    })
  })

  it("keeps an explicit detail and still records Retry-After", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: "Too many requests", detail: "slow down" },
          { status: 429, headers: { "Retry-After": "3" } },
        ),
      ),
    )

    await expect(apiGet("/api/v1/calendar", undefined, "https://api.example.com")).rejects.toMatchObject({
      message: "Too many requests",
      status: 429,
      detail: "slow down",
      retryAfter: 3,
    })
  })

  it("ignores a non-numeric Retry-After header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(null, {
            status: 429,
            headers: { "Retry-After": "soon" },
          }),
      ),
    )

    await expect(apiGet("/api/v1/meta", undefined, "https://api.example.com")).rejects.toMatchObject({
      message: "API request failed (429)",
      status: 429,
      detail: undefined,
      retryAfter: undefined,
    })
  })
})
