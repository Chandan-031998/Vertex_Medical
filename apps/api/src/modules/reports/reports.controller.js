import { asyncHandler } from "../../utils/asyncHandler.js";
import { customerDuesSchema, dateRangeSchema, deadStockSchema, gstDateRangeSchema, salesDetailsSchema, stockValuationSchema, supplierDuesSchema, topSellingSchema } from "./reports.schema.js";
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
  const input = stockValuationSchema.parse(req.query);
  const branchId = input.branch_id || req.user.branch_id;
  const rows = await svc.stockValuation(req.user.org_id, branchId);
  res.json(rows);
});

export const salesDetails = asyncHandler(async (req, res) => {
  const input = salesDetailsSchema.parse(req.query);
  const rows = await svc.salesDetails(req.user.org_id, req.user.branch_id, input);
  res.json(rows);
});

export const customerDues = asyncHandler(async (req, res) => {
  const input = customerDuesSchema.parse(req.query);
  const rows = await svc.customerDues(req.user.org_id, req.user.branch_id, input);
  res.json(rows);
});

export const deadStock = asyncHandler(async (req, res) => {
  const input = deadStockSchema.parse(req.query);
  const rows = await svc.deadStock(req.user.org_id, req.user.branch_id, input);
  res.json(rows);
});

export const supplierDues = asyncHandler(async (req, res) => {
  const input = supplierDuesSchema.parse(req.query);
  const rows = await svc.supplierDues(req.user.org_id, req.user.branch_id, input);
  res.json(rows);
});

export const gstSales = asyncHandler(async (req, res) => {
  const input = gstDateRangeSchema.parse(req.query);
  const out = await svc.gstSales(req.user.org_id, req.user.branch_id, input);
  res.json(out);
});

export const gstPurchase = asyncHandler(async (req, res) => {
  const input = gstDateRangeSchema.parse(req.query);
  const out = await svc.gstPurchase(req.user.org_id, req.user.branch_id, input);
  res.json(out);
});

export const gstr1Csv = asyncHandler(async (req, res) => {
  const input = gstDateRangeSchema.parse(req.query);
  const csv = await svc.gstr1Csv(req.user.org_id, req.user.branch_id, input);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=gstr1.csv");
  res.send(csv);
});

export const gstr3bSummary = asyncHandler(async (req, res) => {
  const input = gstDateRangeSchema.parse(req.query);
  const out = await svc.gstr3bSummary(req.user.org_id, req.user.branch_id, input);
  res.json(out);
});

export const gstSummary = asyncHandler(async (req, res) => {
  const input = gstDateRangeSchema.parse(req.query);
  const out = await svc.gstr3bSummary(req.user.org_id, req.user.branch_id, input);
  res.json(out);
});
