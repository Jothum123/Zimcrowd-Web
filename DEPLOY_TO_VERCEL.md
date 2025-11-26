# Deploy ZimCrowd Frontend to Vercel

## Quick Deploy via Dashboard

### Step 1: Import Repository

1. Go to: https://vercel.com/new
2. Click "Import Git Repository"
3. Connect GitLab if not already connected
4. Select: `jchitewe-group/Zimcrowd-Web`
5. Click "Import"

### Step 2: Configure Project

```
Project Name: zimcrowd-web
Framework: Other
Root Directory: ./
Build Command: (leave empty)
Output Directory: (leave empty)
```

### Step 3: Deploy

1. Click "Deploy"
2. Wait 2-3 minutes
3. Your site will be live at: `zimcrowd-web.vercel.app`

### Step 4: Add Custom Domain

1. Go to project Settings → Domains
2. Add `zimcrowd.com`
3. Add `www.zimcrowd.com`
4. Vercel will show DNS records to add

### Step 5: Update DNS at Your Registrar

Add these records at your domain registrar:

```dns
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Step 6: Wait for SSL

- SSL certificate generates automatically
- Takes 5-10 minutes after DNS propagates
- Your site will be live at: https://zimcrowd.com

---

## Deploy via Vercel CLI (Alternative)

### Install Vercel CLI

```bash
npm install -g vercel
```

### Login to Vercel

```bash
vercel login
```

### Deploy

```bash
# Navigate to project directory
cd "C:\Users\Bruce M\Desktop\Zimcrowd-Web"

# Deploy to Vercel
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? zimcrowd-web
# - Directory? ./
# - Override settings? No

# Deploy to production
vercel --prod
```

### Add Domain via CLI

```bash
vercel domains add zimcrowd.com
vercel domains add www.zimcrowd.com
```

---

## What Gets Deployed

Your `vercel.json` configuration will deploy:

### Frontend Files:
- ✅ index.html
- ✅ dashboard.html
- ✅ login.html, signup.html
- ✅ All HTML pages
- ✅ js/ directory (all JavaScript)
- ✅ css/ directory (all stylesheets)
- ✅ assets/ directory (images, fonts)
- ✅ images/ directory

### Backend Files:
- ✅ backend-server.js
- ✅ routes/ directory
- ✅ services/ directory
- ✅ config/ directory
- ✅ utils/ directory

### Routes:
- ✅ `/` → index.html
- ✅ `/dashboard.html` → dashboard
- ✅ `/api/*` → backend-server.js
- ✅ `/js/*` → JavaScript files
- ✅ `/css/*` → Stylesheets
- ✅ `/assets/*` → Static assets

---

## Verify Deployment

### Check Deployment Status

1. Go to: https://vercel.com/dashboard
2. Click your project
3. Check "Deployments" tab
4. Latest deployment should show "Ready"

### Test Your Site

```
https://zimcrowd-web.vercel.app → Preview URL
https://zimcrowd.com → Custom domain (after DNS)
```

### Test API Endpoints

```
https://zimcrowd.com/api/health
https://zimcrowd.com/api/wallet/balance
```

---

## Environment Variables

If your frontend needs API configuration:

### Add in Vercel Dashboard:

1. Settings → Environment Variables
2. Add:

```
Name: NEXT_PUBLIC_API_URL
Value: https://zimcrowd.com/api

Name: SUPABASE_URL
Value: your-supabase-url

Name: SUPABASE_ANON_KEY
Value: your-supabase-anon-key
```

### Or via CLI:

```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter value: https://zimcrowd.com/api

vercel env add SUPABASE_URL production
# Enter value: your-supabase-url
```

---

## Troubleshooting

### Deployment Failed

**Check:**
- Vercel build logs
- vercel.json syntax
- File paths are correct

**Fix:**
- Review error message
- Check vercel.json configuration
- Ensure all files are committed

### 404 Errors

**Check:**
- File paths in vercel.json
- Routes configuration
- Static files are included

**Fix:**
- Update vercel.json routes
- Ensure files are in root directory
- Check file extensions

### API Not Working

**Check:**
- backend-server.js exists
- Routes are configured
- Environment variables set

**Fix:**
- Verify API routes in vercel.json
- Check backend-server.js
- Add missing environment variables

### Domain Not Working

**Check:**
- DNS records are correct
- DNS has propagated (24-48 hours)
- SSL certificate generated

**Fix:**
- Verify DNS at registrar
- Wait for propagation
- Check https://dnschecker.org

---

## Post-Deployment

### Update API Configuration

If you have hardcoded API URLs, update them:

**In js/api-config-new.js:**
```javascript
const API_BASE_URL = 'https://zimcrowd.com/api';
```

### Test All Features

- [ ] Home page loads
- [ ] Login/signup works
- [ ] Dashboard accessible
- [ ] API calls work
- [ ] Payments functional
- [ ] Images load
- [ ] Styles applied

### Monitor Performance

1. Vercel Dashboard → Analytics
2. Check response times
3. Monitor errors
4. Review logs

---

## Continuous Deployment

### Automatic Deployments

Vercel will auto-deploy when you push to GitLab:

```bash
git add -A
git commit -m "Update site"
git push gitlab main
```

Vercel automatically:
1. Detects push
2. Builds project
3. Deploys to production
4. Updates live site

### Manual Deployment

Via dashboard:
1. Go to Deployments
2. Click "Redeploy"

Via CLI:
```bash
vercel --prod
```

---

## DNS Configuration

### At Your Domain Registrar

**For Namecheap:**
1. Login → Domain List
2. Click "Manage" next to zimcrowd.com
3. Advanced DNS
4. Add records

**For GoDaddy:**
1. Login → My Products
2. DNS → Manage Zones
3. Add records

**For Cloudflare:**
1. Login → Select domain
2. DNS → Records
3. Add records

### Records to Add

```dns
Type: A
Name: @
Value: 76.76.21.21
TTL: Automatic

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Automatic
```

### Remove Old Records

Delete these if they exist:
- Old GitHub Pages A records
- Old GitHub Pages CNAME
- Any conflicting records

---

## Final Checklist

- [ ] Repository imported to Vercel
- [ ] Project deployed successfully
- [ ] Custom domains added
- [ ] DNS records updated
- [ ] SSL certificate generated
- [ ] Site accessible at zimcrowd.com
- [ ] API endpoints working
- [ ] All pages loading correctly
- [ ] Images and assets loading
- [ ] Authentication working
- [ ] Payments functional

---

## Support

**Vercel Documentation:**
- https://vercel.com/docs

**Check Deployment:**
- https://vercel.com/dashboard

**DNS Help:**
- https://vercel.com/docs/concepts/projects/custom-domains

**Need Help?**
- Vercel Support: https://vercel.com/support
- Check deployment logs
- Review error messages

---

## Summary

**Quick Steps:**
1. Go to vercel.com/new
2. Import GitLab repo
3. Click Deploy
4. Add domains
5. Update DNS
6. Wait for SSL
7. Done! 🎉

**Result:**
- ✅ Frontend + Backend on Vercel
- ✅ Custom domain: zimcrowd.com
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Auto-deployments from GitLab

Your site will be live at https://zimcrowd.com! 🚀
