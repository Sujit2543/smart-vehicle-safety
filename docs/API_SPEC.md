# API Specification — Car Deal Smart Safety Tag

Base URL: `https://api.yourdomain.com/api/v1`

---

## Authentication

### POST /auth/send-otp
Send OTP to mobile number.
```json
Body: { "mobile": "9876543210" }
Response: { "success": true, "expiresIn": 600 }
```

### POST /auth/verify-otp
Verify OTP and issue tokens.
```json
Body: { "mobile": "9876543210", "otp": "123456" }
Response: { "accessToken": "...", "user": {...} }
```

### POST /auth/admin/login
Admin login with email + password.
```json
Body: { "email": "admin@cardeal.com", "password": "..." }
Response: { "accessToken": "...", "user": {...} }
```

### POST /auth/refresh
Refresh access token using HttpOnly cookie.
```json
Response: { "accessToken": "..." }
```

### POST /auth/logout
Blacklist refresh token.

---

## Tags

### GET /tags/:tagId/scan
Public scan — returns tag status + vehicle info if active.

### POST /tags/generate (Admin)
Generate one or more tags.
```json
Body: { "count": 100 }
Response: { "tags": [{ "tagId": "CD-1001", "qrUrl": "..." }] }
```

### GET /tags (Admin)
List all tags with pagination, filters, search.

### PATCH /tags/:tagId/status (Admin)
Change tag status.
```json
Body: { "status": "BLOCKED", "reason": "..." }
```

### POST /tags/:tagId/activate (Public — first scan)
Self-activation endpoint.
```json
Body: { customer, vehicle, emergency, documents, pin }
```

### POST /tags/:tagId/reassign (Admin)
Reassign tag to another vehicle.

### GET /tags/:tagId/history (Admin)
Full tag history.

### GET /tags/:tagId/qr (Admin)
Download QR code image.

### GET /tags/bulk-qr (Admin)
Download ZIP of QR codes.

---

## Customers

### GET /customers/me (Customer)
Own profile.

### PATCH /customers/me (Customer)
Update profile.

### GET /customers (Admin)
List all customers.

### GET /customers/:id (Admin)
Customer detail.

### PATCH /customers/:id (Admin)
Update customer.

### PATCH /customers/:id/disable (Admin)
Disable customer account.

---

## Vehicles

### GET /vehicles (Customer — own)
Own vehicles list.

### GET /vehicles/:id (Customer)
Vehicle detail.

### PATCH /vehicles/:id (Customer)
Update vehicle details.

### GET /vehicles (Admin)
All vehicles with filters.

### GET /vehicles/:id/scans (Admin/Customer)
Scan history for vehicle.

---

## Documents

### POST /vehicles/:vehicleId/documents (Customer)
Upload document (RC/Insurance/PUC).

### POST /documents/:docId/access (Public)
Verify PIN and get pre-signed URL.
```json
Body: { "tagId": "CD-1001", "pin": "1234" }
Response: { "url": "https://s3.presigned...", "expiresIn": 900 }
```

### DELETE /documents/:docId (Customer)
Soft-delete document.

---

## SOS

### POST /sos (Public)
Trigger SOS event.
```json
Body: { "tagId": "CD-1001", "latitude": 18.9, "longitude": 72.8 }
Response: { "sosId": "...", "status": "TRIGGERED" }
```

### PATCH /sos/:sosId/acknowledge (Customer)
Mark SOS as acknowledged.

### PATCH /sos/:sosId/resolve (Customer/Admin)
Resolve SOS.

### GET /sos (Admin)
All SOS events with filters.

### GET /sos/mine (Customer)
Own vehicle SOS history.

---

## Calls

### POST /calls/initiate (Public)
Initiate masked call.
```json
Body: { "tagId": "CD-1001", "callerNumber": "9876543210" }
```

### GET /calls (Admin)
Call logs.

---

## Maintenance

### GET /vehicles/:vehicleId/maintenance (Customer)
Maintenance records.

### POST /vehicles/:vehicleId/maintenance (Customer)
Add maintenance record.

### PATCH /maintenance/:id (Customer)
Update record.

### DELETE /maintenance/:id (Customer)
Delete record.

---

## Insurance & PUC

### GET /vehicles/:vehicleId/insurance (Customer)
Insurance records.

### POST /vehicles/:vehicleId/insurance (Customer)
Add/update insurance.

### GET /vehicles/:vehicleId/puc (Customer)
PUC records.

### POST /vehicles/:vehicleId/puc (Customer)
Add/update PUC.

---

## Notifications

### GET /notifications/mine (Customer)
Own notifications.

### GET /notifications (Admin)
All notifications.

### POST /notifications/:id/retry (Admin)
Retry failed notification.

---

## Admin

### GET /admin/dashboard
Dashboard stats (counts + chart data).

### GET /admin/expiry-radar
Vehicles with expiring insurance/PUC.

### GET /admin/audit-logs
Audit log with filters.

### GET /admin/scan-analytics
Scan statistics.

### POST /admin/users
Create admin user.
