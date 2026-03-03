import { z } from "zod";

export const invoiceCreateSchema = z.object({
  customer_id: z.number().int().positive().optional().nullable(),
  customer: z.object({
    name: z.string().min(2),
    phone: z.string().optional().nullable(),
  }).optional(),
  doctor_name: z.string().optional().nullable(),
  prescription_id: z.number().int().positive().optional().nullable(),
  items: z.array(z.object({
    batch_id: z.number().int().positive(),
    qty: z.number().int().positive(),
    discount_amount: z.number().nonnegative().optional().default(0),
  })).min(1),
  payments: z.array(z.object({
    mode: z.enum(["CASH","UPI","CARD"]),
    amount: z.number().positive(),
    ref_no: z.string().optional().nullable(),
  })).min(1),
});

export const invoiceListSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
});
