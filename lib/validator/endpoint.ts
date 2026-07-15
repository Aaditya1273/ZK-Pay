import { z } from "zod"

export const endpointValidator = z.string()
  .url("Must be a valid URL")
  .startsWith("https://", "Endpoint must use HTTPS")
  .max(512, "Endpoint must be at most 512 characters")
  .refine((val) => !/localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|.local/i.test(val), {
    message: "Endpoint must be publicly reachable, not a local or private address"
  })

export function validateEndpoint(url: string) {
  return endpointValidator.safeParse(url)
}
