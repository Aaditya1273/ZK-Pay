import { generateWithFallback } from "./ai"

export async function generateDocs(idea: string) {
  const prompt = `You are an OKX.AI expert. Based on this agent idea: "${idea}", generate comprehensive documentation.
Return JSON ONLY. Format:
{
  "installationGuide": "markdown string",
  "usageExamples": "markdown string",
  "apiDocumentation": "markdown string",
  "faq": "markdown string"
}`

  try {
    const text = await generateWithFallback(prompt)
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim())
  } catch (e) {
    return {
      installationGuide: "No guide available.",
      usageExamples: "No examples available.",
      apiDocumentation: "No API docs.",
      faq: "No FAQs."
    }
  }
}
