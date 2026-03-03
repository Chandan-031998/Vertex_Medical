# Vertex Medical Manager (White‑Label Pharmacy ERP) — React + Node + MySQL

A clean, deployment-ready starter for **Indian pharmacy workflow** (batch + expiry + GST + Schedule H1 register)
built with:

- **Frontend:** React + Tailwind (Vite)
- **Backend:** Node.js + Express (REST)
- **DB:** MySQL 8
- **Auth:** JWT access + refresh
- **RBAC:** Roles + permissions
- **Multi-branch:** org_id + branch_id scoping

---

## Default Login (seeded)
- **Email:** `admin@vertex.com`
- **Password:** `Admin@123`

---

## 1) Run locally (fastest)

### A) Start MySQL (Docker)
```bash
docker compose up -d
```

- MySQL: `localhost:3307`
- phpMyAdmin: `http://localhost:8088`  
  (server: `mysql`, user: `vertex_user`, pass: `vertex_pass`)

### B) Start API
```bash
cd apps/api
cp .env.example .env
npm install
npm run dev
```
API runs on: `http://localhost:4000`

### C) Start Web
```bash
cd apps/web
cp .env.example .env
npm install
npm run dev
```
Web runs on: `http://localhost:5173`

---

## 2) What is implemented (working)
### ✅ Auth + RBAC
- Login / refresh / me
- Permission-based route protection

### ✅ Inventory (batch-first)
- Medicines CRUD + barcode support
- Batches CRUD
- Stock ledger + current stock
- Low stock + near expiry

### ✅ Billing (POS)
- Invoice create (transaction)
- Stock deduction
- Expired batch blocked
- Schedule H1 register auto-write

### ✅ Purchases
- Purchase invoice create (transaction)
- Stock increase
- Batch auto-create if missing

### ✅ Customers & Suppliers
- CRUD

### ✅ Reports
- Sales summary
- Top selling
- Stock valuation
- Low stock / near expiry counts

---

## 3) Deployment notes (summary)
- Set API env: `TRUST_PROXY=1` behind nginx/cPanel
- Put React build on any static host (cPanel/Vercel/Netlify)
- Put API on Render/VPS/cPanel node app
- Set `CORS_ORIGINS` to your frontend domain

---

## 4) API docs quick test
After API starts:

- GET `http://localhost:4000/health`
- POST `http://localhost:4000/api/auth/login`

---

## License
MIT



Demo login credentials (all same password):

admin@vertex.com / Admin@123
owner@vertex.com / Admin@123
manager@vertex.com / Admin@123
pharmacist@vertex.com / Admin@123
cashier@vertex.com / Admin@123
