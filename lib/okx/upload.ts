import { execWithProxy } from "./exec"
import fs from "fs"
import path from "path"
import os from "os"

/**
 * Uploads an avatar to OKX CDN and returns a static.okx.com URL.
 *
 * OKX agent create requires --picture to be a URL from their own CDN.
 * External URLs (DiceBear, etc.) are rejected with code 81001.
 *
 * Strategy:
 * 1. Already an OKX CDN URL (static.okx.com) → return immediately.
 * 2. Any other https:// URL → download to /tmp, then upload via CLI.
 * 3. Local file path → upload via CLI directly.
 */
export async function runUpload(input: string, chain: string = "ethereum"): Promise<string> {
  // Already an OKX CDN URL — skip upload entirely
  if (input.includes("static.okx.com") || input.includes("okg-pub")) {
    return input
  }

  let localPath: string

  if (input.startsWith("http://") || input.startsWith("https://")) {
    // External URL: download to /tmp first, then upload via CLI from same container
    localPath = await downloadToTmp(input)
  } else {
    // Already a local file path
    localPath = input
  }

  return uploadViaCliWithRetry(localPath, chain)
}

async function downloadToTmp(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to download avatar from ${url}: ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const tmpPath = path.join(os.tmpdir(), `avatar-${Date.now()}.png`)
  fs.writeFileSync(tmpPath, buffer)
  return tmpPath
}

async function uploadViaCliWithRetry(filePath: string, chain: string): Promise<string> {
  // Verify file exists before calling CLI to surface a clearer error
  if (!fs.existsSync(filePath)) {
    throw new Error(`Avatar file not found at ${filePath}. Check that /tmp is writable.`)
  }

  const stdout = await execWithProxy(
    `onchainos agent upload --file "${filePath}" --chain "${chain}"`
  )

  // stdout may contain two JSON lines: auth response + result
  // Find the line that contains the CDN URL
  const urlMatch = stdout.match(/"url"\s*:\s*"(https:\/\/[^"]+)"/)
  if (urlMatch?.[1]) {
    // Clean up temp file
    try { fs.unlinkSync(filePath) } catch { /* ignore */ }
    return urlMatch[1]
  }

  const details = stdout.slice(0, 300)
  throw new Error(`Failed to upload avatar: Command succeeded but no URL returned.\nOutput: ${details}`)
}
