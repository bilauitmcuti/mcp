import { connect } from "cloudflare:sockets"
import { classifyHost, isPublicRoutableHost } from "@better-auth/core/utils/host"

const DOH_URL = "https://cloudflare-dns.com/dns-query"
const MAX_LOOKUPS = 16
const MAX_BODY_BYTES = 65_536

let outstandingLookups = 0

interface ResolvedAddress {
  address: string
  family: 4 | 6
}

function httpsUrl(input: RequestInfo | URL): URL {
  const url = new URL(input instanceof Request ? input.url : input)
  if (url.protocol !== "https:") throw new TypeError("CIMD transport requires an HTTPS URL")
  return url
}

async function resolvePublicAddresses(hostname: string, signal?: AbortSignal): Promise<ResolvedAddress[]> {
  if (outstandingLookups >= MAX_LOOKUPS) throw new TypeError("metadata DNS lookup limit exceeded")
  outstandingLookups += 1
  try {
    const addresses: ResolvedAddress[] = []
    for (const type of ["A", "AAAA"] as const) {
      const response = await fetch(`${DOH_URL}?name=${encodeURIComponent(hostname)}&type=${type}`, {
        headers: { accept: "application/dns-json" },
        redirect: "manual",
        signal,
      })
      if (!response.ok) throw new TypeError(`metadata DNS lookup failed (${response.status})`)
      const body = (await response.json()) as { Status?: number; Answer?: { type: number; data: string }[] }
      if (body.Status !== 0 && body.Status !== undefined) continue
      for (const answer of body.Answer ?? []) {
        if (type === "A" && answer.type === 1) addresses.push({ address: answer.data, family: 4 })
        if (type === "AAAA" && answer.type === 28) addresses.push({ address: answer.data, family: 6 })
      }
    }
    return addresses
  } finally {
    outstandingLookups -= 1
  }
}

async function addressesFor(url: URL, signal?: AbortSignal): Promise<ResolvedAddress[]> {
  const host = classifyHost(url.hostname)
  if (host.literal !== "fqdn") {
    if (host.kind !== "public") throw new TypeError("metadata hostname must resolve only to public-routable addresses")
    return [{ address: host.canonical, family: host.literal === "ipv6" ? 6 : 4 }]
  }
  const addresses = await resolvePublicAddresses(url.hostname, signal)
  if (addresses.length === 0) throw new TypeError("metadata hostname returned no DNS addresses")
  for (const address of addresses) {
    if (!isPublicRoutableHost(address.address)) {
      throw new TypeError("metadata hostname must resolve only to public-routable addresses")
    }
  }
  return addresses
}

function requestHeaders(source: Headers, host: string): string {
  const lines = [`host: ${host}`, "connection: close", "user-agent: bilauitmcuti-cimd"]
  source.forEach((value, key) => {
    const name = key.toLowerCase()
    if (name === "host" || name === "connection" || name === "transfer-encoding" || name === "content-length") return
    lines.push(`${name}: ${value}`)
  })
  return lines.join("\r\n")
}

async function readAll(readable: ReadableStream<Uint8Array>, signal?: AbortSignal): Promise<Uint8Array> {
  const reader = readable.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (total < MAX_BODY_BYTES + 8192) {
      if (signal?.aborted) throw new TypeError("metadata request aborted")
      const next = await reader.read()
      if (next.done) break
      total += next.value.byteLength
      chunks.push(next.value)
    }
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

function splitHttpMessage(bytes: Uint8Array): { head: string; rest: Uint8Array } {
  const marker = new TextEncoder().encode("\r\n\r\n")
  for (let index = 0; index <= bytes.length - marker.length; index += 1) {
    let matched = true
    for (let offset = 0; offset < marker.length; offset += 1) {
      if (bytes[index + offset] !== marker[offset]) {
        matched = false
        break
      }
    }
    if (!matched) continue
    return {
      head: new TextDecoder().decode(bytes.subarray(0, index)),
      rest: bytes.subarray(index + marker.length),
    }
  }
  throw new TypeError("metadata response had no header terminator")
}

function decodeChunked(bytes: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = []
  let offset = 0
  const decoder = new TextDecoder()
  while (offset < bytes.length) {
    const lineEnd = (() => {
    for (let index = offset; index < bytes.length; index += 1) if (bytes[index] === 10) return index
    return -1
  })()
    if (lineEnd < 0) break
    const size = Number.parseInt(decoder.decode(bytes.subarray(offset, lineEnd)).trim(), 16)
    if (!Number.isFinite(size)) throw new TypeError("metadata response had a bad chunk size")
    if (size === 0) break
    const start = lineEnd + 1
    chunks.push(bytes.subarray(start, start + size))
    offset = start + size + 2
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const body = new Uint8Array(total)
  let cursor = 0
  for (const chunk of chunks) {
    body.set(chunk, cursor)
    cursor += chunk.byteLength
  }
  return body
}

function toResponse(bytes: Uint8Array, method: string): Response {
  const { head, rest } = splitHttpMessage(bytes)
  const [statusLine, ...headerLines] = head.split("\r\n")
  const status = Number(statusLine?.split(" ")[1] ?? 502)
  const headers = new Headers()
  for (const line of headerLines) {
    const splitAt = line.indexOf(":")
    if (splitAt <= 0) continue
    headers.append(line.slice(0, splitAt).trim(), line.slice(splitAt + 1).trim())
  }
  if (method === "HEAD" || status === 204 || status === 205 || status === 304) {
    return new Response(null, { status, headers })
  }
  const lengthHeader = headers.get("content-length")
  const length = lengthHeader ? Number(lengthHeader) : undefined
  let body = rest
  if (headers.get("transfer-encoding")?.toLowerCase().includes("chunked")) body = decodeChunked(rest)
  else if (length !== undefined && Number.isFinite(length)) body = rest.subarray(0, length)
  if (body.byteLength > MAX_BODY_BYTES) throw new TypeError("metadata response is too large")
  return new Response(body, { status, headers })
}

async function requestPinned(url: URL, address: string, method: string, headers: Headers, signal?: AbortSignal): Promise<Response> {
  const serverName = classifyHost(url.hostname).literal === "fqdn" ? url.hostname : undefined
  const socket = connect({ hostname: address, port: 443 }, { allowHalfOpen: true, secureTransport: "starttls" })
  const tls = socket.startTls(serverName ? { expectedServerHostname: serverName } : undefined)
  const writer = tls.writable.getWriter()
  const path = `${url.pathname}${url.search}` || "/"
  const payload = `${method} ${path} HTTP/1.1\r\n${requestHeaders(headers, url.host)}\r\n\r\n`
  await writer.write(new TextEncoder().encode(payload))
  await writer.close()
  const bytes = await readAll(tls.readable, signal)
  return toResponse(bytes, method)
}

/** Workers CIMD fetch: one public DNS answer, TLS pinned to that address, redirects not followed. */
export async function fetchClientMetadataResource(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init)
  if (request.method !== "GET" && request.method !== "HEAD") {
    throw new TypeError("CIMD transport supports only GET and HEAD")
  }
  const url = httpsUrl(request)
  request.signal.throwIfAborted()
  const addresses = await addressesFor(url, request.signal)
  let lastError: unknown
  for (const address of addresses) {
    try {
      return await requestPinned(url, address.address, request.method, request.headers, request.signal)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new TypeError("metadata request failed")
}
