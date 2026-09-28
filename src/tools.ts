import type { McpServer } from "@modelcontextprotocol/server"

import { apiGet, McpApiError } from "./client"
import {
  academicMetaSchema,
  calendarSchema,
  lectureWeeksSchema,
  publicHolidayMetaSchema,
  publicHolidaysSchema,
  todayStatusSchema,
} from "./schemas"
import { mcpInputSchema } from "./tool-input-schema"

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: true,
} as const

function textResult(data: unknown) {
  const structured =
    data !== null && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : { result: data }

  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: structured,
  }
}

function errorResult(error: unknown) {
  if (error instanceof McpApiError) {
    const parts = [error.message]
    if (error.detail) parts.push(error.detail)
    if (error.retryAfter != null) parts.push(`Retry-After: ${error.retryAfter}s`)
    return {
      isError: true as const,
      content: [{ type: "text" as const, text: parts.join(" — ") }],
      structuredContent: {
        error: error.message,
        detail: error.detail,
        status: error.status,
        retryAfter: error.retryAfter,
      },
    }
  }
  const message = error instanceof Error ? error.message : String(error)
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
    structuredContent: { error: message },
  }
}

function trimArrayField(
  data: unknown,
  fieldNames: string[],
  limit?: number,
  compact?: boolean,
): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data
  const out: Record<string, unknown> = { ...(data as Record<string, unknown>) }

  for (const field of fieldNames) {
    const value = out[field]
    if (!Array.isArray(value)) continue
    let rows = value as unknown[]
    if (typeof limit === "number") rows = rows.slice(0, limit)
    if (compact) {
      rows = rows.map((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) return row
        const { description: _d, notes: _n, detail: _dt, ...rest } = row as Record<string, unknown>
        return rest
      })
    }
    out[field] = rows
    if (typeof limit === "number" && Array.isArray(value) && value.length > limit) {
      out.truncated = true
      out.returned = rows.length
      out.total = value.length
    }
  }

  return out
}

async function runTool(name: string, fn: () => Promise<ReturnType<typeof textResult>>) {
  const started = Date.now()
  try {
    const result = await fn()
    console.info("[mcp] tool ok", { tool: name, ms: Date.now() - started })
    return result
  } catch (error) {
    const result = errorResult(error)
    console.warn("[mcp] tool error", {
      tool: name,
      ms: Date.now() - started,
      status: error instanceof McpApiError ? error.status : undefined,
    })
    return result
  }
}

export function registerBilaTools(server: McpServer, apiBaseUrl: string): void {
  server.registerTool(
    "get_academic_meta",
    {
      title: "List UiTM sessions & programs",
      description:
        "Use this first when you need valid session IDs or program options. Filter by Group A or B, or return the full catalog with all=true.",
      inputSchema: mcpInputSchema(academicMetaSchema),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) =>
      runTool("get_academic_meta", async () => {
        const data = await apiGet(
          "/api/v1/meta",
          {
            group: args.group,
            all: args.all,
          },
          apiBaseUrl,
        )
        return textResult(data)
      }),
  )

  server.registerTool(
    "get_calendar",
    {
      title: "Get academic calendar activities",
      description:
        "Fetch lectures, breaks, exams, and other calendar activities for a session or group. Prefer a specific session from List UiTM sessions & programs. Use limit/compact if the result is large.",
      inputSchema: mcpInputSchema(calendarSchema),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) =>
      runTool("get_calendar", async () => {
        const data = await apiGet(
          "/api/v1/calendar",
          {
            session: args.session,
            group: args.group,
            program: args.program,
            type: args.type,
            allSessions: args.allSessions,
            all: args.all,
          },
          apiBaseUrl,
        )
        return textResult(
          trimArrayField(data, ["activities", "sessions", "data"], args.limit, args.compact),
        )
      }),
  )

  server.registerTool(
    "get_today_status",
    {
      title: "Check if a date is a class day",
      description:
        "Tell whether a date is a class day, break, exam week, or study week. group is required (A or B). Omit date to use today.",
      inputSchema: mcpInputSchema(todayStatusSchema),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) =>
      runTool("get_today_status", async () => {
        const data = await apiGet(
          "/api/v1/today",
          {
            group: args.group,
            date: args.date,
            session: args.session,
            program: args.program,
          },
          apiBaseUrl,
        )
        return textResult(data)
      }),
  )

  server.registerTool(
    "get_lecture_weeks",
    {
      title: "Get lecture week dates",
      description:
        "Return Week 1–14 start and end dates for one session. Requires a session ID from List UiTM sessions & programs.",
      inputSchema: mcpInputSchema(lectureWeeksSchema),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) =>
      runTool("get_lecture_weeks", async () => {
        const data = await apiGet(
          "/api/v1/lecture-weeks",
          {
            session: args.session,
          },
          apiBaseUrl,
        )
        return textResult(data)
      }),
  )

  server.registerTool(
    "get_public_holiday_meta",
    {
      title: "List public holiday filters",
      description:
        "Use this first for holidays: available years, coverage options, and Malaysia state/territory slugs.",
      inputSchema: mcpInputSchema(publicHolidayMetaSchema),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () =>
      runTool("get_public_holiday_meta", async () => {
        const data = await apiGet("/api/v1/public-holiday/meta", undefined, apiBaseUrl)
        return textResult(data)
      }),
  )

  server.registerTool(
    "get_public_holidays",
    {
      title: "List Malaysia public holidays",
      description:
        "Return public holidays for a year, optionally nationwide or for one state. Call List public holiday filters first if you need valid year or state values. Use limit/compact if the result is large.",
      inputSchema: mcpInputSchema(publicHolidaysSchema),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) =>
      runTool("get_public_holidays", async () => {
        const data = await apiGet(
          "/api/v1/public-holiday",
          {
            year: args.year,
            coverage: args.coverage,
            state: args.state,
          },
          apiBaseUrl,
        )
        return textResult(
          trimArrayField(data, ["holidays", "data", "items"], args.limit, args.compact),
        )
      }),
  )
}
