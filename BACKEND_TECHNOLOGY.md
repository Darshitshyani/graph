# Backend Technology Details

This document provides a comprehensive overview of all backend technologies used in this Size Chart Shopify App.

## Runtime Environment

- **Node.js**: Version >=20.19 <22 || >=22.12
- **Runtime**: Node.js (Alpine Linux in production via Docker)
- **Type**: ES Modules (`"type": "module"`)

## Framework & Architecture

### React Router v7
- **Version**: ^7.9.3
- **Type**: Full-stack React framework
- **Packages Used**:
  - `@react-router/dev`: ^7.9.3
  - `@react-router/fs-routes`: ^7.9.3
  - `@react-router/node`: ^7.9.3
  - `@react-router/serve`: ^7.9.3
- **Server-side Rendering**: Yes, using `renderToPipeableStream` from `react-dom/server`
- **Routing**: File-based routing with route loaders and actions

### Server Entry Point
- **File**: `app/entry.server.jsx`
- **Features**:
  - Server-side streaming with React 18
  - CORS handling for API routes
  - OPTIONS preflight request handling
  - Bot detection using `isbot` package

## Database & ORM

### Prisma
- **Version**: ^6.16.3 (CLI), ^6.19.1 (Client)
- **ORM**: Prisma ORM with Prisma Client
- **Database Provider**: SQLite (development), supports PostgreSQL in production
- **Schema Location**: `prisma/schema.prisma`

### Database Models

1. **Session** (Shopify App Sessions)
   - Stores OAuth session data
   - Managed by `@shopify/shopify-app-session-storage-prisma`

2. **SizeChartTemplate**
   - Stores size chart templates
   - Fields: id, shop, name, gender, category, description, chartData, active, timestamps

3. **SizeChartProductAssignment**
   - Links products to size chart templates
   - Fields: id, templateId, productId, productTitle, shop, timestamps

4. **ThemeSettings**
   - Stores theme integration settings
   - Fields: button styling, colors, margins, alignment, etc.

5. **Subscription**
   - Manages shop subscription plans
   - Fields: planId, planName, status, period dates, features, limits

6. **Plan**
   - Defines available subscription plans
   - Fields: name, displayName, price, currency, interval, features, limits

### Database Connection
- **File**: `app/db.server.js`
- **Pattern**: Singleton pattern to avoid multiple connections
- **Implementation**: Global instance for development, fresh instance for production

## Shopify Integration

### Shopify App Framework
- **Package**: `@shopify/shopify-app-react-router`
- **Version**: ^1.0.0
- **API Version**: October25 (2025-10)
- **Configuration File**: `app/shopify.server.js`

### Shopify Packages
- `@shopify/app-bridge`: ^3.7.11
- `@shopify/app-bridge-react`: ^4.2.4
- `@shopify/shopify-app-session-storage-prisma`: ^7.0.0

### Authentication & Authorization
- **OAuth Flow**: Handled by Shopify App framework
- **Session Storage**: Prisma-based session storage
- **Session Management**: Automatic via `PrismaSessionStorage`
- **Admin API Access**: Via `authenticate.admin(request)`
- **Webhook Authentication**: Via `authenticate.webhook(request)`

### Webhooks Implemented

#### App Lifecycle Webhooks
1. **App Uninstalled** (`webhooks.app.uninstalled.jsx`)
   - Topic: `app/uninstalled`
   - Cleans up session data when app is uninstalled
   - Deletes all sessions for the shop

2. **App Scopes Update** (`webhooks.app.scopes_update.jsx`)
   - Topic: `app/scopes_update`
   - Handles OAuth scope changes
   - Updates session scope information

#### Shop Management Webhooks
3. **Shop Update** (`webhooks.shop.update.jsx`)
   - Topic: `shop/update`
   - Triggered when shop information changes (e.g., domain changes)
   - Updates shop domain in records if needed
   - **Required for production approval**

#### GDPR Compliance Webhooks (Mandatory)
4. **Customers Data Request** (`webhooks.customers.data_request.jsx`)
   - Topic: `customers/data_request`
   - Handles GDPR customer data requests
   - Returns customer data within 10 days (currently returns empty as no customer data is stored)
   - **Mandatory for Shopify App Store approval**

5. **Customers Redact** (`webhooks.customers.redact.jsx`)
   - Topic: `customers/redact`
   - Handles GDPR customer data deletion requests (right to be forgotten)
   - Deletes customer data within 10 days (acknowledged as no customer data is stored)
   - **Mandatory for Shopify App Store approval**

6. **Shop Redact** (`webhooks.shop.redact.jsx`)
   - Topic: `shop/redact`
   - Handles GDPR shop data deletion requests
   - Deletes ALL shop data within 10 days:
     - Size chart templates
     - Product assignments
     - Theme settings
     - Subscription data
     - Session data
   - Uses database transactions for atomicity
   - **Mandatory for Shopify App Store approval**

## API Routes

