# Deploying Moby Dick to Railway - Complete Guide

This guide walks you through deploying the Polymarket Whale Detector to [Railway](https://railway.app), a modern cloud platform that makes deployment simple.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Create a Railway Account](#1-create-a-railway-account)
3. [Install Railway CLI](#2-install-railway-cli)
4. [Create a New Project](#3-create-a-new-project)
5. [Add PostgreSQL Database](#4-add-postgresql-database)
6. [Configure Environment Variables](#5-configure-environment-variables)
7. [Deploy the Application](#6-deploy-the-application)
8. [Set Up Custom Domain (Optional)](#7-set-up-custom-domain-optional)
9. [Monitor Your Deployment](#8-monitor-your-deployment)
10. [Troubleshooting](#troubleshooting)
11. [Cost Estimation](#cost-estimation)

---

## Prerequisites

Before you begin, make sure you have:

- [ ] A GitHub account (Railway uses GitHub for deployments)
- [ ] The project pushed to GitHub (already done: `github.com/Eyali1001/mobydick`)
- [ ] Node.js 20+ installed locally (for CLI)
- [ ] A credit card (Railway requires one for the free trial, but you get $5 free credits)

---

## 1. Create a Railway Account

1. Go to [https://railway.app](https://railway.app)
2. Click **"Start a New Project"** or **"Login"**
3. Sign up with your **GitHub account** (recommended for easy deployments)
4. Verify your email if prompted
5. Add a payment method to unlock the free $5 trial credits

> **Note:** Railway's free tier gives you $5/month in credits, which is usually enough for small projects like this.

---

## 2. Install Railway CLI

Open your terminal and install the Railway CLI:

```bash
# macOS (Homebrew)
brew install railway

# or using npm
npm install -g @railway/cli

# or using curl
curl -fsSL https://railway.app/install.sh | sh
```

Verify installation:

```bash
railway --version
```

Login to Railway:

```bash
railway login
```

This opens a browser window. Click **"Authorize"** to connect your terminal to Railway.

---

## 3. Create a New Project

You have two options:

### Option A: Via CLI (Recommended)

```bash
# Navigate to your project directory
cd /path/to/mobydick

# Initialize a new Railway project
railway init
```

When prompted:
- Select **"Create new project"**
- Give it a name like `mobydick` or `whale-detector`

### Option B: Via Dashboard

1. Go to [https://railway.app/dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Find and select `Eyali1001/mobydick`
5. Click **"Deploy Now"**

---

## 4. Add PostgreSQL Database

The app uses a database to store whale trades. In production, we'll use PostgreSQL instead of SQLite.

### Via CLI:

```bash
railway add
```

Select **"PostgreSQL"** from the list.

### Via Dashboard:

1. In your project, click **"New"**
2. Select **"Database"**
3. Choose **"PostgreSQL"**
4. Click **"Add PostgreSQL"**

Railway automatically creates a `DATABASE_URL` environment variable for you.

---

## 5. Configure Environment Variables

### Required Variables

In the Railway dashboard:

1. Click on your **service** (not the database)
2. Go to the **"Variables"** tab
3. Add these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `3000` | Server port (Railway sets this automatically) |

### The DATABASE_URL

Railway **automatically** creates and links the `DATABASE_URL` from your PostgreSQL service. You don't need to set this manually.

To verify it's linked:
1. Click on your app service
2. Go to **"Variables"**
3. Look for `DATABASE_URL` - it should show as a reference to your PostgreSQL service

### Via CLI:

```bash
# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3000

# View all variables
railway variables
```

---

## 6. Deploy the Application

### Option A: Automatic Deploys from GitHub (Recommended)

1. In the Railway dashboard, click on your service
2. Go to **"Settings"**
3. Under **"Source"**, connect to your GitHub repo
4. Select the `main` branch
5. Enable **"Automatic Deploys"**

Now every push to `main` will automatically deploy!

### Option B: Manual Deploy via CLI

```bash
# Deploy from your local directory
railway up
```

### Option C: Manual Deploy via Dashboard

1. Go to your service
2. Click **"Deploy"**
3. Select **"Deploy from GitHub"**
4. Choose the branch and click **"Deploy"**

---

## 7. Generate a Public URL

After deployment, you need a public URL:

### Via CLI:

```bash
railway domain
```

### Via Dashboard:

1. Click on your service
2. Go to **"Settings"**
3. Scroll to **"Networking"**
4. Click **"Generate Domain"**

You'll get a URL like: `mobydick-production.up.railway.app`

---

## 8. Set Up Custom Domain (Optional)

If you have your own domain:

1. Go to your service **"Settings"**
2. Under **"Networking"**, click **"Custom Domain"**
3. Enter your domain (e.g., `whales.yourdomain.com`)
4. Railway will give you DNS records to add:

```
Type: CNAME
Name: whales (or @ for root)
Value: <your-railway-domain>.up.railway.app
```

5. Add these records in your domain registrar (Cloudflare, Namecheap, etc.)
6. Wait for DNS propagation (usually 5-30 minutes)

---

## 9. Monitor Your Deployment

### View Logs

**CLI:**
```bash
railway logs
```

**Dashboard:**
1. Click on your service
2. Go to **"Deployments"**
3. Click on a deployment to see logs

### Check Health

Once deployed, test these endpoints:

```bash
# Health check
curl https://your-app.up.railway.app/health

# API stats
curl https://your-app.up.railway.app/api/stats

# View the dashboard
open https://your-app.up.railway.app
```

### Set Up Alerts (Optional)

1. Go to **"Settings"** → **"Observability"**
2. Configure alerts for:
   - Deployment failures
   - High memory usage
   - Service crashes

---

## 10. Database Migrations

After your first deployment, run the database migration:

```bash
railway run npx prisma db push
```

Or, if you want migrations:

```bash
railway run npx prisma migrate deploy
```

---

## Troubleshooting

### "Build failed" errors

Check the build logs. Common issues:

1. **Missing dependencies** - Ensure all deps are in `package.json` (not devDependencies for production-needed packages)

2. **TypeScript errors** - Fix any type errors locally first:
   ```bash
   npm run build
   ```

3. **Prisma generation** - The build command should include:
   ```bash
   npx prisma generate && npm run build
   ```

### "Application failed to start"

1. Check logs: `railway logs`
2. Verify `PORT` is set correctly
3. Ensure `DATABASE_URL` is linked
4. Check the start command in `package.json`:
   ```json
   "start": "node dist/server/index.js"
   ```

### Database connection errors

1. Verify PostgreSQL service is running
2. Check `DATABASE_URL` is properly linked
3. Run migrations:
   ```bash
   railway run npx prisma db push
   ```

### WebSocket not connecting

The app uses WebSocket connections to Polymarket. If you see connection issues:

1. Check Railway logs for WebSocket errors
2. Verify no firewall is blocking outbound WebSocket connections
3. The app auto-reconnects, so brief disconnections are normal

---

## Cost Estimation

Railway pricing (as of 2024):

| Resource | Cost |
|----------|------|
| Free Trial | $5/month credits |
| Compute | ~$0.000463/min (~$20/month for always-on) |
| PostgreSQL | ~$5-10/month for small DB |
| Network | First 100GB free |

**Estimated monthly cost:** $10-25/month for a small, always-on deployment

### Cost-Saving Tips

1. **Use sleep mode** - In Settings, enable "Sleep when inactive" to pause when no traffic
2. **Scale down** - Use the smallest resource allocation that works
3. **Monitor usage** - Check the Usage tab regularly

---

## Quick Reference Commands

```bash
# Login
railway login

# Link to existing project
railway link

# Deploy
railway up

# View logs
railway logs -f

# Run command on Railway
railway run <command>

# Set variable
railway variables set KEY=value

# Open dashboard
railway open

# Generate domain
railway domain

# Check status
railway status
```

---

## Project Files for Railway

Your project already has these Railway-specific files:

### `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### `Procfile`
```
web: npm run start
release: npm run db:migrate
```

---

## Summary Checklist

- [ ] Created Railway account
- [ ] Installed Railway CLI (`railway --version`)
- [ ] Logged in (`railway login`)
- [ ] Created project (`railway init`)
- [ ] Added PostgreSQL database
- [ ] Set environment variables (`NODE_ENV=production`)
- [ ] Deployed the app (`railway up`)
- [ ] Generated public domain
- [ ] Ran database migrations (`railway run npx prisma db push`)
- [ ] Tested the live URL
- [ ] (Optional) Set up custom domain
- [ ] (Optional) Configured monitoring/alerts

---

## Need Help?

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app)

---

*Last updated: January 2026*
