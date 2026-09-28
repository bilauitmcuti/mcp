export interface RateLimitBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>
}

export interface Env {
  MCP_API_BASE_URL?: string
  DOCS_BASE_URL?: string
  API_RATE_LIMIT?: RateLimitBinding
}
