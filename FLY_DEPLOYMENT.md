# Fly.io Deployment Guide for WhatsApp Gateway

## 🚀 Complete Setup Instructions

### Step 1: Install Fly.io CLI

#### **Windows (PowerShell):**
```powershell
# Download and install Fly CLI
powershell -Command "iwr https://fly.io/install.ps1 | iex"

# Or use winget
winget install superfly.flyctl

# Restart your terminal after installation
```

#### **Mac/Linux:**
```bash
# Install with curl
curl -L https://fly.io/install.sh | sh

# Or use homebrew (Mac)
brew install flyctl
```

#### **Verify Installation:**
```bash
flyctl version
# Should show: flyctl v0.x.x
```

---

### Step 2: Create Fly.io Account

#### **Option A: Sign up via CLI**
```bash
flyctl auth signup
```
This will open a browser for registration.

#### **Option B: Sign up via Web**
1. Go to https://fly.io
2. Click "Sign Up"
3. Use GitHub/GitLab/Email
4. After signup, authenticate:
```bash
flyctl auth login
```

---

### Step 3: Prepare Your Project

#### **Navigate to Your Project:**
```bash
cd d:\nodejsapps\wa_gateway_working
```

#### **Verify Dockerfile Exists:**
```bash
# Check that Dockerfile is present
cat Dockerfile
```

#### **Update .gitignore for Fly.io:**
```bash
# Add these lines to .gitignore if not present
.fly/
fly.toml
```

---

### Step 4: Launch Your App on Fly.io

#### **Initialize Fly.io App:**
```bash
flyctl launch
```

**You'll be prompted:**
```
? App name (leave blank to use an auto-generated name):
your-app-name

? Select organization: (use default or create new)
personal

? Choose a region for deployment:
Amsterdam, Netherlands (ams) [Recommended]

? Would you like to set up a PostgreSQL database now? No
We'll add MySQL separately

? Would you like to deploy now? No
We'll configure first
```

#### **This Creates:**
- `fly.toml` configuration file
- `.fly/` directory with app settings

---

### Step 5: Configure fly.toml

#### **Edit the Generated fly.toml:**
```toml
# fly.toml app configuration file
# See https://fly.io/docs/reference/configuration/ for information about how to use this file.

app = "your-app-name"
primary_region = "ams"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "5001"

[http_service]
  internal_port = 5001
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[http_service.checks]]
  interval = "15s"
  timeout = "10s"
  grace_period = "5s"
  method = "GET"
  path = "/health"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256

# MySQL Database will be added in next steps
```

---

### Step 6: Add MySQL Database

#### **Create MySQL Database:**
```bash
# Create a MySQL database
flyctl mysql create

# Choose:
# - App: your-app-name
# - Region: same as your app (ams)
# - Plan: Free (development)
```

#### **Get Database Connection Details:**
```bash
# List databases
flyctl mysql list

# Get connection string
flyctl mysql status -a your-app-name-mysql
```

#### **Set Database Environment Variables:**
```bash
# Get your database details
flyctl mysql status -a your-app-name-mysql

# Add environment variables to your app
flyctl secrets set DB_HOST=mysql.fly.io \
  DB_PORT=3306 \
  DB_USER=root \
  DB_PASSWORD=your_password \
  DB_NAME=your_database_name \
  KEY=your_secure_api_key_here \
  -a your-app-name
```

---

### Step 7: Deploy Your App

#### **First Deployment:**
```bash
# Deploy to Fly.io
flyctl deploy

# This will:
# 1. Build Docker image
# 2. Push to Fly.io registry
# 3. Deploy to their infrastructure
# 4. Start the container
```

#### **Monitor Deployment:**
```bash
# Watch deployment logs
flyctl logs -a your-app-name

# Check app status
flyctl status -a your-app-name
```

---

### Step 8: Verify Deployment

#### **Check App Health:**
```bash
# Get your app URL
flyctl info -a your-app-name

# Test health endpoint
curl https://your-app-name.fly.dev/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":...}
```

#### **Check Database Connection:**
```bash
# View logs for database connection
flyctl logs -a your-app-name | grep DB

# Look for:
# [DB] ✅ Pool created successfully
```

