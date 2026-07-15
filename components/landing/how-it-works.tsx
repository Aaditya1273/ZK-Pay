export function HowItWorks() {
  const steps = [
    { num: "01", title: "Describe", desc: "Type a single sentence about what your AI agent does." },
    { num: "02", title: "Review", desc: "Approve the generated brand, pricing, and 2-part description." },
    { num: "03", title: "Deploy", desc: "Watch the SSE stream execute the OKX CLI commands in real-time." }
  ]

  return (
    <section id="how-it-works" className="py-24 border-t bg-muted/30">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative p-6">
              <div className="text-6xl font-bold text-muted/50 mb-4">{step.num}</div>
              <h3 className="text-2xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
