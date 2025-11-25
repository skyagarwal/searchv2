# QUICK FIX GUIDE - search.mangwale.ai

## Current Status (November 14, 2025)

### ✅ WORKING (70%)
- Food item search: 11,226 items indexed
- E-commerce search: 1,017 items indexed  
- Category indices: 144 categories
- HTTPS/SSL: Fully operational
- Frontend: Healthy
- Embedding service: Operational

### ❌ BROKEN (30%)
- **Stores indices: EMPTY (0 food stores, 0 ecom stores)**
- **MySQL sync: ACCESS DENIED**
- Store autocomplete: Failing (no stores)
- Ecom autocomplete: Returns 0 results

---

## 🔴 CRITICAL FIX REQUIRED

### Issue: MySQL Access Denied

**Error**:
```
Access denied for user 'root'@'157.173.221.52' (using password: YES)
```

**Your server IPs**:
- IPv4: `157.173.221.52`
- IPv6: `2a02:4780:12:f46a::1`

**Remote MySQL**: `103.160.107.41:3306`

---

## 🛠️ FIX STEPS

### Step 1: Grant MySQL Access

**On remote MySQL server (103.160.107.41)**, run:

```sql
-- Option A: Grant from specific IP (more secure)
GRANT ALL PRIVILEGES ON *.* TO 'root'@'157.173.221.52' 
IDENTIFIED BY 'secret' WITH GRANT OPTION;
FLUSH PRIVILEGES;

-- Option B: Grant from any IP (if Option A doesn't work)
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' 
IDENTIFIED BY 'secret' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

### Step 2: Test Connection

```bash
# From your search server
docker exec mysql mysql -h 103.160.107.41 -u root -psecret -e "SELECT COUNT(*) FROM mangwale_stores.stores;"
```

**Expected output**: Should show store count (not "Access denied")

### Step 3: Resync Stores Data

```bash
# Sync food stores (module_id=4)
curl -X POST http://localhost:3100/sync/stores/4

# Sync ecom stores (module_id=6)  
curl -X POST http://localhost:3100/sync/stores/6
```

**Expected output**: 
```json
{"message":"Synced 123 food stores"}
{"message":"Synced 24 ecom stores"}
```

### Step 4: Verify Stores Are Indexed

```bash
# Check counts
curl -s http://localhost:9200/food_stores/_count | jq '.count'
curl -s http://localhost:9200/ecom_stores/_count | jq '.count'

# Should show:
# 123 (food_stores)
# 24 (ecom_stores)
```

### Step 5: Test Store Search

```bash
# Test food store search
curl -s 'http://localhost:3100/search/food/stores?q=cafe&limit=3' | jq '.stores | length'

# Test autocomplete with stores
curl -s 'http://localhost:3100/search/food/suggest?q=piz' | jq '{items, stores, categories}'

# Should now show stores > 0
```

---

## 📋 VERIFICATION CHECKLIST

After MySQL access is granted:

- [ ] MySQL connection test passes
- [ ] Food stores synced (123 stores)
- [ ] Ecom stores synced (24 stores)
- [ ] Store search returns results
- [ ] Autocomplete includes stores
- [ ] No errors in API logs

---

## 🔍 CURRENT WORKING APIs

You can test these RIGHT NOW (they work with existing data):

### Food Search ✅
```bash
curl 'https://search.mangwale.ai/search/food?query=pizza&limit=5'
```

### Ecom Search ✅
```bash
curl 'https://search.mangwale.ai/search/ecom?query=phone&limit=5'
```

### Food Autocomplete ⚠️ (partial - no stores)
```bash
curl 'https://search.mangwale.ai/search/food/suggest?q=burger'
```

---

## 📊 System Health

```bash
# Check all containers
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check OpenSearch indices
curl -s http://localhost:9200/_cat/indices?v | grep -E "food|ecom"

# Check API logs
docker logs search-api --tail 50

# Check embedding service
curl -s http://localhost:8000/health
```

---

## 🚨 If Still Having Issues

### Debug MySQL Connection

```bash
# Test from local MySQL container
docker exec mysql mysql -h 103.160.107.41 -u root -psecret -e "SHOW DATABASES;"

# Check if port 3306 is accessible
nc -zv 103.160.107.41 3306

# View detailed error
docker logs search-api --tail 100 | grep -i "access denied"
```

### Alternative: Use Local MySQL

If remote MySQL cannot be accessed, you can temporarily use local MySQL:

1. **Update docker-compose.production.yml**:
```yaml
search-api:
  environment:
    - MYSQL_HOST=mysql  # Change from 103.160.107.41
```

2. **Restart API**:
```bash
docker-compose restart search-api
```

3. **Import data to local MySQL** (if needed)

---

## 📞 Support Information

**Full diagnostic report**: `/srv/SearchMangwaleAi/COMPREHENSIVE_API_TEST_REPORT.md`

**Quick status check**:
```bash
cat > /tmp/quick_status.sh << 'EOF'
#!/bin/bash
echo "=== Quick Status Check ==="
echo ""
echo "Food items: $(curl -s http://localhost:9200/food_items/_count | jq -r .count)"
echo "Ecom items: $(curl -s http://localhost:9200/ecom_items/_count | jq -r .count)"  
echo "Food stores: $(curl -s http://localhost:9200/food_stores/_count | jq -r .count)"
echo "Ecom stores: $(curl -s http://localhost:9200/ecom_stores/_count | jq -r .count)"
echo ""
echo "Testing MySQL connection..."
docker exec mysql mysql -h 103.160.107.41 -u root -psecret -e "SELECT 1" 2>&1 | grep -q "Access denied" && echo "❌ MySQL: DENIED" || echo "✅ MySQL: OK"
echo ""
echo "API health: $(curl -s http://localhost:3100/health | jq -r .opensearch)"
echo "HTTPS: $(curl -sk -o /dev/null -w '%{http_code}' https://search.mangwale.ai/)"
EOF
chmod +x /tmp/quick_status.sh
/tmp/quick_status.sh
```

---

**Last Updated**: November 14, 2025  
**Priority**: URGENT - MySQL access blocks critical functionality
