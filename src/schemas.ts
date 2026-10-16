import { z } from "zod"

import {
  ACTIVITY_TYPE_ENUM,
  COVERAGE_ENUM,
  GROUP_ENUM,
  PROGRAM_ENUM,
  STATE_ENUM,
} from "./enums"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isRealCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
}

export const academicMetaSchema = z.object({
  group: z
    .enum(GROUP_ENUM)
    .optional()
    .describe(
      'UiTM academic group: "A" or "B". Optional. No default group is defined in this server; the value is forwarded only when set.',
    ),
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
      "Session id from get_academic_meta (sessionOptions). Do not hardcode; the published set changes each term.",
    ),
  group: z
    .enum(GROUP_ENUM)
    .optional()
    .describe('UiTM academic group: "A" or "B".'),
  program: z
    .enum(PROGRAM_ENUM)
    .optional()
    .describe("Program filter (mainly Group B), from get_academic_meta."),
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
    .regex(ISO_DATE, { abort: true, error: "Date must be YYYY-MM-DD." })
    .superRefine((value, ctx) => {
      if (isRealCalendarDate(value)) return
      ctx.addIssue({
        code: "custom",
        message: `"${value}" is not a real calendar date. Use YYYY-MM-DD, such as 2026-03-09.`,
      })
    })
    .optional()
    .describe("Real calendar date as YYYY-MM-DD. Leave empty for today."),
  session: z
    .string()
    .optional()
    .describe(
      "Session id from get_academic_meta (sessionOptions). Do not hardcode; the published set changes each term.",
    ),
  program: z
    .enum(PROGRAM_ENUM)
    .optional()
    .describe("Program filter (mainly Group B), from get_academic_meta."),
})

export const lectureWeeksSchema = z.object({
  session: z
    .string()
    .describe(
      "Required. Session id from get_academic_meta (sessionOptions). Do not hardcode; the published set changes each term.",
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
    .describe("Calendar year from get_public_holiday_meta (yearOptions)."),
  coverage: z
    .enum(COVERAGE_ENUM)
    .optional()
    .describe(
      'Coverage: "all" returns every holiday and ignores state. "nationwide" returns federal holidays only. Omit to filter with state.',
    ),
  state: z
    .enum(STATE_ENUM)
    .optional()
    .describe(
      'State or territory slug from get_public_holiday_meta (for example selangor). Ignored when coverage is "all", which returns every holiday. When coverage is omitted, state includes nationwide holidays plus that territory.',
    ),
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
