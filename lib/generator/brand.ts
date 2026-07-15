import { GoogleGenerativeAI } from "@google/generative-ai"

// We assume process.env.GEMINI_API_KEY is set
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function generateBrandName(idea: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  
  const prompt = `You are a professional OKX ASP brand namer. 
  Given the user's idea, output a 3-25 character professional brand name.
  CRITICAL RULES:
  - NO celebrity names (e.g. Trump, Musk, CZ)
  - NO test markers (test, demo)
  - Output ONLY the name. No quotes, no markdown, no explanation.
  
  User Idea: ${idea}`
  
  const result = await model.generateContent(prompt)
  const response = result.response
  return response.text().trim().replace(/^"|"$/g, "")
}
