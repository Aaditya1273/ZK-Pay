"use client"

import * as React from "react"
import { useEffect } from "react"
import { useShipitStore } from "@/stores/shipit.store"
import { useDeployment } from "@/hooks/use-deployment"
import { DeploymentScore } from "@/components/deployment/DeploymentScore"
import { useRouter } from "next/navigation"

export default function DeployPage() {
  const router = useRouter()
  const { deploymentSteps, generatedPayload } = useShipitStore()
  const { deploy, isDeploying } = useDeployment()

  const score = deploymentSteps.reduce((acc, step) => {
    if (step.status === "success") return acc + (100 / deploymentSteps.length)
    if (step.status === "loading") return acc + (50 / deploymentSteps.length)
    return acc
  }, 0)

  const hasDeployed = React.useRef(false)

  useEffect(() => {
    if (!generatedPayload) {
      router.push("/new")
      return
    }
    
    // Auto-start deployment when landing on this page
    if (!isDeploying && score === 0 && !hasDeployed.current) {
      hasDeployed.current = true
      deploy()
    }
  }, [generatedPayload, isDeploying, score, deploy, router])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deploying to OKX</h1>
        <p className="text-muted-foreground mt-2">Executing zero-touch deployment via Onchain OS...</p>
      </div>
      
      <DeploymentScore score={score} steps={deploymentSteps} />
    </div>
  )
}
