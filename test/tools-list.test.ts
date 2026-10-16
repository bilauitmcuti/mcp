import { afterEach, describe, expect, it, vi } from "vitest"

import worker from "../src/index"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function rpcBody(text: string): { result?: { tools?: Array<{ name: string; inputSchema: unknown }> } } {
  const trimmed = text.trim()
  if (trimmed.startsWith("{")) return JSON.parse(trimmed) as { result?: { tools?: Array<{ name: string; inputSchema: unknown }> } }

  const payloads = trimmed
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)) as { result?: { tools?: Array<{ name: string; inputSchema: unknown }> } })

  const listed = payloads.find((payload) => payload.result?.tools)
  if (!listed) throw new Error(`No tools/list payload in response:\n${text}`)
  return listed
}

describe("tools/list", () => {
  it("snapshots tool names and input schemas without calling the network", async () => {
    const fetchMock = vi.fn(() => {
      throw new Error("network disabled")
    })
    vi.stubGlobal("fetch", fetchMock)
    vi.spyOn(console, "info").mockImplementation(() => {})

    const response = await worker.fetch(
      new Request("https://mcp.bilauitmcuti.com/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        }),
      }),
      { MCP_API_BASE_URL: "https://api.example.test" },
    )

    expect(response.status).toBe(200)
    const body = rpcBody(await response.text())
    const tools = (body.result?.tools ?? []).map((tool) => ({
      name: tool.name,
      inputSchema: tool.inputSchema,
    }))

    expect(tools.map((tool) => tool.name)).toEqual([
      "get_academic_meta",
      "get_calendar",
      "get_today_status",
      "get_lecture_weeks",
      "get_public_holiday_meta",
      "get_public_holidays",
    ])
    expect(tools).toMatchSnapshot()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
