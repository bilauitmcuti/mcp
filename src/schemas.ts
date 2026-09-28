import { z } from "zod"

import {
  ACTIVITY_TYPE_ENUM,
  COVERAGE_ENUM,
  GROUP_ENUM,
  PROGRAM_ENUM,
  STATE_ENUM,
} from "./enums"

export const academicMetaSchema = z.object({
  group: z
    .enum(GROUP_ENUM)
    .optional()
    .describe('UiTM academic group: "A" or "B". Omit to use the default group.'),
  all: z
    .boolean()
    .optional()
    .describe("When true, return sessions and programs for all groups."),
})

export const calendarSchema = z.object({
  session: z
    .string()
    .optional()
    .describe(
      "Session id from GET /api/v1/meta (`sessionOptions`). Do not hardcode; the published set changes each term.",
    ),
  group: z
    .enum(GROUP_ENUM)
    .optional()
    .describe('UiTM academic group: "A" or "B".'),
  program: z
    .enum(PROGRAM_ENUM)
    .optional()
    .describe("Program filter (mainly Group B), from List UiTM sessions & programs."),
  type: z
    .enum(ACTIVITY_TYPE_ENUM)
    .optional()
    .describe("Activity type: lecture, break, examination, registration, or other."),
  allSessions: z
    .boolean()
    .optional()
    .describe("When true, include every session in the selected group."),
  all: z
    .boolean()
    .optional()
    .describe("When true, return the full calendar dataset (large). Prefer a specific session."),
  limit: z
    .number()
    .int()
    .positive()
    .max(500)
    .optional()
    .describe("Max number of activities to return (keeps answers shorter)."),
  compact: z
    .boolean()
    .optional()
    .describe("When true, drop lengthy description/notes fields from each activity."),
})

export const todayStatusSchema = z.object({
  group: z.enum(GROUP_ENUM).describe('Required. UiTM academic group: "A" or "B".'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Date as YYYY-MM-DD. Leave empty for today."),
  session: z
    .string()
    .optional()
    .describe(
      "Session id from GET /api/v1/meta (`sessionOptions`). Do not hardcode; the published set changes each term.",
    ),
  program: z
    .enum(PROGRAM_ENUM)
    .optional()
    .describe("Program filter (mainly Group B), from List UiTM sessions & programs."),
})

export const lectureWeeksSchema = z.object({
  session: z
    .string()
    .describe(
      "Required. Session id from GET /api/v1/meta (`sessionOptions`). Do not hardcode; the published set changes each term.",
    ),
})

export const publicHolidayMetaSchema = z.object({})

export const publicHolidaysSchema = z.object({
  year: z
    .number()
    .int()
    .min(2000)
    .max(2100)
    .optional()
    .describe("Calendar year from List public holiday filters (yearOptions)."),
  coverage: z
    .enum(COVERAGE_ENUM)
    .optional()
    .describe('Coverage: "all" (every holiday) or "nationwide" (federal only).'),
  state: z
    .enum(STATE_ENUM)
    .optional()
    .describe("State/territory slug (e.g. selangor). Ignored when coverage is all."),
  limit: z
    .number()
    .int()
    .positive()
    .max(500)
    .optional()
    .describe("Max number of holidays to return (keeps answers shorter)."),
  compact: z
    .boolean()
    .optional()
    .describe("When true, drop lengthy description/notes fields from each holiday."),
})
