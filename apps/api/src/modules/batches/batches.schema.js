import { z } from "zod";

export const batchCreateSchema = z.object({
  medicine_id: z.number().int().positive(),
  batch_no: z.string().min(1),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mrp: z.number().positive(),
  purchase_rate: z.number().nonnegative(),
  selling_rate: z.number().positive(),
  gst_rate: z.number().min(0).max(28),
});

export const batchUpdateSchema = batchCreateSchema.partial();

export const batchListSchema = z.object({
  medicine_id: z.coerce.number().int().positive().optional(),
});
