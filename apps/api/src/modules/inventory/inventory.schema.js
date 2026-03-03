import { z } from "zod";

export const stockListSchema = z.object({
  q: z.string().optional(),
});

export const nearExpirySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(60),
});

export const transferSchema = z.object({
  to_branch_id: z.number().int().positive(),
  items: z.array(z.object({
    batch_id: z.number().int().positive(),
    qty: z.number().int().positive(),
  })).min(1),
  note: z.string().optional().nullable(),
});

export const adjustSchema = z.object({
  batch_id: z.number().int().positive(),
  qty_delta: z.number().int(),
  reason: z.string().min(3),
});

export const adjustmentsListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
