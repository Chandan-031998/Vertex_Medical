import { z } from "zod";

export const customerCreateSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const customerUpdateSchema = customerCreateSchema.partial().extend({
  loyalty_points: z.number().int().optional(),
  credit_balance: z.number().optional(),
});

export const customerListSchema = z.object({
  q: z.string().optional(),
});
