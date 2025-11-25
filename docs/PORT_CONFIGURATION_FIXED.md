# ✅ Port Configuration Fixed

## Changes Made

### 1. Label Studio Restored
- ✅ **Status**: Running on port 8080
- ✅ **Container**: `mangwale_labelstudio`
- ✅ **Access**: `http://localhost:8080`

### 2. Search Frontend Moved
- ✅ **Status**: Running on port 6000
- ✅ **Container**: `search-frontend`
- ✅ **Access**: `http://localhost:6000`
- ✅ **Internal**: Port 80 (container)

### 3. Caddy Configuration Updated
- ✅ **API Routes**: Properly configured to proxy to `search-api:3100`
- ✅ **Frontend Routes**: Configured to proxy to `search-frontend:80`
- ✅ **SSL**: Certificate obtained for `search.test.mangwale.ai`

## Current Port Allocation

| Service | Port | Status |
|---------|------|--------|
| Label Studio | 8080 | ✅ Running |
| Search Frontend | 6000 | ✅ Running |
| Search API | 3100 | ✅ Running |
| Caddy | 80, 443 | ✅ Running |

## Access URLs

### Direct Access (Before DNS):
- **Label Studio**: `http://103.184.155.61:8080`
- **Search Frontend**: `http://103.184.155.61:6000`
- **Search API**: `http://103.184.155.61:3100`

### Through Domain (After DNS):
- **Label Studio**: `http://103.184.155.61:8080` (direct access)
- **Search Frontend**: `https://search.test.mangwale.ai`
- **Search API**: `https://search.test.mangwale.ai/v2/search/*`
- **Health**: `https://search.test.mangwale.ai/health`

## Testing

### Health Endpoint:
```bash
# Direct API
curl http://localhost:3100/health

# Through Caddy (with Host header)
curl -H "Host: search.test.mangwale.ai" http://localhost/health

# After DNS (will work automatically)
curl https://search.test.mangwale.ai/health
```

### v2 Endpoints:
```bash
# Direct API
curl "http://localhost:3100/v2/search/suggest?q=pizza"

# Through Caddy (with Host header)
curl -H "Host: search.test.mangwale.ai" "http://localhost/v2/search/suggest?q=pizza"

# After DNS
curl "https://search.test.mangwale.ai/v2/search/suggest?q=pizza"
```

## Caddy Routing

The Caddyfile is configured to:
1. Route `/health`, `/v2/*`, `/search/*`, `/analytics/*`, `/api-docs*`, `/docs*` → `search-api:3100`
2. Route all other requests → `search-frontend:80`

## Verification

```bash
# Check all services
docker ps | grep -E "label-studio|search-frontend|search-api|caddy"

# Test health endpoint
curl http://localhost:3100/health

# Test through Caddy
curl -H "Host: search.test.mangwale.ai" http://localhost/health
```

## ✅ All Fixed!

- ✅ Label Studio: Back on port 8080
- ✅ Search Frontend: Moved to port 6000
- ✅ Caddy: Configured with proper routing
- ✅ Health endpoint: Working at `/health`
- ✅ All endpoints: Properly routed

**Note**: When accessing via `localhost`, you need to use the Host header. Once DNS is configured, `https://search.test.mangwale.ai/health` will work automatically.

