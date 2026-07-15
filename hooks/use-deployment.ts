import { useState } from "react"
import { useShipitStore, DEPLOY_STEPS } from "@/stores/shipit.store"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function useDeployment() {
  const [isDeploying, setIsDeploying] = useState(false)
  const router = useRouter()
  const { 
    generatedPayload, 
    setDeploymentSteps, 
    updateDeploymentStep, 
    addDeployedAgent,
    apiKey 
  } = useShipitStore()

  const deploy = async () => {
    if (!generatedPayload) {
      toast.error("No payload found. Please generate an idea first.")
      return
    }

    setIsDeploying(true)
    setDeploymentSteps(DEPLOY_STEPS.map(s => ({ ...s, status: "pending" })))

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: generatedPayload, apiKey })
      })
      
      if (!res.body) throw new Error("No response body")
      
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      
      let buffer = ""
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const eventBlocks = buffer.split("\n\n")
        buffer = eventBlocks.pop() || ""
        
        for (const block of eventBlocks) {
          const lines = block.split("\n")
          let currentEvent = ""
          
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim()
            } else if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim()
              if (!dataStr) continue
              
              try {
                const data = JSON.parse(dataStr)
                
                if (currentEvent === "step") {
                  updateDeploymentStep(data.id, data.status, data.label)
                } else if (currentEvent === "done") {
                  addDeployedAgent({
                    id: data.agentId,
                    name: data.name,
                    description: data.description,
                    fee: data.fee,
                    status: "ready",
                    avatarUrl: data.avatarUrl
                  })
                  router.push("/success")
                } else if (currentEvent === "error") {
                  toast.error(data.message)
                  setDeploymentSteps(prev => {
                    const newSteps = [...prev]
                    const activeIndex = newSteps.findIndex(s => s.status === "loading")
                    if (activeIndex !== -1) {
                      newSteps[activeIndex].status = "error"
                      newSteps[activeIndex].errorMessage = data.message
                    }
                    return newSteps
                  })
                }
              } catch (e) {
                console.error("Failed to parse SSE data", e)
              }
            }
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to deploy payload")
    } finally {
      setIsDeploying(false)
    }
  }

  return { deploy, isDeploying }
}
