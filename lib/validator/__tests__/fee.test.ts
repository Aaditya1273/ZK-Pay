import { describe, it, expect } from "vitest"
import { validateFee } from "../fee"

describe("feeValidator", () => {
  it("accepts valid integer fee", () => {
    const result = validateFee("5")
    expect(result.success).toBe(true)
  })

  it("accepts valid decimal fee with up to 6 decimal places", () => {
    const result = validateFee("0.05")
    expect(result.success).toBe(true)
  })

  it("accepts fee with 6 decimal places", () => {
    const result = validateFee("0.123456")
    expect(result.success).toBe(true)
  })

  it("accepts zero fee", () => {
    const result = validateFee("0")
    expect(result.success).toBe(true)
  })

  it("rejects fee with text", () => {
    const result = validateFee("5 USDT")
    expect(result.success).toBe(false)
  })

  it("rejects fee with 'usd'", () => {
    const result = validateFee("10 usd")
    expect(result.success).toBe(false)
  })

  it("rejects fee with 'approx'", () => {
    const result = validateFee("approx 5")
    expect(result.success).toBe(false)
  })

  it("rejects empty fee", () => {
    const result = validateFee("")
    expect(result.success).toBe(false)
  })

  it("rejects fee with more than 6 decimal places", () => {
    const result = validateFee("0.1234567")
    expect(result.success).toBe(false)
  })

  it("rejects non-numeric fee", () => {
    const result = validateFee("abc")
    expect(result.success).toBe(false)
  })

  it("accepts fee with surrounding whitespace after trimming", () => {
    const result = validateFee("  0.05  ")
    expect(result.success).toBe(true)
  })
})
