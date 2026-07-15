import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function runUpload(filePath: string): Promise<string> {
  try {
    // The CLI should return the uploaded URL
    const { stdout } = await execAsync(`agent upload --file "${filePath}"`)
    // Depending on CLI output format, we extract the URL. Assuming it prints the URL directly or in JSON.
    // We'll just return the trimmed output for now.
    return stdout.trim()
  } catch (error: any) {
    throw new Error(`Failed to upload avatar: ${error.message}`)
  }
}
