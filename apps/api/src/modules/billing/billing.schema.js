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
  })).default([]),
});

export const invoiceListSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
  invoice_no: z.string().optional(),
  customer_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});

export const returnCreateSchema = z.object({
  invoice_id: z.number().int().positive(),
  reason: z.string().max(255).optional().nullable(),
  return_items: z.array(z.object({
    batch_id: z.number().int().positive(),
    qty: z.number().int().positive(),
  })).min(1),
  refunds: z.array(z.object({
    mode: z.enum(["CASH", "UPI", "CARD"]),
    amount: z.number().positive(),
    ref_no: z.string().optional().nullable(),
  })).default([]),
});
