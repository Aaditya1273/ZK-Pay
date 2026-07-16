import { execWithProxy } from "./exec"

export async function runUpload(filePath: string, chain: string = "ethereum"): Promise<string> {
  try {
    const stdout = await execWithProxy(`onchainos agent upload --file "${filePath}" --chain "${chain}"`)
    const urlMatch = stdout.match(/"url"\s*:\s*"([^"]+)"/)
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1]
    }
    return stdout
  } catch (error: any) {
    throw new Error(`Failed to upload avatar: ${error.message}`)
  }
}
