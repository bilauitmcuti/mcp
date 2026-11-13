import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { MCP_INSTRUCTIONS } from "../src/server-info"

const skillPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../plugin/bila-uitm-cuti/skills/bila-uitm-cuti/SKILL.md",
)

describe("bila-uitm-cuti skill", () => {
  it("matches the server instructions after the frontmatter", () => {
    const raw = readFileSync(skillPath, "utf8")
    const match = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)
    expect(match).not.toBeNull()
    const body = match?.[1].replace(/\n$/, "")
    expect(body).toBe(MCP_INSTRUCTIONS)
  })
})
