import { execWithProxy } from "./exec"

export async function runActivate(
  agentId: string,
  chain: string = "ethereum",
  preferredLanguage: string = "en-US"
): Promise<void> {
  try {
    const stdout = await execWithProxy(`onchainos agent activate --agent-id "${agentId}" --chain "${chain}" --preferred-language "${preferredLanguage}"`)
    const parsed = JSON.parse(stdout).catch?.(() => null) || (() => { try { return JSON.parse(stdout) } catch { return null } })()
    if (parsed?.ok === false) {
      throw new Error(parsed.error || "Activation failed")
    }
  } catch (error: any) {
    const raw = error.stderr || error.stdout || error.message || ""
    // Try to extract a clean error from JSON output
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.ok === false) throw new Error(parsed.error)
    } catch {}
    throw new Error(`Failed to activate agent: ${raw}`)
  }
}
