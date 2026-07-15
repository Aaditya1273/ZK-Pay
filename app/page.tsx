"use client"

import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Pricing } from "@/components/landing/pricing"
import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight">SHIPIT</div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4">
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
      </div>

      <footer className="border-t py-12 text-center text-sm text-muted-foreground">
        <p>© 2026 SHIPIT. Built for OKX.AI Onchain OS.</p>
      </footer>
    </main>
  )
}
