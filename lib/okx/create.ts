import { execWithProxy } from "./exec"

export interface CreateResult {
  agentId: string | null
  txHash: string | null
}

export async function runCreate(
  name: string,
  description: string,
  pictureUrl: string,
  services: any[],
  chain: string = "ethereum"
): Promise<CreateResult> {
  try {
    const servicesJson = JSON.stringify(services).replace(/"/g, '\\"')
    const cmd = `onchainos agent create --role asp --name "${name}" --description "${description}" --picture "${pictureUrl}" --service "${servicesJson}" --chain "${chain}"`
    const stdout = await execWithProxy(cmd)
    const parsed = JSON.parse(stdout)
    if (parsed?.ok === false) {
      throw new Error(parsed.error || "Agent creation failed")
    }
    return {
      agentId: parsed?.data?.newAgentId ?? null,
      txHash: parsed?.data?.txHash ?? null,
    }
  } catch (error: any) {
    if (error.message?.startsWith("Failed to create agent")) throw error
    const details = error.stderr || error.stdout || ""
    throw new Error(`Failed to create agent: ${error.message} \nDetails: ${details}`)
  }
}
