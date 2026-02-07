# Deployment Guide

## CORS Configuration Fix

### The Problem
The CORS error occurs when:
1. Frontend sends requests with `withCredentials: true`
2. Backend returns `Access-Control-Allow-Origin: *` (wildcard)
3. Browsers block this combination for security reasons

### The Solution

#### Step 1: Set Environment Variables
Create a `.env` file in the backend directory (or set environment variables in your deployment platform):

```bash
CORS_ORIGIN=https://alexol.io,https://admin.alexol.io
```

**IMPORTANT**: Do NOT use wildcards (*). List each domain explicitly, separated by commas.

#### Step 2: Rebuild and Redeploy
If using Docker:

```bash
cd backend
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Step 3: Verify CORS Configuration
After deployment, check the logs:

```bash
docker-compose logs -f backend
```

Look for lines like:
```
[CORS] Incoming request from origin: https://admin.alexol.io
[CORS] Allowed origins: [ 'https://alexol.io', 'https://admin.alexol.io' ]
```

If you see:
```
[CORS] ❌ Blocked origin: https://admin.alexol.io
```

Then the CORS_ORIGIN environment variable is not set correctly.

## Testing CORS

### Using curl:
```bash
curl -H "Origin: https://admin.alexol.io" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     -v \
     https://api.alexol.io/api/auth/login
```

Expected response headers:
```
Access-Control-Allow-Origin: https://admin.alexol.io
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
```

## Common Issues

### 1. Reverse Proxy CORS Headers
If you're using nginx, traefik, or another reverse proxy, make sure it's NOT adding its own CORS headers. The backend should handle CORS.

Example nginx config (remove if present):
```nginx
# REMOVE THESE LINES:
add_header 'Access-Control-Allow-Origin' '*';
add_header 'Access-Control-Allow-Credentials' 'true';
```

### 2. Multiple CORS Middleware
Make sure you only have ONE cors middleware in your Express app. Having multiple can cause conflicts.

### 3. Environment Variables Not Loading
Verify environment variables are loaded:

```bash
docker-compose exec backend env | grep CORS_ORIGIN
```

Should output:
```
CORS_ORIGIN=https://alexol.io,https://admin.alexol.io
```

## Deployment Platforms

### Docker Compose
Environment variables are set in `docker-compose.yml` or in a `.env` file in the same directory.

### Heroku
```bash
heroku config:set CORS_ORIGIN="https://alexol.io,https://admin.alexol.io"
```

### AWS/DigitalOcean/Other
Set environment variables in your platform's dashboard or configuration files.

## Security Notes

1. **Never use wildcards (*)** when credentials are involved
2. **Only list trusted domains** in CORS_ORIGIN
3. **Use HTTPS** for all production domains
4. **Keep JWT_SECRET secure** and never commit it to git
