# Production Deployment Checklist - Post-Registration System

## 🚨 CRITICAL STEP 1: Database Schema Deployment (DO THIS FIRST)

### 1.1 Run SQL Schema in Supabase
- [ ] Run `database/document-management-final.sql` in Supabase SQL Editor
- [ ] Verify all tables created successfully
- [ ] Confirm `verification_documents` table references `auth.users(id)` (fixed foreign key)
- [ ] Test `upload_user_document()` function works
- [ ] Test `get_user_document_summary()` function works

### 1.2 Verify Storage Bucket
- [ ] Confirm `user-documents` storage bucket exists in Supabase
- [ ] Verify RLS policies allow authenticated users to upload
- [ ] Test file upload permissions with a test file

### 1.3 Database Health Check
```sql
-- Run this after deployment to verify everything works
SELECT COUNT(*) as tables_created FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_documents', 'document_types', 'verification_documents');

-- Test foreign key constraint
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'verification_documents' AND column_name = 'user_id';
```

## 🚨 CRITICAL STEP 2: End-to-End Testing (BEFORE FRONTEND DEPLOY)

### 2.1 Test Document Upload Flow
- [ ] Test upload with primary API working
- [ ] Test upload with API failure (fallback activation)
- [ ] Verify user sees "Using Backup Upload System" notification
- [ ] Confirm documents saved to `verification_documents` table
- [ ] Test file validation (size, type restrictions)

### 2.2 Test Complete Registration Flow
- [ ] Test full post-registration process end-to-end
- [ ] Verify no foreign key constraint errors
- [ ] Confirm user can complete registration even if external API fails
- [ ] Test error handling and user notifications

## 🚨 STEP 3: Frontend Deployment

### 3.1 Commit and Push Changes
```bash
git add .
git commit -m "Deploy post-registration system with Supabase fallback and fixed database constraints"
git push origin main
```

### 3.2 Verify Deployment
- [ ] Confirm frontend files deployed to production
- [ ] Test post-registration page loads correctly
- [ ] Verify Supabase client loads properly
- [ ] Test notification system works

## 🚨 STEP 4: Production Monitoring

### 4.1 Monitor Fallback Activation
- [ ] Set up monitoring for "Using Backup Upload System" notifications
- [ ] Track external API failure rates
- [ ] Monitor document upload success rates
- [ ] Alert on high fallback usage (indicates API issues)

### 4.2 User Experience Monitoring
- [ ] Monitor registration completion rates
- [ ] Track document upload failures
- [ ] Monitor database constraint errors
- [ ] Set up alerts for registration blocking issues

## 🚨 ROLLBACK PLAN

### If Issues Occur:
1. **Database Issues**: Immediately restore previous database schema
2. **Frontend Issues**: Revert to previous commit
3. **API Issues**: Fallback system should handle automatically
4. **Storage Issues**: Check Supabase storage permissions and RLS policies

## 🚨 SUCCESS CRITERIA

### Must Have:
- [ ] No foreign key constraint errors
- [ ] Users can complete registration even if external API fails
- [ ] Fallback system activates seamlessly
- [ ] User notifications work properly
- [ ] Documents stored securely in Supabase

### Nice to Have:
- [ ] OCR processing works with primary API
- [ ] Fast upload speeds
- [ ] Good user experience with progress indicators
- [ ] Comprehensive error logging

## 🚨 POST-DEPLOYMENT VALIDATION

### Test Scenarios:
1. **Happy Path**: External API working, all documents uploaded successfully
2. **API Failure**: External API down, fallback system activates, registration completes
3. **Partial Failure**: Some documents upload via API, others via fallback
4. **Error Recovery**: User can retry failed uploads
5. **File Validation**: Large files and invalid types are rejected properly

## 🚨 CONTACTS & ESCALATION

- **Database Issues**: Contact Supabase support
- **API Issues**: Check zimcrowd-api.onrender.com status
- **Storage Issues**: Verify Supabase storage configuration
- **Frontend Issues**: Check deployment logs and rollback if needed
