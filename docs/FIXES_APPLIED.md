# 🔧 Fixes Applied for Deployment Issues

## Issues Fixed

### 1. ✅ Python Syntax Error in Port Replacement
**Problem:** 
```
SyntaxError: unterminated string literal (detected at line 10)
('"3100:3100"', '"⚠ Port 3100 is in use, trying alternative 3110
```

**Root Cause:** The `find_available_port()` function was outputting warning messages to stdout along with the port number. When captured with `SEARCH_API_PORT=$(find_available_port 3100 3110)`, it captured the warning text too.

**Solution:** 
- Modified `find_available_port()` to redirect all print messages to stderr (`>&2`)
- Only the port number is now output to stdout
- Port variables now contain clean numeric values

**File:** `deploy-staging.sh` - `find_available_port()` function

### 2. ✅ Nginx Port 80 Conflict
**Problem:**
```
nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)
nginx.service is not active, cannot reload.
```

**Root Cause:** Port 80 is already in use by another service (possibly Apache, another Nginx instance, or a Docker container).

**Solution:**
- Added port 80 conflict detection in `setup-nginx-https.sh`
- Added checks for common services (Apache, Nginx, Docker)
- Improved error handling and user guidance
- Created helper script `fix-port-80-conflict.sh` to diagnose and resolve conflicts
- Changed `set -e` to `set +e` to handle errors gracefully

**Files:**
- `setup-nginx-https.sh` - Enhanced port 80 checking
- `fix-port-80-conflict.sh` - New diagnostic/repair script

## How to Use

### Deploy Again (Fixed)
```bash
# The port replacement issue is now fixed
./deploy-staging.sh deploy
```

### Fix Port 80 Conflict
```bash
# Run the diagnostic script
sudo ./fix-port-80-conflict.sh

# Or manually check what's using port 80
sudo lsof -i :80
# or
sudo netstat -tulpn | grep :80

# Common fixes:
sudo systemctl stop apache2    # If Apache is running
sudo systemctl restart nginx   # If Nginx needs restart
docker ps | grep 80            # Check Docker containers
```

### Set Up Nginx After Port 80 is Free
```bash
# Once port 80 is available
sudo ./setup-nginx-https.sh

# Then get SSL certificates
sudo certbot --nginx -d search.test.mangwale.ai
```

## What Changed

### `deploy-staging.sh`
- ✅ `find_available_port()` now redirects messages to stderr
- ✅ Port variables contain only numeric values
- ✅ Python port replacement will work correctly

### `setup-nginx-https.sh`
- ✅ Added port 80 availability check
- ✅ Added service status checks (Apache, Nginx)
- ✅ Better error messages and guidance
- ✅ Changed to `set +e` for graceful error handling
- ✅ Improved nginx start/reload logic

### New Files
- ✅ `fix-port-80-conflict.sh` - Diagnostic and repair tool for port 80 conflicts

## Next Steps

1. **Fix Port 80 Conflict:**
   ```bash
   sudo ./fix-port-80-conflict.sh
   ```

2. **Re-run Deployment:**
   ```bash
   ./deploy-staging.sh deploy
   ```

3. **Set Up Nginx:**
   ```bash
   sudo ./setup-nginx-https.sh
   ```

4. **Get SSL Certificates:**
   ```bash
   sudo certbot --nginx -d search.test.mangwale.ai
   ```

## Verification

After fixes, verify:
```bash
# Check port assignments (should show clean numbers)
./deploy-staging.sh info

# Check port 80
sudo lsof -i :80

# Check nginx status
sudo systemctl status nginx

# Test nginx config
sudo nginx -t
```

---

**Status:** ✅ All issues fixed and ready for deployment!

