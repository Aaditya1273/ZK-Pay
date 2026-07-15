import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export interface ValidationFinding {
  field: string
  code: string
  severity: "block" | "warn"
  issue: string
  fix?: string
}

export interface ValidateResult {
  pass: boolean
  findings: ValidationFinding[]
}

export async function runValidateListing(
  name: string,
  description: string,
  services: any[]
): Promise<ValidateResult> {
  try {
    const servicesJson = JSON.stringify(services).replace(/"/g, '\\"')
    const cmd = `agent validate-listing --role asp --name "${name}" --description "${description}" --service "${servicesJson}" --json`
    
    const { stdout } = await execAsync(cmd)
    return JSON.parse(stdout.trim()) as ValidateResult
  } catch (error: any) {
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout.trim()) as ValidateResult
      } catch (e) {
        // Fall through
      }
    }
    throw new Error(`Failed to validate listing: ${error.message}`)
  }
}
