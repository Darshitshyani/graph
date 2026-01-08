# Vercel Deployment Guide

This Shopify app is deployed on Vercel at: https://size-chart-virid.vercel.app/

## Prerequisites

1. Vercel account connected to your GitHub repository
2. Environment variables configured in Vercel dashboard
3. PostgreSQL database (Vercel Postgres or external provider)

## Environment Variables

Configure these in Vercel Dashboard → Settings → Environment Variables:

### Required Variables

```bash
# Shopify App Configuration
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=write_products,read_products,write_orders,read_orders,write_customers,read_customers
SHOPIFY_APP_URL=https://size-chart-virid.vercel.app

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# AWS S3 (for image storage)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
AWS_S3_BUCKET_NAME=your_bucket_name

# Node Environment
NODE_ENV=production
```

### Optional Variables

```bash
# For development/testing
SHOPIFY_API_VERSION=2024-10
```

## Build Configuration

The project uses:
- **Build Command**: `npm run build && npm run setup`
  - Builds React Router app
  - Generates Prisma client
  - Runs database migrations

- **Output Directory**: `build/client`
  - Static assets served by Vercel

- **Serverless Function**: `api/index.js`
  - Handles all server-side rendering and API routes
  - Runtime: Node.js 20.x
  - Max Duration: 30 seconds
  - Memory: 1024 MB

## Database Setup

### Using Vercel Postgres

1. Go to Vercel Dashboard → Storage → Create Database → Postgres
2. Copy the `DATABASE_URL` connection string
3. Add it to Environment Variables
4. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

### Using External PostgreSQL

1. Create PostgreSQL database
2. Add `DATABASE_URL` to Vercel Environment Variables
3. Run migrations manually or via Vercel build command

## Deployment Steps

1. **Connect Repository**
   - Go to Vercel Dashboard
   - Import your GitHub repository
   - Vercel will auto-detect the configuration

2. **Configure Environment Variables**
   - Add all required environment variables
   - Ensure `NODE_ENV=production` is set

3. **Deploy**
   - Push to main branch (auto-deploys)
   - Or manually trigger deployment

4. **Verify Deployment**
   - Check build logs for errors
   - Test the app URL: https://size-chart-virid.vercel.app/
   - Verify database connection

## Troubleshooting

### Build Fails

- Check Node.js version (requires >=20.19 or >=22.12)
- Verify all environment variables are set
- Check build logs for specific errors

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Ensure database is accessible from Vercel
- Check Prisma migrations ran successfully

### Runtime Errors

- Check function logs in Vercel Dashboard
- Verify all environment variables are set
- Check serverless function timeout (max 30s)

### Static Assets Not Loading

- Verify `build/client` directory exists after build
- Check `vercel.json` rewrites configuration
- Ensure assets are in the correct location

## File Structure

```
.
├── api/
│   └── index.js          # Vercel serverless function handler
├── app/                  # React Router app
├── build/                # Build output
│   ├── client/          # Static assets (served by Vercel)
│   └── server/          # Server bundle (used by api/index.js)
├── vercel.json          # Vercel configuration
└── package.json         # Dependencies and scripts
```

## Important Notes

1. **Prisma Client**: Must be generated during build (`npm run setup`)
2. **Database Migrations**: Run automatically via `npm run setup`
3. **Serverless Function**: All routes are handled by `api/index.js`
4. **Static Assets**: Served directly by Vercel from `build/client`
5. **Environment Variables**: Must be set in Vercel Dashboard (not in `.env` files)

## Updating the App

1. Make changes to your code
2. Commit and push to GitHub
3. Vercel automatically deploys
4. Check deployment status in Vercel Dashboard

## Support

For issues:
- Check Vercel deployment logs
- Review React Router v7 documentation
- Check Shopify App Bridge documentation
