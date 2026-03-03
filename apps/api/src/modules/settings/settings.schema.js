import { z } from "zod";

const jsonValueSchema = z.any();

export const upsertOrgSettingsSchema = z.object({
  settings: z.array(
    z.object({
      setting_key: z.string().min(2).max(120),
      setting_value_json: jsonValueSchema,
    })
  ).min(1),
});

export const upsertBrandingSchema = z.object({
  app_name: z.string().min(2).max(255).optional(),
  logo_url: z.string().url().max(500).optional().nullable(),
  primary_color: z.string().max(32).optional().nullable(),
  secondary_color: z.string().max(32).optional().nullable(),
  login_bg_url: z.string().url().max(500).optional().nullable(),
  support_phone: z.string().max(40).optional().nullable(),
  terms_url: z.string().url().max(500).optional().nullable(),
});

export const upsertOrgModulesSchema = z.object({
  modules: z.array(
    z.object({
      module_key: z.string().min(2).max(60),
      enabled: z.number().int().min(0).max(1),
    })
  ).min(1),
});

export const upsertNumberSeriesSchema = z.object({
  series: z.array(
    z.object({
      series_key: z.string().min(2).max(40),
      prefix: z.string().max(40),
      next_no: z.number().int().nonnegative(),
      padding: z.number().int().positive().max(20),
      reset_rule: z.enum(["NEVER", "DAILY", "MONTHLY", "YEARLY"]),
    })
  ).min(1),
});