---

### Step 9: Configure Webhook (Optional)

#### **Set Webhook URL:**
```bash
flyctl secrets set WEBHOOK_BASE_URL=https://your-app-name.fly.dev/webhook -a your-app-name
```

---

### Step 10: Access Your App

#### **Get App URLs:**
```bash
flyctl info -a your-app-name
```

**You'll get:**
- **App URL:** `https://your-app-name.fly.dev`
- **Health Check:** `https://your-app-name.fly.dev/health`
- **API Endpoints:** `https://your-app-name.fly.dev/session`, etc.

---

## 🧪 Testing Your Deployment

### **Test Health Endpoint:**
```bash
curl https://your-app-name.fly.dev/health
```

### **Test Session Creation:**
```bash
curl -X POST https://your-app-name.fly.dev/session/start \
  -H "Content-Type: application/json" \
  -H "key: your_secure_api_key" \
  -d '{"session": "test-session"}'
```

### **View Logs:**
```bash
# Real-time logs
flyctl logs -a your-app-name

# Last 100 lines
flyctl logs -a your-app-name --lines 100
```

---

## 🔧 Troubleshooting

### **Database Connection Issues:**
```bash
# Check database status
flyctl mysql status -a your-app-name-mysql

# Restart database
flyctl mysql restart -a your-app-name-mysql

# Check database logs
flyctl logs -a your-app-name-mysql
```

### **App Not Starting:**
```bash
# Check app status
flyctl status -a your-app-name

# Restart app
flyctl apps restart your-app-name

# View detailed logs
flyctl logs -a your-app-name --lines 200
```

### **Environment Variables:**
```bash
# List all secrets
flyctl secrets list -a your-app-name

# Update a secret
flyctl secrets set KEY=new_value -a your-app-name

# Delete a secret
flyctl secrets unset KEY -a your-app-name
```

---

## 📊 Monitoring & Management

### **Dashboard Access:**
```bash
# Open Fly.io dashboard in browser
flyctl dashboard -a your-app-name
```

### **Resource Usage:**
```bash
# Check resource usage
flyctl status -a your-app-name --all
```

### **Scale App:**
```bash
# Scale to 2 machines
flyctl scale count 2 -a your-app-name

# Scale memory
flyctl scale memory 512 -a your-app-name
```

---

## 💰 Cost Management

### **Free Tier Limits:**
- 3 VMs free forever
- 3GB persistent storage free
- 160GB outbound data transfer/month

### **Check Usage:**
```bash
# View current usage
flyctl orgs personal
```

---

## 🚀 Advanced Configuration

### **Custom Domain:**
```bash
# Add custom domain
flyctl certs add yourdomain.com -a your-app-name

# Add CNAME record:
# yourdomain.com → your-app-name.fly.dev
```

### **Persistent Storage:**
```bash
# Create volume for media files
flyctl volumes create media_data --size 1 -a your-app-name

# Mount in fly.toml:
[mounts]
  source="media_data"
  destination="/app/media"
```

---

## 🎯 Key Advantages of Fly.io for WhatsApp Gateway

✅ **No Spin-Down** - Always running (critical for WhatsApp)
✅ **Free MySQL** - Database included in free tier
✅ **Global Deployment** - Deploy close to your users
✅ **Docker Support** - Your Dockerfile works perfectly
✅ **Simple CLI** - Easy deployment and management
✅ **Auto HTTPS** - SSL certificates automatically
✅ **Scaling** - Easy to scale when needed

---

## 📝 Quick Reference Commands

```bash
# Deploy
flyctl deploy

# View logs
flyctl logs -a your-app-name

# Get app info
flyctl info -a your-app-name

# Set secrets
flyctl secrets set KEY=value -a your-app-name

# Restart app
flyctl apps restart your-app-name

# Open dashboard
flyctl dashboard -a your-app-name

# SSH into app
flyctl ssh console -a your-app-name
```

---

## 🎉 Success Indicators

When everything is working, you should see:

✅ **Deployment succeeds**
✅ **Health check returns 200**
✅ **Database connection established**
✅ **Logs show no errors**
✅ **App responds to API requests**

Your WhatsApp Gateway is now live on Fly.io! 🚀