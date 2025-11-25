# ✅ Port Configuration Fixed

## Changes Completed

### 1. ✅ Label Studio Restored
- **Port**: 8080 (restored)
- **Container**: `mangwale_labelstudio`
- **Status**: ✅ Running
- **Access**: `http://103.184.155.61:8080`

### 2. ✅ Search Frontend Moved
- **Port**: 6000 (changed from 8080)
- **Container**: `search-frontend`
- **Status**: ✅ Running
- **Internal Port**: 80 (container)
- **Access**: `http://103.184.155.61:6000` (direct) or `https://search.test.mangwale.ai` (via Caddy)

### 3. ✅ Caddy Configuration Updated
- **API Routes**: `/health`, `/v2/*`, `/search/*`, `/analytics/*`, `/api-docs*`, `/docs*` → `search-api:3100`
- **Frontend Routes**: All other routes → `search-frontend:80`
- **SSL**: Certificate obtained for `search.test.mangwale.ai`

## Current Port Allocation

| Service | External Port | Internal Port | Status |
|---------|--------------|---------------|--------|
| Label Studio | 8080 | 8080 | ✅ Running |
| Search Frontend | 6000 | 80 | ✅ Running |
| Search API | 3100 | 3100 | ✅ Running |
| Caddy | 80, 443 | - | ✅ Running |

## Health Endpoint Status

### ✅ Working Endpoints:

1. **Direct API Access**:
   ```bash
   curl http://localhost:3100/health
   # Returns: {"ok":true,"opensearch":"yellow"}
   ```

2. **Via Caddy (HTTPS)**:
   ```bash
   curl -k -H "Host: search.test.mangwale.ai" https://127.0.0.1/health
   # Returns: {"ok":true,"opensearch":"yellow"}
   ```

3. **After DNS Configuration**:
   ```bash
   curl https://search.test.mangwale.ai/health
   # Will work automatically once DNS is configured
   ```

## All v2 Endpoints Working

### ✅ Test Results:

1. **`/v2/search/suggest`**: ✅ Working
2. **`/v2/search/items`**: ✅ Working
3. **`/v2/search/stores`**: ✅ Working

### Test Commands:

```bash
# Direct API
curl "http://localhost:3100/v2/search/suggest?q=pizza"

# Via Caddy (HTTPS with -k for testing)
curl -k -H "Host: search.test.mangwale.ai" "https://127.0.0.1/v2/search/suggest?q=pizza"

# After DNS (will work automatically)
curl "https://search.test.mangwale.ai/v2/search/suggest?q=pizza"
```

## DNS Configuration

**Required**: Add A record in your DNS provider:

```
Type: A
Name: search.test
Domain: mangwale.ai
Value: 103.184.155.61
TTL: 3600
```

**Full Domain**: `search.test.mangwale.ai` → `103.184.155.61`

## Access URLs

### Current (Before DNS):
- **Label Studio**: `http://103.184.155.61:8080`
- **Search Frontend**: `http://103.184.155.61:6000`
- **Search API**: `http://103.184.155.61:3100`
- **Health (Direct)**: `http://103.184.155.61:3100/health`

### After DNS Configuration:
- **Label Studio**: `http://103.184.155.61:8080` (unchanged)
- **Search Frontend**: `https://search.test.mangwale.ai`
- **Search API**: `https://search.test.mangwale.ai/v2/search/*`
- **Health**: `https://search.test.mangwale.ai/health` ✅

## Verification

```bash
# Check all services
docker ps | grep -E "label-studio|search-frontend|search-api|caddy"

# Test health endpoint
curl http://localhost:3100/health

# Test via Caddy (with domain header)
curl -k -H "Host: search.test.mangwale.ai" https://127.0.0.1/health
```

## ✅ Summary

- ✅ Label Studio: Restored on port 8080
- ✅ Search Frontend: Moved to port 6000
- ✅ Caddy: Configured with proper routing
- ✅ Health endpoint: Working at `/health`
- ✅ All v2 endpoints: Working and tested
- ✅ SSL: Certificate obtained for `search.test.mangwale.ai`

**Once DNS is configured, `https://search.test.mangwale.ai/health` will work automatically!**

