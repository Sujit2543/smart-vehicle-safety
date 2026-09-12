# Environment Variable Specification

## Backend (.env)

```env
# ── Server ──────────────────────────────────────────
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1

# ── Database ─────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/cardeal_db

# ── JWT ──────────────────────────────────────────────
JWT_ACCESS_SECRET=<generate-32-char-random>
JWT_REFRESH_SECRET=<generate-32-char-random>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── AWS S3 ───────────────────────────────────────────
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_S3_BUCKET=cardeal-documents-private
AWS_S3_PRESIGNED_URL_TTL=900

# ── OTP / SMS ────────────────────────────────────────
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<your-sid>
TWILIO_AUTH_TOKEN=<your-token>
TWILIO_FROM_NUMBER=+1XXXXXXXXXX
OTP_EXPIRY_SECONDS=600
OTP_MAX_ATTEMPTS=3

# ── WhatsApp ─────────────────────────────────────────
WHATSAPP_PROVIDER=meta
META_WHATSAPP_TOKEN=<your-token>
META_WHATSAPP_PHONE_ID=<your-phone-number-id>
META_WHATSAPP_API_VERSION=v18.0

# ── Masked Calling ───────────────────────────────────
MASKED_CALLING_PROVIDER=exotel
EXOTEL_API_KEY=<your-key>
EXOTEL_API_TOKEN=<your-token>
EXOTEL_SUBDOMAIN=api.exotel.com
EXOTEL_SID=<your-sid>
EXOTEL_VIRTUAL_NUMBER=<your-virtual-number>

# ── Email ────────────────────────────────────────────
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<your-key>
EMAIL_FROM=noreply@cardeal.com
EMAIL_FROM_NAME=Car Deal Safety

# ── Frontend ─────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# ── Rate Limiting ────────────────────────────────────
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
OTP_RATE_LIMIT_MAX=5

# ── App ──────────────────────────────────────────────
APP_NAME=Car Deal Smart Safety Tag
TAG_ID_PREFIX=CD
TAG_ID_START=1001
BASE_URL=https://yourdomain.com
DOCUMENT_PIN_MAX_ATTEMPTS=5
DOCUMENT_PIN_LOCKOUT_MINUTES=30
```

## Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_APP_NAME=Car Deal Smart Safety Tag
VITE_APP_BASE_URL=http://localhost:3000
```

## Notes

- Never commit `.env` files to git
- Use `.env.example` files in each package
- On production, inject via CI/CD environment secrets
- AWS credentials must be IAM role on EC2/ECS, not hardcoded
