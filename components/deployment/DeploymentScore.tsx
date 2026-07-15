import * as React from "react"
import { Check, Loader2, Circle, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type StepStatus = "pending" | "loading" | "success" | "error"

export interface DeploymentStep {
  id: string
  label: string
  status: StepStatus
  errorMessage?: string
}

interface DeploymentScoreProps {
  score: number // 0 to 100
  steps: DeploymentStep[]
}

export function DeploymentScore({ score, steps }: DeploymentScoreProps) {
  return (
    <Card className="w-full max-w-lg mx-auto border-border">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-end mb-2">
          <CardTitle>Deployment Readiness</CardTitle>
          <span className="text-2xl font-bold text-primary">{Math.round(score)}%</span>
        </div>
        <div className="h-2 w-full bg-secondary overflow-hidden rounded-full">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${score}%` }} />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3 pt-2">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-3">
              <div className="mt-0.5">
                {step.status === "success" && (
                  <Check className="w-4 h-4 text-green-500 font-bold" />
                )}
                {step.status === "loading" && (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                )}
                {step.status === "error" && (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
                {step.status === "pending" && (
                  <Circle className="w-4 h-4 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  "text-sm font-medium transition-colors duration-200",
                  step.status === "success" ? "text-foreground" :
                  step.status === "error" ? "text-destructive" :
                  step.status === "loading" ? "text-foreground" :
                  "text-muted-foreground"
                )}>
                  {step.label}
                </span>
                {step.errorMessage && (
                  <span className="text-xs text-destructive mt-0.5 font-mono">
                    {step.errorMessage}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
