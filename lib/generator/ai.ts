import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * AI generation with triple fallback: Gemini → Groq → NVIDIA → error.
 * Each fallback activates when the previous provider hits rate limits or fails.
 */
export async function generateWithFallback(prompt: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY || "";
  const groqKey = process.env.GROQ_API_KEY || "";
  const nvidiaKey = process.env.NVIDIA_API_KEY || "";

  // --- 1. Try Gemini ---
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      console.warn("Gemini failed, trying Groq...", (err as Error).message?.slice(0, 80));
    }
  }

  // --- 2. Fallback to Groq ---
  if (groqKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen/qwen3-32b",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Groq ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      // Strip Qwen3 native chain-of-thought blocks
      content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      return content;
    } catch (err) {
      console.warn("Groq failed, trying NVIDIA...", (err as Error).message?.slice(0, 80));
    }
  }

  // --- 3. Fallback to NVIDIA NIM ---
  if (nvidiaKey) {
    try {
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${nvidiaKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta/llama-3.1-70b-instruct",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`NVIDIA ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (err) {
      console.warn("NVIDIA also failed.", (err as Error).message?.slice(0, 80));
    }
  }

  // --- All providers exhausted ---
  const missing: string[] = [];
  if (!geminiKey) missing.push("GEMINI_API_KEY");
  if (!groqKey) missing.push("GROQ_API_KEY");
  if (!nvidiaKey) missing.push("NVIDIA_API_KEY");

  throw new Error(
    missing.length === 3
      ? "No AI providers configured. Set GEMINI_API_KEY, GROQ_API_KEY, or NVIDIA_API_KEY in your .env.local."
      : "All AI providers (Gemini, Groq, NVIDIA) exhausted or unreachable. Try again shortly."
  );
}
