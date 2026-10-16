import { describe, expect, it } from "vitest"

import { McpApiError } from "../src/client"
import { errorResult, trimArrayField } from "../src/tools"

describe("trimArrayField", () => {
  it("returns non-objects unchanged", () => {
    expect(trimArrayField(null, ["activities"], 1, true)).toBeNull()
    expect(trimArrayField("calendar", ["activities"])).toBe("calendar")
    expect(trimArrayField([{ id: 1 }], ["activities"], 1)).toEqual([{ id: 1 }])
  })

  it("limits and compacts named array fields without mutating the input", () => {
    const input = {
      meta: "keep",
      activities: [
        { id: 1, description: "long", notes: "n", detail: "d", name: "Week 1" },
        { id: 2, name: "Week 2" },
        { id: 3, name: "Week 3" },
      ],
      sessions: [{ id: "s1", description: "drop me" }],
      missing: "nope",
    }

    const result = trimArrayField(input, ["activities", "sessions", "missing"], 2, true)

    expect(result).toEqual({
      meta: "keep",
      activities: [
        { id: 1, name: "Week 1" },
        { id: 2, name: "Week 2" },
      ],
      sessions: [{ id: "s1" }],
      missing: "nope",
      truncated: true,
      returned: 2,
      total: 3,
    })
    expect(input.activities[0]).toEqual({
      id: 1,
      description: "long",
      notes: "n",
      detail: "d",
      name: "Week 1",
    })
  })

  it("does not mark the payload truncated when the array fits", () => {
    expect(
      trimArrayField(
        { holidays: [{ name: "New Year", description: "keep" }, "closed"] },
        ["holidays"],
        5,
        false,
      ),
    ).toEqual({
      holidays: [{ name: "New Year", description: "keep" }, "closed"],
    })
  })

  it("compacts without a limit", () => {
    expect(
      trimArrayField({ items: [{ name: "a", notes: "n" }, null] }, ["items"], undefined, true),
    ).toEqual({
      items: [{ name: "a" }, null],
    })
  })
})

describe("errorResult", () => {
  it("formats an McpApiError with detail and retry", () => {
    expect(errorResult(new McpApiError("Too many requests", 429, "slow down", 5))).toEqual({
      isError: true,
      content: [{ type: "text", text: "Too many requests — slow down — Retry-After: 5s" }],
      structuredContent: {
        error: "Too many requests",
        detail: "slow down",
        status: 429,
        retryAfter: 5,
      },
    })
  })

  it("omits missing detail and retry text", () => {
    expect(errorResult(new McpApiError("Unknown session", 404))).toEqual({
      isError: true,
      content: [{ type: "text", text: "Unknown session" }],
      structuredContent: {
        error: "Unknown session",
        detail: undefined,
        status: 404,
        retryAfter: undefined,
      },
    })
  })

  it("maps a generic Error and a non-Error throw", () => {
    expect(errorResult(new Error("boom"))).toEqual({
      isError: true,
      content: [{ type: "text", text: "boom" }],
      structuredContent: { error: "boom" },
    })
    expect(errorResult("plain")).toEqual({
      isError: true,
      content: [{ type: "text", text: "plain" }],
      structuredContent: { error: "plain" },
    })
  })
})
