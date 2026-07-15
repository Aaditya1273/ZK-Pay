export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T
  } catch (error) {
    return fallback
  }
}

export function prettyJson(obj: any): string {
  return JSON.stringify(obj, null, 2)
}
