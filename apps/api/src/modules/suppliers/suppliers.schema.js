import { z } from "zod";

export const supplierCreateSchema = z.object({
  name: z.string().min(2),
  gstin: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const supplierUpdateSchema = supplierCreateSchema.partial();

export const supplierListSchema = z.object({
  q: z.string().optional(),
});
