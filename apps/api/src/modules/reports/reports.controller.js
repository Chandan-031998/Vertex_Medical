import { asyncHandler } from "../../utils/asyncHandler.js";
import { dateRangeSchema, topSellingSchema } from "./reports.schema.js";
import * as svc from "./reports.service.js";

export const dashboard = asyncHandler(async (req, res) => {
  const out = await svc.dashboard(req.user.org_id, req.user.branch_id);
  res.json(out);
});

export const salesSummary = asyncHandler(async (req, res) => {
  const input = dateRangeSchema.parse(req.query);
  const rows = await svc.salesSummary(req.user.org_id, req.user.branch_id, input);
  res.json(rows);
});

export const topSelling = asyncHandler(async (req, res) => {
  const input = topSellingSchema.parse(req.query);
  const rows = await svc.topSelling(req.user.org_id, req.user.branch_id, input);
  res.json(rows);
});

export const stockValuation = asyncHandler(async (req, res) => {
  const rows = await svc.stockValuation(req.user.org_id, req.user.branch_id);
  res.json(rows);
});
