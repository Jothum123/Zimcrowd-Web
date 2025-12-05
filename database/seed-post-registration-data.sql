/**
 * Comprehensive Post-Registration Data Seeding Script
 * Creates realistic test users at different stages of the post-registration journey
 * Includes documents, verification data, employment history, and loan applications
 */

-- =====================================================
-- CLEAN UP EXISTING TEST DATA (Optional)
-- =====================================================

-- Clean up existing post-registration test data
-- DELETE FROM user_documents WHERE user_id LIKE 'postreg-%';
-- DELETE FROM profile_flags WHERE user_id LIKE 'postreg-%';
-- DELETE FROM loan_applications WHERE user_id LIKE 'postreg-%';
-- DELETE FROM profiles WHERE id LIKE '11111111-%';

-- =====================================================
-- STAGE 1: NEWLY REGISTERED USERS (Just completed basic registration)
-- =====================================================

-- User 1: Just registered - no documents uploaded yet
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    id_number,
    address,
    city,
    country,
    employment_status,
    employer_type,
    job_title,
    employer_name,
    monthly_income,
    bank_name,
    account_number,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111'::UUID,
    'new.user1@example.com',
    'James',
    'Moyo',
    '+263712345678',
    '1990-05-15',
    '45-123456-A-12',
    '123 First Street, Avondale',
    'Harare',
    'Zimbabwe',
    'employed',
    'private',
    'Software Developer',
    'Tech Solutions Zimbabwe',
    2500.00,
    'CBZ Bank',
    '1234567890',
    CURRENT_TIMESTAMP - INTERVAL '2 days',  -- Just registered 2 days ago
    CURRENT_TIMESTAMP - INTERVAL '2 days'
) ON CONFLICT (id) DO NOTHING;

-- User 2: Just registered - government employee
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    id_number,
    address,
    city,
    country,
    employment_status,
    employer_type,
    job_title,
    employer_name,
    monthly_income,
    bank_name,
    account_number,
    ec_number,
    created_at,
    updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222222'::UUID,
    'gov.user2@example.com',
    'Sarah',
    'Chikowore',
    '+263712345679',
    '1985-08-22',
    '63-987654-B-45',
    '456 Government Ave, Milton Park',
    'Harare',
    'Zimbabwe',
    'employed',
    'government',
    'Senior Administrator',
    'Ministry of Finance',
    1800.00,
    'Steward Bank',
    '9876543210',
    'GOV2024001',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STAGE 2: DOCUMENTS UPLOADED (Documents submitted, pending verification)
-- =====================================================

-- User 3: Documents uploaded - pending verification
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    id_number,
    address,
    city,
    country,
    employment_status,
    employer_type,
    job_title,
    employer_name,
    monthly_income,
    bank_name,
    account_number,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333'::UUID,
    'docs.pending@example.com',
    'Michael',
    'Ncube',
    '+263712345680',
    '1988-03-10',
    '21-456789-C-78',
    '789 Borrowdale Road, Borrowdale',
    'Harare',
    'Zimbabwe',
    'employed',
    'private',
    'Marketing Manager',
    'Creative Agency Zimbabwe',
    2200.00,
    'Ecobank',
    '5555666677',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
) ON CONFLICT (id) DO NOTHING;

-- Upload documents for User 3
INSERT INTO user_documents (
    user_id,
    document_type,
    document_name,
    file_path,
    file_size,
    file_type,
    upload_status,
    verification_status,
    upload_date,
    metadata
) VALUES 
-- ID Front
(
    '33333333-3333-3333-3333-333333333333'::UUID,
    'national_id_front',
    'michael_ncube_id_front.jpg',
    'uploads/documents/postreg-33333333-3333-3333-3333-333333333333/id_front_20231201.jpg',
    245760,
    'image/jpeg',
    'uploaded',
    'pending',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    '{"ocr_confidence": 0.95, "extracted_name": "Michael Ncube", "extracted_id": "21-456789-C-78"}'::JSONB
),
-- ID Back
(
    '33333333-3333-3333-3333-333333333333'::UUID,
    'national_id_back',
    'michael_ncube_id_back.jpg',
    'uploads/documents/postreg-33333333-3333-3333-3333-333333333333/id_back_20231201.jpg',
    198656,
    'image/jpeg',
    'uploaded',
    'pending',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    '{"ocr_confidence": 0.92, "extracted_dob": "1988-03-10", "extracted_address": "789 Borrowdale Road"}'::JSONB
),
-- Bank Statement
(
    '33333333-3333-3333-3333-333333333333'::UUID,
    'bank_statement',
    'michael_ncube_bank_statement.pdf',
    'uploads/documents/postreg-33333333-3333-3333-3333-333333333333/bank_statement_20231201.pdf',
    524288,
    'application/pdf',
    'uploaded',
    'pending',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    '{"ocr_confidence": 0.88, "estimated_monthly_income": 2150, "account_number": "****6677", "bank_name": "Ecobank"}'::JSONB
),
-- Payslip
(
    '33333333-3333-3333-3333-333333333333'::UUID,
    'payslip',
    'michael_ncube_payslip.pdf',
    'uploads/documents/postreg-33333333-3333-3333-3333-333333333333/payslip_20231201.pdf',
    393216,
    'application/pdf',
    'uploaded',
    'pending',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    '{"ocr_confidence": 0.91, "net_salary": 2200, "gross_salary": 2800, "employer": "Creative Agency Zimbabwe"}'::JSONB
) ON CONFLICT DO NOTHING;

-- =====================================================
-- STAGE 3: DOCUMENTS VERIFIED (Documents approved, ready for salary verification)
-- =====================================================

