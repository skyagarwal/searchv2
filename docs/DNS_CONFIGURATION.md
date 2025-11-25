# DNS Configuration Instructions

## Server IP Address
Your server IP address is needed to configure the DNS A record.

To get your server IP, run:
```bash
hostname -I | awk '{print $1}'
```

Or check your server's public IP:
```bash
curl -s ifconfig.me
```

## DNS Configuration Steps

### Option 1: Using Your DNS Provider's Control Panel

1. **Log in** to your DNS provider's control panel (e.g., Cloudflare, GoDaddy, Namecheap, etc.)

2. **Navigate** to DNS Management for `mangwale.ai` domain

3. **Add A Record**:
   - **Type**: A
   - **Name**: `search.test`
   - **Value/Content**: `[YOUR_SERVER_IP]` (the IP address from above)
   - **TTL**: 3600 (or Auto)
   - **Proxy**: Disabled (if using Cloudflare, turn off proxy to allow SSL)

4. **Save** the record

5. **Wait** for DNS propagation (usually 5-60 minutes, can take up to 48 hours)

### Option 2: Using Command Line (if you have DNS API access)

If you're using a DNS provider with API access (like Cloudflare, AWS Route53, etc.), you can use their CLI tools.

**Example for Cloudflare:**
```bash
# Install cloudflare-cli if needed
# Then add the record
```

### Verify DNS Configuration

After adding the DNS record, verify it's working:

```bash
# Check DNS resolution
nslookup search.test.mangwale.ai
# or
dig search.test.mangwale.ai
# or
host search.test.mangwale.ai
```

You should see your server's IP address in the response.

## SSL/TLS Configuration

Once DNS is configured and pointing to your server:

1. **Caddy is already running** and will automatically:
   - Detect the domain
   - Request SSL certificate from Let's Encrypt
   - Configure HTTPS automatically

2. **Access your site**:
   - HTTP: `http://search.test.mangwale.ai`
   - HTTPS: `https://search.test.mangwale.ai` (will auto-redirect)

3. **Check Caddy logs**:
   ```bash
   docker logs caddy
   ```
   
   You should see messages like:
   - "Certificate obtained"
   - "Serving HTTPS"

## Troubleshooting

### DNS not resolving?
- Wait for DNS propagation (can take up to 48 hours)
- Check if the A record is correctly configured
- Verify the IP address is correct

### SSL not working?
- Ensure DNS is pointing to your server
- Check Caddy logs: `docker logs caddy`
- Verify port 80 and 443 are open in firewall
- Make sure Caddy container is running: `docker ps | grep caddy`

### Can't access the site?
- Check if Caddy is running: `docker ps | grep caddy`
- Check if search-api is running: `docker ps | grep search-api`
- Check if search-frontend is running: `docker ps | grep search-frontend`
- Check firewall rules for ports 80 and 443

## Current Status

- ✅ Caddy container: Configured and ready
- ✅ SSL/TLS: Will auto-configure once DNS is set
- ⏳ DNS: Waiting for A record configuration
- ✅ All endpoints: Working and tested

## Quick Commands

```bash
# Check DNS resolution
nslookup search.test.mangwale.ai

# Check Caddy status
docker ps | grep caddy
docker logs caddy

# Check all services
docker-compose -f docker-compose.production.yml ps

# Restart Caddy if needed
docker-compose -f docker-compose.production.yml restart caddy
```

