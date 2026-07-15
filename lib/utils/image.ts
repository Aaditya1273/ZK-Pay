export async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const contentType = response.headers.get("content-type") || "image/png"
  return `data:${contentType};base64,${buffer.toString("base64")}`
}
