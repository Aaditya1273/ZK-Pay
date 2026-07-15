import { generateWithFallback } from "./ai"

export async function generateMarketing(idea: string) {
  const prompt = `You are an OKX.AI expert. Based on this agent idea: "${idea}", generate a marketing kit.
Return JSON ONLY. Format:
{
  "productPitch": "string",
  "launchAnnouncement": "string"
}`

  const text = await generateWithFallback(prompt)
  
  try {
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim())
  } catch (e) {
    return {
      productPitch: "The best agent on OKX.",
      launchAnnouncement: "We are live on OKX!"
    }
  }
}
