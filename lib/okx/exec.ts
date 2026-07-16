import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import os from "os"

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
  
  const currentPath = process.env.PATH || ""
  const extendedPath = [projectBin, localBin, npmGlobalBin, npxCacheBin, currentPath]
    .filter(Boolean)
    .join(":")

  const { stdout } = await execAsync(command, {
    env: {
      ...process.env,
      PATH: extendedPath,
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
