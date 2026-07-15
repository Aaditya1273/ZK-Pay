import { describe, it, expect } from "vitest"
import { validateName, nameValidator } from "../name"

describe("nameValidator", () => {
  it("accepts valid names between 3-25 characters", () => {
    const result = validateName("BlogWise")
    expect(result.success).toBe(true)
  })

  it("accepts names with numbers and letters", () => {
    const result = validateName("AIWriterPro")
    expect(result.success).toBe(true)
  })

  it("rejects names shorter than 3 characters", () => {
    const result = validateName("AB")
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 3 characters")
    }
  })

  it("rejects names longer than 25 characters", () => {
    const result = validateName("A".repeat(26))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at most 25 characters")
    }
  })

  it("rejects names containing 'test'", () => {
    const result = validateName("TestAgent")
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("banned markers")
    }
  })

  it("rejects names containing 'demo'", () => {
    const result = validateName("DemoApp")
    expect(result.success).toBe(false)
  })

  it("rejects celebrity names (musk)", () => {
    const result = validateName("ElonMuskAI")
    expect(result.success).toBe(false)
  })

  it("rejects celebrity names (trump)", () => {
    const result = validateName("TrumpBot")
    expect(result.success).toBe(false)
  })

  it("rejects celebrity names (cz)", () => {
    const result = validateName("CZToken")
    expect(result.success).toBe(false)
  })

  it("handles empty string", () => {
    const result = validateName("")
    expect(result.success).toBe(false)
  })

  it("rejects whitespace-only string after trimming", () => {
    const result = validateName("   ")
    expect(result.success).toBe(false)
  })

  it("accepts name with surrounding whitespace after trimming", () => {
    const result = validateName("  BlogWise  ")
    expect(result.success).toBe(true)
  })
})