-- User 4: Documents verified - salary verification pending
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    id_number,
    address,
    city,
    country,
    employment_status,
    employer_type,
    job_title,
    employer_name,
    monthly_income,
    bank_name,
    account_number,
    created_at,
    updated_at
) VALUES (
    '44444444-4444-4444-4444-444444444444'::UUID,
    'docs.verified@example.com',
    'Lisa',
    'Makoni',
    '+263712345681',
    '1992-11-28',
    '54-321654-D-89',
    '321 Samora Machel Ave, CBD',
    'Harare',
    'Zimbabwe',
    'employed',
    'private',
    'Financial Analyst',
    'Zimbabwe Financial Services',
    3000.00,
    'FBC Bank',
    '9999888877',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '7 days'
) ON CONFLICT (id) DO NOTHING;

-- Upload and verify documents for User 4
INSERT INTO user_documents (
    user_id,
    document_type,
    document_name,
    file_path,
    file_size,
    file_type,
    upload_status,
    verification_status,
    upload_date,
    verified_date,
    verified_by,
    metadata
) VALUES 
-- ID Front (Verified)
(
    '44444444-4444-4444-4444-444444444444'::UUID,
    'national_id_front',
    'lisa_makoni_id_front.jpg',
    'uploads/documents/postreg-44444444-4444-4444-4444-444444444444/id_front_20231128.jpg',
    262144,
    'image/jpeg',
    'uploaded',
    'verified',
    CURRENT_TIMESTAMP - INTERVAL '8 days',
    CURRENT_TIMESTAMP - INTERVAL '7 days',
    'admin-user-uuid',  -- This would be an admin user ID
    '{"ocr_confidence": 0.97, "extracted_name": "Lisa Makoni", "extracted_id": "54-321654-D-89"}'::JSONB
),
-- ID Back (Verified)
(
    '44444444-4444-4444-4444-444444444444'::UUID,
    'national_id_back',
    'lisa_makoni_id_back.jpg',
    'uploads/documents/postreg-44444444-4444-4444-4444-444444444444/id_back_20231128.jpg',
    204800,
    'image/jpeg',
    'uploaded',
    'verified',
    CURRENT_TIMESTAMP - INTERVAL '8 days',
    CURRENT_TIMESTAMP - INTERVAL '7 days',
    'admin-user-uuid',
    '{"ocr_confidence": 0.94, "extracted_dob": "1992-11-28", "extracted_address": "321 Samora Machel Ave"}'::JSONB
),
-- Bank Statement (Verified)
(
    '44444444-4444-4444-4444-444444444444'::UUID,
    'bank_statement',
    'lisa_makoni_bank_statement.pdf',
    'uploads/documents/postreg-44444444-4444-4444-4444-444444444444/bank_statement_20231128.pdf',
    589824,
    'application/pdf',
    'uploaded',
    'verified',
    CURRENT_TIMESTAMP - INTERVAL '7 days',
    CURRENT_TIMESTAMP - INTERVAL '6 days',
    'admin-user-uuid',
    '{"ocr_confidence": 0.91, "estimated_monthly_income": 2950, "account_number": "****8877", "bank_name": "FBC Bank"}'::JSONB
),
-- Payslip (Verified)
(
    '44444444-4444-4444-4444-444444444444'::UUID,
    'payslip',
    'lisa_makoni_payslip.pdf',
    'uploads/documents/postreg-44444444-4444-4444-4444-444444444444/payslip_20231128.pdf',
    458752,
    'application/pdf',
    'uploaded',
    'verified',
    CURRENT_TIMESTAMP - INTERVAL '7 days',
    CURRENT_TIMESTAMP - INTERVAL '6 days',
    'admin-user-uuid',
    '{"ocr_confidence": 0.93, "net_salary": 3000, "gross_salary": 3800, "employer": "Zimbabwe Financial Services"}'::JSONB
),
-- Proof of Residence (Verified)
(
    '44444444-4444-4444-4444-444444444444'::UUID,
    'proof_of_residence',
    'lisa_makoni_utility_bill.pdf',
    'uploads/documents/postreg-44444444-4444-4444-4444-444444444444/utility_bill_20231128.pdf',
    393216,
    'application/pdf',
    'uploaded',
    'verified',
    CURRENT_TIMESTAMP - INTERVAL '7 days',
    CURRENT_TIMESTAMP - INTERVAL '6 days',
    'admin-user-uuid',
    '{"utility_type": "electricity", "account_holder": "Lisa Makoni", "address": "321 Samora Machel Ave, CBD"}'::JSONB
) ON CONFLICT DO NOTHING;

-- =====================================================
-- STAGE 4: SALARY VERIFICATION COMPLETED (Fully verified, ready for loans)
-- =====================================================

-- User 5: Fully verified private sector employee
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    id_number,
    address,
    city,
    country,
    employment_status,
    employer_type,
    job_title,
    employer_name,
    monthly_income,
    verified_net_salary,
    salary_verified_at,
    ocr_bank_salary,
    ocr_payslip_salary,
    bank_name,
    account_number,
    created_at,
    updated_at
) VALUES (
    '55555555-5555-5555-5555-555555555555'::UUID,
    'fully.verified@example.com',
    'David',
    'Katsande',
    '+263712345682',
    '1987-07-15',
    '12-789012-E-34',
    '555 Highlands, Greendale',
    'Harare',
    'Zimbabwe',
    'employed',
    'private',
    'Senior Engineer',
    'Engineering Solutions Ltd',
    3500.00,
    3500.00,
    CURRENT_TIMESTAMP - INTERVAL '20 days',  -- Salary verified 20 days ago
    3450.00,  -- Bank OCR (slight difference)
    3500.00,  -- Payslip OCR (matches)
    'Stanbic Bank',
    '1111222233',
    CURRENT_TIMESTAMP - INTERVAL '25 days',
    CURRENT_TIMESTAMP - INTERVAL '20 days'
) ON CONFLICT (id) DO NOTHING;

