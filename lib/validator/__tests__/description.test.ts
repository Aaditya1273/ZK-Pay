import { describe, it, expect } from "vitest"
import { validateDescription } from "../description"

describe("descriptionValidator", () => {
  it("accepts valid 2-part descriptions", () => {
    const result = validateDescription("Writes SEO-optimized blog posts for crypto startups.\n1. topic 2. keywords 3. tone")
    expect(result.success).toBe(true)
  })

  it("rejects descriptions without a newline separator", () => {
    const result = validateDescription("Single line description without two parts")
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("2 parts")
    }
  })

  it("rejects descriptions over 400 characters", () => {
    const longDesc = "A".repeat(401) + "\n" + "B".repeat(50)
    const result = validateDescription(longDesc)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("400")
    }
  })

  it("rejects descriptions containing GitHub links", () => {
    const result = validateDescription("Does stuff.\nCheck github.com/my-repo for details")
    expect(result.success).toBe(false)
  })

  it("rejects descriptions containing wallet addresses", () => {
    const result = validateDescription("Send payment.\nSend to 0x1234567890abcdef1234567890abcdef12345678")
    expect(result.success).toBe(false)
  })

  it("rejects descriptions containing 'tech stack'", () => {
    const result = validateDescription("Builds things.\nUses Python and Node.js tech stack")
    expect(result.success).toBe(false)
  })

  it("rejects descriptions containing 'disclaimer'", () => {
    const result = validateDescription("Analyzes data.\nDisclaimer: Not financial advice")
    expect(result.success).toBe(false)
  })

  it("accepts minimal valid description", () => {
    const result = validateDescription("Short capability.\n1. input")
    expect(result.success).toBe(true)
  })

  it("handles empty string", () => {
    const result = validateDescription("")
    expect(result.success).toBe(false)
  })
})
