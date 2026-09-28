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

function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
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

export async function apiGet(
  path: string,
  query?: Record<string, QueryValue>,
  baseUrl?: string,
): Promise<unknown> {
  const url = buildUrl(resolveBaseUrl(baseUrl), path, query)
  const response = await fetch(url, {
    method: "GET",
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
    } catch {
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
}
