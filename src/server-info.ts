import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./version"

export const MCP_SERVER_TITLE = "Bila UiTM Cuti" as const

export const MCP_SERVER_DESCRIPTION =
  "Read-only MCP server for the UiTM academic calendar and Malaysia public holidays." as const

export const MCP_INSTRUCTIONS = [
  "Unofficial UiTM calendar data — not affiliated with UiTM. Verify important dates before relying on them.",
  "Call List UiTM sessions & programs first when you need a session ID for calendar or lecture-week tools.",
  "UiTM groups are A or B. Check if a date is a class day requires group.",
  "For public holidays, call List public holiday filters first when you need valid year or state values.",
  "All tools are read-only GET requests. Use limit/compact on large calendar or holiday results.",
].join("\n")

const DEFAULT_DOCS_BASE = "https://docs.bilauitmcuti.com"

export function buildMcpServerInfo(docsBaseUrl = DEFAULT_DOCS_BASE) {
  const docs = docsBaseUrl.replace(/\/+$/, "")
  const iconBase = `${docs}/listing`
  return {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    title: MCP_SERVER_TITLE,
    description: MCP_SERVER_DESCRIPTION,
    websiteUrl: `${docs}/docs/mcp`,
    icons: [
      { src: `${iconBase}/icon-16.png`, mimeType: "image/png", sizes: ["16x16"] },
      { src: `${iconBase}/icon-32.png`, mimeType: "image/png", sizes: ["32x32"] },
      { src: `${iconBase}/icon-48.png`, mimeType: "image/png", sizes: ["48x48"] },
      { src: `${iconBase}/icon-512.png`, mimeType: "image/png", sizes: ["512x512"] },
    ],
  }
}

export function mcpHandlerOptions(docsBaseUrl?: string) {
  return {
    serverInfo: buildMcpServerInfo(docsBaseUrl),
    instructions: MCP_INSTRUCTIONS,
  }
}
