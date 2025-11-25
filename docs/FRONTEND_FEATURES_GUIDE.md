# Frontend Features Guide - Search Web Application

**Access URL:** https://localhost:5173 or https://192.168.0.156:5173  
**Updated:** November 11, 2025

---

## 🎯 All Features Available in Frontend

### ✅ **1. Module Selection (5 Modules)**
Switch between different business modules:
- **Food** (Module ID: 4) - Restaurants, food items
- **Shop/Ecom** (Module ID: 5) - Grocery, e-commerce items
- **Rooms** (Module ID: 6) - Hotels, accommodation
- **Services** (Module ID: 3) - Local services, spa, repairs
- **Movies** (Module ID: 8) - Movies, theaters

**Location:** Top segmented control in header

---

### ✅ **2. Search & Autocomplete**
- **Real-time suggestions** - Shows items, stores, and categories as you type
- **Minimum 2 characters** - Suggestions appear after typing 2+ characters
- **Geo-aware** - Considers your location if coordinates are set
- **Clear button** - Quick "×" to clear search

**Location:** Main search bar at top

---

### ✅ **3. Voice Search (ASR)**
- **Server-based ASR** - Uses Admin AI for transcription
- **Browser fallback** - Uses built-in Speech Recognition if server fails
- **Visual feedback** - Shows listening/processing states
- **Natural language** - Integrates with AI agent for intent parsing

**Location:** Microphone icon 🎤 next to search bar

**How to use:**
1. Click microphone icon
2. Speak your query (e.g., "vegetarian restaurants near me")
3. AI processes and executes search

---

### ✅ **4. Geo Location Filters**
Configure location-based search:
- **Latitude** - Set your latitude coordinate
- **Longitude** - Set your longitude coordinate
- **Radius** - Slider to set search radius (1-20 km)
- **Auto-saved** - Coordinates persist in localStorage

**Location:** Filter panel (expandable)

**Features:**
- Distance calculation for items/stores
- Radius-based filtering
- Enables "Sort by Distance" option

---

### ✅ **5. Veg/Non-Veg Filter** (Food & Ecom)
Tri-state filtering:
- **All** - Show both veg and non-veg
- **Veg Only** - Filter vegetarian items
- **Non-Veg Only** - Filter non-vegetarian items

**Location:** Filter panel dropdown

**Visual Indicators:**
- 🟢 Green dot = Vegetarian
- 🔴 Red dot = Non-Vegetarian

---

### ✅ **6. Price Range Filter**
Set minimum and maximum price:
- **Price Min** - Minimum price threshold
- **Price Max** - Maximum price threshold
- **Works across modules** - Applies to all item types

**Location:** Filter panel - two number inputs

---

### ✅ **7. Rating Filter**
Filter by minimum rating:
- **Rating Min** - 0 to 5 stars (decimal supported)
- **Shows highly rated items** - E.g., 4+ stars

**Location:** Filter panel - number input

---

### ✅ **8. Store Filtering** 🆕 (Food & Ecom)
**Single Store Mode:**
- Dropdown to select one store
- Shows items from selected store only
- Perfect for in-store browsing

**Multi-Store Mode:**
- Click store chips to select multiple
- Compare items across stores
- Great for price comparison

**Location:** Below filter panel when stores are available

**How to use:**
1. Type search query (stores appear in suggestions)
2. Use dropdown OR click chips to select stores
3. View items filtered to selected store(s)

---

### ✅ **9. Category Browsing**
Browse by popular categories:
- **Dynamic facets** - Shows categories from search results
- **Fallback categories** - Default categories if no results
- **Count badges** - Shows number of items in each category
- **Module-specific** - Different categories for Food/Ecom/Services/Movies

**Location:** Category chips section below filters

**Examples:**
- Food: Chinese, Sweets, Starters, Rolls, Desserts
- Ecom: Dairy, Frozen Foods, Ready to Eat
- Services: Beauty, Repair, Cleaning
- Movies: Action, Comedy, Drama

---

