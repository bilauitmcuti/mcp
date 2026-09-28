import type { z } from "zod"

type JsonSchema = Record<string, unknown>

interface StandardJsonSchema {
  input: (options?: { target?: string }) => JsonSchema
  output?: (options?: { target?: string }) => JsonSchema
}

interface StandardProps {
  validate: (value: unknown) => unknown
  vendor: string
  version: number
  jsonSchema: StandardJsonSchema
}

function sanitizeJsonSchemaNode(node: JsonSchema): JsonSchema {
  const out: JsonSchema = { ...node }
  delete out.$schema

  if (out.type === "object" && !out.properties) {
    out.properties = {}
  }

  if (out.type === "integer" && out.exclusiveMinimum === 0) {
    delete out.exclusiveMinimum
    out.minimum = 1
  }

  if (out.properties && typeof out.properties === "object" && !Array.isArray(out.properties)) {
    const props: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(out.properties as Record<string, JsonSchema>)) {
      props[key] = sanitizeJsonSchemaNode(value)
    }
    out.properties = props
  }

  return out
}

function sanitizeToolDefinition(tool: Record<string, unknown>): Record<string, unknown> {
  if (tool.inputSchema && typeof tool.inputSchema === "object" && !Array.isArray(tool.inputSchema)) {
    return {
      ...tool,
      inputSchema: sanitizeJsonSchemaNode(tool.inputSchema as JsonSchema),
    }
  }
  return tool
}

/** Rewrite tools/list SSE or JSON bodies so Claude accepts every tool schema. */
export function sanitizeToolsListResponseBody(text: string): string {
  if (!text.includes('"tools"')) return text

  if (text.includes("event:")) {
    return text
      .split("\n")
      .map((line) => {
        if (!line.startsWith("data: ")) return line
        try {
          const payload = JSON.parse(line.slice(6)) as {
            result?: { tools?: Record<string, unknown>[] }
          }
          if (payload.result?.tools) {
            payload.result.tools = payload.result.tools.map(sanitizeToolDefinition)
            return `data: ${JSON.stringify(payload)}`
          }
        } catch {
          /* keep line */
        }
        return line
      })
      .join("\n")
  }

  try {
    const payload = JSON.parse(text) as { result?: { tools?: Record<string, unknown>[] } }
    if (payload.result?.tools) {
      payload.result.tools = payload.result.tools.map(sanitizeToolDefinition)
      return JSON.stringify(payload)
    }
  } catch {
    /* keep body */
  }

  return text
}

/** Strip `$schema` and normalize shapes for Claude / OpenAI MCP clients. */
const wrappedSchemas = new WeakSet<z.ZodType>()

export function mcpInputSchema<T extends z.ZodType>(schema: T): T {
  if (wrappedSchemas.has(schema)) return schema

  const standard = (schema as T & { "~standard"?: StandardProps })["~standard"]
  if (!standard?.jsonSchema?.input) return schema

  const originalInput = standard.jsonSchema.input.bind(standard.jsonSchema)
  standard.jsonSchema.input = (options) => sanitizeJsonSchemaNode(originalInput(options))

  if (standard.jsonSchema.output) {
    const originalOutput = standard.jsonSchema.output.bind(standard.jsonSchema)
    standard.jsonSchema.output = (options) => sanitizeJsonSchemaNode(originalOutput(options))
  }

  wrappedSchemas.add(schema)
  return schema
}
