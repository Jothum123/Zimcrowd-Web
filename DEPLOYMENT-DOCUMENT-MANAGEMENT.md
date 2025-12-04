# Document Management System Deployment Guide

## Overview
This guide covers deploying the ZimCrowd document management system with Supabase backend.

## Prerequisites
- Supabase project with authentication already configured
- Admin access to Supabase dashboard
- Basic knowledge of SQL and Supabase Storage

## Step 1: Database Setup

### 1.1 Execute Activity Tracking Schema (REQUIRED FIRST)
```sql
-- Run this file FIRST in Supabase SQL Editor
-- File: database/activity-tracking.sql
```

### 1.2 Execute Document Management Schema
```sql
-- Run this file SECOND after activity-tracking.sql completes
-- File: database/document-management.sql
```

**IMPORTANT**: The document management schema depends on functions from activity-tracking.sql. Execute in the correct order.

## Step 2: Supabase Storage Setup

### 2.1 Create Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Click "Create new bucket"
3. Bucket name: `user-documents`
4. Public bucket: Yes
5. File size limit: 5MB (or as needed)

### 2.2 Configure Storage RLS Policies
```sql
-- Allow users to upload to their own folders
CREATE POLICY "Users can upload their own documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to read their own documents
CREATE POLICY "Users can read their own documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'user-documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow admins to read all documents
CREATE POLICY "Admins can read all documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'user-documents' AND
        EXISTS (
            SELECT 1 FROM admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- Allow admins to update all documents
CREATE POLICY "Admins can update all documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'user-documents' AND
        EXISTS (
            SELECT 1 FROM admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );
```

## Step 3: Database Functions Verification

### 3.1 Test Core Functions
```sql
-- Test document upload function
SELECT upload_user_document(
    'YOUR_USER_ID_HERE',
    'kyc_id',
    'test-document.jpg',
    'test-user/kyc_id/test-document.jpg',
    1024000,
    'image/jpeg'
);

-- Test document summary function
SELECT * FROM get_user_document_summary('YOUR_USER_ID_HERE');
```

## Step 4: Frontend Integration

### 4.1 Verify Script Loading
Ensure these scripts are loaded in dashboard.html (in this order):
```html
<script src="js/supabase-config.js"></script>
<script src="js/test-notifications.js"></script>
<script src="js/document-management.js"></script>
```

### 4.2 Check HTML Elements
Verify these elements exist in dashboard.html:
```html
<!-- Verification Badge -->
<div class="verification-badge" id="verification-badge" style="display: none;">
    <i class="fas fa-exclamation-circle"></i> Not Verified
</div>
```

## Step 5: Testing Checklist

### 5.1 User Authentication
- [ ] User can log in successfully
- [ ] Verification badge appears with "Not Verified" status
- [ ] Badge is clickable and opens document center

### 5.2 Document Upload
- [ ] Document center modal opens correctly
- [ ] Drag and drop works for files
- [ ] File type validation (JPG, PNG, PDF only)
- [ ] File size validation (5MB max)
- [ ] Upload progress shows correctly
- [ ] Documents appear in list after upload

### 5.3 Verification Status
- [ ] Badge changes to "Pending" after upload
- [ ] Status updates every 30 seconds
- [ ] Admin can approve/reject documents
- [ ] Badge changes to "Verified" after approval

## Step 6: Common Issues & Solutions

### 6.1 Storage Permission Errors
**Error**: `new row violates row-level security policy`
**Solution**: Check storage RLS policies and ensure user ID matches folder structure

### 6.2 Database Function Errors
**Error**: `function log_user_activity does not exist`
**Solution**: Run activity-tracking.sql before document-management.sql

### 6.3 Badge Not Displaying
**Error**: Verification badge not visible
**Solution**: Check browser console for JavaScript errors and verify Supabase connection

### 6.4 Upload Failures
**Error**: Files not uploading
**Solution**: 
1. Check storage bucket exists
2. Verify RLS policies
3. Check network connection
4. Verify Supabase keys in supabase-config.js

## Step 7: Production Considerations

### 7.1 Security
- [ ] Enable RLS on all tables
- [ ] Use environment variables for Supabase keys
- [ ] Implement rate limiting for uploads
- [ ] Add virus scanning for uploaded files

### 7.2 Performance
- [ ] Enable CDN for storage
- [ ] Implement image compression
- [ ] Add caching for document lists
- [ ] Monitor storage usage

### 7.3 Monitoring
- [ ] Set up error tracking
- [ ] Monitor upload success rates
- [ ] Track verification completion times
- [ ] Set up alerts for storage limits

## Step 8: Admin Setup (Optional but Recommended)

### 8.1 Admin User Table
The system assumes an `admin_users` table exists. Create it if needed:
```sql
CREATE TABLE admin_users (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 8.2 Admin Dashboard
Deploy the admin approval interface (see admin-document-approval.html)

## Support

For deployment issues:
1. Check browser console for JavaScript errors
2. Verify Supabase connection in Network tab
3. Check Supabase logs for SQL errors
4. Ensure all SQL files executed in correct order

## Next Steps

After successful deployment:
1. Test with real user accounts
2. Train admin users on approval process
3. Set up monitoring and alerts
4. Document user workflows
5. Plan for scaling storage needs
