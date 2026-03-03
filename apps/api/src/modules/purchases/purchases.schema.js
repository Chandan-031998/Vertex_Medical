import { z } from "zod";

export const purchaseCreateSchema = z.object({
  supplier_id: z.number().int().positive(),
  invoice_no: z.string().min(1),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(z.object({
    medicine_id: z.number().int().positive(),
    batch_no: z.string().min(1),
    expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    qty: z.number().int().positive(),
    purchase_rate: z.number().nonnegative(),
    mrp: z.number().positive(),
    selling_rate: z.number().positive(),
    gst_rate: z.number().min(0).max(28),
  })).min(1),
});

export const purchaseListSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
