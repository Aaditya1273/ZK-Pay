import fs from "fs"
import path from "path"
import os from "os"

export async function generateAvatar(name: string): Promise<string> {
  // Using a placeholder image service based on the brand name
  // In a full production setup with Vertex, we could call Imagen here.
  const size = 400
  const url = `https://api.dicebear.com/7.x/shapes/png?seed=${encodeURIComponent(name)}&size=${size}`
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error("Failed to generate avatar image")
  }
  
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  const tempPath = path.join(os.tmpdir(), `avatar-${Date.now()}.png`)
  fs.writeFileSync(tempPath, buffer)
  
  return tempPath
}
