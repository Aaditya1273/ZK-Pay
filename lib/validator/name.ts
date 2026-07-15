import { z } from "zod"

export const nameValidator = z.string()
  .trim()
  .min(3, "Name must be at least 3 characters")
  .max(25, "Name must be at most 25 characters")
  .refine((val) => !/test|demo|musk|trump|cz/i.test(val), {
    message: "Name contains banned markers or celebrity references"
  })

export function validateName(name: string) {
  return nameValidator.safeParse(name)
}