-- Documents for User 5 (All verified)
INSERT INTO user_documents (
    user_id,
    document_type,
    document_name,
    file_path,
    file_size,
    file_type,
    upload_status,
    verification_status,
    upload_date,
    verified_date,
    metadata
) VALUES 
(
    '55555555-5555-5555-5555-555555555555'::UUID,
    'national_id_front',
    'david_katsande_id_front.jpg',
    'uploads/documents/postreg-55555555-5555-5555-5555-555555555555/id_front_20231115.jpg',
    286720,
    'image/jpeg',
    'uploaded',
    'verified',
    CURRENT_TIMESTAMP - INTERVAL '23 days',
    CURRENT_TIMESTAMP - INTERVAL '22 days',
    '{"ocr_confidence": 0.96, "extracted_name": "David Katsande", "extracted_id": "12-789012-E-34"}'::JSONB
),
(
    '55555555-5555-5555-5555-555555555555'::UUID,
    'bank_statement',
    'david_katsande_bank_statement.pdf',
    'uploads/documents/postreg-55555555-5555-5555-5555-555555555555/bank_statement_20231115.pdf',
    655360,
    'application/pdf',
    'uploaded',
    'verified',
    CURRENT_TIMESTAMP - INTERVAL '21 days',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    '{"ocr_confidence": 0.92, "estimated_monthly_income": 3450, "account_number": "****2233", "bank_name": "Stanbic Bank"}'::JSONB
),
(
    '55555555-5555-5555-5555-555555555555'::UUID,
    'payslip',
    'david_katsande_payslip.pdf',
    'uploads/documents/postreg-55555555-5555-5555-5555-555555555555/payslip_20231115.pdf',
    524288,
    'application/pdf',
    'uploaded',
    'verified',
    CURRENT_TIMESTAMP - INTERVAL '21 days',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    '{"ocr_confidence": 0.94, "net_salary": 3500, "gross_salary": 4500, "employer": "Engineering Solutions Ltd"}'::JSONB
) ON CONFLICT DO NOTHING;

-- User 6: Fully verified government employee
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    id_number,
    address,
    city,
    country,
    employment_status,
    employer_type,
    job_title,
    employer_name,
    monthly_income,
    verified_net_salary,
    salary_verified_at,
    ocr_bank_salary,
    ocr_payslip_salary,
    bank_name,
    account_number,
    ec_number,
    created_at,
    updated_at
) VALUES (
    '66666666-6666-6666-6666-666666666666'::UUID,
    'gov.verified@example.com',
    'Grace',
    'Mudzongo',
    '+263712345683',
    '1983-09-20',
    '71-567890-F-56',
    '888 Kuwadzana Extension, Kuwadzana',
    'Harare',
    'Zimbabwe',
    'employed',
    'government',
    'Department Director',
    'Ministry of Health',
    2500.00,
    2500.00,
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    2480.00,  -- Bank OCR
    2500.00,  -- Payslip OCR
    'Agribank',
    '7777888899',
    'GOV2024002',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days'
) ON CONFLICT (id) DO NOTHING;

-- Documents for User 6 (Government employee)
INSERT INTO user_documents (
    user_id,
    document_type,
    document_name,
    file_path,
    file_size,
    file_type,
    upload_status,
    verification_status,
    upload_date,
    verified_date,
    metadata
) VALUES 
(
    '66666666-6666-6666-6666-666666666666'::UUID,
    'national_id_front',
    'grace_mudzongo_id_front.jpg',
    'uploads/documents/postreg-66666666-6666-6666-6666-666666666666/id_front_20231120.jpg',
    294912,
    'image/jpeg',
    'uploaded',
    'verified',
    CURRENT_TIMESTAMP - INTERVAL '18 days',
    CURRENT_TIMESTAMP - INTERVAL '17 days',
    '{"ocr_confidence": 0.98, "extracted_name": "Grace Mudzongo", "extracted_id": "71-567890-F-56"}'::JSONB
),
(
    '66666666-6666-6666-6666-666666666666'::UUID,
    'payslip',
    'grace_mudzongo_payslip.pdf',
    'uploads/documents/postreg-66666666-6666-6666-6666-666666666666/government_payslip_20231120.pdf',
    655360,
    'application/pdf',
    'uploaded',
    'verified',
    CURRENT_TIMESTAMP - INTERVAL '16 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    '{"ocr_confidence": 0.95, "net_salary": 2500, "gross_salary": 3200, "employer": "Ministry of Health", "grade": "Director"}'::JSONB
),
(
    '66666666-6666-6666-6666-666666666666'::UUID,
    'employment_confirmation',
    'grace_mudzongo_employment_letter.pdf',
    'uploads/documents/postreg-66666666-6666-6666-6666-666666666666/employment_confirmation_20231120.pdf',
    786432,
    'application/pdf',
    'uploaded',
    'verified',
    CURRENT_TIMESTAMP - INTERVAL '16 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    '{"employer": "Ministry of Health", "position": "Department Director", "start_date": "2015-03-01"}'::JSONB
) ON CONFLICT DO NOTHING;

-- =====================================================
-- STAGE 5: LOAN APPLICATIONS (Users with loans in different stages)
-- =====================================================

