"use client"

import { useShipitStore } from "@/stores/shipit.store"
import { useRouter } from "next/navigation"
import { IdentityCard } from "@/components/review/identity-card"
import { ServiceList } from "@/components/review/service-list"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft, ClipboardCheck, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

export default function ReviewPage() {
  const router = useRouter()
  const { generatedPayload } = useShipitStore()

  if (!generatedPayload) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="p-4 bg-muted rounded-2xl">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No payload generated yet.</p>
        <Button onClick={() => router.push("/new")} className="rounded-xl">Go Generate One</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-xl">
            <ClipboardCheck className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Review Your Agent</h1>
        </div>
        <p className="text-muted-foreground ml-[52px]">
          Make sure everything looks perfect before we deploy it to OKX.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="space-y-6"
      >
        <IdentityCard payload={generatedPayload} />
        <ServiceList payload={generatedPayload} />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex justify-between items-center pt-6 border-t border-border/80"
      >
        <Button
          variant="outline"
          onClick={() => router.push("/new")}
          className="rounded-xl h-11 px-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Start Over
        </Button>
        <Button
          size="lg"
          onClick={() => router.push("/deploy")}
          className="rounded-xl h-11 px-8 gap-2"
        >
          Looks Good, Deploy Now <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  )
}
