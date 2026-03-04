import { Router } from "express";
import { authRequired } from "../../middleware/auth.middleware.js";
import { requireAnyPerms } from "../../middleware/rbac.middleware.js";
import * as ctrl from "./admin.controller.js";

const r = Router();

r.use(authRequired);

r.get("/branches", requireAnyPerms(["BRANCH_READ", "USER_ADMIN"]), ctrl.listBranches);
r.post("/branches", requireAnyPerms(["BRANCH_WRITE", "USER_ADMIN"]), ctrl.createBranch);
r.patch("/branches/:id", requireAnyPerms(["BRANCH_WRITE", "USER_ADMIN"]), ctrl.updateBranch);

r.get("/permissions", requireAnyPerms(["USER_ADMIN"]), ctrl.listPermissions);
r.get("/roles", requireAnyPerms(["USER_ADMIN"]), ctrl.listRoles);
r.post("/roles", requireAnyPerms(["USER_ADMIN"]), ctrl.createRole);
r.put("/roles/:id", requireAnyPerms(["USER_ADMIN"]), ctrl.updateRole);
r.patch("/roles/:id", requireAnyPerms(["USER_ADMIN"]), ctrl.updateRole);
r.delete("/roles/:id", requireAnyPerms(["USER_ADMIN"]), ctrl.deleteRole);
r.get("/roles/:id/permissions", requireAnyPerms(["USER_ADMIN"]), ctrl.getRolePermissions);
r.put("/roles/:id/permissions", requireAnyPerms(["USER_ADMIN"]), ctrl.replaceRolePermissions);

r.get("/users", requireAnyPerms(["USER_ADMIN"]), ctrl.listUsers);
r.post("/users", requireAnyPerms(["USER_ADMIN"]), ctrl.createUser);
r.put("/users/:id", requireAnyPerms(["USER_ADMIN"]), ctrl.updateUser);
r.patch("/users/:id", requireAnyPerms(["USER_ADMIN"]), ctrl.updateUser);

export default r;
