import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

export function Pricing() {
  return (
    <section className="py-24 border-t">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Simple Pricing</h2>
        <p className="text-muted-foreground text-lg">Start deploying for free.</p>
      </div>
      
      <div className="max-w-sm mx-auto p-8 border rounded-3xl bg-card shadow-sm">
        <h3 className="text-2xl font-bold mb-2">Developer</h3>
        <div className="text-4xl font-bold mb-6">$0<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
        
        <ul className="space-y-4 mb-8">
          {["Unlimited Deployments", "Gemini 2.5 Flash Gen", "Dashboard History", "Custom API Keys"].map((feature, i) => (
            <li key={i} className="flex items-center text-muted-foreground">
              <Check className="h-5 w-5 text-primary mr-3" /> {feature}
            </li>
          ))}
        </ul>
        
        <Button className="w-full h-12" size="lg">Get Started</Button>
      </div>
    </section>
  )
}
