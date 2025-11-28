# User Documents Schema Mapping

## 📋 Overview

The `user_documents` table exists in the database but has different column names than expected by the unified-settings-schema.sql. This document maps the existing columns to the expected schema.

---

## 🔄 Column Mapping

### **Existing Columns → Expected Columns**

| Existing Column | Expected Column | Action | Notes |
|----------------|-----------------|--------|-------|
| `doc_type` | `document_type` | **Add new, keep old** | Copy data from doc_type |
| `file_url` | `document_url` | **Add new, keep old** | Copy data from file_url |
| `uploaded_at` | `created_at` | **Add new, keep old** | Copy data from uploaded_at |
| `verification_notes` | `rejection_reason` | **Add new, keep old** | Copy when is_verified = false |
| `status` | `status` | **Already exists** | ✅ No change needed |
| `is_verified` | - | **Keep** | Used internally |
| `verified_at` | `verified_at` | **Already exists** | ✅ No change needed |

### **New Columns to Add**

| Column Name | Type | Default | Purpose |
|------------|------|---------|---------|
| `document_number` | VARCHAR(100) | NULL | ID/passport number |
| `verified_by` | UUID | NULL | Admin who verified |
| `issue_date` | DATE | NULL | Document issue date |
| `expiry_date` | DATE | NULL | Document expiry date |
| `is_expired` | BOOLEAN | FALSE | Auto-updated by trigger from expiry_date |
| `metadata` | JSONB | '{}' | Additional document metadata |
| `notes` | TEXT | NULL | Admin notes |
| `updated_at` | TIMESTAMP | NOW() | Last update timestamp |

---

## 🏗️ Current Table Structure

```sql
Columns (15 total):
1. id (uuid) - Primary key
2. user_id (uuid) - Foreign key to auth.users
3. doc_type (varchar) - Document type
4. file_name (text) - Original filename
5. file_size (integer) - File size in bytes
6. mime_type (varchar) - File MIME type
7. file_url (text) - Storage URL
8. is_verified (boolean) - Verification flag
9. verified_at (timestamp) - Verification timestamp
10. verification_notes (text) - Verification notes
11. uploaded_at (timestamp) - Upload timestamp
12. ocr_validation (jsonb) - OCR validation results
13. face_verification (jsonb) - Face match results
14. verification_status (varchar) - Verification status
15. status (varchar) - Document status
```

---

## ✅ Migration Strategy

### **Option 1: Add New Columns (Recommended)**

**Pros:**
- ✅ Preserves all existing data
- ✅ Maintains backward compatibility
- ✅ No downtime
- ✅ Can use both old and new column names

**Cons:**
- ⚠️ Table has duplicate columns (doc_type + document_type)
- ⚠️ Slightly larger table size

**Script:** `database/migrate-user-documents-schema.sql`

### **Option 2: Rename Columns**

**Pros:**
- ✅ Cleaner schema
- ✅ No duplicate columns
- ✅ Smaller table size

**Cons:**
- ❌ Breaks existing code using old column names
- ❌ Requires updating all queries
- ❌ Potential downtime

**Not recommended** unless you update all backend code first.

---

## 🚀 How to Migrate

### **Step 1: Run Migration Script**

```sql
-- File: database/migrate-user-documents-schema.sql
-- This adds new columns while preserving existing ones
```

### **Step 2: Verify Results**

After running the script, you should see:
```
✅ Added document_type column
✅ Added document_number column
✅ Added document_url column
✅ Added verified_by column
✅ Added rejection_reason column
✅ Added issue_date column
✅ Added expiry_date column
✅ Added is_expired computed column
✅ Added metadata column
✅ Added notes column
✅ Added created_at column
✅ Added updated_at column
```

### **Step 3: Update Backend Code**

Gradually update your backend to use new column names:

**Before:**
```javascript
const { data } = await supabase
    .from('user_documents')
    .select('doc_type, file_url, uploaded_at')
    .eq('user_id', userId);
```

**After:**
```javascript
const { data } = await supabase
    .from('user_documents')
    .select('document_type, document_url, created_at')
    .eq('user_id', userId);
```

### **Step 4: (Optional) Remove Old Columns**

Once all code is updated, you can remove old columns:

```sql
-- Only run this after updating ALL backend code!
ALTER TABLE public.user_documents DROP COLUMN doc_type;
ALTER TABLE public.user_documents DROP COLUMN file_url;
ALTER TABLE public.user_documents DROP COLUMN uploaded_at;
```

---

## 📊 Column Purpose Guide

### **Document Information**
- `document_type` / `doc_type` - Type of document (national_id, passport, etc.)
- `document_number` - ID/passport number for verification
- `document_url` / `file_url` - Where the file is stored
- `file_name` - Original filename
- `file_size` - File size in bytes
- `mime_type` - File type (image/jpeg, application/pdf, etc.)

### **Verification Status**
- `status` - Overall status (pending, verified, rejected, expired)
- `verification_status` - Detailed verification status
- `is_verified` - Boolean flag for quick checks
- `verified_by` - Admin who verified the document
- `verified_at` - When it was verified
- `rejection_reason` / `verification_notes` - Why rejected or notes

### **Document Validity**
- `issue_date` - When document was issued
- `expiry_date` - When document expires
- `is_expired` - Auto-calculated (expiry_date < today)

### **Advanced Verification**
- `ocr_validation` - OCR text extraction results
- `face_verification` - Face matching results
- `metadata` - Additional structured data
- `notes` - Free-form admin notes

### **Timestamps**
- `created_at` / `uploaded_at` - When uploaded
- `updated_at` - Last modification time

---

## 🔍 Why Two Sets of Columns?

The table was created with one naming convention (`doc_type`, `file_url`, etc.) but the unified schema uses different names (`document_type`, `document_url`, etc.). 

Rather than breaking existing code, we add the new columns and copy data over. This allows:
1. Old code to continue working
2. New code to use standard names
3. Gradual migration without downtime

---

## ✅ After Migration

Your table will have **both** old and new columns:

```
Old columns (preserved):
- doc_type, file_url, uploaded_at, verification_notes

New columns (added):
- document_type, document_url, created_at, rejection_reason

Plus new features:
- document_number, verified_by, issue_date, expiry_date, 
  is_expired, metadata, notes, updated_at
```

---

## 📝 Summary

**Current State:**
- Table exists with 15 columns
- Uses old naming convention
- Missing some expected columns

**After Migration:**
- Table has ~25 columns
- Supports both old and new names
- All expected columns present
- Backward compatible
- Ready for unified schema

**Next Steps:**
1. Run `migrate-user-documents-schema.sql`
2. Verify all columns added
3. Update backend code gradually
4. (Optional) Remove old columns later

---

**Document Version:** 1.0  
**Last Updated:** November 28, 2025  
**Status:** Migration Script Ready
