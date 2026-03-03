export function requireRoles(roles = []) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    const roleKey = req.user?.role_key;
    if (!roleKey) return res.status(403).json({ message: "Forbidden" });
    if (allowed.size === 0 || allowed.has(roleKey)) return next();
    return res.status(403).json({ message: "Insufficient role" });
  };
}

export function requirePerms(perms = []) {
  const required = new Set(perms);
  return (req, res, next) => {
    const userPerms = new Set(req.user?.perms || []);
    for (const p of required) {
      if (!userPerms.has(p)) {
        return res.status(403).json({ message: `Missing permission: ${p}` });
      }
    }
    next();
  };
}

export function requireAnyPerms(perms = []) {
  const expected = new Set(perms);
  return (req, res, next) => {
    if (expected.size === 0) return next();
    const userPerms = new Set(req.user?.perms || []);
    for (const p of expected) {
      if (userPerms.has(p)) return next();
    }
    return res.status(403).json({ message: "Insufficient permissions" });
  };
}
