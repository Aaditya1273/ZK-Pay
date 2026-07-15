"use client"

import { PromptInput } from "@/components/generator/PromptInput"
import { useGeneration } from "@/hooks/use-generation"
import { DeploymentScore } from "@/components/deployment/DeploymentScore"
import { useShipitStore } from "@/stores/shipit.store"

export default function NewAgentPage() {
  const { generate, isGenerating } = useGeneration()
  const { deploymentSteps } = useShipitStore()

  const activeSteps = deploymentSteps.filter(s => s.id === "1" || s.id === "2" || s.id === "3" || s.id === "4")
  const score = activeSteps.reduce((acc, step) => {
    if (step.status === "success") return acc + (100 / activeSteps.length)
    if (step.status === "loading") return acc + (50 / activeSteps.length)
    return acc
  }, 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Agent</h1>
        <p className="text-muted-foreground mt-2">Describe what you want to build and we'll generate the perfect OKX-compliant agent profile.</p>
      </div>
      
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <PromptInput onSubmit={generate} isGenerating={isGenerating} />
      </div>

      {isGenerating && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <DeploymentScore score={score} steps={activeSteps} />
        </div>
      )}
    </div>
  )
}
