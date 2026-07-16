/**
 * Generates a deterministic avatar for the given agent name.
 * Returns a publicly-accessible HTTPS URL — no disk I/O, no subprocess.
 * This URL is passed directly to onchainos --picture.
 */
export async function generateAvatar(name: string): Promise<string> {
  const url = `https://api.dicebear.com/7.x/shapes/png?seed=${encodeURIComponent(name)}&size=400`
  // Validate the URL resolves (fast HEAD check)
  const check = await fetch(url, { method: "HEAD" })
  if (!check.ok) throw new Error("Failed to generate avatar image")
  return url
}
