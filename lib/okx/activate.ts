import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function runActivate(agentId: string): Promise<void> {
  try {
    await execAsync(`agent activate ${agentId}`)
  } catch (error: any) {
    throw new Error(`Failed to activate agent: ${error.message}`)
  }
}
