export interface RateLimitBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>
}

export interface Env {
  MCP_API_BASE_URL?: string
  DOCS_BASE_URL?: string
  API_RATE_LIMIT?: RateLimitBinding
  /** Other Google accounts: 10 requests / 10 seconds (Cloudflare period cannot be 30). */
  STANDARD_RATE_LIMIT?: RateLimitBinding
  /** D1 — Better Auth sessions and accounts */
  DB?: D1Database
  BETTER_AUTH_SECRET?: string
  /** Public origin, e.g. https://mcp.bilauitmcuti.com */
  BETTER_AUTH_URL?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  /** Bearer token required for POST /api/auth/__migrate */
  AUTH_MIGRATE_SECRET?: string
  /** Better Auth dashboard / infra — from the dashboard “Copy key” step. Not used by MCP clients. */
  BETTER_AUTH_API_KEY?: string
}
