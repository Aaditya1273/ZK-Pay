import { useState } from "react"
import { useShipitStore, INITIAL_STEPS } from "@/stores/shipit.store"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function useGeneration() {
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()
  const { 
    setGeneratedPayload, 
    setDeploymentSteps, 
    updateDeploymentStep, 
    apiKey 
  } = useShipitStore()

  const generate = async (idea: string) => {
    setIsGenerating(true)
    setDeploymentSteps(INITIAL_STEPS.map(s => ({ ...s, status: "pending" })))

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, apiKey })
      })

      // Handle non-200 responses (e.g., 429 rate limit)
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(errBody.error || `Request failed (${res.status})`)
      }
      
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
                  setGeneratedPayload({
                    name: data.name,
                    description: data.description,
                    fee: data.fee,
                    avatarUrl: data.avatarUrl,
                    categories: data.categories || [],
                    keywords: data.keywords || [],
                    capabilities: data.capabilities || [],
                    featuresList: data.featuresList || [],
                    routingMetadata: data.routingMetadata || "",
                    pricing: data.pricing || { subscriptionPlans: [], usageTiers: [], premiumUpgrades: [] },
                    docs: data.docs || { installationGuide: "", usageExamples: "", apiDocumentation: "", faq: "" },
                    marketing: data.marketing || { productPitch: "", launchAnnouncement: "" }
                  })
                  router.push("/review")
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
      toast.error(err.message || "Failed to generate payload")
    } finally {
      setIsGenerating(false)
    }
  }

  return { generate, isGenerating }
}
