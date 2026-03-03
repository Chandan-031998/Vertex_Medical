import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(20),
});

export const logoutSchema = refreshSchema;
