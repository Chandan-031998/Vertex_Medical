# Deploy Frontend to Vercel (Monorepo)

This project uses React Router client-side routes (for example `/login`, `/reports`, `/inventory/transfers`), so Vercel must rewrite all paths to `/` for SPA routing.

## Required Vercel Settings

1. Import repository in Vercel.
2. Set **Root Directory** to `apps/web`.
3. Set **Build Command** to `npm run build`.
4. Set **Output Directory** to `dist`.
5. Add environment variable:
   - `VITE_API_BASE=https://vertex-medical.onrender.com`

## SPA Route Fix

Ensure this file exists:

- `apps/web/vercel.json`

With:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

This prevents Vercel `404 NOT_FOUND` errors when opening client routes directly (for example `/login`).

## Redeploy

After applying settings and adding `vercel.json`, trigger a redeploy from Vercel dashboard.
