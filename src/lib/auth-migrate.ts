import type { BetterAuthOptions } from "@better-auth/core"
import { getMigrations } from "better-auth/db/migration"

export async function runAuthMigrations(options: BetterAuthOptions) {
  const { toBeCreated, toBeAdded, runMigrations, compileMigrations } = await getMigrations(options)
  await runMigrations()
  return {
    toBeCreated,
    toBeAdded,
    sql: await compileMigrations(),
  }
}