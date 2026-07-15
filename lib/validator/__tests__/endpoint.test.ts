import { describe, it, expect } from "vitest"
import { validateEndpoint } from "../endpoint"

describe("endpointValidator", () => {
  it("accepts valid HTTPS URL", () => {
    const result = validateEndpoint("https://api.example.com/v1")
    expect(result.success).toBe(true)
  })

  it("rejects HTTP URL (not HTTPS)", () => {
    const result = validateEndpoint("http://api.example.com")
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("HTTPS")
    }
  })

  it("rejects localhost", () => {
    const result = validateEndpoint("https://localhost:3000/api")
    expect(result.success).toBe(false)
  })

  it("rejects 127.0.0.1", () => {
    const result = validateEndpoint("https://127.0.0.1/api")
    expect(result.success).toBe(false)
  })

  it("rejects private IP (192.168.x.x)", () => {
    const result = validateEndpoint("https://192.168.1.1/api")
    expect(result.success).toBe(false)
  })

  it("rejects .local domains", () => {
    const result = validateEndpoint("https://myapp.local/api")
    expect(result.success).toBe(false)
  })

  it("rejects URLs longer than 512 characters", () => {
    const longUrl = "https://example.com/" + "a".repeat(500)
    const result = validateEndpoint(longUrl)
    expect(result.success).toBe(false)
  })

  it("rejects non-URL strings", () => {
    const result = validateEndpoint("not-a-url")
    expect(result.success).toBe(false)
  })

  it("rejects empty string", () => {
    const result = validateEndpoint("")
    expect(result.success).toBe(false)
  })
})
