"use client"

import { useShipitStore } from "@/stores/shipit.store"
import { AppList } from "@/components/dashboard/AppList"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Plus, History, Package } from "lucide-react"
import { motion } from "framer-motion"

export default function HistoryPage() {
  const router = useRouter()
  const { deployedAgents } = useShipitStore()

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-start"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <History className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Deploy History</h1>
          </div>
          <p className="text-muted-foreground ml-[52px]">
            All your live agents managed by SHIPIT.
          </p>
        </div>
        <Button onClick={() => router.push("/new")} className="rounded-xl h-11 px-6 shrink-0">
          <Plus className="w-4 h-4 mr-2" /> New Agent
        </Button>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        {deployedAgents.length === 0 ? (
          <div className="text-center py-24 bg-card border border-border/60 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-muted rounded-2xl">
                <Package className="w-10 h-10 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-medium">No agents deployed yet</h3>
            <p className="text-muted-foreground">Start by deploying your first OKX agent.</p>
            <Button onClick={() => router.push("/new")} className="mt-2 rounded-xl">
              Deploy Now
            </Button>
          </div>
        ) : (
          <AppList asps={deployedAgents} />
        )}
      </motion.div>
    </div>
  )
}
