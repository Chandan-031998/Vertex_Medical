import { z } from "zod";

export const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const topSellingSchema = dateRangeSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
