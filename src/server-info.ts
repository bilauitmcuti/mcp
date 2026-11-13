import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./version"

export const MCP_SERVER_TITLE = "Bila UiTM Cuti" as const

export const MCP_SERVER_DESCRIPTION =
  "Read-only MCP server for the UiTM academic calendar and Malaysia public holidays." as const

export const MCP_INSTRUCTIONS = [
  "Unofficial UiTM calendar data — not affiliated with UiTM. Do not invent dates. Verify dates that matter.",
  "",
  "Route the question:",
  "- One date is a class day, break, exam week, or study week: call get_today_status. group is required (A or B). Omit date for today. If the user did not name a group, ask before calling.",
  "- Week 1–14: call get_academic_meta for that group, then get_lecture_weeks with the session id just returned.",
  "- Lectures, exams, breaks, or registration: call get_academic_meta, then get_calendar with that session and type when the user named one. Default limit to about 20 and compact to true. Set all or allSessions only when they ask for every session.",
  "- Which sessions or programs exist: call get_academic_meta only. program is mainly a Group B filter.",
  '- Malaysia public holidays: call get_public_holiday_meta when the year or state slug is unknown, then get_public_holidays. A named state with coverage omitted means nationwide holidays plus that state. coverage "nationwide" is federal only. coverage "all" ignores state. Use limit and compact on a full-year list.',
  "",
  "Never reuse a session id from chat history or docs. Session ids change each term.",
  "",
  "Reply with the date, group, session, and the activity or holiday name. Add one line that the data is unofficial and dates that matter should be checked. Do not paste raw JSON.",
  "",
  "On a 429, wait for Retry-After and retry once.",
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
    websiteUrl: `${docs}/mcp-server`,
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
