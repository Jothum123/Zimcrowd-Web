# Remove zimcrowd.com from GitHub Pages

## Current Issue
GitHub Pages is configured to use your custom domain `zimcrowd.com`, which is causing conflicts.

## Steps to Remove

### 1. Remove Custom Domain from GitHub Pages

1. Go to: https://github.com/Jothum123/Zimcrowd-Web/settings/pages
2. Find "Custom domain" section
3. Clear the text box (remove `zimcrowd.com`)
4. Click "Save"
5. Under "Source", select "None"
6. Click "Save" again

### 2. Delete CNAME File (if exists)

Check if you have a `CNAME` file in your repository:

```bash
# Check if CNAME file exists
ls CNAME

# If it exists, delete it
git rm CNAME
git commit -m "Remove CNAME for GitHub Pages"
git push gitlab main
```

### 3. Update DNS Records

**Current DNS (GitHub Pages):**
```
A Record: @ → 185.199.108.153 (GitHub)
CNAME: www → jothum123.github.io
```

**Option A: Point to Vercel (Recommended)**
```
A Record: @ → 76.76.21.21
CNAME: www → cname.vercel-dns.com
```

**Option B: Point to GitLab Pages**
```
A Record: @ → 35.185.44.232
CNAME: www → jchitewe-group.gitlab.io
```

### 4. Configure Custom Domain on New Platform

**For Vercel:**
1. Go to your Vercel project
2. Settings → Domains
3. Add `zimcrowd.com` and `www.zimcrowd.com`
4. Follow DNS instructions

**For GitLab Pages:**
1. Go to: https://gitlab.com/jchitewe-group/Zimcrowd-Web/-/settings/pages
2. Click "New Domain"
3. Enter `zimcrowd.com`
4. Follow verification steps

## Verification

After changes:

1. **Check GitHub Pages:**
   - Should show "GitHub Pages is currently disabled"
   - Custom domain field should be empty

2. **Check DNS propagation:**
   ```
   nslookup zimcrowd.com
   ```
   Should NOT point to GitHub IPs

3. **Wait 24-48 hours** for full DNS propagation

## Important Notes

- DNS changes can take up to 48 hours to propagate globally
- Clear browser cache after DNS changes
- Use incognito mode to test
- Check https://dnschecker.org to verify DNS propagation

## Current Recommended Setup

**Domain:** zimcrowd.com
**Frontend:** Vercel or GitLab Pages
**Backend:** Vercel (already set up)
**Database:** Supabase

**NOT using:**
- ❌ GitHub Pages (disabled)
