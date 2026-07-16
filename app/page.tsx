"use client"

import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import Link from "next/link"
import { Sparkles, ArrowUpRight } from "lucide-react"
import { useUIStore } from "@/stores/ui.store"

export default function Home() {
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
            <Link href="#features" className="text-[14px] font-medium text-gray-400 hover:text-white transition-colors hidden sm:block">
              Features
            </Link>
            <Link href="/pricing" className="text-[14px] font-medium text-gray-400 hover:text-white transition-colors hidden sm:block">
              Pricing
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

      <div className="relative pt-40 pb-24 md:pt-52 md:pb-32 max-w-6xl mx-auto px-4">
        {/* Massive Lovable Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-r from-pink-500/30 via-orange-400/20 to-blue-600/30 rounded-[100%] blur-[120px] pointer-events-none" />
        <div className="absolute top-20 right-0 w-[600px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-20 left-0 w-[600px] h-[400px] bg-pink-500/20 rounded-full blur-[100px] pointer-events-none" />
        
        <Hero />
      </div>

      <div id="features" className="max-w-6xl mx-auto px-4 pb-32">
        <Features />
      </div>

      {/* Massive Lovable Footer */}
      <footer className="relative bg-[#111] pt-24 pb-12 overflow-hidden border-t border-[#222]">
        {/* Subtle bottom gradient */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-gradient-to-t from-[#5b3eff]/10 to-transparent blur-[80px] pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8a75ff] to-[#5b3eff] flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-extrabold text-xl tracking-tight text-white">SHIPIT</span>
              </div>
              <p className="text-gray-400 text-sm max-w-xs mb-6 leading-relaxed">
                The zero-touch deployment platform for OKX.AI. Build, validate, and ship agent service providers instantly.
              </p>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                All systems operational
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Product</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors flex items-center gap-1">Changelog <ArrowUpRight className="w-3 h-3" /></Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Resources</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Templates</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Guides</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Community</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Company</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Partners</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Legal</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#333] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">© 2026 SHIPIT. Built for OKX.AI Onchain OS.</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-2 hover:text-white cursor-pointer transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="currentColor"></path><path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="currentColor"></path><path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="currentColor"></path><path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26537 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="currentColor"></path></svg>
                EN
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
