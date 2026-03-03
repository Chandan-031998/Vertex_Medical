import { asyncHandler } from "../../utils/asyncHandler.js";
import { loginSchema, refreshSchema, logoutSchema } from "./auth.schema.js";
import * as service from "./auth.service.js";

export const login = asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const result = await service.login(input);
  res.json(result);
});

export const refresh = asyncHandler(async (req, res) => {
  const input = refreshSchema.parse(req.body);
  const result = await service.refresh(input);
  res.json(result);
});

export const logout = asyncHandler(async (req, res) => {
  const input = logoutSchema.parse(req.body);
  const result = await service.logout(input);
  res.json(result);
});

export const me = asyncHandler(async (req, res) => {
  const user = await service.me(req.user.user_id);
  res.json({ user, perms: req.user.perms, role_key: req.user.role_key });
});