-- Create loan_applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS loan_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    loan_amount DECIMAL(10,2) NOT NULL,
    loan_term INTEGER NOT NULL,
    purpose TEXT NOT NULL,
    verified_salary DECIMAL(10,2) NOT NULL,
    dtni_calculation JSONB NOT NULL,
    salary_verified_at TIMESTAMP WITH TIME ZONE NOT NULL,
    validation_warnings JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for loan applications
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;

-- Loan for User 5 (Approved)
INSERT INTO loan_applications (
    user_id,
    loan_amount,
    loan_term,
    purpose,
    verified_salary,
    dtni_calculation,
    salary_verified_at,
    status,
    created_at,
    updated_at
) VALUES (
    '55555555-5555-5555-5555-555555555555'::UUID,
    1000.00,
    6,
    'Home renovation project',
    3500.00,
    jsonb_build_object(
        'max_installment', 1155.00,  -- 33% of 3500
        'available_installment', 1155.00,
        'dtni_limit', 6780.50,
        'dtni_method', 'PERCENTAGE_33'
    ),
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    'approved',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '8 days'
) ON CONFLICT DO NOTHING;

-- Loan for User 6 (Pending)
INSERT INTO loan_applications (
    user_id,
    loan_amount,
    loan_term,
    purpose,
    verified_salary,
    dtni_calculation,
    salary_verified_at,
    status,
    created_at,
    updated_at
) VALUES (
    '66666666-6666-6666-6666-666666666666'::UUID,
    800.00,
    3,
    'Emergency medical expenses',
    2500.00,
    jsonb_build_object(
        'max_installment', 2430.00,  -- 2500 - 70 buffer
        'available_installment', 2430.00,
        'dtni_limit', 7185.20,
        'dtni_method', 'GOVERNMENT_BUFFER'
    ),
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    'pending',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- STAGE 6: EDGE CASES & PROBLEM SCENARIOS
-- =====================================================

-- User 7: Documents rejected - needs to re-upload
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    id_number,
    address,
    city,
    country,
    employment_status,
    employer_type,
    job_title,
    employer_name,
    monthly_income,
    bank_name,
    account_number,
    created_at,
    updated_at
) VALUES (
    '77777777-7777-7777-7777-777777777777'::UUID,
    'docs.rejected@example.com',
    'Peter',
    'Matanda',
    '+263712345684',
    '1991-12-03',
    '89-234567-G-90',
    '200 Chitungwiza Road, Chitungwiza',
    'Chitungwiza',
    'Zimbabwe',
    'employed',
    'private',
    'Sales Representative',
    'Zimbabwe Sales Corp',
    1800.00,
    'NMB Bank',
    '3333444455',
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_TIMESTAMP - INTERVAL '25 days'
) ON CONFLICT (id) DO NOTHING;

-- Rejected documents for User 7
INSERT INTO user_documents (
    user_id,
    document_type,
    document_name,
    file_path,
    file_size,
    file_type,
    upload_status,
    verification_status,
    upload_date,
    verified_date,
    rejection_reason,
    metadata
) VALUES 
-- ID Front (Rejected - blurry)
(
    '77777777-7777-7777-7777-777777777777'::UUID,
    'national_id_front',
    'peter_matanda_id_front_blurry.jpg',
    'uploads/documents/postreg-77777777-7777-7777-7777-777777777777/id_front_blurry_20231105.jpg',
    327680,
    'image/jpeg',
    'uploaded',
    'rejected',
    CURRENT_TIMESTAMP - INTERVAL '28 days',
    CURRENT_TIMESTAMP - INTERVAL '25 days',
    'Image quality too poor - ID number not clearly visible',
    '{"ocr_confidence": 0.45, "extracted_name": "Peter Matanda", "extracted_id": "89-2*****-G-90"}'::JSONB
),
-- Bank Statement (Rejected - outdated)
(
    '77777777-7777-7777-7777-777777777777'::UUID,
    'bank_statement',
    'peter_matanda_bank_statement_old.pdf',
    'uploads/documents/postreg-77777777-7777-7777-7777-777777777777/bank_statement_old_20231106.pdf',
    589824,
    'application/pdf',
    'uploaded',
    'rejected',
    CURRENT_TIMESTAMP - INTERVAL '27 days',
    CURRENT_TIMESTAMP - INTERVAL '25 days',
    'Bank statement is more than 3 months old',
    '{"ocr_confidence": 0.82, "estimated_monthly_income": 1750, "statement_date": "2023-08-15"}'::JSONB
) ON CONFLICT DO NOTHING;

-- User 8: Government employee missing EC number (validation failure)
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    id_number,
    address,
    city,
    country,
    employment_status,
    employer_type,
    job_title,
    employer_name,
    monthly_income,
    verified_net_salary,
    salary_verified_at,
    ocr_bank_salary,
    ocr_payslip_salary,
    bank_name,
    account_number,
    ec_number,  -- Missing EC number
    created_at,
    updated_at
) VALUES (
    '88888888-8888-8888-8888-888888888888'::UUID,
    'gov.no.ec@example.com',
    'Tendai',
    'Mudziri',
    '+263712345685',
    '1986-04-18',
    '34-876543-H-23',
    '777 Mbare, Mbare',
    'Harare',
    'Zimbabwe',
    'employed',
    'government',
    'Administrative Officer',
    'Ministry of Education',
    1300.00,
    1300.00,
    CURRENT_TIMESTAMP - INTERVAL '40 days',
    1280.00,
    1300.00,
    'People''s Own Savings Bank',
    '6666777788',
    NULL,  -- Missing EC number - will cause validation failure
    CURRENT_TIMESTAMP - INTERVAL '45 days',
    CURRENT_TIMESTAMP - INTERVAL '40 days'
) ON CONFLICT (id) DO NOTHING;

