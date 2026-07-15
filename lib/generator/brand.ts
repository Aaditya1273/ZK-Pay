import { generateWithFallback } from "./ai"

export async function generateBrandName(idea: string): Promise<string> {
  const prompt = `You are a professional OKX ASP brand namer. 
  Given the user's idea, output a 3-25 character professional brand name.
  CRITICAL RULES:
  - NO celebrity names (e.g. Trump, Musk, CZ)
  - NO test markers (test, demo)
  - Output ONLY the name. No quotes, no markdown, no explanation.
  
  User Idea: ${idea}`
  
  const text = await generateWithFallback(prompt)
  return text.trim().replace(/^"|"$/g, "")
}
