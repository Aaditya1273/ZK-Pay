import { execWithProxy } from "./exec"
import fs from "fs"
import path from "path"
import os from "os"

/**
 * Uploads an avatar image to OKX CDN and returns the CDN URL.
 *
 * Strategy:
 * 1. If the input is already an HTTPS URL (e.g., from a previous successful upload
 *    or an external CDN), return it directly — no upload needed.
 * 2. If the input is a local file path, try the onchainos CLI first.
 * 3. If the CLI fails (common on Vercel due to read-only filesystem), fall back
 *    to calling the OKX REST API directly with multipart/form-data.
 */
export async function runUpload(input: string, chain: string = "ethereum"): Promise<string> {
  // Already an HTTPS URL — skip upload entirely
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input
  }

  // Local file path — try CLI first, then REST fallback
  const filePath = input

  // -- 1. Try the onchainos CLI --
  try {
    const stdout = await execWithProxy(`onchainos agent upload --file "${filePath}" --chain "${chain}"`)
    // stdout may contain two JSON lines (auth + result) — find the one with "url"
    const urlMatch = stdout.match(/"url"\s*:\s*"([^"]+)"/)
    if (urlMatch?.[1]) return urlMatch[1]
    // If ok:true but no URL field, something changed — return stdout as-is
    if (stdout.includes('"ok":true')) return stdout
  } catch (cliErr: any) {
    console.warn("[upload] CLI failed, falling back to REST API:", cliErr.message?.slice(0, 120))
  }

  // -- 2. REST API fallback (works on Vercel where subprocess /tmp may differ) --
  return uploadViaRest(filePath, chain)
}

async function uploadViaRest(filePath: string, chain: string): Promise<string> {
  const apiKey     = process.env.OKX_API_KEY     || ""
  const secretKey  = process.env.OKX_SECRET_KEY  || ""
  const passphrase = process.env.OKX_PASSPHRASE  || ""

  if (!apiKey || !secretKey || !passphrase) {
    throw new Error("OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE must be set for avatar upload")
  }

  // Read file bytes — try the given path, fallback to /tmp/<basename>
  let fileBuffer: Buffer
  let filename = path.basename(filePath)
  try {
    fileBuffer = fs.readFileSync(filePath)
  } catch {
    // Last-resort: try /tmp/<basename> (in case path resolution differs inside subprocess)
    const fallbackPath = path.join("/tmp", filename)
    try {
      fileBuffer = fs.readFileSync(fallbackPath)
    } catch {
      // Fetch a deterministic avatar from dicebear if we have no local file at all
      const seed = filename.replace(/[^a-zA-Z0-9]/g, "")
      const resp = await fetch(`https://api.dicebear.com/7.x/shapes/png?seed=${seed}&size=400`)
      if (!resp.ok) throw new Error("Failed to fetch fallback avatar from dicebear")
      fileBuffer = Buffer.from(await resp.arrayBuffer())
      filename   = `${seed}.png`
    }
  }

  // Build timestamp + signature for OKX REST auth
  const timestamp = new Date().toISOString()
  const method    = "POST"
  const reqPath   = "/api/v1/onchain/agent/file/upload"
  const body      = ""

  const { createHmac } = await import("crypto")
  const signature = createHmac("sha256", secretKey)
    .update(`${timestamp}${method}${reqPath}${body}`)
    .digest("base64")

  // Build FormData
  const formData = new FormData()
  const blob     = new Blob([new Uint8Array(fileBuffer)], { type: "image/png" })
  formData.append("file", blob, filename)
  formData.append("chain", chain)

  const baseUrl  = "https://www.okx.com"
  const response = await fetch(`${baseUrl}${reqPath}`, {
    method: "POST",
    headers: {
      "OK-ACCESS-KEY":        apiKey,
      "OK-ACCESS-SIGN":       signature,
      "OK-ACCESS-TIMESTAMP":  timestamp,
      "OK-ACCESS-PASSPHRASE": passphrase,
    },
    body: formData,
  })

  const result = await response.json()
  if (!result?.data?.url) {
    throw new Error(`OKX REST upload failed: ${JSON.stringify(result)}`)
  }

  return result.data.url
}
