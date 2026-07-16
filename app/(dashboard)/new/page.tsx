"use client"

import { PromptInput } from "@/components/generator/PromptInput"
import { useGeneration } from "@/hooks/use-generation"
import { DeploymentScore } from "@/components/deployment/DeploymentScore"
import { useShipitStore } from "@/stores/shipit.store"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Lock, Zap, Bot, Coins, HandCoins, Sparkles, TrendingUp, Search, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const actionCards = [
  {
    title: "Trading Agent",
    description: "Build an automated DCA and momentum trading bot.",
    icon: TrendingUp,
    prompt: "Build a crypto trading agent that runs DCA on BTC and sends Telegram alerts."
  },
  {
    title: "Research Agent",
    description: "Analyze tokenomics and scan smart contracts.",
    icon: Search,
    prompt: "Build an agent that analyzes new token launches on Solana for honeypots."
  },
  {
    title: "Meme Predictor",
    description: "Track social sentiment for emerging meme coins.",
    icon: Coins,
    prompt: "Build a meme coin predictor that scans Twitter sentiment and alerts on volume spikes."
  },
  {
    title: "Wallet Manager",
    description: "Automate sub-account rebalancing and gas management.",
    icon: Wallet,
    prompt: "Build an agent to manage my OKX sub-accounts and automatically top up gas."
  }
]

export default function NewAgentPage() {
  const router = useRouter()
  const { generate, isGenerating } = useGeneration()
  const { deploymentSteps, deployedAgents, resetPipeline } = useShipitStore()
  
  const [submittedPrompt, setSubmittedPrompt] = useState("")

  useEffect(() => {
    resetPipeline()
    setSubmittedPrompt("")
  }, [resetPipeline])

  const activeSteps = deploymentSteps.filter(s => s.id === "1" || s.id === "2" || s.id === "3" || s.id === "4")
  const score = activeSteps.reduce((acc, step) => {
    if (step.status === "success") return acc + (100 / activeSteps.length)
    if (step.status === "loading") return acc + (50 / activeSteps.length)
    return acc
  }, 0)

  const handleGenerate = (prompt: string) => {
    setSubmittedPrompt(prompt)
    generate(prompt)
  }

  if (deployedAgents.length >= 3) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 bg-[#FAFAF8]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="p-5 bg-red-50 text-red-500 rounded-2xl"
        >
          <Lock className="w-14 h-14" />
        </motion.div>
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-[#111827]">Free Tier Limit Reached</h2>
          <p className="text-gray-500 max-w-md text-center leading-relaxed">
            You have successfully deployed 3 ASPs using the Free Tier. Upgrade to Pro for unlimited deployments.
          </p>
        </div>
        <Button size="lg" className="mt-4 gap-2 h-12 px-8 rounded-xl bg-[#7C5CFC] hover:bg-[#6b4ce6] text-white border-0 transition-colors">
          <Zap className="w-4 h-4" /> Upgrade to Pro — $19/mo
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      
      {/* LEFT PANE: Workspace & Chat */}
      <motion.div 
        layout
        className={cn(
          "h-full transition-all duration-500 ease-in-out relative flex flex-col",
          submittedPrompt ? "w-[50%] border-r border-[#ECECEC]" : "w-full items-center overflow-y-auto"
        )}
      >
        {!submittedPrompt ? (
          /* Enforced exact Claude/Loveable proportions layout */
          <div className="w-[min(1100px,calc(100vw-420px))] mt-[120px] px-8 flex flex-col pb-16">
            
            {/* Title */}
            <h1 className="text-[64px] font-bold text-[#111827] text-center leading-none tracking-tight">
              Build your dream agent
            </h1>
            
            {/* Subtitle */}
            <p className="text-[20px] text-gray-500 font-medium text-center mt-4">
              Describe what you want to build and SHIPIT will create it.
            </p>

            {/* Prompt Box */}
            <div className="w-full mt-10">
              <PromptInput onSubmit={handleGenerate} isGenerating={isGenerating} />
            </div>

            {/* Suggestions */}
            <div className="grid grid-cols-2 gap-6 mt-8 w-full">
              {actionCards.map((card, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleGenerate(card.prompt)}
                  className="group relative bg-white border border-[#ECECEC] rounded-[32px] p-8 h-[180px] w-full cursor-pointer transition-all duration-300 hover:shadow-[0_16px_48px_rgba(0,0,0,0.06)] overflow-hidden flex items-start gap-6"
                >
                  {/* Hover Gradient Border Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#7C5CFC]/0 via-[#7C5CFC]/0 to-[#7C5CFC]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#7C5CFC]/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                  
                  <div className="relative z-10 w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all duration-300">
                    <card.icon className="w-7 h-7 text-gray-500 group-hover:text-[#7C5CFC] transition-colors" />
                  </div>
                  
                  <div className="relative z-10 flex flex-col justify-center h-full">
                    <h3 className="font-bold text-[#111827] text-[19px] mb-2">{card.title}</h3>
                    <p className="text-[15px] text-gray-500 leading-relaxed line-clamp-2">{card.description}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        ) : (
          /* Chat History (Visible after submission) */
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="flex-1 w-full p-8 overflow-y-auto"
            >
              <div className="flex justify-end w-full mb-8">
                <div className="bg-[#111827] text-white px-5 py-4 rounded-3xl rounded-tr-sm max-w-[85%] text-[15px] shadow-sm leading-relaxed">
                  {submittedPrompt}
                </div>
              </div>
              
              <div className="flex justify-start w-full items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8a75ff] to-[#7C5CFC] flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>

                <div className="bg-white border border-[#ECECEC] text-[#111827] px-6 py-5 rounded-3xl rounded-tl-sm max-w-[85%] text-[15px] shadow-sm leading-relaxed">
                  <p>I'll generate a complete, OKX-compliant Agent Service Provider based on your request. I'm building the profile, generating the documentation, and writing the deployment manifests.</p>
                  <p className="mt-3 text-gray-500 text-sm">I'll update the execution panel on the right so you can track the deployment progress in real-time.</p>
                  
                  {isGenerating && (
                    <div className="flex items-center gap-1.5 mt-5">
                      <span className="w-2 h-2 bg-[#7C5CFC] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 bg-[#7C5CFC] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 bg-[#7C5CFC] rounded-full animate-bounce"></span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              layout
              className="w-full p-6 mt-auto shrink-0"
            >
              <PromptInput onSubmit={handleGenerate} isGenerating={isGenerating} />
            </motion.div>
          </>
        )}
      </motion.div>

      {/* RIGHT PANE: Execution Pipeline */}
      <AnimatePresence>
        {submittedPrompt && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "50%", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="h-full bg-white flex flex-col overflow-hidden shrink-0 border-l border-[#ECECEC] z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.02)]"
          >
            <div className="flex items-center justify-between px-8 py-5 border-b border-[#ECECEC] bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <span className="text-sm font-semibold text-[#111827]">Deployment Pipeline</span>
              <div className="px-2.5 py-1 bg-[#7C5CFC]/10 rounded-md text-[11px] font-bold text-[#7C5CFC] uppercase tracking-wider">
                Live Build
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 scrollbar-on-hover bg-[#FAFAF8]">
              <DeploymentScore score={score} steps={activeSteps} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
