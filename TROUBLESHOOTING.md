# Troubleshooting Guide

## Error: "Tidak dapat terhubung ke server. Cek koneksi internet atau CORS settings"

### 1. Cek Backend Sudah Running ✅

```bash
# Di terminal backend
npm run dev

# Output yang benar:
# Server running on port 3000
# Prisma connected
```

**Test di browser atau terminal:**
```bash
# Cek health endpoint
curl http://localhost:3000/health
# Harus return: {"ok":true}

# Atau buka di browser:
http://localhost:3000/health
http://localhost:3000/api-docs
```

---

### 2. Cek URL di Frontend ✅

Pastikan frontend menggunakan URL yang benar:

**Development:**
```typescript
const API_BASE_URL = 'http://localhost:3000/api/v1';
```

**Production:**
```typescript
const API_BASE_URL = 'https://service.minimart.my.id/api/v1';
```

**Best Practice - Gunakan Environment Variable:**
```typescript
// .env.development
VITE_API_BASE_URL=http://localhost:3000/api/v1

// .env.production
VITE_API_BASE_URL=https://service.minimart.my.id/api/v1

// Di kode:
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

---

### 3. Cek CORS di Browser Console 🔍

Buka **Developer Tools (F12)** → **Console Tab**

**Jika ada error CORS, akan muncul:**
```
Access to fetch at 'http://localhost:3000/api/v1/logs' from origin 
'http://localhost:5173' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Solusi:**

A. **Pastikan origin frontend sudah ada di ALLOWED_ORIGINS**

Edit file `.env` di backend:
```env
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173,http://localhost:5174"
```

B. **Restart backend setelah edit .env**
```bash
# Stop backend (Ctrl+C)
# Start lagi
npm run dev
```

C. **Cek origin frontend**

Di browser console frontend, ketik:
```javascript
console.log(window.location.origin);
// Output: http://localhost:5173
```

Pastikan output ini ada di `ALLOWED_ORIGINS` backend!

---

### 4. Cek Request di Network Tab 🌐

Buka **Developer Tools (F12)** → **Network Tab**

**Cek request ke API:**
1. Reload halaman frontend
2. Lihat request yang gagal (berwarna merah)
3. Klik request tersebut
4. Lihat tab **Headers**

**Yang perlu dicek:**

**Request URL:**
```
http://localhost:3000/api/v1/logs/123
```
✅ Harus sesuai dengan backend URL

**Request Headers:**
```
Authorization: Bearer eyJhbGc...
Content-Type: application/json
```
✅ Token harus ada jika endpoint butuh auth

**Response Headers:**
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
```
✅ Harus ada jika CORS OK

**Status Code:**
- `0` atau `ERR_CONNECTION_REFUSED` → Backend tidak running
- `404` → Endpoint URL salah
- `401` → Token tidak ada/expired
- `403` → CORS blocked
- `500` → Error di backend

---

### 5. Test dengan cURL atau Postman 🧪

**Test tanpa CORS (untuk pastikan backend OK):**

```bash
# Test health
curl http://localhost:3000/health

# Test login (dapat token)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'

# Test get logs (pakai token dari login)
curl http://localhost:3000/api/v1/logs \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Test get log detail
curl http://localhost:3000/api/v1/logs/LOG_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Jika cURL berhasil tapi frontend gagal = masalah CORS!

---

### 6. Common Issues & Solutions 🔧

#### Issue: Backend tidak running
**Error:** `ERR_CONNECTION_REFUSED` atau `net::ERR_FAILED`

**Solusi:**
```bash
cd backend-folder
npm run dev
```

---

#### Issue: Port sudah dipakai
**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solusi:**
```bash
# Matikan proses yang pakai port 3000
lsof -ti:3000 | xargs kill -9

# Atau ganti port di .env
PORT=3001
```

---

#### Issue: Token expired/invalid
**Error:** `401 Unauthorized`

**Solusi:**
- Login ulang di frontend
- Cek token di localStorage
```javascript
console.log(localStorage.getItem('token'));
```

---

#### Issue: CORS masih error setelah setup
**Solusi:**

1. **Hard refresh browser:** Ctrl+Shift+R (Windows) atau Cmd+Shift+R (Mac)

2. **Clear browser cache**

3. **Restart backend**
```bash
# Stop (Ctrl+C)
npm run dev
```

4. **Cek log backend** - akan muncul:
```
CORS blocked origin: http://localhost:XXXX
```

5. **Tambahkan origin tersebut ke .env:**
```env
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173,http://localhost:XXXX"
```

---

#### Issue: Development mode allow all localhost

Backend sudah dikonfigurasi untuk allow **semua localhost** di development:

```typescript
// Di app.ts
if (isDevelopment && origin.startsWith('http://localhost')) {
  return callback(null, true);
}
```

Jadi tidak perlu tambah manual setiap port localhost di development!

---

### 7. Verifikasi Lengkap ✔️

**Checklist debugging:**

- [ ] Backend running (`npm run dev`)
- [ ] Health endpoint OK (`http://localhost:3000/health`)
- [ ] Frontend URL benar (`http://localhost:3000/api/v1`)
- [ ] Token tersimpan di localStorage (jika perlu auth)
- [ ] Origin frontend ada di ALLOWED_ORIGINS atau development mode aktif
- [ ] Browser console tidak ada error CORS
- [ ] Network tab menunjukkan status 200 OK
- [ ] Response data muncul di Network tab

---

### 8. Quick Fix Commands 🚀

```bash
# Backend
cd log-expres
npm run dev

# Frontend  
cd log-frontend
npm run dev

# Cek backend health
curl http://localhost:3000/health

# Cek CORS (dari browser console frontend)
fetch('http://localhost:3000/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend OK:', d))
  .catch(e => console.error('❌ Error:', e.message));
```

---

## Masih Error?

1. Screenshot error di browser console
2. Cek terminal backend ada error apa
3. Share request/response dari Network tab
4. Pastikan kedua aplikasi (backend + frontend) running bersamaan
