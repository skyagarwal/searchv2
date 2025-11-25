# 🚀 Deployment Configuration Updates for search.test.mangwale.ai

## Overview

This document describes the enhanced deployment configuration for deploying Mangwale Search on `https://search.test.mangwale.ai/` with automatic port conflict resolution and HTTPS support.

## Key Features

### 1. Automatic Port Conflict Resolution

The deployment script now automatically:
- ✅ Detects if a port is already in use
- ✅ Assigns alternative ports if conflicts are detected
- ✅ Updates `docker-compose.production.yml` with assigned ports
- ✅ Displays actual ports used during deployment

**Port Mapping:**
- Search API: 3100 → 3110 (if 3100 is in use)
- Frontend: 6000 → 6010 (if 6000 is in use)
- Embedding Service: 3101 → 3111 (if 3101 is in use)
- OpenSearch: 9200 → 9210 (if 9200 is in use)
- And so on for all services...

### 2. HTTPS Support

- ✅ Nginx reverse proxy configuration for HTTPS
- ✅ Let's Encrypt SSL certificate support
- ✅ Automatic HTTP to HTTPS redirect
- ✅ Security headers configured
- ✅ Domain: `search.test.mangwale.ai`

### 3. Enhanced Deployment Script

The `deploy-staging.sh` script now includes:
- Port availability checking
- Automatic port assignment
- Docker Compose file updates
- Health checks
- Nginx HTTPS setup
- Comprehensive status reporting

## Files Modified/Created

### New Files
1. **`nginx/search.test.mangwale.ai.conf`** - Nginx HTTPS configuration
2. **`setup-nginx-https.sh`** - Automated Nginx setup script
3. **`DEPLOYMENT_CHANGES.md`** - This file

### Modified Files
1. **`deploy-staging.sh`** - Enhanced with port conflict detection
2. **`Caddyfile`** - Updated with port notes
3. **`STAGING_DEPLOYMENT_GUIDE.md`** - Updated with new features
4. **`DEPLOYMENT_QUICK_REFERENCE.md`** - Updated port information
5. **`DEPLOYMENT_SUMMARY.md`** - Updated overview

## Deployment Steps

### Quick Start

```bash
# 1. Clone and navigate
git clone <repo-url> SearchMangwaleAi
cd SearchMangwaleAi

# 2. Make scripts executable
chmod +x deploy-staging.sh setup-nginx-https.sh

# 3. Run automated deployment
./deploy-staging.sh deploy

# 4. Set up HTTPS (if not done automatically)
sudo ./setup-nginx-https.sh
sudo certbot --nginx -d search.test.mangwale.ai
```

### What Happens During Deployment

1. **Pre-flight Checks**
   - Docker and Docker Compose verification
   - System settings (vm.max_map_count, disk space, memory)
   - Port availability checking
   - Port assignment (with alternatives if needed)

2. **Docker Compose Update**
   - Ports in `docker-compose.production.yml` are updated with assigned ports
   - File is modified in-place

3. **Build & Deploy**
   - Docker images are built
   - Services are started in correct order
   - Health checks are performed

4. **Post-Deployment**
   - OpenSearch indices are created
   - Health checks are run
   - Nginx configuration is set up (if run as root)
   - Access information is displayed

## Port Management

### How Port Conflicts Are Handled

1. Script checks each port using `netstat`, `ss`, or `lsof`
2. If preferred port is available → use it
3. If preferred port is in use → try alternative port
4. If alternative is also in use → find next available port
5. Update docker-compose.production.yml with assigned port

### Finding Actual Ports Used

```bash
# Method 1: Check deployment script output
./deploy-staging.sh info

# Method 2: Check docker-compose file
grep -A 1 "ports:" docker-compose.production.yml

# Method 3: Check running containers
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

## HTTPS Configuration

### Nginx Setup

The Nginx configuration includes:
- HTTP to HTTPS redirect
- SSL/TLS configuration
- Security headers
- API endpoint proxying
- Frontend proxying
- WebSocket support

### SSL Certificate

Use Let's Encrypt:
```bash
sudo certbot --nginx -d search.test.mangwale.ai
```

### Updating Nginx Config for Alternative Ports

If alternative ports were assigned, update the Nginx config:

```bash
sudo nano /etc/nginx/sites-available/search.test.mangwale.ai
```

Replace:
- `3100` with actual Search API port
- `6000` with actual Frontend port

Then reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Troubleshooting

### Port Conflicts

If you see port conflicts:
- The script handles this automatically
- Check the deployment output for assigned ports
- Update Nginx config if needed

### SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

### Nginx Not Working

```bash
# Test configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log

# Reload Nginx
sudo systemctl reload nginx
```

## Access URLs

### Production (HTTPS)
- Frontend: https://search.test.mangwale.ai
- API: https://search.test.mangwale.ai/search
- API Docs: https://search.test.mangwale.ai/api-docs

### Local (HTTP)
- Check deployment output for actual ports
- Default: Frontend on 6000, API on 3100
- Alternatives may be used if conflicts detected

## Migration Notes

If you have an existing deployment:

1. **Backup current configuration:**
   ```bash
   cp docker-compose.production.yml docker-compose.production.yml.backup
   ```

2. **Check current ports:**
   ```bash
   docker ps --format "table {{.Names}}\t{{.Ports}}"
   ```

3. **Run new deployment script:**
   ```bash
   ./deploy-staging.sh deploy
   ```

4. **Update Nginx if ports changed:**
   ```bash
   sudo nano /etc/nginx/sites-available/search.test.mangwale.ai
   # Update ports, then reload
   ```

## Next Steps

1. ✅ Deploy using enhanced script
2. ✅ Set up SSL certificates
3. ✅ Configure DNS (if not already done)
4. ✅ Test HTTPS access
5. ✅ Index data
6. ✅ Set up monitoring

## Support

For detailed information, see:
- `STAGING_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `DEPLOYMENT_QUICK_REFERENCE.md` - Quick command reference
- `DEPLOYMENT_SUMMARY.md` - System overview

---

**Last Updated:** $(date)
**Version:** 2.0.0
**Domain:** search.test.mangwale.ai

