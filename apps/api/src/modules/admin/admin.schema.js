import { z } from "zod";

export const branchCreateSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(30),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export const userCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  branch_id: z.number().int().positive(),
  role_id: z.number().int().positive(),
  password: z.string().min(6),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  branch_id: z.number().int().positive().optional(),
  role_id: z.number().int().positive().optional(),
  is_active: z.number().int().min(0).max(1).optional(),
  password: z.string().min(6).optional(),
});

export const roleCreateSchema = z.object({
  name: z.string().min(2).max(120),
  role_key: z.string().min(2).max(60),
  description: z.string().max(255).optional().nullable(),
  active: z.number().int().min(0).max(1).optional(),
});

export const roleUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  role_key: z.string().min(2).max(60).optional(),
  description: z.string().max(255).optional().nullable(),
  active: z.number().int().min(0).max(1).optional(),
});

export const rolePermissionsReplaceSchema = z.object({
  perm_keys: z.array(z.string().min(2).max(80)).max(500),
});
