import { z } from "zod";

export const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const topSellingSchema = dateRangeSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const salesDetailsSchema = dateRangeSchema.extend({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const customerDuesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});

export const deadStockSchema = dateRangeSchema.extend({
  limit: z.coerce.number().int().min(1).max(1000).default(500),
});

export const supplierDuesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});

export const gstDateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const stockValuationSchema = z.object({
  branch_id: z.coerce.number().int().positive().optional(),
});
