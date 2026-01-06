# API Authentication Testing Guide

## Summary of Changes

### Authentication Split by HTTP Method:

1. **POST /api/v1/logs** → Requires **API Key** (for external applications sending logs)
2. **GET /api/v1/logs** → Requires **JWT Token** (for dashboard viewing logs)
3. **GET /api/v1/logs/verify-chain** → Requires **JWT Token** (for dashboard)
4. **POST /api/v1/logs/queue** → Requires **API Key** (for external applications)

### New Files Created:
- `src/middlewares/apiKeyMiddleware.ts` - API Key validation middleware

### Files Modified:
- `src/routes/v1.ts` - Split middleware by HTTP method
- `src/controllers/logController.ts` - Support both JWT and API Key auth
- `src/controllers/logQueueController.ts` - Use API Key middleware

---

## Testing Instructions

### 1. Setup - Create User & Get JWT Token

**Register User:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "password123",
    "role": "SUPER_ADMIN"
  }'
```

**Login & Get Token:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {...},
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

Save the `token` value for next steps.

---

### 2. Setup - Create Application & Get API Key

**Create Application (needs JWT token):**
```bash
curl -X POST http://localhost:3000/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "name": "My Test App",
    "slug": "my-test-app",
    "domain": "example.com",
    "stack": "nodejs"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Application created",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Test App",
    "slug": "my-test-app",
    "apiKey": "app_1a2b3c4d5e6f7g8h9i0j"
  }
}
```

Save the `apiKey` value for next steps.

---

### 3. Test POST /logs (Requires API Key) ✅

**Send Log with API Key:**
```bash
curl -X POST http://localhost:3000/api/v1/logs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -d '{
    "log_type": "AUTH_LOGIN",
    "payload": {
      "user_id": 123,
      "ip": "192.168.1.1",
      "timestamp": "2026-01-06T10:00:00Z"
    }
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Log stored",
  "data": {
    "id": "...",
    "seq": "1",
    "created_at": "2026-01-06T10:00:00.000Z",
    "log_type": "AUTH_LOGIN"
  }
}
```

**Alternative with Authorization header:**
```bash
curl -X POST http://localhost:3000/api/v1/logs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "log_type": "AUTH_LOGIN",
    "payload": {"user_id": 123}
  }'
```

---

### 4. Test GET /logs (Requires JWT Token) ✅

**View Logs with JWT Token:**
```bash
curl -X GET "http://localhost:3000/api/v1/logs?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "seq": "1",
      "log_type": "AUTH_LOGIN",
      "payload": {"user_id": 123, "ip": "192.168.1.1"},
      "hash": "...",
      "prev_hash": "000...",
      "ip_address": "::1",
      "user_agent": "curl/7.88.1",
      "created_at": "2026-01-06T10:00:00.000Z",
      "application": {
        "id": "...",
        "name": "My Test App",
        "slug": "my-test-app"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

**Filter by Application:**
```bash
curl -X GET "http://localhost:3000/api/v1/logs?application_id=YOUR_APP_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

---

### 5. Test GET /logs/verify-chain (Requires JWT Token) ✅

**Verify Hash Chain with JWT Token:**
```bash
curl -X GET "http://localhost:3000/api/v1/logs/verify-chain" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "application_id": "...",
      "application_name": "My Test App",
      "valid": true,
      "total_logs": 5,
      "first_invalid_seq": null,
      "errors": []
    }
  ]
}
```

**Verify Specific Application:**
```bash
curl -X GET "http://localhost:3000/api/v1/logs/verify-chain?application_id=YOUR_APP_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

---

## Error Scenarios

### ❌ POST /logs without API Key:
```bash
curl -X POST http://localhost:3000/api/v1/logs \
  -H "Content-Type: application/json" \
  -d '{"log_type": "AUTH_LOGIN", "payload": {}}'
```
**Response (401):**
```json
{
  "success": false,
  "message": "API Key is required. Provide via X-API-Key header or Authorization: Bearer <api-key>"
}
```

### ❌ GET /logs without JWT Token:
```bash
curl -X GET "http://localhost:3000/api/v1/logs"
```
**Response (401):**
```json
{
  "success": false,
  "message": "Authentication required. Provide token via Authorization header"
}
```

### ❌ GET /logs with API Key (should fail):
```bash
curl -X GET "http://localhost:3000/api/v1/logs" \
  -H "X-API-Key: YOUR_API_KEY_HERE"
```
**Response (401):**
```json
{
  "success": false,
  "message": "Authentication required. Provide token via Authorization header"
}
```

---

## Postman Testing

### Setup Environment Variables:
1. `BASE_URL`: `http://localhost:3000`
2. `JWT_TOKEN`: (from login response)
3. `API_KEY`: (from create application response)

### Collection Structure:

**1. Auth Endpoints:**
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login` → Save `token` to `JWT_TOKEN`
- GET `/api/v1/auth/profile` (Header: `Authorization: Bearer {{JWT_TOKEN}}`)

**2. Application Endpoints:**
- POST `/api/v1/applications` (Header: `Authorization: Bearer {{JWT_TOKEN}}`) → Save `apiKey` to `API_KEY`
- GET `/api/v1/applications` (Header: `Authorization: Bearer {{JWT_TOKEN}}`)

**3. Log Endpoints (External App - API Key):**
- POST `/api/v1/logs` (Header: `X-API-Key: {{API_KEY}}`)
- POST `/api/v1/logs/queue` (Header: `X-API-Key: {{API_KEY}}`)

**4. Log Endpoints (Dashboard - JWT Token):**
- GET `/api/v1/logs` (Header: `Authorization: Bearer {{JWT_TOKEN}}`)
- GET `/api/v1/logs/verify-chain` (Header: `Authorization: Bearer {{JWT_TOKEN}}`)

---

## Summary

### ✅ Fixed Issues:
1. **GET /logs** now accepts JWT Token instead of API Key
2. **POST /logs** still uses API Key (for external applications)
3. Middleware properly separated by HTTP method
4. Dashboard can view all logs from all applications using JWT Token
5. External applications can only send logs using their API Key

### 🔑 Authentication Rules:
- **Dashboard/Frontend** → Use JWT Token from `/auth/login`
- **External Applications** → Use API Key from `/applications`

### 📊 Use Cases:
1. **External App** sends log → `POST /logs` with API Key
2. **Dashboard User** views logs → `GET /logs` with JWT Token
3. **Dashboard User** verifies chain → `GET /logs/verify-chain` with JWT Token
4. **Admin** creates application → `POST /applications` with JWT Token (SUPER_ADMIN role)