### ✅ **10. Brand Filter** (Ecom Module)
Filter by brand:
- **Multi-select** - Click multiple brands
- **Shows count** - Number of items per brand
- **Clear all** - One-click to reset

**Location:** Brand chips section (Ecom module only)

---

### ✅ **11. Sorting Options** 🆕
Sort results by:
- **Default** - Relevance-based
- **Distance (Nearest)** - Requires lat/lon ⭐
- **Price: Low to High** - Cheapest first
- **Price: High to Low** - Most expensive first
- **Rating (Highest)** - Best rated first
- **Popularity** - Most popular first

**Location:** Filter panel - "Sort By" dropdown

**Note:** Distance sorting only available when geo coordinates are set

---

### ✅ **12. Frequently Bought Together** 🆕 (Food & Ecom)
See what other customers buy with an item:
- **Click "💡 Frequently Bought Together" button** on any item card
- **Shows recommendations** - Items purchased together
- **Times bought together** - Frequency count
- **Store filtering** - Can filter to same store
- **Based on order history** - Real co-occurrence data

**Location:** Button appears on each item card in results

**Features:**
- Item name and price
- Store name (if applicable)
- Purchase frequency (e.g., "Bought together 10× times")
- Expandable panel with all recommendations

---

### ✅ **13. Items vs Stores Tabs**
Toggle between viewing:
- **Items Tab** - Food items, products, services, movies
- **Stores Tab** - Restaurants, shops, hotels, theaters

**Location:** Tabs above results section

**Store View Shows:**
- Store name
- Distance (if geo enabled)
- Rating
- Category/type

---

### ✅ **14. Search History**
- **Auto-saves searches** - Last 8 searches stored
- **Click to reuse** - Quick access to previous searches
- **Remove individual** - Delete unwanted history items
- **Clear all** - Reset entire history

**Location:** Shows in suggestion dropdown

---

### ✅ **15. Trending Queries**
View what others are searching:
- **Time windows** - 24h, 7d, 30d
- **Time of day** - Morning, Afternoon, Evening, Night
- **Module filter** - See trending by module
- **Click to search** - Instant search with trending query

**Location:** Bottom panel - "Fetch Trending"

---

### ✅ **16. Open Now Filter** (Food Module)
Filter restaurants currently open:
- **Checkbox toggle**
- **Based on availability times**
- **Food module only**

**Location:** Filter panel (Food module)

---

### ✅ **17. Faceted Search**
Dynamic filters based on search results:
- **Veg/Non-Veg facets** - Shows distribution
- **Category facets** - Shows available categories
- **Brand facets** - Shows available brands (Ecom)
- **Genre facets** - Shows movie genres (Movies)
- **Count badges** - Number of items in each facet

**Location:** Below filter panel, auto-generated from results

---

### ✅ **18. Responsive Design**
- **Mobile-friendly** - Works on all screen sizes
- **Touch-optimized** - Chips, buttons, sliders
- **Accessible** - ARIA labels for screen readers
- **Fast loading** - Skeleton loaders during fetch

---

### ✅ **19. Persistent State**
Auto-saves to localStorage:
- Selected module
- Geo coordinates (lat, lon, radius)
- Search history

**Benefit:** Settings persist across browser sessions

---

### ✅ **20. Real-time Updates**
- **Debounced search** - 250ms delay to reduce API calls
- **Live suggestions** - Updates as you type
- **Loading states** - Skeleton loaders, spinners
- **Error handling** - Graceful fallbacks

---

## 🎨 Visual Indicators

### Item Cards Show:
- ⭐ **Rating** - Average rating (e.g., 4.5)
- 📍 **Distance** - km from your location
- 💰 **Price** - Item price in ₹
- 🏪 **Store Name** - Which store sells it
- 🟢/🔴 **Veg Status** - Green (veg), Red (non-veg)
- 🎬 **Cast** - For movies
- 🏷️ **Brand** - For ecom items

### Store Cards Show:
- 📍 **Distance** - km from your location
- ⭐ **Rating** - Store rating
- 📁 **Category** - Type of store/business

