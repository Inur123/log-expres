# Deployment Guide

## Backend Production Setup

Backend API URL: `https://service.minimart.my.id/`

### 1. Environment Variables untuk Production

Set environment variables berikut di hosting provider Anda:

```env
# Database (Production)
DATABASE_URL="your-production-postgres-url"

# Server
PORT=3000

# Security (GANTI dengan key production yang aman!)
LOG_HASH_KEY="your-secure-random-64-char-key"
JWT_SECRET="your-secure-jwt-secret-min-32-characters"

# Redis
REDIS_HOST="your-redis-host"
REDIS_PORT="6379"

# CORS - Tambahkan semua domain frontend
ALLOWED_ORIGINS="https://service.minimart.my.id,https://admin.minimart.my.id,https://dashboard.minimart.my.id"
```

### 2. Build & Deploy

```bash
# Build aplikasi
npm run build

# Start production
npm start
```

### 3. API Endpoints

Base URL Production: `https://service.minimart.my.id/api/v1`

**Contoh Endpoints:**
- `GET /api/v1/logs` - Get all logs
- `GET /api/v1/logs/:id` - Get log detail
- `POST /api/v1/logs` - Store log (requires API Key)
- `GET /api/v1/applications` - Get applications
- `POST /api/v1/auth/login` - Login
- `GET /api-docs` - API Documentation (Swagger)

### 4. Frontend Configuration

Frontend harus menggunakan base URL production:

```typescript
// Frontend .env.production
VITE_API_BASE_URL=https://service.minimart.my.id/api/v1
# atau untuk Next.js:
NEXT_PUBLIC_API_URL=https://service.minimart.my.id/api/v1
```

### 5. Testing Production API

```bash
# Health check
curl https://service.minimart.my.id/health

# Login (untuk dapat token)
curl -X POST https://service.minimart.my.id/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get log detail (dengan token)
curl https://service.minimart.my.id/api/v1/logs/{log-id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Security Checklist

- [x] CORS dikonfigurasi dengan domain frontend yang benar
- [ ] JWT_SECRET diganti dengan key production yang aman
- [ ] LOG_HASH_KEY diganti dengan key production yang aman
- [ ] DATABASE_URL menggunakan production database
- [ ] HTTPS enabled di domain
- [ ] Rate limiting enabled (opsional, untuk keamanan tambahan)
- [ ] Redis dikonfigurasi untuk queue processing

### 7. Monitoring

Pastikan endpoint berikut berfungsi:
- Health Check: `https://service.minimart.my.id/health`
- API Docs: `https://service.minimart.my.id/api-docs`

### 8. Troubleshooting CORS

Jika frontend tidak bisa akses API:

1. Pastikan domain frontend sudah ditambahkan di `ALLOWED_ORIGINS`
2. Cek browser console untuk error CORS
3. Pastikan request menggunakan HTTPS jika API menggunakan HTTPS
4. Pastikan header `Authorization` dikirim dengan benar

### 9. Database Migration di Production

```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

## Platform Deployment

### Railway / Render / Vercel

1. Connect repository
2. Set environment variables (lihat .env.example)
3. Build command: `npm run build`
4. Start command: `npm start`
5. Deploy!

### VPS / DigitalOcean

1. Clone repository
2. Install dependencies: `npm install`
3. Copy .env.example ke .env dan isi dengan data production
4. Build: `npm run build`
5. Run dengan PM2: `pm2 start dist/server.js --name log-api`
6. Setup Nginx sebagai reverse proxy
7. Setup SSL dengan Let's Encrypt

---

**Domain Backend:** https://service.minimart.my.id/
**API Base URL:** https://service.minimart.my.id/api/v1
**Swagger Docs:** https://service.minimart.my.id/api-docs
