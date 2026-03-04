import { z } from "zod";

export const stockListSchema = z.object({
  q: z.string().optional(),
  medicine_id: z.coerce.number().int().positive().optional(),
  sellable_only: z.union([z.coerce.number().int(), z.boolean()]).optional(),
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

export const transferListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  from: z.string().optional(),
  to: z.string().optional(),
  from_branch_id: z.coerce.number().int().positive().optional(),
  to_branch_id: z.coerce.number().int().positive().optional(),
});

export const transferBatchListSchema = z.object({
  from_branch_id: z.coerce.number().int().positive().optional(),
});

export const markDeadStockSchema = z.object({
  batch_id: z.number().int().positive(),
  qty: z.number().int().positive(),
  reason: z.string().min(3).max(255),
});

export const blockBatchSchema = z.object({
  batch_id: z.number().int().positive(),
  blocked: z.boolean(),
});

export const adjustSchema = z.object({
  batch_id: z.number().int().positive(),
  qty_delta: z.number().int(),
  reason: z.string().min(3),
});

export const adjustmentsListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