---

## 🔧 How to Use Key Features

### **Store Comparison Workflow:**
```
1. Search for "milk" in Ecom module
2. See stores in suggestions
3. Click multiple store chips (e.g., Store A, Store B, Store C)
4. View milk prices across all 3 stores
5. Compare and choose best option
```

### **Geo-Based Search Workflow:**
```
1. Set Latitude: 19.9975
2. Set Longitude: 73.7898
3. Set Radius: 5 km
4. Select "Sort By: Distance (Nearest)"
5. See results sorted by proximity
```

### **Recommendations Workflow:**
```
1. Search for "paneer" in Food
2. Click on a paneer item
3. Click "💡 Frequently Bought Together"
4. See items like "chapati", "dal", "rice"
5. Know what pairs well with paneer
```

### **Veg Filter Workflow:**
```
1. Search for "pizza"
2. Select "Veg Only" filter
3. See only vegetarian pizza options
4. Visual 🟢 indicators confirm veg status
```

---

## 🚀 Advanced Features

### **AI-Powered Search:**
Voice search integrates with natural language agent:
- Understands context: "vegetarian food near me"
- Parses intent: "go to Ganesh Sweets and order paneer"
- Applies filters automatically
- Switches modules intelligently

### **Smart Fallbacks:**
- Server ASR → Browser Speech Recognition
- Failed requests → Retry logic
- No results → Helpful messaging

### **Performance:**
- Debounced search (250ms)
- Lazy loading
- Optimized re-renders
- Efficient state management

---

## 📱 Access Information

**Local Access:**
- https://localhost:5173

**Network Access:**
- https://192.168.0.156:5173

**API Backend:**
- http://localhost:3100
- Swagger Docs: http://localhost:3100/docs

**Note:** Frontend uses HTTPS with self-signed cert. Accept the security warning in browser.

---

## 🎯 Feature Coverage Summary

| Feature | Food | Ecom | Rooms | Services | Movies |
|---------|------|------|-------|----------|--------|
| Search | ✅ | ✅ | ✅ | ✅ | ✅ |
| Veg Filter | ✅ | ✅ | ❌ | ❌ | ❌ |
| Store Filter | ✅ | ✅ | ✅ | ✅ | ✅ |
| Geo Filter | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Price Filter | ✅ | ✅ | ✅ | ✅ | ❌ |
| Rating Filter | ✅ | ✅ | ✅ | ✅ | ❌ |
| Sorting | ✅ | ✅ | ✅ | ✅ | ✅ |
| Recommendations | ✅ | ✅ | ❌ | ❌ | ❌ |
| Categories | ✅ | ✅ | ❌ | ✅ | ✅ |
| Open Now | ✅ | ❌ | ❌ | ❌ | ❌ |
| Brand Filter | ❌ | ✅ | ❌ | ❌ | ❌ |

**Legend:**
- ✅ Fully functional
- ⚠️ Limited (Ecom geo data incomplete)
- ❌ Not applicable for this module

---

## 🔄 Recently Added (Nov 11, 2025)

1. **Sorting Options** - 5 different sort modes
2. **Recommendations** - Frequently Bought Together feature
3. **Multi-Store Comparison** - Compare items across stores
4. **Enhanced Visual Feedback** - Better loading states
5. **Persistent Sort** - Sort preference in URL params

---

## 💡 Tips & Best Practices

1. **Use Geo for Better Results** - Enable location for distance-based sorting
2. **Combine Filters** - E.g., Veg + Price Range + Rating for precise results
3. **Try Voice Search** - Natural language works great: "cheap vegetarian food nearby"
4. **Check Recommendations** - Discover complementary items
5. **Multi-Store Compare** - Save money by comparing prices across stores

---

**For Developers:**
- Source: `/home/ubuntu/Devs/Search/apps/search-web/src/ui/App.tsx`
- Build: `npm run build`
- Dev: `npm run dev`
- Vite config: `vite.config.ts`
