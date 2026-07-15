import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export interface PrecheckResult {
  canCreate: boolean
  role: string
  reason?: string
  consent?: { terms: string }
  existingSameRole?: any[]
  aspCount?: number
}

export async function runPrecheck(): Promise<PrecheckResult> {
  try {
    const { stdout } = await execAsync("agent pre-check --role asp --json")
    return JSON.parse(stdout.trim()) as PrecheckResult
  } catch (error: any) {
    // If the command fails, it might return JSON in stderr or stdout depending on the CLI
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout.trim()) as PrecheckResult
      } catch (e) {
        throw new Error(`Failed to run pre-check: ${error.message}`)
      }
    }
    throw error
  }
}
