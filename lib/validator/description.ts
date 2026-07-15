import { z } from "zod"

export const descriptionValidator = z.string()
  .max(400, "Description must be at most 400 characters")
  .refine((val) => val.includes("\n"), {
    message: "Description must be 2 parts separated by a newline"
  })
  .refine((val) => !/github\.com|0x[a-fA-F0-9]{40}|tech stack|disclaimer/i.test(val), {
    message: "Description must not contain links, wallet addresses, or tech stack details"
  })

export function validateDescription(desc: string) {
  return descriptionValidator.safeParse(desc)
}
