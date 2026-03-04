# Vertex Medical API

## Route Contract Check (dev)
Use this to catch frontend endpoint paths that do not match mounted Express routes.

From `apps/api`:

```bash
npm run check:routes
```

Behavior:
- Reads mounted API routes from `src/routes/index.routes.js` and module route files.
- Reads frontend API paths from `apps/web/src/api/endpoints.js`.
- Warns/fails if a web endpoint path is not mounted by backend.
