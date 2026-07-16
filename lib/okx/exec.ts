import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import os from "os"
import fs from "fs"

const execAsync = promisify(exec)

/**
 * Executes a CLI command and returns stdout as a trimmed string.
 * Includes ~/.local/bin in PATH so the onchainos CLI binary is found.
 * Passes proxy + OKX credential env vars to child processes.
 */
export async function execWithProxy(command: string): Promise<string> {
  const homeDir = os.homedir()
  const localBin = path.join(homeDir, ".local", "bin")
  const npmGlobalBin = path.join(homeDir, ".npm-global", "bin")
  // okx-a2a is installed via npx and lives in the npx cache
  const npxCacheBin = path.join(homeDir, ".npm", "_npx", "4e765b6729538b84", "node_modules", ".bin")
  
  // Vercel deployment support: use the bundled binary in the project's /bin directory
  const projectBin = path.join(process.cwd(), "bin")
  
  // In Vercel serverless, /var/task is read-only and might lose the +x bit.
  // We copy the binary to /tmp (which is writable) and chmod +x it.
  const tmpBin = "/tmp"
  if (process.env.VERCEL) {
    const srcPath = path.join(projectBin, "onchainos")
    const destPath = path.join(tmpBin, "onchainos")
    if (!fs.existsSync(destPath) && fs.existsSync(srcPath)) {
      try {
        fs.copyFileSync(srcPath, destPath)
        fs.chmodSync(destPath, "755")
      } catch (err) {
        console.warn("Failed to copy/chmod onchainos to /tmp:", err)
      }
    }
  }
  
  const currentPath = process.env.PATH || ""
  const extendedPath = [tmpBin, projectBin, localBin, npmGlobalBin, npxCacheBin, currentPath]
    .filter(Boolean)
    .join(":")

  const { stdout } = await execAsync(command, {
    env: {
      ...process.env,
      PATH: extendedPath,
      // Vercel read-only filesystem fix: tell onchainos CLI that HOME is /tmp
      // so it can successfully create the ~/.onchainos folder.
      ...(process.env.VERCEL && { HOME: "/tmp" }),
      // Only pass proxy vars when actually set — empty strings can confuse
      // Rust-based CLIs like onchainos
      ...(process.env.HTTPS_PROXY && { HTTPS_PROXY: process.env.HTTPS_PROXY }),
      ...(process.env.HTTP_PROXY && { HTTP_PROXY: process.env.HTTP_PROXY }),
      // Pass OKX credentials explicitly for CLI auth
      ...(process.env.OKX_API_KEY && { OKX_API_KEY: process.env.OKX_API_KEY }),
      ...(process.env.OKX_SECRET_KEY && { OKX_SECRET_KEY: process.env.OKX_SECRET_KEY }),
      ...(process.env.OKX_PASSPHRASE && { OKX_PASSPHRASE: process.env.OKX_PASSPHRASE }),
    },
  })
  return stdout.toString().trim()
}
