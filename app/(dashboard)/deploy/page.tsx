"use client"

import * as React from "react"
import { useEffect } from "react"
import { useShipitStore } from "@/stores/shipit.store"
import { useDeployment } from "@/hooks/use-deployment"
import { DeploymentScore } from "@/components/deployment/DeploymentScore"
import { useRouter } from "next/navigation"
import { Rocket, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

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
    if (!isDeploying && !hasDeployed.current) {
      hasDeployed.current = true
      deploy()
    }
  }, [generatedPayload, isDeploying, deploy, router])

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Deploying to OKX</h1>
        </div>
        <p className="text-muted-foreground ml-[52px]">
          Executing zero-touch deployment via Onchain OS...
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        <DeploymentScore score={score} steps={deploymentSteps} />
      </motion.div>
    </div>
  )
}
