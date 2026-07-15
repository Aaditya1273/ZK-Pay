import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateWithFallback(prompt: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY || "";
  const groqKey = process.env.GROQ_API_KEY || "";

  try {
    // Attempt Gemini first
    if (!geminiKey) throw new Error("No Gemini key");
    
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    
    return result.response.text();
  } catch (error) {
    console.warn("Gemini generation failed, falling back to Groq...");
    
    if (!groqKey) {
      throw new Error("Gemini failed and no Groq key is configured for fallback.");
    }

    // Fallback to Groq using standard fetch (OpenAI compatible endpoint)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Groq fallback failed: ${response.status} - ${errBody}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
