import { apiKeyClient } from "@better-auth/api-key/client"
import { createAuthClient } from "better-auth/client"

import { AUTH_BASE_PATH } from "./auth"

/** Browser / Node client — point `baseURL` at the Worker host (no trailing slash). */
export function createMcpAuthClient(baseURL: string) {
  const origin = baseURL.replace(/\/+$/, "")
  return createAuthClient({
    baseURL: origin,
    basePath: AUTH_BASE_PATH,
    plugins: [apiKeyClient()],
  })
}