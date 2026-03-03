import { asyncHandler } from "../../utils/asyncHandler.js";
import { auditLog } from "../../utils/audit.js";
import {
  upsertBrandingSchema,
  upsertNumberSeriesSchema,
  upsertOrgModulesSchema,
  upsertOrgSettingsSchema,
} from "./settings.schema.js";
import * as svc from "./settings.service.js";

export const getOrgSettings = asyncHandler(async (req, res) => {
  const rows = await svc.getOrgSettings(req.user.org_id);
  res.json(rows);
});

export const putOrgSettings = asyncHandler(async (req, res) => {
  const input = upsertOrgSettingsSchema.parse(req.body);
  const before = await svc.getOrgSettings(req.user.org_id);
  const out = await svc.putOrgSettings(req.user.org_id, req.user.user_id, input.settings);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "UPDATE", entity: "org_settings", entity_id: null, before, after: out, req });
  res.json(out);
});

export const getBranding = asyncHandler(async (req, res) => {
  const row = await svc.getBranding(req.user.org_id);
  res.json(row);
});

export const putBranding = asyncHandler(async (req, res) => {
  const input = upsertBrandingSchema.parse(req.body);
  const before = await svc.getBranding(req.user.org_id);
  const out = await svc.putBranding(req.user.org_id, input);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "UPDATE", entity: "org_branding", entity_id: null, before, after: out, req });
  res.json(out);
});

export const getModules = asyncHandler(async (req, res) => {
  const rows = await svc.getOrgModules(req.user.org_id);
  res.json(rows);
});

export const putModules = asyncHandler(async (req, res) => {
  const input = upsertOrgModulesSchema.parse(req.body);
  const before = await svc.getOrgModules(req.user.org_id);
  const out = await svc.putOrgModules(req.user.org_id, input.modules);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "TOGGLE", entity: "org_modules", entity_id: null, before, after: out, req });
  res.json(out);
});

export const getNumberSeries = asyncHandler(async (req, res) => {
  const rows = await svc.getNumberSeries(req.user.org_id);
  res.json(rows);
});

export const putNumberSeries = asyncHandler(async (req, res) => {
  const input = upsertNumberSeriesSchema.parse(req.body);
  const before = await svc.getNumberSeries(req.user.org_id);
  const out = await svc.putNumberSeries(req.user.org_id, input.series);
  await auditLog({ org_id: req.user.org_id, branch_id: req.user.branch_id, user_id: req.user.user_id, action: "UPDATE", entity: "number_series", entity_id: null, before, after: out, req });
  res.json(out);
});
