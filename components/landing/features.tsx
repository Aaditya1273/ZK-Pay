import { CheckCircle2, Zap, Shield, Image as ImageIcon } from "lucide-react"

const features = [
  {
    icon: Zap,
    title: "AI-Powered Generation",
    description: "Gemini 2.5 Flash automatically generates compliant brand names, descriptions, and pricing models."
  },
  {
    icon: Shield,
    title: "Strict Zod Validation",
    description: "Never hit a CLI error again. Pre-validated against all OKX.AI strict deployment rules."
  },
  {
    icon: ImageIcon,
    title: "Auto Avatar Gen",
    description: "Bypass OKX's anti-URL rules with automatic avatar generation and physical file uploads."
  },
  {
    icon: CheckCircle2,
    title: "1-Click Activation",
    description: "Orchestrates precheck, validate, create, and activate in a single seamless SSE pipeline."
  }
]

export function Features() {
  return (
    <section className="py-24 border-t">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Everything you need to ship</h2>
        <p className="text-muted-foreground text-lg">Stop wrestling with CLI commands and JSON payloads.</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto px-4">
        {features.map((feature, i) => (
          <div key={i} className="p-6 border rounded-2xl bg-card hover:border-primary/50 transition-colors">
            <feature.icon className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
