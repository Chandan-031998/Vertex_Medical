# Vertex Medical Manager SQL Install

## Fresh install in phpMyAdmin
1. Create/select your target database.
2. Open that database in phpMyAdmin.
3. Go to **Import**.
4. Choose file: `apps/api/sql/FULL_INSTALL.sql`.
5. Format: `SQL`.
6. Click **Go**.

This script:
- drops all known project tables,
- recreates full schema (RBAC, inventory, billing, returns, purchases, prescriptions, reports config, white-label config, approvals, custom fields, integrations),
- seeds default org/branch/roles/modules/permissions,
- seeds default admin user.

## Seed login
- Email: `admin@vertex.com`
- Password: `Admin@123`

## Local validation (CLI)

### Import with mysql client (optional alternative)
```bash
mysql -u root -p your_database_name < apps/api/sql/FULL_INSTALL.sql
```

### Start backend
```bash
cd apps/api
npm install
npm run dev
```

### Validate login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vertex.com","password":"Admin@123"}'
```

Expected: JSON response with `access_token`, `refresh_token`, and admin user details.

### Validate basic endpoints
```bash
TOKEN="<paste_access_token>"

curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/auth/me
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/admin/roles
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/medicines?page=1&pageSize=10
```

If login fails, verify:
- API env points to same DB where `FULL_INSTALL.sql` was imported.
- Port/CORS config matches frontend (`apps/web/.env`).