-- User 9: Government employee below minimum salary
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    id_number,
    address,
    city,
    country,
    employment_status,
    employer_type,
    job_title,
    employer_name,
    monthly_income,
    verified_net_salary,
    salary_verified_at,
    ocr_bank_salary,
    ocr_payslip_salary,
    bank_name,
    account_number,
    ec_number,
    created_at,
    updated_at
) VALUES (
    '99999999-9999-9999-9999-999999999999'::UUID,
    'gov.low.salary@example.com',
    'Chipo',
    'Dube',
    '+263712345686',
    '1993-06-25',
    '56-345678-J-67',
    '111 Highfield, Highfield',
    'Harare',
    'Zimbabwe',
    'employed',
    'government',
    'Junior Clerk',
    'Ministry of Transport',
    800.00,  -- Below $120 minimum
    800.00,
    CURRENT_TIMESTAMP - INTERVAL '35 days',
    780.00,
    800.00,
    'CBZ Bank',
    '1234567890',
    'GOV2024003',
    CURRENT_TIMESTAMP - INTERVAL '40 days',
    CURRENT_TIMESTAMP - INTERVAL '35 days'
) ON CONFLICT (id) DO NOTHING;

-- User 10: Stale salary data (>90 days old)
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    id_number,
    address,
    city,
    country,
    employment_status,
    employer_type,
    job_title,
    employer_name,
    monthly_income,
    verified_net_salary,
    salary_verified_at,
    ocr_bank_salary,
    ocr_payslip_salary,
    bank_name,
    account_number,
    created_at,
    updated_at
) VALUES (
    '10101010-1010-1010-1010-101010101010'::UUID,
    'stale.salary@example.com',
    'George',
    'Chinamasa',
    '+263712345687',
    '1984-11-12',
    '78-987654-K-45',
    '444 Waterfalls, Waterfalls',
    'Harare',
    'Zimbabwe',
    'employed',
    'private',
    'Project Manager',
    'Construction Zimbabwe Ltd',
    2800.00,
    2800.00,
    CURRENT_TIMESTAMP - INTERVAL '120 days',  -- Stale - 120 days old
    2750.00,
    2800.00,
    'Stanbic Bank',
    '9876543210',
    CURRENT_TIMESTAMP - INTERVAL '130 days',
    CURRENT_TIMESTAMP - INTERVAL '120 days'
) ON CONFLICT (id) DO NOTHING;

-- User 11: Informal sector worker with variable income
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    id_number,
    address,
    city,
    country,
    employment_status,
    employer_type,
    job_title,
    employer_name,
    monthly_income,
    verified_net_salary,
    salary_verified_at,
    ocr_bank_salary,
    ocr_payslip_salary,
    bank_name,
    account_number,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111112'::UUID,
    'informal.worker@example.com',
    'Rumbidzai',
    'Moyo',
    '+263712345688',
    '1989-02-14',
    '91-654321-L-89',
    '888 Epworth, Epworth',
    'Epworth',
    'Zimbabwe',
    'self-employed',
    'informal',
    'Small Business Owner',
    'Moyo General Store',
    600.00,
    600.00,
    CURRENT_TIMESTAMP - INTERVAL '25 days',
    550.00,  -- Bank OCR shows lower income (variable)
    600.00,  -- Payslip OCR shows self-reported
    'Ecobank',
    '2222333344',
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_TIMESTAMP - INTERVAL '25 days'
) ON CONFLICT (id) DO NOTHING;

-- User 12: Stuck in verification limbo (documents uploaded weeks ago, never reviewed)
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    id_number,
    address,
    city,
    country,
    employment_status,
    employer_type,
    job_title,
    employer_name,
    monthly_income,
    bank_name,
    account_number,
    created_at,
    updated_at
) VALUES (
    '12121212-1212-1212-1212-121212121212'::UUID,
    'verification.stuck@example.com',
    'Patricia',
    'Kundishora',
    '+263712345689',
    '1990-08-30',
    '23-789012-M-34',
    '555 Ruwa, Ruwa',
    'Ruwa',
    'Zimbabwe',
    'employed',
    'private',
    'Accountant',
    'Ruwa Manufacturing',
    2000.00,
    'FBC Bank',
    '5555666677',
    CURRENT_TIMESTAMP - INTERVAL '60 days',  -- Registered 60 days ago
    CURRENT_TIMESTAMP - INTERVAL '55 days'
) ON CONFLICT (id) DO NOTHING;

-- Documents stuck in pending for User 12
INSERT INTO user_documents (
    user_id,
    document_type,
    document_name,
    file_path,
    file_size,
    file_type,
    upload_status,
    verification_status,
    upload_date,
    metadata
) VALUES 
(
    '12121212-1212-1212-1212-121212121212'::UUID,
    'national_id_front',
    'patricia_kundishora_id_front.jpg',
    'uploads/documents/postreg-12121212-1212-1212-1212-121212121212/id_front_20231005.jpg',
    245760,
    'image/jpeg',
    'uploaded',
    'pending',  -- Still pending after 55 days
    CURRENT_TIMESTAMP - INTERVAL '55 days',
    '{"ocr_confidence": 0.93, "extracted_name": "Patricia Kundishora", "extracted_id": "23-789012-M-34"}'::JSONB
),
(
    '12121212-1212-1212-1212-121212121212'::UUID,
    'bank_statement',
    'patricia_kundishora_bank_statement.pdf',
    'uploads/documents/postreg-12121212-1212-1212-1212-121212121212/bank_statement_20231006.pdf',
    524288,
    'application/pdf',
    'uploaded',
    'pending',  -- Still pending after 54 days
    CURRENT_TIMESTAMP - INTERVAL '54 days',
    '{"ocr_confidence": 0.89, "estimated_monthly_income": 1950, "account_number": "****6677"}'::JSONB
) ON CONFLICT DO NOTHING;

