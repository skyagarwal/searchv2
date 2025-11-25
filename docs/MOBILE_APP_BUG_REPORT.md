# 🐛 Mobile App Display Bug Report
**Date:** November 6, 2025  
**Issue:** Distance and delivery time showing incorrect values  
**Severity:** 🔴 HIGH - User-facing data display error

---

## 📱 Issue Description

The mobile app is displaying incorrect values for distance and delivery time:

| Field | Expected | Actual (Screenshot) | Error |
|-------|----------|---------------------|-------|
| Distance | **4.6 km** | **8309.9 km** | ×1809 multiplier! |
| Delivery Time | **10-15 min** | **16630-16635 min** | ×1109 multiplier! |

**Screenshot Analysis:**
- Item: "Batata Wada Rassa Pav" from "The Spice Yard"
- Shows: "8309.9 km" and "16630-16635 min"
- Should show: "~4.6 km" and "10-15 min"

---

## ✅ API Response is CORRECT

I've verified the Search API (port 3100) returns **correct data**:

```bash
curl "http://localhost:3100/search/food/category?category_id=4&lat=20.0&lon=73.76"
```

**Returns:**
```json
{
  "name": "Batata Wada Rassa Pav",
  "store_name": "The Spice Yard",
  "distance_km": 4.591,           // ✅ CORRECT (in kilometers)
  "delivery_time": "10-15 min",   // ✅ CORRECT (in minutes)
  "store_location": {
    "lat": 20.023365785990517,
    "lon": 73.7238397076726
  }
}
```

**Distance Calculation Verified:**
- User location: (20.0, 73.76)
- Store location: (20.023, 73.724)
- Haversine distance: **4.59 km** ✅
- API returns: **4.59 km** ✅
- Mobile app shows: **8309.9 km** ❌

---

## 🔍 Root Cause Analysis

### Hypothesis 1: Unit Conversion Bug (Most Likely)

The numbers suggest a **unit mismatch**:

```
8309.9 km ≈ 8,309,900 meters (if API returned meters)
16630 min ≈ 997,800 seconds (if API returned seconds)
```

However, **the API returns data in correct units**, so the mobile app must be:
1. **Misinterpreting the response format**
2. **Applying incorrect unit conversions**
3. **Multiplying by wrong factors**

### Hypothesis 2: Different API Endpoint

The mobile app might be calling a **different backend** that returns data in different units:
- Main PHP backend (not the Search API)
- Gateway API (port 3001)
- Legacy API with different response format

### Hypothesis 3: Frontend Display Bug

The mobile app's distance/time display logic might have:
- Incorrect decimal formatting
- Wrong unit labels
- Parsing errors

---

## 🔧 How to Fix

### Option 1: Check Mobile App API Calls

1. **Enable network debugging** in the mobile app
2. **Capture the actual API request/response**
3. **Verify which endpoint** it's calling:
   - Search API: `http://[domain]:3100/search/food/category`
   - Gateway: `http://[domain]:3001/...`
   - PHP Backend: `http://[domain]/api/...`

4. **Check the raw response** to see if units are correct

### Option 2: Fix Mobile App Display Code

If the app is calling the Search API correctly, fix the frontend code:

**React Native Example:**
```javascript
// ❌ WRONG (if this is what's happening):
<Text>{item.distance_km} km</Text>  // If distance_km is already in km

// ✅ CORRECT:
<Text>{item.distance_km.toFixed(1)} km</Text>  // Show 1 decimal place

// ❌ WRONG (if parsing delivery_time incorrectly):
const [min, max] = item.delivery_time.split('-').map(x => parseInt(x) * 1000);  
// Don't multiply by 1000!

// ✅ CORRECT:
const [min, max] = item.delivery_time.match(/(\d+)-(\d+)/);
<Text>{min}-{max} min</Text>
```

### Option 3: Add API Response Validation

Add validation in the mobile app to catch incorrect values:

