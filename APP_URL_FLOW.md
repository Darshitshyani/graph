# App URL Flow Documentation
## Complete Backend and Frontend Flow Explanation

This document explains how the App URL is detected, stored, and used throughout the Size Chart application.

---

## Table of Contents
1. [Overview](#overview)
2. [Backend Flow](#backend-flow)
3. [Frontend Flow](#frontend-flow)
4. [App URL Detection Priority](#app-url-detection-priority)
5. [Data Flow Diagram](#data-flow-diagram)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The App URL is the public URL of your Shopify app server. It's used by the theme extension (frontend) to make API calls to fetch size chart data. The app needs to detect this URL automatically because it can change (e.g., when using Cloudflare tunnels, ngrok, or different deployment environments).

**Key Points:**
- App URL can be set manually or detected automatically
- Detection happens in multiple places (backend API, frontend JavaScript)
- Priority system ensures the most reliable source is used
- Supports both direct app URLs and app proxy URLs

---

## Backend Flow

### 1. Initial Configuration

**File:** `app/shopify.server.js`
```javascript
const shopify = shopifyApp({
  appUrl: process.env.SHOPIFY_APP_URL || "",
  // ... other config
});
```

**Flow:**
1. App reads `SHOPIFY_APP_URL` from environment variables
2. Set automatically by `shopify app dev` during development
3. Must be set manually in production deployment

---

### 2. Theme Settings API - App URL Detection

**File:** `app/routes/api.theme-settings.public.jsx`

**Purpose:** Detects and returns the app URL for theme integration

**Detection Priority (Backend):**
```
1. Saved appUrl from database (ThemeSettings.appUrl)
   ↓ (if not found)
2. SHOPIFY_APP_URL environment variable
   ↓ (if not found)
3. X-Forwarded-Host header (from Cloudflare/ngrok)
   ↓ (if not found)
4. Request URL host (when called directly)
   ↓ (if not found)
5. Host header
   ↓ (if not found)
6. Origin header
```

**API Endpoint:** `/api/theme-settings/public?shop={shop-domain}`

**Response Format:**
```json
{
  "settings": {
    "buttonText": "Size Chart",
    "appUrl": "https://your-app-url.com",
    // ... other settings
  },
  "appUrl": "https://your-app-url.com"
}
```

**Code Flow:**
1. Request comes from theme (storefront)
2. API checks database for saved `appUrl` in `ThemeSettings` table
3. If not found, tries environment variable
4. If not found, detects from request headers
5. Normalizes URL (adds protocol, removes trailing slash)
6. Returns appUrl in response

---

### 3. App URL API Endpoint

**File:** `app/routes/api.app-url.public.jsx`

**Purpose:** Dedicated endpoint just for app URL detection

**API Endpoint:** `/api/app-url/public?shop={shop-domain}`

**Detection Priority:**
```
1. SHOPIFY_APP_URL environment variable
   ↓
2. Request URL host (direct calls to app server)
   ↓
3. App proxy path detection (/apps/ path)
   ↓
4. X-Forwarded-Host header
   ↓
5. Host header
   ↓
6. Origin header
   ↓
7. Referer header
   ↓
8. App proxy fallback
```

**Response Format:**
```json
{
  "appUrl": "https://your-app-url.com",
  "detected": true,
  "source": "environment" | "request_url" | "forwarded_headers" | etc.
}
```

---

### 4. Theme Integration Page

**File:** `app/routes/app.theme-integration.jsx`

**Purpose:** Admin interface to manually set/save app URL

**Flow:**
1. Page loads with current settings
2. Detects app URL from request origin or environment
3. Displays app URL in input field
4. Admin can manually override and save
5. Saved URL is stored in `ThemeSettings.appUrl` in database

**Database Storage:**
```prisma
model ThemeSettings {
  appUrl String?  // Stored when manually configured
  // ... other settings
}
```

---

### 5. Size Chart API

**File:** `app/routes/api.size-chart.public.jsx`

**Purpose:** Returns size chart data for a product

**API Endpoint:** `/api/size-chart/public?shop={shop}&productId={id}`

**Flow:**
1. Receives request from theme with shop and productId
2. Queries database for product assignment
3. Returns chart template data
4. Uses CORS headers for cross-origin requests

**Note:** This API uses the app URL that the frontend detected to construct requests.

---

## Frontend Flow

### 1. Theme Extension Initialization

**File:** `extensions/size-chart/assets/size-chart-sync.js`

**Location:** Runs on storefront (customer-facing theme)

**Flow:**

```
Page Load
  ↓
Script Initialization (size-chart-sync.js)
  ↓
detectAppUrl() function called
  ↓
Priority Check:
  1. window.sizeChartAppUrl (from block settings)
  2. API call to /api/theme-settings/public
  3. API call to /api/app-url/public
  ↓
App URL stored in appUrl variable
  ↓
checkChartAvailability() - Checks if products have charts
  ↓
Buttons shown/hidden based on chart availability
```

---

### 2. App URL Detection (Frontend)

**Function:** `detectAppUrl()` in `size-chart-sync.js`

**Detection Priority (Frontend):**
```
1. window.sizeChartAppUrl (manually configured in block settings)
   ↓ (if not found)
2. API: /api/theme-settings/public?shop={shop}
   - Returns saved appUrl from database OR detected appUrl
   ↓ (if not found)
3. Fallback: https://{shop}/apps/size-chart (app proxy pattern)
```

**Code Example:**
```javascript
async function detectAppUrl() {
  // Priority 1: Manual configuration from block
  if (window.sizeChartAppUrl && window.sizeChartAppUrl.trim()) {
    return normalizeUrl(window.sizeChartAppUrl.trim());
  }

  // Priority 2: Fetch from theme settings API
  const settingsUrl = `${appUrl}/api/theme-settings/public?shop=${shopDomain}`;
  const response = await fetch(settingsUrl);
  const data = await response.json();
  if (data.settings?.appUrl || data.appUrl) {
    return normalizeUrl(data.appUrl);
  }

  // Priority 3: Fallback to app proxy
  return `https://${shopDomain}/apps/size-chart`;
}
```

---

### 3. Block Settings (Liquid)

**File:** `extensions/size-chart/blocks/custom-size-button.liquid`

**Purpose:** Allows merchants to manually configure app URL in theme editor

**Flow:**
```liquid
{% if block.settings.app_url != blank %}
  <script>
    window.sizeChartAppUrl = '{{ block.settings.app_url }}';
  </script>
{% endif %}
```

**Settings Schema:**
```json
{
  "type": "text",
  "id": "app_url",
  "label": "App URL",
  "info": "Leave empty to auto-detect..."
}
```

---

### 4. Chart Availability Check

**Function:** `checkChartAvailability()` in `size-chart-sync.js`

**Flow:**
```
For each product button on page:
  ↓
Normalize product ID
  ↓
Construct API URL: {appUrl}/api/size-chart/public?shop={shop}&productId={id}
  ↓
Fetch chart data
  ↓
If hasChart === true:
  - Show button (set display: flex)
Else:
  - Hide button (set display: none)
```

**API Request Construction:**
```javascript
// Direct app URL
apiUrl = `${appUrl}/api/size-chart/public?shop=${shop}&productId=${productId}`;

// OR App proxy URL
apiUrl = `https://${shopDomain}/apps/size-chart/api/size-chart/public?shop=${shop}&productId=${productId}`;
```

---

### 5. Opening Size Chart Modal

**Function:** `openSizeChartModal()` in `size-chart-sync.js`

**Flow:**
```
User clicks size chart button
  ↓
Extract product ID from button
  ↓
Ensure appUrl is available
  ↓
Construct API URL
  ↓
Fetch size chart data from API
  ↓
Parse response (hasChart, template, chartData)
  ↓
Render modal with chart data
  ↓
Display table or measurement form
```

---

## App URL Detection Priority

### Complete Priority System (Combined Backend + Frontend)

```
FRONTEND (Theme Extension):
┌─────────────────────────────────────┐
│ 1. Block Settings (window.sizeChartAppUrl) │ ← Highest Priority
│ 2. API: /api/theme-settings/public          │
│ 3. Fallback: App Proxy Pattern              │
└─────────────────────────────────────┘
                    ↓
         Calls Backend API
                    ↓
BACKEND (API Routes):
┌─────────────────────────────────────┐
│ 1. Database (ThemeSettings.appUrl)  │ ← Manual override
│ 2. Environment (SHOPIFY_APP_URL)    │ ← Auto-set by CLI
│ 3. X-Forwarded-Host header          │ ← Cloudflare/ngrok
│ 4. Request URL host                 │ ← Direct calls
│ 5. Host header                      │
│ 6. Origin header                    │
│ 7. Referer header                   │
│ 8. App Proxy Fallback               │ ← Last resort
└─────────────────────────────────────┘
```

---

## Data Flow Diagram

### Complete Request Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    STOREFRONT (Theme)                        │
│                                                               │
│  1. Customer visits product page                             │
│  2. size-chart-sync.js loads                                 │
│  3. detectAppUrl() called                                    │
│     ├─ Check window.sizeChartAppUrl (block settings)        │
│     ├─ If not found: Fetch /api/theme-settings/public       │
│     └─ Store in appUrl variable                              │
│                                                               │
│  4. checkChartAvailability()                                 │
│     ├─ For each product button                               │
│     ├─ Construct: {appUrl}/api/size-chart/public            │
│     └─ Fetch → Show/Hide buttons                             │
│                                                               │
│  5. User clicks button → openSizeChartModal()                │
│     └─ Fetch chart data → Display modal                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP Requests (CORS enabled)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  APP SERVER (Backend)                        │
│                                                               │
│  API Endpoints:                                               │
│                                                               │
│  A. /api/theme-settings/public                               │
│     ├─ Detect app URL (priority order)                       │
│     ├─ Query ThemeSettings from database                     │
│     └─ Return: { settings, appUrl }                          │
│                                                               │
│  B. /api/size-chart/public                                   │
│     ├─ Extract shop and productId from query                 │
│     ├─ Query SizeChartProductAssignment                      │
│     ├─ Query SizeChartTemplate                               │
│     └─ Return: { hasChart, template }                        │
│                                                               │
│  C. /api/app-url/public                                      │
│     └─ Return: { appUrl, detected, source }                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Database Queries
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE (Prisma)                       │
│                                                               │
│  Tables Used:                                                │
│  • ThemeSettings.appUrl (saved manual URL)                   │
│  • SizeChartProductAssignment (product → template mapping)   │
│  • SizeChartTemplate (chart data)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## URL Formats Supported

### 1. Direct App URL
```
https://deborah-beta-trust-producer.trycloudflare.com
https://your-app.herokuapp.com
https://your-domain.com
```

### 2. App Proxy URL
```
https://shop-domain.myshopify.com/apps/size-chart
```

**Note:** App proxy requires configuration in Shopify Partners Dashboard.

---

## Environment Variables

### Development
```bash
# Automatically set by: shopify app dev
SHOPIFY_APP_URL=https://deborah-beta-trust-producer.trycloudflare.com
```

### Production
```bash
# Must be set manually
SHOPIFY_APP_URL=https://your-production-domain.com
```

---

## URL Normalization

All detected URLs are normalized to ensure consistency:

```javascript
function normalizeUrl(url) {
  // Add protocol if missing
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
  }
  
  // Remove trailing slash
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  
  return url;
}
```

---

## Troubleshooting

### Issue: App URL not detected

**Symptoms:**
- Buttons don't show
- API calls fail
- Console errors about missing app URL

**Solutions:**
1. Check `SHOPIFY_APP_URL` environment variable is set
2. Verify app server is running and accessible
3. Check browser console for detection logs
4. Manually set app URL in Theme Integration page
5. Manually set app URL in block settings

---

### Issue: CORS errors

**Symptoms:**
- Browser console shows CORS errors
- API requests blocked

**Solution:**
- Ensure CORS headers are set (already implemented in API routes)
- Verify app URL is correct and accessible from storefront

---

### Issue: Buttons not showing

**Symptoms:**
- Size chart buttons don't appear on product pages

**Check:**
1. Is chart assigned to product? (check database)
2. Is template active? (check database)
3. Check browser console for API errors
4. Verify app URL is correct
5. Check `checkChartAvailability()` logs

---

### Debugging Steps

1. **Check Environment:**
   ```bash
   echo $SHOPIFY_APP_URL
   ```

2. **Check Browser Console:**
   ```javascript
   // Look for these logs:
   [Size Chart] Initialized with app URL: ...
   [Size Chart] Chart check result for product: ...
   ```

3. **Test API Directly:**
   ```bash
   curl "https://your-app-url.com/api/app-url/public?shop=your-shop.myshopify.com"
   ```

4. **Check Database:**
   ```sql
   SELECT appUrl FROM ThemeSettings WHERE shop = 'your-shop';
   ```

---

## Summary

**Backend Flow:**
1. App URL configured in environment or detected from headers
2. Saved to database when manually configured
3. Returned via API endpoints
4. Used for CORS configuration

**Frontend Flow:**
1. Detects app URL from multiple sources (priority order)
2. Stores in JavaScript variable
3. Uses to construct API requests
4. Fetches chart data and displays buttons/modals

**Key Files:**
- Backend: `app/routes/api.theme-settings.public.jsx`, `app/routes/api.app-url.public.jsx`
- Frontend: `extensions/size-chart/assets/size-chart-sync.js`
- Config: `app/shopify.server.js`, `.env`

---

## Best Practices

1. **Development:** Let `shopify app dev` automatically set `SHOPIFY_APP_URL`
2. **Production:** Set `SHOPIFY_APP_URL` in hosting platform environment variables
3. **Manual Override:** Use Theme Integration page for troubleshooting
4. **Block Settings:** Only use for specific theme customizations
5. **Monitoring:** Check logs regularly for detection failures

---

*Last Updated: 2024-12-19*

