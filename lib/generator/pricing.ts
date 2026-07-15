import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function generatePricing(idea: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  
  const prompt = `You are an expert OKX ASP pricing strategist.
  Given the user's idea, estimate a fair market fee in USDT.
  
  CRITICAL RULES:
  - Output MUST be a plain numeric string (e.g. "0.05" or "10").
  - NO currency units (no "USDT", "USD", etc.).
  - NO text, no explanation.
  - Max 6 decimal places.
  
  User Idea: ${idea}`
  
  const result = await model.generateContent(prompt)
  const response = result.response
  return response.text().trim().replace(/[^0-9.]/g, "")
}
