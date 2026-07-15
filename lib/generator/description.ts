import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function generateDescription(idea: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  
  const prompt = `You are a professional OKX ASP service describer.
  Given the user's idea, write a 2-part description separated by a newline.
  Part 1: Core capability summary (what it does + who it's for).
  Part 2: What the user must provide (e.g. "1. topic 2. tone").
  
  CRITICAL RULES:
  - Max 400 characters total.
  - NO example prompts.
  - NO links, no wallet addresses.
  - NO tech-stack details.
  - NO disclaimers.
  - Do not use markdown, just plain text with exactly one newline separating the two parts.
  
  User Idea: ${idea}`
  
  const result = await model.generateContent(prompt)
  const response = result.response
  return response.text().trim()
}
