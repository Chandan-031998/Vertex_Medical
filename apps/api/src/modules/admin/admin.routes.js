import { Router } from "express";
import { authRequired } from "../../middleware/auth.middleware.js";
import { requireAnyPerms } from "../../middleware/rbac.middleware.js";
import * as ctrl from "./admin.controller.js";

const r = Router();

r.use(authRequired);

r.get("/branches", requireAnyPerms(["USER_ADMIN", "BRANCH_READ"]), ctrl.listBranches);
r.post("/branches", requireAnyPerms(["USER_ADMIN", "BRANCH_WRITE"]), ctrl.createBranch);

r.get("/permissions", requireAnyPerms(["USER_ADMIN", "PERMISSION_READ"]), ctrl.listPermissions);
r.get("/roles", requireAnyPerms(["USER_ADMIN", "ROLE_READ"]), ctrl.listRoles);
r.post("/roles", requireAnyPerms(["USER_ADMIN", "ROLE_WRITE"]), ctrl.createRole);
r.put("/roles/:id", requireAnyPerms(["USER_ADMIN", "ROLE_WRITE"]), ctrl.updateRole);
r.patch("/roles/:id", requireAnyPerms(["USER_ADMIN", "ROLE_WRITE"]), ctrl.updateRole);
r.delete("/roles/:id", requireAnyPerms(["USER_ADMIN", "ROLE_WRITE"]), ctrl.deleteRole);
r.get("/roles/:id/permissions", requireAnyPerms(["USER_ADMIN", "ROLE_READ"]), ctrl.getRolePermissions);
r.put("/roles/:id/permissions", requireAnyPerms(["USER_ADMIN", "ROLE_WRITE"]), ctrl.replaceRolePermissions);

r.get("/users", requireAnyPerms(["USER_ADMIN"]), ctrl.listUsers);
r.post("/users", requireAnyPerms(["USER_ADMIN"]), ctrl.createUser);
r.put("/users/:id", requireAnyPerms(["USER_ADMIN"]), ctrl.updateUser);
r.patch("/users/:id", requireAnyPerms(["USER_ADMIN"]), ctrl.updateUser);

export default r;
