import { z } from "zod";

export const prescriptionCreateSchema = z.object({
  customer_id: z.coerce.number().int().positive().optional().nullable(),
  doctor_name: z.string().optional().nullable(),
  doctor_reg_no: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const prescriptionLinkSchema = z.object({
  invoice_id: z.number().int().positive(),
  prescription_id: z.number().int().positive(),
});