### Public API Routes (No Authentication Required)
1. **`/api/size-chart/public`** (`api.size-chart.public.jsx`)
   - GET: Retrieve size chart data for a product
   - Query params: `shop`, `productId`
   - CORS enabled for cross-origin requests
   - Returns: Size chart template data or error

2. **`/api/app-url/public`** (`api.app-url.public.jsx`)
   - GET: Retrieve app URL for theme integration

3. **`/api/theme-settings/public`** (`api.theme-settings.public.jsx`)
   - GET: Retrieve theme settings for a shop

### Protected API Routes (Requires Authentication)
1. **`/api/subscription`** (`api.subscription.jsx`)
   - GET: Get shop subscription details and limits
   - POST: Update shop subscription plan
   - Uses: `authenticate.admin(request)`

2. **`/api/theme-settings`** (`api.theme-settings.jsx`)
   - GET: Get theme settings for authenticated shop
   - POST: Update theme settings
   - Uses: `authenticate.admin(request)`

3. **`/api/measurement-template`** (`api.measurement-template.jsx`)
   - Handles measurement template operations
   - Uses: `authenticate.admin(request)`

## Server-Side Utilities

### Subscription Management (`app/utils/subscription.server.js`)
- `getShopSubscription(shop)`: Get or create shop subscription
- `getPlanLimits(shop)`: Get plan limits for a shop
- `hasFeatureAccess(shop, feature)`: Check feature access
- `checkPlanLimit(shop, limitType, currentCount)`: Validate plan limits
- `getShopUsage(shop)`: Get current usage statistics
- `canCreateTemplate(shop)`: Check if shop can create template
- `canAssignToProduct(shop)`: Check if shop can assign chart
- `ensureDefaultPlans()`: Initialize default subscription plans
- `updateShopSubscription(shop, planName, data)`: Update subscription

### Plan Tiers
- **Free**: 3 templates, 10 product assignments
- **Basic**: 10 templates, 50 product assignments
- **Pro**: 50 templates, 500 product assignments, custom branding, API access
- **Enterprise**: Unlimited, all features, priority support

## Build & Development Tools

### Build Tool
- **Vite**: ^6.3.6
- **Config**: `vite.config.js`
- **Features**:
  - TypeScript support via `vite-tsconfig-paths`
  - React Router plugin integration
  - HMR (Hot Module Replacement) configuration
  - CORS preflight handling

### TypeScript
- **Version**: ^5.9.3
- **Type Checking**: Enabled via `tsc --noEmit`
- **Config**: `tsconfig.json`

### Database Migrations
- **Tool**: Prisma Migrate
- **Migration Location**: `prisma/migrations/`
- **Commands**:
  - Development: `prisma db push`
  - Production: `prisma migrate deploy`

## Deployment

### Docker
- **Base Image**: `node:20-alpine`
- **File**: `Dockerfile`
- **Production Build**: Optimized build with `npm ci --omit=dev`
- **Start Command**: `npm run docker-start`
- **Setup**: Runs Prisma generate and migrations

### Production Dependencies
- **PostgreSQL Driver**: `pg` ^8.11.3 (for production database)
- **Session Storage**: Prisma-based (works with SQLite and PostgreSQL)

## Key Server-Side Features

### CORS Handling
- Enabled for public API routes
- Headers configured for cross-origin requests
- OPTIONS preflight request handling

### Error Handling
- React Router error boundaries
- Shopify-specific error boundaries via `@shopify/shopify-app-react-router/server`
- Error logging and graceful degradation

### Security
- OAuth 2.0 authentication via Shopify
- Session-based authorization
- Webhook verification
- Environment variable configuration

### Performance
- Database connection pooling (via Prisma)
- Singleton database client pattern
- Parallel database queries using `Promise.all()`
- Server-side streaming for React components

## Environment Variables Required

- `SHOPIFY_API_KEY`: Shopify app API key
- `SHOPIFY_API_SECRET`: Shopify app API secret
- `SCOPES`: Comma-separated OAuth scopes
- `SHOPIFY_APP_URL`: App URL
- `DATABASE_URL`: Database connection string (for production)
- `NODE_ENV`: Environment (development/production)
- `SHOP_CUSTOM_DOMAIN`: Optional custom shop domain

## File Structure

```
app/
├── db.server.js              # Prisma client singleton
├── shopify.server.js         # Shopify app configuration
├── entry.server.jsx          # Server entry point
├── utils/
│   └── subscription.server.js # Subscription utilities
└── routes/
    ├── api.*.jsx             # API routes
    ├── app.*.jsx             # Protected app routes
    ├── auth.*.jsx            # Authentication routes
    └── webhooks.*.jsx        # Webhook handlers
```

## Summary

This is a **full-stack Shopify app** built with:
- **React Router v7** as the web framework
- **Prisma ORM** for database operations
- **SQLite/PostgreSQL** as the database
- **Node.js** runtime
- **Shopify App Bridge** for Shopify integration
- **Docker** for containerization
- Server-side rendering with React 18 streaming
- RESTful API endpoints with CORS support
- Subscription management system
- Theme integration capabilities

