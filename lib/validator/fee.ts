import { z } from "zod"

export const feeValidator = z.string()
  .trim()
  .regex(/^\d+(\.\d{1,6})?$/, "Fee must be a numeric string with at most 6 decimal places")
  .refine((val) => !/usdt|usd|approx/i.test(val), {
    message: "Fee must not contain currency units or text"
  })

export function validateFee(fee: string) {
  return feeValidator.safeParse(fee)
}
