# Application CRUD API Documentation

## Endpoints Overview

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/v1/applications` | JWT | SUPER_ADMIN | Create new application |
| GET | `/api/v1/applications` | JWT | AUDITOR/SUPER_ADMIN | Get all applications |
| GET | `/api/v1/applications/:id` | JWT | AUDITOR/SUPER_ADMIN | Get application by ID |
| PUT | `/api/v1/applications/:id` | JWT | SUPER_ADMIN | Update application |
| DELETE | `/api/v1/applications/:id` | JWT | SUPER_ADMIN | Soft delete application |
| DELETE | `/api/v1/applications/:id/hard-delete` | JWT | SUPER_ADMIN | Permanently delete application |
| POST | `/api/v1/applications/:id/regenerate-key` | JWT | SUPER_ADMIN | Regenerate API Key |

---

## 1. Create Application

**POST** `/api/v1/applications`

**Auth:** JWT Token (SUPER_ADMIN only)

**Request Body:**
```json
{
  "name": "My Application",
  "slug": "my-app",
  "domain": "myapp.com",
  "stack": "nodejs"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Application created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Application",
    "slug": "my-app",
    "apiKey": "app_1a2b3c4d5e6f7g8h9i0j"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/applications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Test App",
    "slug": "my-test-app",
    "domain": "example.com",
    "stack": "nodejs"
  }'
```

---

## 2. Get All Applications

**GET** `/api/v1/applications`

**Auth:** JWT Token (AUDITOR or SUPER_ADMIN)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My Application",
      "slug": "my-app",
      "domain": "myapp.com",
      "stack": "nodejs",
      "isActive": true,
      "createdAt": "2026-01-06T10:00:00.000Z",
      "updatedAt": "2026-01-06T10:00:00.000Z",
      "total_logs": 150
    }
  ]
}
```

**Example:**
```bash
curl -X GET http://localhost:3000/api/v1/applications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 3. Get Application by ID

**GET** `/api/v1/applications/:id`

**Auth:** JWT Token (AUDITOR or SUPER_ADMIN)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Application",
    "slug": "my-app",
    "domain": "myapp.com",
    "stack": "nodejs",
    "isActive": true,
    "createdAt": "2026-01-06T10:00:00.000Z",
    "updatedAt": "2026-01-06T10:00:00.000Z",
    "total_logs": 150
  }
}
```

**Example:**
```bash
curl -X GET http://localhost:3000/api/v1/applications/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 4. Update Application

**PUT** `/api/v1/applications/:id`

**Auth:** JWT Token (SUPER_ADMIN only)

**Request Body (all fields optional):**
```json
{
  "name": "Updated App Name",
  "domain": "newdomain.com",
  "stack": "python",
  "isActive": true
}
```

**Note:** `slug` and `apiKey` cannot be updated via this endpoint for security reasons.

**Response (200):**
```json
{
  "success": true,
  "message": "Application updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Updated App Name",
    "slug": "my-app",
    "domain": "newdomain.com",
    "stack": "python",
    "isActive": true,
    "createdAt": "2026-01-06T10:00:00.000Z",
    "updatedAt": "2026-01-06T11:00:00.000Z"
  }
}
```

**Example:**
```bash
curl -X PUT http://localhost:3000/api/v1/applications/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated App Name",
    "domain": "newdomain.com"
  }'
```

---

## 5. Soft Delete Application

**DELETE** `/api/v1/applications/:id`

**Auth:** JWT Token (SUPER_ADMIN only)

**Description:** Sets `isActive` to `false`. Application and its logs remain in database.

**Response (200):**
```json
{
  "success": true,
  "message": "Application \"My Application\" deleted successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/v1/applications/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 6. Hard Delete Application

**DELETE** `/api/v1/applications/:id/hard-delete`

**Auth:** JWT Token (SUPER_ADMIN only)

**Description:** Permanently deletes application from database. **Cannot delete if application has logs.**

**Response (200):**
```json
{
  "success": true,
  "message": "Application \"My Application\" permanently deleted"
}
```

**Response (400) - Has Logs:**
```json
{
  "success": false,
  "message": "Cannot delete application with 150 logs. Please use soft delete instead or confirm with force=true query parameter"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/v1/applications/550e8400-e29b-41d4-a716-446655440000/hard-delete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 7. Regenerate API Key

**POST** `/api/v1/applications/:id/regenerate-key`

**Auth:** JWT Token (SUPER_ADMIN only)

**Description:** Generates a new API Key for the application. Old API Key will be invalidated immediately.

**Response (200):**
```json
{
  "success": true,
  "message": "API Key regenerated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Application",
    "slug": "my-app",
    "apiKey": "app_9j0i8h7g6f5e4d3c2b1a"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/applications/550e8400-e29b-41d4-a716-446655440000/regenerate-key \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required. Provide token via Authorization header"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. SUPER_ADMIN role required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Application not found"
}
```

### 422 Validation Error
```json
{
  "success": false,
  "message": "name and slug are required"
}
```

---

## Notes

1. **API Key Security:**
   - API Key is only shown when creating a new application or regenerating the key
   - Store API Key securely, it cannot be retrieved later
   - Use API Key for external applications sending logs

2. **Soft Delete vs Hard Delete:**
   - **Soft Delete:** Recommended for applications with logs (sets `isActive=false`)
   - **Hard Delete:** Only for applications without logs (permanently removes from database)

3. **Role-Based Access:**
   - **SUPER_ADMIN:** Full CRUD access
   - **AUDITOR:** Read-only access (GET endpoints)

4. **Total Logs Count:**
   - GET endpoints include `total_logs` field showing the number of logs associated with the application
