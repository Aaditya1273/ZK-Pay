import { NextRequest } from "next/server"
import { generateBrandName } from "@/lib/generator/brand"
import { generateDescription } from "@/lib/generator/description"
import { generatePricing } from "@/lib/generator/pricing"
import { generateAvatar } from "@/lib/generator/avatar"
import { generateMetadata } from "@/lib/generator/metadata"
import { generateDocs } from "@/lib/generator/docs"
import { generateMarketing } from "@/lib/generator/marketing"
import { validateName } from "@/lib/validator/name"
import { validateDescription } from "@/lib/validator/description"
import { validateFee } from "@/lib/validator/fee"
import { checkRateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  const { idea, apiKey } = await req.json()

  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests. Please wait before generating again." }), {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)),
        "X-RateLimit-Remaining": "0",
      },
    })
  }
  
  if (!idea) {
    return new Response(JSON.stringify({ error: "Idea is required" }), { status: 400 })
  }
  
  if (apiKey) {
    process.env.GEMINI_API_KEY = apiKey
  }

  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  let writerClosed = false
  
  const sendEvent = async (event: string, data: any) => {
    if (writerClosed) return
    try {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
    } catch { /* stream may have been closed by client disconnect */ }
  }

  const executeGeneration = async () => {
    try {
      // 1. Generate & Validate Name
      await sendEvent("step", { id: "1", label: "Generating Brand Name", status: "loading" })
      const name = await generateBrandName(idea)
      const nameVal = validateName(name)
      if (!nameVal.success) throw new Error(`Name validation failed: ${nameVal.error.errors[0].message}`)
      await sendEvent("step", { id: "1", label: `Name: ${name}`, status: "success" })

      // 2. Generate & Validate Description
      await sendEvent("step", { id: "2", label: "Generating Service Description", status: "loading" })
      const desc = await generateDescription(idea)
      const descVal = validateDescription(desc)
      if (!descVal.success) throw new Error(`Description validation failed: ${descVal.error.errors[0].message}`)
      await sendEvent("step", { id: "2", label: "Description generated & validated", status: "success" })

      // 3. Generate & Validate Pricing & Metadata
      await sendEvent("step", { id: "3", label: "Analyzing Pricing & Metadata", status: "loading" })
      const [pricingObj, metadataObj, docsObj, marketingObj] = await Promise.all([
        generatePricing(idea),
        generateMetadata(idea),
        generateDocs(idea),
        generateMarketing(idea)
      ])
      const feeVal = validateFee(pricingObj.fee)
      if (!feeVal.success) throw new Error(`Fee validation failed: ${feeVal.error.errors[0].message}`)
      await sendEvent("step", { id: "3", label: `Fee: ${pricingObj.fee} USDT`, status: "success" })
      
      // 4. Generate Avatar (returns a public https:// URL — no disk I/O)
      await sendEvent("step", { id: "4", label: "Generating Identity Avatar", status: "loading" })
      const avatarPath = await generateAvatar(name)
      await sendEvent("step", { id: "4", label: "Avatar Generated", status: "success" })

      // Final signal for generation complete
      await sendEvent("done", { 
        name, 
        description: desc, 
        fee: pricingObj.fee, 
        avatarUrl: avatarPath,
        categories: metadataObj.categories,
        keywords: metadataObj.keywords,
        capabilities: metadataObj.capabilities,
        featuresList: metadataObj.featuresList,
        routingMetadata: metadataObj.routingMetadata,
        pricing: {
          subscriptionPlans: pricingObj.subscriptionPlans,
          usageTiers: pricingObj.usageTiers,
          premiumUpgrades: pricingObj.premiumUpgrades
        },
        docs: docsObj,
        marketing: marketingObj
      })
    } catch (error: any) {
      await sendEvent("error", { message: error.message || "Generation failed" })
    } finally {
      if (!writerClosed) {
        writerClosed = true
        await writer.close().catch(() => {})
      }
    }
  }

  executeGeneration()

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  })
}
