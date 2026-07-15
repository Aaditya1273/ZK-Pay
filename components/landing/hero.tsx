import { Button } from "@/components/ui/button"
import { ArrowRight, Terminal } from "lucide-react"
import Link from "next/link"

export function Hero() {
  return (
    <section className="py-24 space-y-8 text-center max-w-4xl mx-auto">
      <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium bg-muted/50">
        <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
        OKX.AI Onchain OS Ready
      </div>
      
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
        Zero-Touch <span className="text-muted-foreground">Deployment</span><br/>
        For AI Agents.
      </h1>
      
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        Describe your idea. SHIPIT automatically handles the generation, validation, 
        and on-chain registration in seconds. Built exclusively for OKX ASPs.
      </p>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link href="/new">
          <Button size="lg" className="h-12 px-8 text-base">
            Start Deploying <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link href="#how-it-works">
          <Button size="lg" variant="outline" className="h-12 px-8 text-base">
            <Terminal className="mr-2 h-4 w-4" /> View Docs
          </Button>
        </Link>
      </div>
    </section>
  )
}