```javascript
function validateDistance(distance_km) {
  // Sanity check: distance should be < 100 km for local delivery
  if (distance_km > 100) {
    console.error(`Invalid distance: ${distance_km} km`);
    return distance_km / 1000;  // Convert from meters if needed
  }
  return distance_km;
}

function validateDeliveryTime(timeStr) {
  const match = timeStr.match(/(\d+)-(\d+)/);
  if (match) {
    const [_, min, max] = match;
    // Sanity check: delivery should be < 120 minutes
    if (parseInt(max) > 120) {
      console.error(`Invalid delivery time: ${timeStr}`);
      // Convert from seconds to minutes if needed
      return `${Math.round(min/60)}-${Math.round(max/60)} min`;
    }
  }
  return timeStr;
}
```

---

## 🧪 Testing Steps

### 1. Test Search API (Verified ✅)

```bash
curl "http://localhost:3100/search/food/category?category_id=4&lat=20.0&lon=73.76&size=5" \
  | jq '.items[] | {name, store_name, distance_km, delivery_time}'
```

**Result:** All values are correct ✅

### 2. Test Mobile App API Call (TO DO)

In the mobile app, add logging:
```javascript
fetch(API_URL)
  .then(res => res.json())
  .then(data => {
    console.log('RAW API RESPONSE:', JSON.stringify(data, null, 2));
    // Check if distance_km and delivery_time are correct here
  });
```

### 3. Test Display Logic (TO DO)

Check the component that renders distance and time:
```javascript
// Find code like this:
<Text>{distance} km</Text>
<Text>{deliveryTime}</Text>

// Add logging before display:
console.log('Distance value:', distance, typeof distance);
console.log('Delivery time:', deliveryTime, typeof deliveryTime);
```

---

## 📊 Comparison Table

| Source | Distance | Delivery Time | Status |
|--------|----------|---------------|--------|
| **OpenSearch Raw Data** | 4.59 km (calculated) | "10-15 min" | ✅ Correct |
| **Search API Response** | 4.591 km | "10-15 min" | ✅ Correct |
| **Mobile App Display** | 8309.9 km | 16630-16635 min | ❌ WRONG |

---

## 🎯 Recommended Fix Priority

1. **IMMEDIATE (Today):**
   - Add console.log in mobile app to capture raw API response
   - Identify which API endpoint the app is actually calling
   - Check if response format matches expectations

2. **SHORT TERM (This Week):**
   - Fix the display logic if it's a frontend bug
   - Add validation/sanitization for distance and time values
   - Test on multiple items/categories

3. **LONG TERM:**
   - Add unit tests for distance/time formatting
   - Add API response validation layer
   - Add visual alerts for suspicious values (e.g., distance > 50km)

---

## 🔍 Possible Code Locations to Check

### Mobile App (React Native):

```
/components/FoodItem.tsx          // Item display component
/components/RestaurantCard.tsx    // Restaurant display
/utils/formatters.ts              // Distance/time formatting utilities
/services/api.ts                  // API client
/screens/CategoryScreen.tsx       // Category listing screen
```

### Search Keywords:

Search the mobile app codebase for:
- `distance_km`
- `delivery_time`
- `.toFixed(`
- `* 1000`
- `/ 1000`
- `parseInt(`
- `Math.round(`

---

## 💡 Quick Debug Snippet

Add this to the mobile app to debug the issue:

```javascript
// In the component that displays items:
useEffect(() => {
  console.log('=== DEBUG ITEM DATA ===');
  console.log('Raw item:', JSON.stringify(item, null, 2));
  console.log('Distance type:', typeof item.distance_km);
  console.log('Distance value:', item.distance_km);
  console.log('Delivery time:', item.delivery_time);
  console.log('======================');
}, [item]);
```

---

## ✅ Verification Checklist

After fixing, verify:
- [ ] Distance shows as single digit km (e.g., "4.6 km")
- [ ] Delivery time shows as 10-60 min range (e.g., "10-15 min")
- [ ] Values make sense geographically
- [ ] No scientific notation or huge numbers
- [ ] Consistent across all items and categories

---

**Status:** 🔴 BLOCKING - Mobile app displays incorrect data to users  
**Next Step:** Capture mobile app API call and response  
**Owner:** Mobile App Team  
**Search API:** ✅ Working correctly, no changes needed
