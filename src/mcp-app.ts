import { createMcpHandler } from "mcp-handler"

import { mcpHandlerOptions } from "./server-info"
import { registerBilaTools } from "./tools"

export function createCalendarMcpHandler(apiBase: string, docsBase: string) {
  return createMcpHandler(
    (server) => {
      registerBilaTools(server, apiBase)
    },
    mcpHandlerOptions(docsBase),
  )
}
