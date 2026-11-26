# Bila UiTM Cuti

Answer questions about the UiTM academic calendar and Malaysia public holidays from a conversation. Ask whether a date is a class day, when lecture week 1 starts, which exams are on a session, or which public holidays fall in a state.

## Use it

Connect the bundled Bila UiTM Cuti connector at `https://mcp.bilauitmcuti.com/mcp` and complete **Google OAuth** when the client asks (the hosted server requires sign-in; there is no API key in config). Then ask in plain language. The skill tells the agent which tool to call, to resolve the current session id first, and to answer with the date, group, and activity instead of raw JSON.

Other agent harnesses get the same workflow from the MCP server instructions as soon as they connect to `https://mcp.bilauitmcuti.com/mcp`. They do not need this plugin.

## Data

Tool arguments are sent as query parameters to the public read-only API at api.bilauitmcuti.com. The plugin stores nothing. The calendar is unofficial and is not affiliated with UiTM. Verify dates that matter before you rely on them.
