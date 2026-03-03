import { asyncHandler } from "../../utils/asyncHandler.js";
import { h1ListSchema } from "./compliance.schema.js";
import * as svc from "./compliance.service.js";

export const scheduleH1 = asyncHandler(async (req, res) => {
  const input = h1ListSchema.parse(req.query);
  const rows = await svc.scheduleH1(req.user.org_id, req.user.branch_id, input);
  res.json(rows);
});
