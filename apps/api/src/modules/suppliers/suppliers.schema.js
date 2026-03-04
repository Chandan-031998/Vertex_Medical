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

export const supplierPaymentsListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const supplierPaymentCreateSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["CASH", "UPI", "CARD", "BANK"]),
  ref_no: z.string().max(80).optional().nullable(),
  paid_at: z.string().optional(),
  notes: z.string().max(255).optional().nullable(),
});
