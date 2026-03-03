import { z } from "zod";

export const h1ListSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
