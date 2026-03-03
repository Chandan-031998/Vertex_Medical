import { z } from "zod";

export const medicineCreateSchema = z.object({
  name: z.string().min(2),
  salt: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  schedule_type: z.enum(["OTC","H","H1","X","NARCOTIC"]).optional(),
  gst_rate: z.number().min(0).max(28).optional(),
  reorder_level: z.number().int().min(0).optional(),
  barcode_primary: z.string().optional().nullable(),
});

export const medicineUpdateSchema = medicineCreateSchema.partial().extend({
  is_active: z.number().int().min(0).max(1).optional(),
});

export const medicineSearchSchema = z.object({
  q: z.string().min(1),
});
