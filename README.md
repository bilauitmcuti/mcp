# Bila UiTM Cuti MCP server

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version 1.0.2](https://img.shields.io/badge/version-1.0.2-blue)](package.json)
![Remote MCP, Google sign-in](https://img.shields.io/badge/MCP-remote_%7C_Google_sign--in-2ea44f)

A hosted [Model Context Protocol](https://modelcontextprotocol.io) server for the UiTM academic calendar and Malaysia public holidays. It is read-only. Clients sign in with Google before they can call tools.

**URL:** `https://mcp.bilauitmcuti.com/mcp` (Streamable HTTP)

Docs: [docs.bilauitmcuti.com/mcp-server](https://docs.bilauitmcuti.com/mcp-server)

The data is unofficial and not affiliated with UiTM. Check any date that matters before you rely on it.

## What you can ask

- Which sessions and programs are published, and when lectures, breaks, registration, and exams fall
- Whether a date is a class day, a break, an exam week, or a study week
- Week 1–14 dates for one session
- Malaysia public holidays for a year, nationwide or for one state

## Rate limits

Signed-in calls to `/mcp` are counted per Google account.

| Account | Limit |
| --- | --- |
| `@student.uitm.edu.my` | 120 requests / 60 seconds |
| Any other Google account | 10 requests / 10 seconds |

`GET /mcp/health` is not limited. Details are in [Sign-in, privacy, and rate limits](docs/authentication.md#rate-limit).

## Guides

- [Install a client](docs/installation.md), including the Cursor sign-in fix
- [Tools](docs/tools.md)
- [Sign-in, privacy, and rate limits](docs/authentication.md)
- [Develop and deploy](docs/develop.md)

## Tools

Six read-only tools. A successful call returns indented JSON text. Call `get_academic_meta` before a calendar or lecture-week tool when you need a session id. Call `get_public_holiday_meta` before a holiday tool when you need a published year or state. Session ids change each term. Parameters, allowed values, and large-result fields are in [Tools](docs/tools.md).

| Tool | Returns |
| --- | --- |
| `get_academic_meta` | Sessions and programs |
| `get_calendar` | Lectures, breaks, exams, registration, and other activities |
| `get_today_status` | Whether a date is a class day, a break, an exam week, or a study week |
| `get_lecture_weeks` | Week 1–14 start and end dates for one session |
| `get_public_holiday_meta` | Years, coverage options, and Malaysia state slugs |
| `get_public_holidays` | Public holidays for a year, nationwide or for one state |

## Sponsors

This server is free to use. If it helps you, you can support the work:

- [GitHub Sponsors](https://github.com/sponsors/shahrulestar)
- [Sponsor via DuitNow](https://shahrulestar.com/sponsor)

## Support and licence

Questions: [hello@bilauitmcuti.com](mailto:hello@bilauitmcuti.com)

- [Privacy](https://docs.bilauitmcuti.com/mcp-server/privacy)
- [Terms](https://docs.bilauitmcuti.com/mcp-server/terms)

Licensed under the [MIT License](LICENSE).
