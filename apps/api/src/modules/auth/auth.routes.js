import { Router } from "express";
import * as ctrl from "./auth.controller.js";
import { authRequired } from "../../middleware/auth.middleware.js";

const r = Router();

r.post("/login", ctrl.login);
r.post("/refresh", ctrl.refresh);
r.post("/logout", ctrl.logout);
r.get("/me", authRequired, ctrl.me);

export default r;