-- =====================================================
-- STAGE 7: MULTIPLE LOAN APPLICATIONS & PROGRESSION
-- =====================================================

-- User 5: Additional loan applications showing progression
-- Rejected loan application for User 5
INSERT INTO loan_applications (
    user_id,
    loan_amount,
    loan_term,
    purpose,
    verified_salary,
    dtni_calculation,
    salary_verified_at,
    status,
    created_at,
    updated_at
) VALUES (
    '55555555-5555-5555-5555-555555555555'::UUID,
    7000.00,  -- Too high - will be rejected
    12,
    'Business expansion',
    3500.00,
    jsonb_build_object(
        'max_installment', 1155.00,
        'available_installment', 1155.00,
        'dtni_limit', 6780.50,
        'dtni_method', 'PERCENTAGE_33'
    ),
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    'rejected',
    CURRENT_TIMESTAMP - INTERVAL '18 days',
    CURRENT_TIMESTAMP - INTERVAL '17 days'
) ON CONFLICT DO NOTHING;

-- Re-application after rejection (smaller amount)
INSERT INTO loan_applications (
    user_id,
    loan_amount,
    loan_term,
    purpose,
    verified_salary,
    dtni_calculation,
    salary_verified_at,
    status,
    created_at,
    updated_at
) VALUES (
    '55555555-5555-5555-5555-555555555555'::UUID,
    1500.00,  -- Smaller amount
    4,
    'Home repairs (re-application)',
    3500.00,
    jsonb_build_object(
        'max_installment', 1155.00,
        'available_installment', 1155.00,
        'dtni_limit', 6780.50,
        'dtni_method', 'PERCENTAGE_33'
    ),
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    'approved',
    CURRENT_TIMESTAMP - INTERVAL '12 days',
    CURRENT_TIMESTAMP - INTERVAL '10 days'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- STAGE 8: ADDITIONAL PROFILE FLAGS FOR EDGE CASES
-- =====================================================

-- Flag for User 7: Rejected documents
INSERT INTO profile_flags (
    user_id,
    flag_type,
    flag_data,
    severity,
    status,
    created_at
) VALUES 
(
    '77777777-7777-7777-7777-777777777777'::UUID,
    'rejected_documents',
    jsonb_build_object(
        'rejected_documents', ARRAY['national_id_front', 'bank_statement'],
        'rejection_reasons', ARRAY['Image quality too poor', 'Statement too old'],
        'required_action', 'Re-upload documents'
    ),
    'HIGH',
    'ACTIVE',
    CURRENT_TIMESTAMP - INTERVAL '25 days'
),
(
    '77777777-7777-7777-7777-777777777777'::UUID,
    'verification_stalled',
    jsonb_build_object(
        'days_since_last_upload', 25,
        'pending_documents', 0,
        'rejected_documents', 2
    ),
    'MEDIUM',
    'ACTIVE',
    CURRENT_TIMESTAMP - INTERVAL '20 days'
) ON CONFLICT DO NOTHING;

-- Flag for User 8: Missing EC number
INSERT INTO profile_flags (
    user_id,
    flag_type,
    flag_data,
    severity,
    status,
    created_at
) VALUES (
    '88888888-8888-8888-8888-888888888888'::UUID,
    'missing_ec_number',
    jsonb_build_object(
        'employer_type', 'government',
        'required_document', 'EC Number',
        'validation_block', 'loan_application'
    ),
    'HIGH',
    'ACTIVE',
    CURRENT_TIMESTAMP - INTERVAL '39 days'
) ON CONFLICT DO NOTHING;

-- Flag for User 9: Government salary too low
INSERT INTO profile_flags (
    user_id,
    flag_type,
    flag_data,
    severity,
    status,
    created_at
) VALUES (
    '99999999-9999-9999-9999-999999999999'::UUID,
    'government_salary_too_low',
    jsonb_build_object(
        'current_salary', 800.00,
        'required_minimum', 120.00,
        'shortfall', 400.00,
        'employer_type', 'government'
    ),
    'HIGH',
    'ACTIVE',
    CURRENT_TIMESTAMP - INTERVAL '34 days'
) ON CONFLICT DO NOTHING;

-- Flag for User 10: Stale salary
INSERT INTO profile_flags (
    user_id,
    flag_type,
    flag_data,
    severity,
    status,
    created_at
) VALUES (
    '10101010-1010-1010-1010-101010101010'::UUID,
    'stale_salary',
    jsonb_build_object(
        'salary_verified_at', CURRENT_TIMESTAMP - INTERVAL '120 days',
        'days_old', 120,
        'freshness_limit', 90,
        'days_overdue', 30
    ),
    'HIGH',
    'ACTIVE',
    CURRENT_TIMESTAMP - INTERVAL '30 days'
) ON CONFLICT DO NOTHING;

-- Flag for User 11: High salary discrepancy (informal sector)
INSERT INTO profile_flags (
    user_id,
    flag_type,
    flag_data,
    severity,
    status,
    created_at
) VALUES (
    '11111111-1111-1111-1111-111111111112'::UUID,
    'salary_discrepancy',
    jsonb_build_object(
        'user_input', 600.00,
        'bank_ocr', 550.00,
        'payslip_ocr', 600.00,
        'percentage_difference', 8.3,
        'discrepancy_source', 'bank_statement_ocr',
        'employer_type', 'informal',
        'note', 'Variable income pattern detected'
    ),
    'MEDIUM',
    'ACTIVE',
    CURRENT_TIMESTAMP - INTERVAL '24 days'
) ON CONFLICT DO NOTHING;

-- Flag for User 12: Verification timeout
INSERT INTO profile_flags (
    user_id,
    flag_type,
    flag_data,
    severity,
    status,
    created_at
) VALUES (
    '12121212-1212-1212-1212-121212121212'::UUID,
    'verification_timeout',
    jsonb_build_object(
        'days_in_pending', 55,
        'documents_pending', 2,
        'last_upload_date', CURRENT_TIMESTAMP - INTERVAL '55 days',
        'sla_breach', true
    ),
    'HIGH',
    'ACTIVE',
    CURRENT_TIMESTAMP - INTERVAL '15 days'
) ON CONFLICT DO NOTHING;

-- Flag for User 5: Small salary discrepancy (bank vs payslip)
INSERT INTO profile_flags (
    user_id,
    flag_type,
    flag_data,
    severity,
    status,
    created_at
) VALUES (
    '55555555-5555-5555-5555-555555555555'::UUID,
    'salary_discrepancy',
    jsonb_build_object(
        'user_input', 3500.00,
        'bank_ocr', 3450.00,
        'payslip_ocr', 3500.00,
        'percentage_difference', 1.4,
        'discrepancy_source', 'bank_statement_ocr'
    ),
    'LOW',
    'ACTIVE',
    CURRENT_TIMESTAMP - INTERVAL '19 days'
) ON CONFLICT DO NOTHING;

-- Flag for User 3: Missing documents
INSERT INTO profile_flags (
    user_id,
    flag_type,
    flag_data,
    severity,
    status,
    created_at
) VALUES (
    '33333333-3333-3333-3333-333333333333'::UUID,
    'missing_documents',
    jsonb_build_object(
        'required_documents', ARRAY['proof_of_residence'],
        'uploaded_documents', ARRAY['national_id_front', 'national_id_back', 'bank_statement', 'payslip'],
        'pending_verification', 4
    ),
    'MEDIUM',
    'ACTIVE',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT '=== COMPREHENSIVE POST-REGISTRATION SEEDING COMPLETE ===' as info;

-- Show all seeded users with their registration stages
SELECT 
    '=== SEEDED USERS BY REGISTRATION STAGE ===' as info;

SELECT 
    id as user_uuid,
    email,
    first_name,
    last_name,
    employer_type,
    verified_net_salary,
    salary_verified_at,
    CASE 
        WHEN salary_verified_at IS NULL THEN '❌ No Salary Verification'
        WHEN (CURRENT_DATE - salary_verified_at::date) <= 30 THEN '✅ Fresh Verification'
        WHEN (CURRENT_DATE - salary_verified_at::date) <= 90 THEN '⚠️ Verification OK'
        ELSE '❌ Stale Verification'
    END as verification_status,
    CASE 
        WHEN verified_net_salary IS NULL THEN 'Stage 1: Just Registered'
        WHEN NOT EXISTS (
            SELECT 1 FROM user_documents ud 
            WHERE ud.user_id = profiles.id 
            AND ud.verification_status = 'verified'
        ) THEN 'Stage 2: Documents Pending'
        WHEN salary_verified_at IS NULL THEN 'Stage 3: Documents Verified'
        ELSE 'Stage 4: Fully Verified'
    END as registration_stage,
    CASE 
        WHEN email LIKE '%rejected%' THEN '🚫 Documents Rejected'
        WHEN email LIKE '%stuck%' THEN '⏰ Verification Timeout'
        WHEN email LIKE '%stale%' THEN '📅 Stale Salary'
        WHEN email LIKE '%low%' THEN '💰 Below Minimum'
        WHEN email LIKE '%no.ec%' THEN '📋 Missing EC Number'
        ELSE '✅ Normal Progress'
    END as special_scenario,
    created_at
FROM profiles 
WHERE id LIKE '11111111-%'
ORDER BY created_at;

-- Show document verification status with edge cases
SELECT 
    '=== DOCUMENT VERIFICATION STATUS (INCLUDING EDGE CASES) ===' as info;

SELECT 
    p.email,
    p.first_name,
    COUNT(ud.id) as total_documents,
    COUNT(CASE WHEN ud.verification_status = 'verified' THEN 1 END) as verified_documents,
    COUNT(CASE WHEN ud.verification_status = 'pending' THEN 1 END) as pending_documents,
    COUNT(CASE WHEN ud.verification_status = 'rejected' THEN 1 END) as rejected_documents,
    STRING_AGG(
        CASE 
            WHEN ud.verification_status = 'rejected' THEN ud.document_type || '(REJECTED)'
            WHEN ud.verification_status = 'pending' THEN ud.document_type || '(PENDING)'
            ELSE ud.document_type
        END, ', '
    ) as document_status,
    CASE 
        WHEN COUNT(CASE WHEN ud.verification_status = 'rejected' THEN 1 END) > 0 THEN '🚫 Has Rejections'
        WHEN COUNT(CASE WHEN ud.verification_status = 'pending' THEN 1 END) > 0 THEN '⏳ Pending Review'
        WHEN COUNT(CASE WHEN ud.verification_status = 'verified' THEN 1 END) > 0 THEN '✅ Documents Verified'
        ELSE '❌ No Documents'
    END as document_summary
FROM profiles p
LEFT JOIN user_documents ud ON p.id = ud.user_id
WHERE p.id LIKE 'postreg-%'
GROUP BY p.id, p.email, p.first_name
ORDER BY p.created_at;

-- Show loan applications with progression
SELECT 
    '=== LOAN APPLICATIONS WITH PROGRESSION HISTORY ===' as info;

SELECT 
    p.email,
    p.first_name,
    la.loan_amount,
    la.purpose,
    la.status,
    la.created_at,
    la.dtni_calculation->>'dtni_method' as dtni_method,
    CASE 
        WHEN la.status = 'rejected' THEN '❌ Rejected - Try Lower Amount'
        WHEN la.status = 'pending' THEN '⏳ Under Review'
        WHEN la.status = 'approved' THEN '✅ Approved'
        ELSE la.status
    END as loan_status_desc,
    CASE 
        WHEN la.purpose LIKE '%re-application%' THEN '🔄 Second Attempt'
        ELSE '🆕 First Application'
    END as application_type
FROM loan_applications la
JOIN profiles p ON la.user_id = p.id
WHERE p.id LIKE 'postreg-%'
ORDER BY la.created_at;

-- Show comprehensive profile flags for all edge cases
SELECT 
    '=== PROFILE FLAGS (COMPREHENSIVE EDGE CASES) ===' as info;

SELECT 
    p.email,
    p.first_name,
    pf.flag_type,
    pf.severity,
    pf.status,
    pf.created_at,
    CASE 
        WHEN pf.flag_type = 'rejected_documents' THEN '🚫 User needs to re-upload documents'
        WHEN pf.flag_type = 'missing_ec_number' THEN '📋 Government employee missing EC number'
        WHEN pf.flag_type = 'government_salary_too_low' THEN '💰 Below $120 minimum for government'
        WHEN pf.flag_type = 'stale_salary' THEN '📅 Salary verification expired (>90 days)'
        WHEN pf.flag_type = 'salary_discrepancy' THEN '⚖️ Income discrepancy detected'
        WHEN pf.flag_type = 'verification_timeout' THEN '⏰ Documents stuck in pending too long'
        WHEN pf.flag_type = 'missing_documents' THEN '📄 Required documents missing'
        ELSE pf.flag_type
    END as flag_description,
    pf.flag_data
FROM profile_flags pf
JOIN profiles p ON pf.user_id = p.id
WHERE p.id LIKE 'postreg-%'
ORDER BY pf.severity DESC, pf.created_at;

-- Government employee specific validation scenarios
SELECT 
    '=== GOVERNMENT EMPLOYEE VALIDATION SCENARIOS ===' as info;

SELECT 
    email,
    first_name,
    verified_net_salary,
    ec_number,
    CASE 
        WHEN ec_number IS NULL THEN '❌ Missing EC Number'
        ELSE '✅ EC Number on file'
    END as ec_status,
    CASE 
        WHEN verified_net_salary < 120 THEN '❌ Below $120 minimum'
        ELSE '✅ Meets minimum salary'
    END as salary_status,
    CASE 
        WHEN ec_number IS NULL OR verified_net_salary < 120 THEN '🚫 Loan Application Blocked'
        ELSE '✅ Eligible for Loans'
    END as loan_eligibility
FROM profiles 
WHERE id LIKE '11111111-%'
AND employer_type = 'government'
ORDER BY 
    CASE WHEN ec_number IS NULL THEN 1 ELSE 0 END,
    CASE WHEN verified_net_salary < 120 THEN 1 ELSE 0 END;

-- Salary freshness analysis
SELECT 
    '=== SALARY FRESHNESS ANALYSIS ===' as info;

SELECT 
    email,
    first_name,
    verified_net_salary,
    salary_verified_at,
    (CURRENT_DATE - salary_verified_at::date) as days_old,
    CASE 
        WHEN salary_verified_at IS NULL THEN '❌ No Verification'
        WHEN (CURRENT_DATE - salary_verified_at::date) <= 30 THEN '✅ Fresh (0-30 days)'
        WHEN (CURRENT_DATE - salary_verified_at::date) <= 60 THEN '⚠️ OK (31-60 days)'
        WHEN (CURRENT_DATE - salary_verified_at::date) <= 90 THEN '⚠️ Warning (61-90 days)'
        ELSE '❌ Stale (>90 days)'
    END as freshness_category,
    CASE 
        WHEN (CURRENT_DATE - salary_verified_at::date) > 90 THEN '🔄 Re-verification Required'
        ELSE '✅ Current'
    END as action_needed
FROM profiles 
WHERE id LIKE '11111111-%'
AND salary_verified_at IS NOT NULL
ORDER BY days_old DESC;

-- Summary statistics for testing
SELECT 
    '=== TESTING SUMMARY STATISTICS ===' as info;

SELECT 
    COUNT(*) as total_test_users,
    COUNT(CASE WHEN verified_net_salary IS NULL THEN 1 END) as no_salary_verification,
    COUNT(CASE WHEN salary_verified_at IS NOT NULL THEN 1 END) as salary_verified,
    COUNT(CASE WHEN (CURRENT_DATE - salary_verified_at::date) > 90 THEN 1 END) as stale_salaries,
    COUNT(CASE WHEN employer_type = 'government' THEN 1 END) as government_employees,
    COUNT(CASE WHEN employer_type = 'government' AND ec_number IS NULL THEN 1 END) as missing_ec_numbers,
    COUNT(CASE WHEN employer_type = 'government' AND verified_net_salary < 120 THEN 1 END) as below_minimum_salary,
    COUNT(CASE WHEN employer_type = 'informal' THEN 1 END) as informal_workers
FROM profiles 
WHERE id LIKE '11111111-%';

SELECT 
    '=== POST-REGISTRATION COMPREHENSIVE TEST DATA READY ===' as info,
       '12 users covering all scenarios: Registration → Documents → Verification → Loans → Edge Cases' as description,
       'Use these UUIDs for testing salary verification API endpoints' as usage_note;
