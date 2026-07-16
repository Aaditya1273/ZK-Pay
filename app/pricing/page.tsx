"use client"

import { Pricing } from "@/components/landing/pricing"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { useUIStore } from "@/stores/ui.store"

export default function PricingPage() {
  const { openAuthModal } = useUIStore()

  return (
    <main className="min-h-screen bg-[#0a0a0a] selection:bg-[#5b3eff]/20 antialiased overflow-hidden text-white">
      {/* Floating Dark Navigation */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
        <nav className="flex items-center justify-between w-full max-w-4xl px-6 py-3.5 bg-[#141414]/80 backdrop-blur-xl border border-[#333] rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8a75ff] to-[#5b3eff] flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">SHIPIT</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[14px] font-medium text-gray-400 hover:text-white transition-colors hidden sm:block">
              Home
            </Link>
            <div className="w-[1px] h-4 bg-[#333] hidden sm:block"></div>
            <button onClick={openAuthModal} className="text-[14px] font-medium text-gray-400 hover:text-white transition-colors">
              Log in
            </button>
            <button onClick={openAuthModal} className="px-5 py-2 bg-white hover:bg-gray-200 text-black text-[14px] font-bold rounded-full shadow-sm transition-all duration-300">
              Get started
            </button>
          </div>
        </nav>
      </div>

      <div className="pt-40 pb-32 max-w-6xl mx-auto px-4 relative">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#5b3eff]/10 rounded-full blur-[100px] pointer-events-none" />
        <Pricing />
      </div>
    </main>
  )
}
