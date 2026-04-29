# Railway Deployment Guide for WA Gateway

## Prerequisites
- GitHub account with your project pushed
- Railway account (railway.app)

## Step-by-Step Deployment

### 1. Push Your Changes to GitHub
```bash
git add .
git commit -m "Add Dockerfile for Railway deployment"
git push origin main
```

### 2. Create Railway Project
1. Go to [railway.app](https://railway.app/)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `wa-gateway` repository
4. Railway will detect the Dockerfile and build using Node.js 22

### 3. Add Database Service
**CRITICAL**: You must add a MySQL database for persistent storage:

1. In your Railway project, click "New Service"
2. Select "Database" → "MySQL"
3. Railway will automatically create a MySQL database

### 4. Configure Environment Variables
Railway automatically provides database variables, but you need to add a few more:

**Add these variables manually:**
- `NODE_ENV` = `production`
- `KEY` = (generate a secure API key - see below)
- `PORT` = `5001`

**Railway automatically provides these from your MySQL service:**
- `DATABASE_URL` (auto-populated)
- `MYSQLHOST` (auto-populated)
- `MYSQLPORT` (auto-populated)
- `MYSQLDATABASE` (auto-populated)
- `MYSQLUSER` (auto-populated)
- `MYSQLPASSWORD` (auto-populated)

### 5. Update Database Configuration
Your app needs to map Railway's MySQL variables to your app's expected format.

**Add these variables in Railway → Settings → Variables:**
```
DB_HOST=${MYSQLHOST}
DB_PORT=${MYSQLPORT}
DB_USER=${MYSQLUSER}
DB_PASSWORD=${MYSQLPASSWORD}
DB_NAME=${MYSQLDATABASE}
```

### 6. Generate and Set KEY
Generate a secure API key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set this as the `KEY` environment variable in Railway.

### 7. Deployment Health Check
- Railway will automatically redeploy when you push changes
- Check the logs for any errors
- The health check path is `/session`

## Docker Configuration
The project now uses a Dockerfile that ensures Node.js 22 is used, which is required for the `@whiskeysockets/baileys` package.

## Important Notes

### ⚠️ Ephemeral Filesystem
Railway's filesystem is temporary. This means:
- **Media files** in `./media` will be lost on redeployment
- **Session data** stored only in files won't persist

### ✅ Solution: Your Database Storage
Your app already stores sessions in the database (`sessions` table), so WhatsApp sessions will persist correctly!

### 📁 Media Files Consideration
For persistent media storage, consider:
- Railway Volume (add persistent disk storage)
- External storage (S3, Cloudflare R2, etc.)
- Or accept that media files are temporary

## Troubleshooting

### Build Fails with Node.js Version Error
- Ensure Dockerfile is present and committed
- Check that Dockerfile uses `node:22-alpine`
- Verify Railway is using the Dockerfile (not NIXPACKS)

### Database Connection Issues
- Ensure MySQL service is running
- Check environment variables are properly mapped
- Verify database tables are created (check logs)

### Session Not Persisting
- Check database is properly connected
- Verify `sessions` table exists
- Check logs for database errors

### Container Won't Start
- Check Railway logs for error messages
- Verify all environment variables are set
- Ensure database service is running before app starts

## Webhook Configuration
If using webhooks, set:
```
WEBHOOK_BASE_URL=https://your-app.railway.app/webhook
```

## Monitoring
- Railway provides built-in metrics
- Check logs in Railway dashboard
- Monitor database usage

## Cost Optimization
- Free tier includes limited usage
- Monitor database storage
- Consider cleanup jobs for old messages/media