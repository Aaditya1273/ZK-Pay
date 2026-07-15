import { NextRequest } from "next/server"
import { runPrecheck } from "@/lib/okx/precheck"
import { runUpload } from "@/lib/okx/upload"
import { runValidateListing } from "@/lib/okx/validate"
import { runCreate } from "@/lib/okx/create"
import { runActivate } from "@/lib/okx/activate"

export async function POST(req: NextRequest) {
  const { payload, apiKey } = await req.json()
  
  if (!payload) {
    return new Response(JSON.stringify({ error: "Payload is required" }), { status: 400 })
  }
  
  if (apiKey) {
    process.env.OKX_API_KEY = apiKey
  }

  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  
  const sendEvent = async (event: string, data: any) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  const executeDeployment = async () => {
    try {
      const { name, description, fee, avatarUrl: avatarPath } = payload
      
      // Upload Avatar if it's a local file path
      let finalAvatarUrl = avatarPath
      if (avatarPath.startsWith("/")) {
        finalAvatarUrl = await runUpload(avatarPath)
      }

      // 5. Precheck & Validation
      await sendEvent("step", { id: "5", label: "Running OKX Validations", status: "loading" })
      await runPrecheck()
      const services = [{ name: `${name} Service`, description, type: "A2MCP", fee, endpoint: "https://example.com/api" }]
      await runValidateListing(name, description, services)
      await sendEvent("step", { id: "5", label: "Validation passed", status: "success" })
      
      // 6. Create & Activate
      await sendEvent("step", { id: "6", label: "Registering Identity On-Chain", status: "loading" })
      const agentId = await runCreate(name, description, finalAvatarUrl, services)
      await runActivate(agentId)
      await sendEvent("step", { id: "6", label: `Registered Agent #${agentId}`, status: "success" })

      // Final complete signal
      await sendEvent("done", { agentId, name, description, fee, avatarUrl: finalAvatarUrl })
    } catch (error: any) {
      await sendEvent("error", { message: error.message || "Deployment failed" })
    } finally {
      await writer.close()
    }
  }

  executeDeployment()

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  })
}
