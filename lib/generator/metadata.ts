import { generateWithFallback } from "./ai"

export async function generateMetadata(idea: string) {
  const prompt = `You are an OKX.AI expert. Based on this agent idea: "${idea}", generate marketplace metadata.
Return JSON ONLY. Format:
{
  "categories": ["string", "string"],
  "keywords": ["string", "string"],
  "capabilities": ["string", "string"],
  "featuresList": ["string", "string"],
  "routingMetadata": "string describing routing"
}`

  try {
    const text = await generateWithFallback(prompt)
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim())
  } catch (e) {
    return {
      categories: ["AI", "Utility"],
      keywords: ["agent", "bot"],
      capabilities: ["Text Generation"],
      featuresList: ["Fast", "Reliable"],
      routingMetadata: "Default HTTP Routing"
    }
  }
}
