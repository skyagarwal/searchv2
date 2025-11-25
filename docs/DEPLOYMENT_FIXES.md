# 🔧 Deployment Script Fixes

## Issues Fixed

### 1. ✅ Sed Command Error
**Problem:** `sed: -e expression #1, char 74: unterminated 's' command`

**Solution:** 
- Replaced sed with Python for more reliable string replacements
- Added fallback to sed if Python is not available
- Added proper error handling and backup restoration

**Location:** `deploy-staging.sh` - `update_docker_compose_ports()` function

### 2. ✅ Nginx SSL Certificate Error
**Problem:** Nginx configuration test failed because SSL certificates don't exist yet

**Solution:**
- Created HTTP-only Nginx configuration template (`nginx/search.test.mangwale.ai.http.conf`)
- Modified `setup-nginx-https.sh` to:
  - Check if SSL certificates exist
  - Use HTTP-only template if certificates don't exist
  - Use HTTPS template if certificates exist
  - Handle errors gracefully and create HTTP-only config if SSL fails

**Location:** 
- `setup-nginx-https.sh` - Enhanced error handling
- `nginx/search.test.mangwale.ai.http.conf` - New HTTP-only template

## How It Works Now

### Port Replacement
1. Script checks port availability
2. Assigns ports (preferred or alternative)
3. Uses Python to replace ports in docker-compose.production.yml
4. Falls back to sed if Python unavailable
5. Creates backup before modifications

### Nginx Setup
1. Checks if SSL certificates exist
2. If yes: Uses HTTPS configuration template
3. If no: Uses HTTP-only configuration template
4. Replaces ports in configuration
5. Tests Nginx configuration
6. If SSL test fails: Creates HTTP-only config automatically
7. Provides instructions for obtaining SSL certificates

## Usage

### Deploy with Automatic Port Handling
```bash
./deploy-staging.sh deploy
```

### Set up Nginx (HTTP first, then HTTPS)
```bash
# This will create HTTP config if SSL doesn't exist
sudo ./setup-nginx-https.sh

# Then get SSL certificates (certbot will update config automatically)
sudo certbot --nginx -d search.test.mangwale.ai
```

## Port Assignments from Your Run

Based on your terminal output:
- **Search API**: 3110 (3100 was in use)
- **Frontend**: 6000 (available)
- **Embedding**: 3101 (available)
- **OpenSearch**: 9200 (available)
- **ClickHouse HTTP**: 8124 (8123 was in use)
- **ClickHouse Native**: 9003 (9000 and 9001 were in use)
- **Adminer**: 8086 (8085 was in use)

## Next Steps

1. ✅ Run deployment again - the sed error is fixed
2. ✅ Nginx will work in HTTP mode initially
3. ✅ Get SSL certificates: `sudo certbot --nginx -d search.test.mangwale.ai`
4. ✅ Certbot will automatically update Nginx config for HTTPS

## Files Modified

- `deploy-staging.sh` - Fixed port replacement using Python
- `setup-nginx-https.sh` - Enhanced SSL handling
- `nginx/search.test.mangwale.ai.http.conf` - New HTTP-only template

---

**Status:** ✅ All issues fixed and ready for deployment!

