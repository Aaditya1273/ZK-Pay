const requestCounts = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS = 10 // per window

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = requestCounts.get(ip)

  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetIn: WINDOW_MS }
  }

  record.count++

  if (record.count > MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: record.resetAt - now }
  }

  return { allowed: true, remaining: MAX_REQUESTS - record.count, resetIn: record.resetAt - now }
}

// Periodically clean up stale entries
// Note: In-memory — resets on server restart. Won't work across serverless instances.
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of requestCounts) {
    if (now > val.resetAt) {
      requestCounts.delete(key)
    }
  }
}, 60_000)
