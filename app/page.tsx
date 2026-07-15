"use client"

import { useState } from "react"
import { PromptInput } from "@/components/generator/PromptInput"
import { AppList } from "@/components/dashboard/AppList"
import { ProviderSettings } from "@/components/settings/ProviderSettings"
import { DeploymentScore, DeploymentStep } from "@/components/deployment/DeploymentScore"
import { ASPData } from "@/components/dashboard/AppShowcaseCard"
import { toast } from "sonner"

const INITIAL_STEPS: DeploymentStep[] = [
  { id: "1", label: "Generating Brand Name", status: "pending" },
  { id: "2", label: "Generating Service Description", status: "pending" },
  { id: "3", label: "Analyzing Pricing Model", status: "pending" },
  { id: "4", label: "Generating Identity Avatar", status: "pending" },
  { id: "5", label: "Running OKX Validations", status: "pending" },
  { id: "6", label: "Registering Identity On-Chain", status: "pending" },
]

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [steps, setSteps] = useState<DeploymentStep[]>(INITIAL_STEPS)
  const [asps, setAsps] = useState<ASPData[]>([])

  const score = steps.reduce((acc, step) => {
    if (step.status === "success") return acc + (100 / steps.length)
    if (step.status === "loading") return acc + (50 / steps.length)
    return acc
  }, 0)

  const handleSubmit = async (idea: string) => {
    setIsGenerating(true)
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: "pending" })))

    const apiKey = localStorage.getItem("OKX_API_KEY") || ""
    
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, apiKey })
      })
      
      if (!res.body) throw new Error("No response body")
      
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")
        
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
                setSteps(prev => prev.map(s => {
                  if (s.id === data.id) {
                    return { ...s, status: data.status, label: data.label || s.label }
                  }
                  return s
                }))
              } else if (currentEvent === "done") {
                toast.success("Successfully deployed to OKX!")
                setAsps(prev => [{
                  id: data.agentId,
                  name: data.name,
                  description: data.desc,
                  fee: data.fee,
                  status: "ready",
                  avatarUrl: data.avatarUrl
                }, ...prev])
              } else if (currentEvent === "error") {
                toast.error(data.message)
                setSteps(prev => {
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
    } catch (err: any) {
      toast.error(err.message || "Failed to deploy")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <main className="min-h-screen bg-background p-8 space-y-24 max-w-6xl mx-auto">
      <section className="space-y-4">
        <div className="text-center space-y-2 mb-12">
          <h1 className="text-4xl font-bold tracking-tight">SHIPIT</h1>
          <p className="text-xl text-muted-foreground">The first zero-touch deployment platform for OKX.AI.</p>
        </div>
        <PromptInput onSubmit={handleSubmit} isGenerating={isGenerating} />
      </section>

      <section className="grid md:grid-cols-2 gap-12 items-start">
        <DeploymentScore score={score} steps={steps} />
        <ProviderSettings />
      </section>

      <section>
        <AppList asps={asps} />
      </section>
    </main>
  )
}
