const RATE_LIMIT_EXPOSE_HEADERS =
  "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, RateLimit, RateLimit-Policy, Retry-After"

export const CACHE_CONTROL_ERROR = "private, no-store"

export function mcpCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Accept, Authorization, Mcp-Session-Id, mcp-session-id",
    "Access-Control-Expose-Headers": RATE_LIMIT_EXPOSE_HEADERS,
  }
}
