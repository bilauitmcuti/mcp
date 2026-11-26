# Tools

Six tools. Each one is read-only. A successful call returns indented JSON text. A non-array object is also `structuredContent`. Any other payload is wrapped as `{ "result": ... }`.

Call `get_academic_meta` before a calendar or lecture-week tool when you need a session id. Call `get_public_holiday_meta` before a holiday tool when you need a published year or state. Session ids change each term.

Omitted optional fields are not sent.

Each call reads calendar and holiday data from [`https://api.bilauitmcuti.com`](https://api.bilauitmcuti.com) (`GET /api/v1/...`). The project is unofficial and not affiliated with UiTM. Check any date that matters before you rely on it.

## Allowed values

| Name | Values |
| --- | --- |
| `group` | `A`, `B` |
| `program` | `All`, `PreDiploma`, `Diploma`, `DiplomaPartTime`, `Bachelor`, `BachelorPartTime`, `Master`, `PhD` |
| `type` | `lecture`, `break`, `examination`, `registration`, `other` |
| `coverage` | `all` (every holiday), `nationwide` (federal only) |
| `state` | `johor`, `kedah`, `kelantan`, `melaka`, `negeri-sembilan`, `pahang`, `perak`, `perlis`, `pulau-pinang`, `sabah`, `sarawak`, `selangor`, `terengganu`, `kuala-lumpur`, `labuan`, `putrajaya` |
| `date` | `YYYY-MM-DD` (pattern `^\d{4}-\d{2}-\d{2}$`) |
| `year` | Integer from 2000 to 2100 |
| `limit` | Integer from 1 to 500 |

`program` is mainly a Group B filter. `state` is ignored when `coverage` is `all`.

## Large results

`get_calendar` and `get_public_holidays` take `limit` and `compact`. This server trims the reply with those arguments before it sends it back.

| Tool | Arrays trimmed |
| --- | --- |
| `get_calendar` | `activities`, `sessions`, `data` |
| `get_public_holidays` | `holidays`, `data`, `items` |

- `limit` keeps that many items from each of those arrays.
- `compact: true` drops `description`, `notes`, and `detail` from each object row. Other rows stay as they are.
- When `limit` is set and an array is longer than `limit`, the result also includes `truncated: true`, `returned` (items kept), and `total` (length before the slice).
- If more than one of those arrays is longer than `limit`, `returned` and `total` come from the last trimmed array, in the order listed above.
- `compact` on its own does not add `truncated`, `returned`, or `total`.

## `get_academic_meta`

Lists sessions and programs. Call this first when you need a session id.

Upstream: `GET /api/v1/meta` on `https://api.bilauitmcuti.com`.

| Parameter | Required | Notes |
| --- | --- | --- |
| `group` | no | `A` or `B`. Leave it out and the field is not sent. The parameter description says that uses the default group. |
| `all` | no | Boolean. `true` returns sessions and programs for every group. |

Ask: "What UiTM sessions and programs are published for every group?"

## `get_calendar`

Lectures, breaks, exams, registration, and other activities for a session or group. Prefer one session from `get_academic_meta`. Use `limit` and `compact` when the reply is large.

Upstream: `GET /api/v1/calendar`.

| Parameter | Required | Notes |
| --- | --- | --- |
| `session` | no | Session id from `get_academic_meta` (`sessionOptions`). The published set changes each term. |
| `group` | no | `A` or `B`. |
| `program` | no | See allowed values. Mainly Group B. |
| `type` | no | See allowed values. |
| `allSessions` | no | Boolean. `true` includes every session in the selected group. |
| `all` | no | Boolean. `true` returns the full calendar dataset (large). Prefer a specific session. |
| `limit` | no | Integer from 1 to 500. |
| `compact` | no | Boolean. See [Large results](#large-results). |

Ask: "List lecture activities for the current Group B session, and keep the list short."

## `get_today_status`

Says whether a date is a class day, a break, an exam week, or a study week. `group` is required. Leave `date` out to use today.

Upstream: `GET /api/v1/today`.

| Parameter | Required | Notes |
| --- | --- | --- |
| `group` | yes | `A` or `B`. |
| `date` | no | `YYYY-MM-DD`. Leave it out and the field is not sent. The parameter description says that means today. |
| `session` | no | Session id from `get_academic_meta`. The published set changes each term. |
| `program` | no | See allowed values. Mainly Group B. |

Ask: "Is 2026-03-09 a class day for Group B Diploma?"

## `get_lecture_weeks`

Week 1–14 start and end dates for one session.

Upstream: `GET /api/v1/lecture-weeks`.

| Parameter | Required | Notes |
| --- | --- | --- |
| `session` | yes | Session id from `get_academic_meta`. The published set changes each term. |

Ask: "When does lecture week 1 start for this session?"

## `get_public_holiday_meta`

Years, coverage options, and Malaysia state slugs for holiday queries. No parameters.

Upstream: `GET /api/v1/public-holiday/meta`.

Ask: "Which years and states can I use for Malaysia public holidays?"

## `get_public_holidays`

Public holidays for a year, nationwide or for one state. Use `limit` and `compact` when the reply is large.

Upstream: `GET /api/v1/public-holiday`.

| Parameter | Required | Notes |
| --- | --- | --- |
| `year` | no | Integer from 2000 to 2100. Take published years from `get_public_holiday_meta` (`yearOptions`). |
| `coverage` | no | `all` or `nationwide`. |
| `state` | no | State slug. Ignored when `coverage` is `all`. |
| `limit` | no | Integer from 1 to 500. |
| `compact` | no | Boolean. See [Large results](#large-results). |

Ask: "List public holidays in Selangor for 2026."

## Errors

A failed call comes back as an error result. The text is the message, plus `detail` and `Retry-After` seconds when the upstream API sent them. An API error's `structuredContent` includes `error`, `detail`, `status`, and `retryAfter`.

## Example questions

Session ids in the examples go stale. Take the current id from `get_academic_meta`.

- What UiTM sessions are available for Group A?
- When does lecture week 1 start for session B-20264?
- Is 2026-03-09 a class day for Group B Diploma?
- Which exam activities are on the calendar for that session?
- List Malaysia public holidays in Selangor for 2026.
- Which of those holidays are nationwide?
