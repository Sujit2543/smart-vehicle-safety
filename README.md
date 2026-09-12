# Car Deal Smart Safety Tag

An All-In-One Smart Vehicle Safety Tag and QR/NFC Platform.

## Stack

| Layer     | Technology                                              |
|-----------|--------------------------------------------------------|
| Frontend  | React 18, Vite, TypeScript, Tailwind CSS, React Router v6 |
| State     | TanStack Query v5, Zustand, React Hook Form + Zod      |
| Backend   | Node.js, Express, TypeScript, Prisma ORM               |
| Database  | PostgreSQL                                              |
| Auth      | JWT (access + refresh), OTP via SMS                    |
| Storage   | AWS S3 (private bucket, pre-signed URLs)               |
| Messaging | WhatsApp Business API, SMS (Twilio), Masked Calling (Exotel) |
| Jobs      | node-cron (expiry reminders, OTP cleanup, retry)       |

---

## Project Structure

```
cardeal_project/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Full DB schema (20+ models)
│   │   └── seed.ts                # Seeds admin + 20 demo tags
│   └── src/
│       ├── config/                # env.ts, database.ts
│       ├── controllers/           # auth.controller.ts
│       ├── jobs/                  # Cron jobs (expiry, retry, cleanup)
│       ├── middlewares/           # auth, errorHandler, rateLimiter, upload, validate, auditLogger
│       ├── routes/                # auth, tag, customer, vehicle, document, sos, call, maintenance, insurance, puc, notification, admin, public
│       ├── services/              # auth, tag, customer, vehicle, document, sos, call, maintenance, expiry, admin, notification, whatsapp, s3
│       └── utils/                 # jwt, hash, otp, dateUtils, pagination, logger, apiResponse, errors
└── frontend/
    └── src/
        ├── components/
        │   ├── layout/            # OwnerLayout, AdminLayout, ProtectedRoute
        │   └── ui/                # Badge, Button, Card, Input, Modal, Table, Skeleton, EmptyState
        ├── pages/
        │   ├── public/            # TagScanPage, ActivationPage, DocumentAccessModal
        │   ├── owner/             # Login, Dashboard, Vehicles, Documents, Maintenance, Expiry, Notifications, Profile, SOSHistory
        │   └── admin/             # Login, Dashboard, Tags, Customers, Vehicles, Documents, SOS, ExpiryRadar, Notifications, WhatsApp, Scans, AuditLogs, Settings
        ├── services/api.ts        # Axios client + all API helpers
        ├── stores/authStore.ts    # Zustand auth store
        ├── types/index.ts         # Shared TypeScript types
        └── utils/helpers.ts       # Date, expiry color, status helpers
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm 9+

### 1. Clone and install
```bash
# Install all dependencies
npm run install:all
```

### 2. Configure environment
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL, JWT secrets, and integrations

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env if needed
```

### 3. Database setup
```bash
# Create DB, run migrations, generate Prisma client
npm run db:migrate

# Generate Prisma types
npm run db:generate

# Seed: creates super admin + 20 demo tags (CD-1001 to CD-1020)
npm run db:seed
```

### 4. Start development servers

Open two terminals:
```bash
# Terminal 1 — Backend (port 5000)
npm run dev:backend

# Terminal 2 — Frontend (port 3000)
npm run dev:frontend
```

---

## Default Credentials (after seed)

| Role        | Credential                              |
|-------------|------------------------------------------|
| Super Admin | admin@cardeal.com / Admin@123456         |
| Customer    | Scan any tag QR → OTP login via mobile  |

---

## Key URLs

| URL                        | Description                              |
|----------------------------|------------------------------------------|
| `http://localhost:3000`    | Frontend app                             |
| `http://localhost:3000/tag/CD-1001` | Scan tag CD-1001 (unassigned → activate) |
| `http://localhost:3000/login`       | Customer login                  |
| `http://localhost:3000/admin/login` | Admin login                     |
| `http://localhost:5000/health`      | Backend health check            |
| `http://localhost:5000/api/v1`      | REST API base                   |

---

## Modules

| # | Module              | Status |
|---|---------------------|--------|
| 1 | QR/NFC Tag System   | ✅ |
| 2 | Customer Self-Activation (5-step wizard) | ✅ |
| 3 | Public Vehicle Page | ✅ |
| 4 | Masked Calling (Exotel) | ✅ |
| 5 | Emergency SOS + GPS | ✅ |
| 6 | Protected Document Viewer (PIN) | ✅ |
| 7 | Owner Portal        | ✅ |
| 8 | Maintenance Logger  | ✅ |
| 9 | Expiry Tracker (Insurance + PUC) | ✅ |
| 10 | WhatsApp Automation | ✅ |
| 11 | Super Admin Dashboard | ✅ |
| 12 | Admin Tag Management | ✅ |
| 13 | Customer Management | ✅ |
| 14 | Vehicle Management  | ✅ |
| 15 | Expiry Radar        | ✅ |
| 16 | Scan Analytics      | ✅ |
| 17 | Audit Logging       | ✅ |
| 18 | Security (JWT, OTP, rate limiting, CORS, Helmet) | ✅ |

---

## Background Jobs

| Job                  | Schedule     |
|----------------------|--------------|
| Insurance expiry check | Daily 08:00 IST |
| PUC expiry check     | Daily 08:00 IST |
| Failed notification retry | Every 15 min |
| OTP cleanup          | Every 1 hour |

---

## Production Checklist

- [ ] Set strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (32+ chars)
- [ ] Configure real AWS S3 credentials
- [ ] Configure Twilio SMS credentials
- [ ] Configure Meta WhatsApp Business API token
- [ ] Configure Exotel masked calling credentials
- [ ] Use `NODE_ENV=production` in deployment
- [ ] Set `DATABASE_URL` to production PostgreSQL
- [ ] Configure `ALLOWED_ORIGINS` to your domain only
- [ ] Run `npm run build:backend` and `npm run build:frontend`
- [ ] Serve frontend build from CDN/static host
- [ ] Use HTTPS in production
