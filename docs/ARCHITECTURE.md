# Car Deal Smart Safety Tag — System Architecture

## Overview

A multi-tenant vehicle safety platform connecting physical QR/NFC tags to a
cloud-hosted web application. Three distinct user interfaces share a single
REST API backend backed by PostgreSQL.

---

## System Diagram

```
Physical QR/NFC Tag (CD-XXXX)
         │
         ▼
https://domain.com/tag/:tagId
         │
         ├──► [UNASSIGNED] ──► Self-Activation Flow ──► Owner Portal
         │
         └──► [ACTIVE] ──► Public Vehicle Safety Page
                                │
                                ├── Call Owner (Masked Calling)
                                ├── Emergency SOS (GPS + WhatsApp)
                                └── View Documents (PIN Protected)

Owner Portal (/dashboard)
    ├── Vehicle Management
    ├── Document Upload
    ├── Maintenance Logger
    ├── Expiry Tracker
    └── Notifications

Super Admin (/admin)
    ├── Tag Management
    ├── Customer Management
    ├── Vehicle Management
    ├── SOS Monitor
    ├── Expiry Radar
    ├── Scan Analytics
    └── Audit Logs
```

---

## Layers

### Frontend (React + Vite + TypeScript)
- **Public Layer**: `/tag/:tagId` — zero-auth, mobile-first
- **Owner Layer**: `/login`, `/dashboard/*` — JWT + OTP auth
- **Admin Layer**: `/admin/*` — JWT + role-based guard

### Backend (Node.js + Express + TypeScript)
- **Route Layer**: Express routers per domain
- **Controller Layer**: Request handling, response shaping
- **Service Layer**: Business logic, orchestration
- **Repository Layer**: Prisma queries, data access
- **Job Layer**: node-cron background jobs (expiry reminders)

### Storage
- **PostgreSQL**: Primary data store via Prisma ORM
- **AWS S3 (Private)**: RC, Insurance, PUC documents
- **Pre-signed URLs**: Time-limited read access (15 min TTL)

---

## Authentication Architecture

| Actor       | Method                    | Token          |
|-------------|---------------------------|----------------|
| Customer    | Mobile OTP → JWT          | access + refresh |
| Admin       | Email + Password → JWT    | access + refresh |
| Public User | None (read-only)          | —              |

### OTP Flow
1. POST `/api/auth/send-otp` → generate 6-digit OTP, store hashed+TTL
2. POST `/api/auth/verify-otp` → verify, issue JWT pair
3. OTP expires in 10 minutes, max 3 attempts

### JWT Strategy
- Access token: 15 minutes
- Refresh token: 7 days, stored in HttpOnly cookie
- Token rotation on refresh
- Blacklist on logout (Redis or DB flag)

---

## Role-Based Access Control

| Role        | Scope                              |
|-------------|-------------------------------------|
| SUPER_ADMIN | Full platform access                |
| ADMIN       | Tag/Customer/Vehicle management     |
| CUSTOMER    | Own vehicles, documents, profile    |
| PUBLIC      | Unauthenticated scan read access    |

---

## Key Business Rules

1. Tag IDs are globally unique (format: CD-XXXX, numeric suffix)
2. Tags start as UNASSIGNED
3. First scan of UNASSIGNED tag → activation flow
4. Subsequent scans → public vehicle page
5. Document access requires correct 4-digit PIN
6. Owner phone never exposed to public
7. All calls routed through masked calling provider
8. SOS captures GPS coordinates
9. Expiry jobs run daily at 08:00 IST
10. All sensitive actions are audit-logged

---

## Background Jobs

| Job                  | Schedule       | Action                          |
|----------------------|----------------|---------------------------------|
| InsuranceExpiryCheck | Daily 08:00    | Notify owners 30/15/7/3/1 days  |
| PUCExpiryCheck       | Daily 08:00    | Notify owners 30/15/7/3/1 days  |
| OTPCleanup           | Every 1 hour   | Delete expired OTPs             |
| SOSEscalation        | Every 5 min    | Re-notify unresolved SOS        |
| NotificationRetry    | Every 15 min   | Retry FAILED notifications      |

---

## Security Architecture

- Helmet.js headers on all responses
- CORS whitelist (env-configured origins)
- Rate limiting: 100 req/15min global, 5 req/15min OTP
- All inputs validated with Zod
- Passwords/PINs hashed with bcrypt (rounds=12)
- SQL injection: Prisma parameterized queries
- XSS: DOMPurify on frontend, express-validator on backend
- AWS credentials only on backend, never in client bundles
- Pre-signed URLs with 15-minute expiry
- Audit log on every sensitive action
