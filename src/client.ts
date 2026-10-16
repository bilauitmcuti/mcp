import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./version"

export class McpApiError extends Error {
  readonly status: number
  readonly detail?: string
  readonly retryAfter?: number

  constructor(message: string, status: number, detail?: string, retryAfter?: number) {
    super(message)
    this.name = "McpApiError"
    this.status = status
    this.detail = detail
    this.retryAfter = retryAfter
  }
}

const DEFAULT_API_BASE = "https://api.bilauitmcuti.com"
const API_TIMEOUT_MS = 10_000

export function resolveBaseUrl(explicit?: string): string {
  const fromArg = explicit?.trim()
  if (fromArg) return fromArg.replace(/\/+$/, "")
  const fromEnv = process.env.MCP_API_BASE_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, "")
  return DEFAULT_API_BASE
}

type QueryValue = string | number | boolean | undefined | null

function serializeQueryValue(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "true" : "false"
  return String(value)
}

export function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, `${baseUrl}/`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue
      url.searchParams.set(key, serializeQueryValue(value))
    }
  }
  return url.toString()
}

interface ApiErrorBody {
  error?: string
  detail?: string
}

function upstreamNetworkError(error: unknown, timedOut: boolean): McpApiError {
  if (timedOut) {
    return new McpApiError(
      `The calendar API timed out after ${API_TIMEOUT_MS / 1000} seconds.`,
      504,
      "Wait a few seconds and retry. If it keeps timing out, check https://api.bilauitmcuti.com.",
    )
  }
  const raw = error instanceof Error && error.message ? error.message : "The network request failed"
  const reason = raw.replace(/\.+$/, "")
  return new McpApiError(
    "Could not reach the calendar API.",
    502,
    `${reason}. Retry shortly. If it continues, check https://api.bilauitmcuti.com.`,
  )
}

export async function apiGet(
  path: string,
  query?: Record<string, QueryValue>,
  baseUrl?: string,
): Promise<unknown> {
  const url = buildUrl(resolveBaseUrl(baseUrl), path, query)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": `${MCP_SERVER_NAME}-mcp/${MCP_SERVER_VERSION}`,
      },
    })

    const retryAfterRaw = response.headers.get("Retry-After")
    const retryAfter = retryAfterRaw ? Number.parseInt(retryAfterRaw, 10) : undefined
    const retryAfterSeconds = Number.isFinite(retryAfter) ? retryAfter : undefined

    let body: unknown = null
    const contentType = response.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      try {
        body = await response.json()
      } catch (error) {
        if (controller.signal.aborted) throw error
        body = null
      }
    } else {
      const text = await response.text()
      body = text || null
    }

    if (!response.ok) {
      const errBody = (body && typeof body === "object" ? body : {}) as ApiErrorBody
      const message = errBody.error ?? `API request failed (${response.status})`
      const detail =
        errBody.detail ??
        (typeof body === "string" && body ? body : undefined) ??
        (response.status === 429 && retryAfterSeconds
          ? `Rate limited. Retry after ${retryAfterSeconds}s.`
          : undefined)
      throw new McpApiError(message, response.status, detail, retryAfterSeconds)
    }

    return body
  } catch (error) {
    if (error instanceof McpApiError) throw error
    throw upstreamNetworkError(error, controller.signal.aborted)
  } finally {
    clearTimeout(timeout)
  }
}
