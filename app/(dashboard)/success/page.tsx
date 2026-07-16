"use client"

import { useShipitStore } from "@/stores/shipit.store"
import { useRouter } from "next/navigation"
import { AppShowcaseCard } from "@/components/dashboard/AppShowcaseCard"
import { Button } from "@/components/ui/button"
import { PlusCircle, CheckCircle2, Sparkles, ExternalLink } from "lucide-react"
import confetti from "canvas-confetti"
import { useEffect } from "react"
import { ReadmeViewer } from "@/components/viewers/readme-viewer"
import { XPostViewer } from "@/components/viewers/xpost-viewer"
import { PayloadViewer } from "@/components/viewers/payload-viewer"
import { DemoScriptViewer } from "@/components/viewers/demo-script-viewer"
import { PitchViewer } from "@/components/viewers/pitch-viewer"
import { FullDocsViewer } from "@/components/viewers/docs-viewer"
import { ExportRepoButton } from "@/components/viewers/export-button"
import { motion } from "framer-motion"

export default function SuccessPage() {
  const router = useRouter()
  const { deployedAgents, resetPipeline, generatedPayload } = useShipitStore()

  const latestAgent = deployedAgents[0]

  useEffect(() => {
    if (latestAgent) {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
        colors: ["#6d28d9", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd"],
      })
    }
  }, [latestAgent])

  if (!latestAgent || !generatedPayload) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-muted-foreground">No recent deployments found.</p>
        <Button onClick={() => router.push("/new")} className="mt-2 rounded-xl">Go to New</Button>
      </div>
    )
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-12 pb-16"
    >
      {/* Success header */}
      <motion.div variants={item} className="text-center space-y-6">
        <div className="inline-flex items-center justify-center p-4 bg-green-500/10 text-green-500 rounded-2xl">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Deployment Successful!</h1>
          <p className="text-xl text-muted-foreground/80">Your agent is now live and registered on-chain.</p>
        </div>
      </motion.div>

      {/* Agent card + on-chain proof */}
      <motion.div variants={item} className="max-w-sm mx-auto space-y-4">
        <AppShowcaseCard asp={latestAgent} />
        {latestAgent.explorerUrl && (
          <a
            href={latestAgent.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-[#7C5CFC]/30 bg-[#7C5CFC]/5 hover:bg-[#7C5CFC]/10 px-4 py-3 text-sm font-medium text-[#7C5CFC] transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            View On-Chain Proof on OKX Explorer
          </a>
        )}
        {latestAgent.txHash && (
          <p className="text-center text-[11px] text-gray-400 font-mono break-all">
            tx: {latestAgent.txHash}
          </p>
        )}
      </motion.div>

      {/* Actions */}
      <motion.div variants={item} className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={() => { resetPipeline(); router.push("/history") }}
          className="rounded-xl h-11 px-6"
        >
          View Dashboard
        </Button>
        <Button
          onClick={() => { resetPipeline(); router.push("/new") }}
          className="rounded-xl h-11 px-6 gap-2"
        >
          <PlusCircle className="mr-1 h-4 w-4" /> Deploy Another
        </Button>
      </motion.div>

      {/* Export repo */}
      <motion.div variants={item} className="max-w-sm mx-auto">
        <ExportRepoButton payload={generatedPayload} />
      </motion.div>

      {/* Deployment Assets */}
      <motion.div variants={item} className="mt-16 space-y-8">
        <div className="flex items-center gap-3 pb-4 border-b border-border/60">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-2xl font-bold tracking-tight">Deployment Assets</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6 h-96">
          <DemoScriptViewer agentId={latestAgent.id} />
          <XPostViewer payload={generatedPayload} />
        </div>

        <div className="grid md:grid-cols-2 gap-6 h-[500px]">
          <ReadmeViewer payload={generatedPayload} />
          <FullDocsViewer payload={generatedPayload} />
        </div>

        <div className="grid md:grid-cols-2 gap-6 h-96">
          <PitchViewer payload={generatedPayload} />
          <PayloadViewer payload={generatedPayload} />
        </div>
      </motion.div>
    </motion.div>
  )
}
