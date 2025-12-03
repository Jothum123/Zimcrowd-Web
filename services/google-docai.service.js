// Optional import - gracefully handle if module not installed
let DocumentProcessorServiceClient = null;
try {
    DocumentProcessorServiceClient = require('@google-cloud/documentai').v1.DocumentProcessorServiceClient;
} catch (err) {
    console.warn('⚠️  @google-cloud/documentai not installed - Document AI features disabled');
}

/**
 * Google Document AI Service
 * PRIMARY OCR provider for ZimCrowd KYC verification
 * Supports: National IDs, Payslips, Bank Statements, Forms
 */
class GoogleDocAIService {
    constructor() {
        this.client = null;
        this.available = false;
        this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        this.location = process.env.GOOGLE_CLOUD_LOCATION || 'us';
        
        // Processor IDs from environment
        this.processors = {
            id: process.env.GOOGLE_DOCAI_ID_PROCESSOR_ID,
            payslip: process.env.GOOGLE_DOCAI_PAYSLIP_PROCESSOR_ID,
            bank: process.env.GOOGLE_DOCAI_BANK_PROCESSOR_ID,
            form: process.env.GOOGLE_DOCAI_FORM_PROCESSOR_ID,
            ocr: process.env.GOOGLE_DOCAI_OCR_PROCESSOR_ID
        };

        this.initializeClient();
    }

    /**
     * Check if service is available
     */
    isAvailable() {
        return this.available && this.client !== null;
    }

    /**
     * Initialize Google Document AI client
     */
    initializeClient() {
        try {
            if (!DocumentProcessorServiceClient) {
                console.warn('⚠️  Google Document AI SDK not available');
                return;
            }

            const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
            
            if (!credentials) {
                console.warn('⚠️  Google Cloud credentials not configured');
                return;
            }

            if (!this.projectId) {
                console.warn('⚠️  GOOGLE_CLOUD_PROJECT_ID not set');
                return;
            }

            // Parse credentials from environment
            const parsedCredentials = JSON.parse(credentials);
            
            this.client = new DocumentProcessorServiceClient({
                credentials: parsedCredentials
            });

            this.available = true;
            console.log('✅ Google Document AI initialized');
            console.log(`   Project: ${this.projectId}`);
            console.log(`   Location: ${this.location}`);
            console.log(`   Processors: ID=${this.processors.id ? '✓' : '✗'}, Payslip=${this.processors.payslip ? '✓' : '✗'}, Bank=${this.processors.bank ? '✓' : '✗'}`);

        } catch (error) {
            console.error('❌ Google Document AI initialization failed:', error.message);
            this.client = null;
        }
    }

    /**
     * Get processor name for API calls
     */
    getProcessorName(processorId) {
        return `projects/${this.projectId}/locations/${this.location}/processors/${processorId}`;
    }

    /**
     * Detect mime type from buffer
     */
    detectMimeType(buffer) {
        // Check for PDF
        if (buffer.toString('utf8', 0, 4) === '%PDF') {
            return 'application/pdf';
        }
        // Check for CSV
        const text = buffer.toString('utf8', 0, 1000);
        if (text.includes(',') && (text.includes('\n') || text.includes('\r'))) {
            return 'text/csv';
        }
        // Check for PNG
        if (buffer.toString('hex', 0, 8) === '89504e470d0a1a0a') {
            return 'image/png';
        }
        // Check for JPEG
        if (buffer.toString('hex', 0, 2) === 'ffd8') {
            return 'image/jpeg';
        }
        // Default to JPEG
        return 'image/jpeg';
    }

    /**
     * Process document with specified processor
     */
    async processDocument(imageBuffer, processorId, mimeType = null) {
        if (!this.client) {
            return { success: false, message: 'Google Document AI not configured' };
        }

        try {
            const processorName = this.getProcessorName(processorId);
            
            // Auto-detect mime type if not provided
            if (!mimeType) {
                mimeType = this.detectMimeType(imageBuffer);
            }
            
            console.log(`🔍 Processing with Google Document AI...`);
            console.log(`   Processor: ${processorId}`);
            console.log(`   MIME Type: ${mimeType}`);

            const request = {
                name: processorName,
                rawDocument: {
                    content: imageBuffer.toString('base64'),
                    mimeType: mimeType
                }
            };

            const [result] = await this.client.processDocument(request);
            const { document } = result;

            console.log('✅ Google Document AI processing complete');

            return {
                success: true,
                text: document.text || '',
                pages: document.pages || [],
                entities: document.entities || [],
                confidence: this.calculateConfidence(document)
            };

        } catch (error) {
            console.error('❌ Google Document AI error:', error.message);
            return {
                success: false,
                message: 'Document processing failed',
                error: error.message
            };
        }
    }

    /**
     * Calculate overall confidence score
     */
    calculateConfidence(document) {
        if (!document.pages || document.pages.length === 0) return 0;
        
        let totalConfidence = 0;
        let count = 0;

        document.pages.forEach(page => {
            if (page.blocks) {
                page.blocks.forEach(block => {
                    if (block.layout && block.layout.confidence) {
                        totalConfidence += block.layout.confidence;
                        count++;
                    }
                });
            }
        });

        return count > 0 ? Math.round((totalConfidence / count) * 100) : 85;
    }

    /**
     * Extract text from National ID
     */
    async extractIDText(imageBuffer) {
        const processorId = this.processors.id || this.processors.form;
        
        if (!processorId) {
            console.warn('⚠️  No ID processor configured, using form parser');
        }

        const result = await this.processDocument(imageBuffer, processorId || this.processors.ocr);
        
        if (!result.success) return result;

        // Parse Zimbabwe ID fields from entities and text
        const fields = this.parseIDFields(result.entities, result.text);

        return {
            success: true,
            fullText: result.text,
            detectedFields: fields,
            confidence: result.confidence,
            blockCount: result.pages.length,
            ocrEngine: 'Google Document AI'
        };
    }

    /**
     * Extract data from Payslip
     */
    async extractPayslipData(imageBuffer) {
        const processorId = this.processors.payslip || this.processors.form;
        
        const result = await this.processDocument(imageBuffer, processorId);
        
        if (!result.success) return result;

        const fields = this.parsePayslipFields(result.entities, result.text);

        return {
            success: true,
            fullText: result.text,
            extractedFields: fields,
            confidence: result.confidence,
            ocrEngine: 'Google Document AI - Pay Slip Parser'
        };
    }

    /**
     * Extract data from Proof of Residence
     * Supports: Utility bills, Lease agreements, Council rates, Bank statements with address
     */
    async extractProofOfResidenceData(imageBuffer) {
        const processorId = this.processors.form || this.processors.ocr;
        
        const result = await this.processDocument(imageBuffer, processorId);
        
        if (!result.success) return result;

        const fields = this.parseProofOfResidenceFields(result.entities, result.text);

        return {
            success: true,
            fullText: result.text,
            extractedFields: fields,
            confidence: result.confidence,
            ocrEngine: 'Google Document AI - Proof of Residence Parser'
        };
    }

    /**
     * Extract data from Bank Statement
     */
    async extractBankStatementData(imageBuffer) {
        const processorId = this.processors.bank || this.processors.form;
        
        const result = await this.processDocument(imageBuffer, processorId);
        
        if (!result.success) return result;

        const fields = this.parseBankStatementFields(result.entities, result.text);

        return {
            success: true,
            fullText: result.text,
            extractedFields: fields,
            confidence: result.confidence,
            ocrEngine: 'Google Document AI - Bank Statement Parser'
        };
    }

    /**
     * General OCR text extraction
     */
    async extractText(imageBuffer) {
        const processorId = this.processors.ocr || this.processors.form;
        
        const result = await this.processDocument(imageBuffer, processorId);
        
        if (!result.success) return result;

        return {
            success: true,
            fullText: result.text,
            confidence: result.confidence,
            ocrEngine: 'Google Document AI - OCR'
        };
    }

    /**
     * Parse Zimbabwe National ID fields
     */
    parseIDFields(entities, text) {
        const fields = {
            idNumber: null,
            firstName: null,
            lastName: null,
            dateOfBirth: null,
            placeOfBirth: null,
            dateOfIssue: null,
            villageOfOrigin: null,
            sex: null,
            nationality: 'Zimbabwe',
            address: null,
            district: null
        };

        // Try to extract from entities first
        if (entities && entities.length > 0) {
            entities.forEach(entity => {
                const type = entity.type?.toLowerCase() || '';
                const value = entity.mentionText || '';

                if (type.includes('document_id') || type.includes('id_number')) {
                    fields.idNumber = value;
                } else if (type.includes('given_name') || type.includes('first_name')) {
                    fields.firstName = value;
                } else if (type.includes('family_name') || type.includes('last_name') || type.includes('surname')) {
                    fields.lastName = value;
                } else if (type.includes('date_of_birth') || type.includes('birth_date')) {
                    fields.dateOfBirth = value;
                } else if (type.includes('place_of_birth')) {
                    fields.placeOfBirth = value;
                } else if (type.includes('issue_date')) {
                    fields.dateOfIssue = value;
                } else if (type.includes('sex') || type.includes('gender')) {
                    fields.sex = value;
                } else if (type.includes('address')) {
                    fields.address = value;
                }
            });
        }

        // Fallback to regex parsing from text
        if (text) {
            // ID Number: XX-XXXXXX X XX XXX X
            if (!fields.idNumber) {
                const idMatch = text.match(/(\d{2}[-\s]?\d{6,7}\s?[A-Z]\s?\d{2}\s?[A-Z]+\s?[A-Z])/i);
                if (idMatch) fields.idNumber = idMatch[1].replace(/\s+/g, ' ').trim();
            }

            // First Name
            if (!fields.firstName) {
                const firstMatch = text.match(/FIRST\s+NAME[:\s]*\n?\s*([A-Z]+)/i);
                if (firstMatch) fields.firstName = firstMatch[1].trim();
            }

            // Surname
            if (!fields.lastName) {
                const surnameMatch = text.match(/SURNAME[:\s]*\n?\s*([A-Z]+)/i);
                if (surnameMatch) fields.lastName = surnameMatch[1].trim();
            }

            // Date of Birth
            if (!fields.dateOfBirth) {
                const dobMatch = text.match(/DATE\s+OF\s+BIRTH[:\s]*\n?\s*(\d{2}\/\d{2}\/\d{4})/i);
                if (dobMatch) fields.dateOfBirth = dobMatch[1];
            }

            // Place of Birth
            if (!fields.placeOfBirth) {
                const pobMatch = text.match(/PLACE\s+OF\s+BIRTH[:\s]*\n?\s*([A-Z]+)/i);
                if (pobMatch) fields.placeOfBirth = pobMatch[1].trim();
            }

            // Date of Issue
            if (!fields.dateOfIssue) {
                const doiMatch = text.match(/DATE\s+OF\s+ISSUE[:\s]*\n?\s*(\d{2}\/\d{2}\/\d{4})/i);
                if (doiMatch) fields.dateOfIssue = doiMatch[1];
            }

            // Village of Origin
            if (!fields.villageOfOrigin) {
                const villageMatch = text.match(/VILLAGE\s+OF\s+ORIGIN[:\s]*\n?\s*([A-Z]+)/i);
                if (villageMatch) fields.villageOfOrigin = villageMatch[1].trim();
            }

            // Sex
            if (!fields.sex) {
                const sexMatch = text.match(/CIT\s+([MF])\b/i) || text.match(/SEX[:\s]*([MF]|MALE|FEMALE)/i);
                if (sexMatch) {
                    const s = sexMatch[1].toUpperCase();
                    fields.sex = (s === 'M' || s === 'MALE') ? 'Male' : 'Female';
                }
            }

            // Address (for ID back)
            if (!fields.address) {
                const addrMatch = text.match(/(?:RESIDENTIAL\s+)?ADDRESS[:\s]*\n?\s*([A-Z0-9\s,.-]+?)(?=\n[A-Z]+:|DISTRICT|$)/i);
                if (addrMatch) fields.address = addrMatch[1].trim().replace(/\s+/g, ' ');
            }

            // District
            if (!fields.district) {
                const distMatch = text.match(/DISTRICT[:\s]*\n?\s*([A-Z\s]+?)(?=\n|PROVINCE|$)/i);
                if (distMatch) fields.district = distMatch[1].trim();
            }
        }

        return fields;
    }

    /**
     * Parse Payslip fields
     */
    parsePayslipFields(entities, text) {
        const fields = {
            employeeName: null,
            employeeId: null,
            employerName: null,
            payPeriod: null,
            grossSalary: null,
            netSalary: null,
            basicSalary: null,
            deductions: null,
            taxAmount: null,
            pensionContribution: null,
            allowances: null,
            payDate: null
        };

        // Extract from entities
        if (entities && entities.length > 0) {
            entities.forEach(entity => {
                const type = entity.type?.toLowerCase() || '';
                const value = entity.mentionText || '';

                if (type.includes('employee_name') || type.includes('receiver_name')) {
                    fields.employeeName = value;
                } else if (type.includes('supplier_name') || type.includes('vendor_name')) {
                    fields.employerName = value;
                } else if (type.includes('net_amount') || type.includes('amount_due')) {
                    fields.netSalary = this.parseAmount(value);
                } else if (type.includes('total_amount')) {
                    fields.grossSalary = this.parseAmount(value);
                }
            });
        }

        // Fallback to regex
        if (text) {
            // Employee Name
            if (!fields.employeeName) {
                const nameMatch = text.match(/(?:EMPLOYEE|NAME)[:\s]*([A-Z\s]+?)(?=\n|EMPLOYEE\s+ID|$)/i);
                if (nameMatch) fields.employeeName = nameMatch[1].trim();
            }

            // Employee ID
            const empIdMatch = text.match(/(?:EMPLOYEE\s+(?:ID|NO|NUMBER)|STAFF\s+(?:ID|NO))[:\s]*([A-Z0-9]+)/i);
            if (empIdMatch) fields.employeeId = empIdMatch[1];

            // Employer Name
            if (!fields.employerName) {
                const empMatch = text.match(/^([A-Z\s&]+(?:LIMITED|LTD|PVT|PRIVATE|COMPANY|CORPORATION))/im);
                if (empMatch) fields.employerName = empMatch[1].trim();
            }

            // Pay Period
            const periodMatch = text.match(/(?:PAY\s+PERIOD|PERIOD)[:\s]*([A-Z]+\s+\d{4}|\d{2}\/\d{2}\/\d{4}\s*[-to]+\s*\d{2}\/\d{2}\/\d{4})/i);
            if (periodMatch) fields.payPeriod = periodMatch[1];

            // Gross Salary
            if (!fields.grossSalary) {
                const grossMatch = text.match(/(?:GROSS\s+(?:SALARY|PAY|EARNINGS?))[:\s]*\$?\s*([\d,]+\.?\d*)/i);
                if (grossMatch) fields.grossSalary = this.parseAmount(grossMatch[1]);
            }

            // Net Salary
            if (!fields.netSalary) {
                const netMatch = text.match(/(?:NET\s+(?:SALARY|PAY)|TAKE\s+HOME)[:\s]*\$?\s*([\d,]+\.?\d*)/i);
                if (netMatch) fields.netSalary = this.parseAmount(netMatch[1]);
            }

            // Basic Salary
            const basicMatch = text.match(/(?:BASIC\s+(?:SALARY|PAY))[:\s]*\$?\s*([\d,]+\.?\d*)/i);
            if (basicMatch) fields.basicSalary = this.parseAmount(basicMatch[1]);

            // Total Deductions
            const deductMatch = text.match(/(?:TOTAL\s+)?DEDUCTIONS?[:\s]*\$?\s*([\d,]+\.?\d*)/i);
            if (deductMatch) fields.deductions = this.parseAmount(deductMatch[1]);

            // Tax
            const taxMatch = text.match(/(?:PAYE|TAX|INCOME\s+TAX)[:\s]*\$?\s*([\d,]+\.?\d*)/i);
            if (taxMatch) fields.taxAmount = this.parseAmount(taxMatch[1]);

            // Pension
            const pensionMatch = text.match(/(?:PENSION|NSSA|RETIREMENT)[:\s]*\$?\s*([\d,]+\.?\d*)/i);
            if (pensionMatch) fields.pensionContribution = this.parseAmount(pensionMatch[1]);
        }

        return fields;
    }

    /**
     * Parse Bank Statement fields
     */
    parseBankStatementFields(entities, text) {
        const fields = {
            bankName: null,
            accountNumber: null,
            accountHolder: null,
            accountType: null,
            statementPeriod: null,
            openingBalance: null,
            closingBalance: null,
            totalCredits: null,
            totalDebits: null,
            currency: 'USD',
            branch: null,
            transactions: []
        };

        // Extract from entities
        if (entities && entities.length > 0) {
            entities.forEach(entity => {
                const type = entity.type?.toLowerCase() || '';
                const value = entity.mentionText || '';

                if (type.includes('account_number')) {
                    fields.accountNumber = value;
                } else if (type.includes('bank_name') || type.includes('supplier_name')) {
                    fields.bankName = value;
                } else if (type.includes('account_holder') || type.includes('receiver_name')) {
                    fields.accountHolder = value;
                }
            });
        }

        // Fallback to regex
        if (text) {
            // Bank Name
            if (!fields.bankName) {
                const bankMatch = text.match(/(GETBUCKS|CBZ|CABS|STEWARD|STANBIC|STANDARD\s+CHARTERED|FBC|NMB|ZB\s+BANK|ECOBANK|NEDBANK|FIRST\s+CAPITAL)(?:\s+(?:MICROFINANCE|BANK))?/i);
                if (bankMatch) fields.bankName = bankMatch[1].trim();
            }

            // Account Number
            if (!fields.accountNumber) {
                const accMatch = text.match(/(?:ACCOUNT\s+(?:NO|NUMBER|#)?|A\/C)[:\s]*(\d{10,18})/i);
                if (accMatch) fields.accountNumber = accMatch[1];
            }

            // Account Holder
            if (!fields.accountHolder) {
                const holderMatch = text.match(/(?:ACCOUNT\s+HOLDER|ACCOUNT\s+NAME|NAME)[:\s]*\n?\s*([A-Z\s]+?)(?=\n|ACCOUNT|$)/i);
                if (holderMatch) fields.accountHolder = holderMatch[1].trim();
            }

            // Statement Period
            const periodMatch = text.match(/(?:FROM|PERIOD)[:\s]*(\d{1,2}[-\/]\w{3}[-\/]\d{4})\s*(?:TO|[-])\s*(\d{1,2}[-\/]\w{3}[-\/]\d{4})/i);
            if (periodMatch) fields.statementPeriod = `${periodMatch[1]} to ${periodMatch[2]}`;

            // Opening Balance
            const openMatch = text.match(/(?:OPENING|PREVIOUS|BROUGHT\s+FORWARD)\s+BALANCE[:\s]*([A-Z]{3})?\s*([\d,]+\.?\d*)/i);
            if (openMatch) {
                if (openMatch[1]) fields.currency = openMatch[1];
                fields.openingBalance = this.parseAmount(openMatch[2]);
            }

            // Closing Balance
            const closeMatch = text.match(/(?:CLOSING|CURRENT|CARRIED\s+FORWARD)\s+BALANCE[:\s]*([A-Z]{3})?\s*([\d,]+\.?\d*)/i);
            if (closeMatch) {
                if (closeMatch[1]) fields.currency = closeMatch[1];
                fields.closingBalance = this.parseAmount(closeMatch[2]);
            }

            // Total Credits
            const creditsMatch = text.match(/(?:TOTAL\s+)?CREDITS?[:\s]*([A-Z]{3})?\s*([\d,]+\.?\d*)/i);
            if (creditsMatch) fields.totalCredits = this.parseAmount(creditsMatch[2]);

            // Total Debits
            const debitsMatch = text.match(/(?:TOTAL\s+)?DEBITS?[:\s]*([A-Z]{3})?\s*([\d,]+\.?\d*)/i);
            if (debitsMatch) fields.totalDebits = this.parseAmount(debitsMatch[2]);

            // Account Type
            const typeMatch = text.match(/(SME\s+SAVINGS|SAVINGS|CURRENT|CHEQUE|TRANSMISSION|FCA)/i);
            if (typeMatch) fields.accountType = typeMatch[1].trim();

            // Branch
            const branchMatch = text.match(/BRANCH[:\s]*([A-Z\s]+?)(?=\n|$)/i);
            if (branchMatch) fields.branch = branchMatch[1].trim();

            // Currency
            if (!fields.currency || fields.currency === 'USD') {
                const currMatch = text.match(/(?:CURRENCY|FCA|USD|ZWG|ZWL)/i);
                if (currMatch) fields.currency = currMatch[0].toUpperCase();
            }
        }

        return fields;
    }

    /**
     * Parse Proof of Residence fields
     * Extracts address and name from utility bills, lease agreements, etc.
     */
    parseProofOfResidenceFields(entities, text) {
        const fields = {
            documentType: null,      // utility_bill, lease, council_rates, bank_statement
            providerName: null,      // ZESA, ZINWA, Council name, etc.
            accountHolder: null,     // Name on the document
            serviceAddress: null,    // Physical address
            city: null,
            province: null,
            meterNumber: null,       // For utility bills
            accountNumber: null,
            documentDate: null,
            dueDate: null,
            amountDue: null,
            isRecent: false,         // Within last 3 months
            addressComponents: {
                streetNumber: null,
                streetName: null,
                suburb: null,
                city: null,
                province: null,
                postalCode: null
            }
        };

        if (!text) return fields;

        const upper = text.toUpperCase();

        // Detect document type
        if (upper.match(/ZESA|ZETDC|ELECTRICITY|POWER|KWATT/)) {
            fields.documentType = 'utility_bill_electricity';
            fields.providerName = 'ZESA/ZETDC';
        } else if (upper.match(/ZINWA|WATER\s+AUTHORITY|WATER\s+BILL/)) {
            fields.documentType = 'utility_bill_water';
            fields.providerName = 'ZINWA';
        } else if (upper.match(/TELONE|ECONET|NETONE|TELECEL|INTERNET|BROADBAND/)) {
            fields.documentType = 'utility_bill_telecom';
            const telcoMatch = upper.match(/(TELONE|ECONET|NETONE|TELECEL)/);
            if (telcoMatch) fields.providerName = telcoMatch[1];
        } else if (upper.match(/CITY\s+OF\s+HARARE|CITY\s+OF\s+BULAWAYO|MUNICIPALITY|COUNCIL|RATES/)) {
            fields.documentType = 'council_rates';
            const councilMatch = upper.match(/(CITY\s+OF\s+[A-Z]+|[A-Z]+\s+MUNICIPALITY|[A-Z]+\s+COUNCIL)/);
            if (councilMatch) fields.providerName = councilMatch[1];
        } else if (upper.match(/LEASE|RENTAL|TENANCY|LANDLORD|TENANT/)) {
            fields.documentType = 'lease_agreement';
        } else if (upper.match(/BANK\s+STATEMENT|ACCOUNT\s+STATEMENT|STATEMENT\s+OF\s+ACCOUNT/)) {
            fields.documentType = 'bank_statement_with_address';
            // Extract bank name
            const bankMatch = upper.match(/(GETBUCKS|CBZ|CABS|STEWARD|STANBIC|STANDARD\s+CHARTERED|FBC|NMB|ZB\s+BANK|ECOBANK|NEDBANK|FIRST\s+CAPITAL)(?:\s+(?:MICROFINANCE|BANK))?/);
            if (bankMatch) fields.providerName = bankMatch[1];
        }

        // Extract account holder name
        const namePatterns = [
            /(?:CUSTOMER|ACCOUNT\s+HOLDER|NAME|TENANT|LESSEE)[:\s]*\n?\s*([A-Z][A-Z\s]+?)(?=\n|ADDRESS|ACCOUNT|$)/i,
            /(?:DEAR|TO)[:\s]*\n?\s*([A-Z][A-Z\s]+?)(?=\n|,|$)/i,
            /(?:MR|MRS|MS|MISS|DR)\.?\s+([A-Z][A-Z\s]+?)(?=\n|,|$)/i
        ];
        
        for (const pattern of namePatterns) {
            const match = text.match(pattern);
            if (match) {
                fields.accountHolder = match[1].trim().replace(/\s+/g, ' ');
                break;
            }
        }

        // Extract service address
        const addressPatterns = [
            /(?:SERVICE\s+)?ADDRESS[:\s]*\n?\s*([A-Z0-9][A-Z0-9\s,.\-\/]+?)(?=\n\n|\nACCOUNT|\nMETER|\nDATE|$)/i,
            /(?:PROPERTY|PREMISES|STAND)[:\s]*\n?\s*([A-Z0-9][A-Z0-9\s,.\-\/]+?)(?=\n\n|\nACCOUNT|$)/i,
            /(?:RESIDENTIAL\s+ADDRESS)[:\s]*\n?\s*([A-Z0-9][A-Z0-9\s,.\-\/]+?)(?=\n\n|$)/i
        ];

        for (const pattern of addressPatterns) {
            const match = text.match(pattern);
            if (match) {
                fields.serviceAddress = match[1].trim().replace(/\s+/g, ' ');
                break;
            }
        }

        // Parse address components
        if (fields.serviceAddress) {
            // Street number
            const streetNumMatch = fields.serviceAddress.match(/^(\d+[A-Z]?)\s/);
            if (streetNumMatch) fields.addressComponents.streetNumber = streetNumMatch[1];

            // Common Zimbabwe cities
            const cities = ['HARARE', 'BULAWAYO', 'MUTARE', 'GWERU', 'KWEKWE', 'KADOMA', 'MASVINGO', 'CHINHOYI', 'MARONDERA', 'CHITUNGWIZA', 'NORTON', 'RUWA', 'BINDURA', 'BEITBRIDGE', 'VICTORIA FALLS', 'HWANGE', 'KARIBA'];
            for (const city of cities) {
                if (fields.serviceAddress.toUpperCase().includes(city)) {
                    fields.city = city;
                    fields.addressComponents.city = city;
                    break;
                }
            }

            // Provinces
            const provinces = ['HARARE', 'BULAWAYO', 'MANICALAND', 'MASHONALAND CENTRAL', 'MASHONALAND EAST', 'MASHONALAND WEST', 'MASVINGO', 'MATABELELAND NORTH', 'MATABELELAND SOUTH', 'MIDLANDS'];
            for (const province of provinces) {
                if (fields.serviceAddress.toUpperCase().includes(province)) {
                    fields.province = province;
                    fields.addressComponents.province = province;
                    break;
                }
            }

            // Suburb extraction
            const suburbMatch = fields.serviceAddress.match(/,\s*([A-Z][A-Z\s]+?)(?:,|\s+HARARE|\s+BULAWAYO|$)/i);
            if (suburbMatch) fields.addressComponents.suburb = suburbMatch[1].trim();
        }

        // Meter number (for utilities)
        const meterMatch = text.match(/(?:METER\s+(?:NO|NUMBER|#)?)[:\s]*([A-Z0-9]+)/i);
        if (meterMatch) fields.meterNumber = meterMatch[1];

        // Account number
        const accMatch = text.match(/(?:ACCOUNT\s+(?:NO|NUMBER|#)?|A\/C)[:\s]*([A-Z0-9\-]+)/i);
        if (accMatch) fields.accountNumber = accMatch[1];

        // Document date
        const datePatterns = [
            /(?:DATE|STATEMENT\s+DATE|BILL\s+DATE)[:\s]*(\d{1,2}[-\/]\w{3}[-\/]\d{4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i,
            /(\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+\d{4})/i
        ];
        
        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                fields.documentDate = match[1];
                // Check if document is recent (within 3 months)
                try {
                    const docDate = new Date(match[1]);
                    const threeMonthsAgo = new Date();
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                    fields.isRecent = docDate >= threeMonthsAgo;
                } catch (e) {
                    fields.isRecent = false;
                }
                break;
            }
        }

        // Due date
        const dueMatch = text.match(/(?:DUE\s+DATE|PAYABLE\s+BY)[:\s]*(\d{1,2}[-\/]\w{3}[-\/]\d{4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i);
        if (dueMatch) fields.dueDate = dueMatch[1];

        // Amount due
        const amountMatch = text.match(/(?:AMOUNT\s+DUE|TOTAL\s+DUE|BALANCE\s+DUE|TOTAL)[:\s]*\$?\s*([\d,]+\.?\d*)/i);
        if (amountMatch) fields.amountDue = this.parseAmount(amountMatch[1]);

        return fields;
    }

    /**
     * Parse Employment Contract / Confirmation Letter fields
     */
    parseEmploymentContractFields(entities, text) {
        const fields = {
            documentType: null,      // employment_contract, confirmation_letter, appointment_letter
            employeeName: null,
            employeeId: null,
            employerName: null,
            employerAddress: null,
            jobTitle: null,
            department: null,
            startDate: null,
            endDate: null,           // For contracts
            contractType: null,      // permanent, contract, temporary
            salary: null,
            salaryPeriod: null,      // monthly, annual
            signatureDate: null,
            isValid: false,
            hasLetterhead: false,
            hasSignature: false
        };

        if (!text) return fields;

        const upper = text.toUpperCase();

        // Detect document type
        if (upper.match(/EMPLOYMENT\s+CONTRACT|CONTRACT\s+OF\s+EMPLOYMENT/)) {
            fields.documentType = 'employment_contract';
        } else if (upper.match(/CONFIRMATION\s+OF\s+EMPLOYMENT|LETTER\s+OF\s+EMPLOYMENT|TO\s+WHOM\s+IT\s+MAY\s+CONCERN/)) {
            fields.documentType = 'confirmation_letter';
        } else if (upper.match(/APPOINTMENT\s+LETTER|LETTER\s+OF\s+APPOINTMENT/)) {
            fields.documentType = 'appointment_letter';
        } else if (upper.match(/OFFER\s+LETTER|LETTER\s+OF\s+OFFER/)) {
            fields.documentType = 'offer_letter';
        }

        // Check for letterhead indicators
        if (upper.match(/LIMITED|LTD|PVT|PRIVATE|COMPANY|CORPORATION|MINISTRY|GOVERNMENT|DEPARTMENT/)) {
            fields.hasLetterhead = true;
        }

        // Extract employer name (usually at top of letterhead)
        const employerPatterns = [
            /^([A-Z][A-Z\s&]+(?:LIMITED|LTD|PVT|PRIVATE|COMPANY|CORPORATION))/im,
            /^(MINISTRY\s+OF\s+[A-Z\s]+)/im,
            /^(GOVERNMENT\s+OF\s+ZIMBABWE)/im,
            /(?:EMPLOYER|COMPANY)[:\s]*\n?\s*([A-Z][A-Z\s&]+?)(?=\n|ADDRESS|$)/i
        ];

        for (const pattern of employerPatterns) {
            const match = text.match(pattern);
            if (match) {
                fields.employerName = match[1].trim().replace(/\s+/g, ' ');
                break;
            }
        }

        // Extract employee name
        const employeePatterns = [
            /(?:THIS\s+IS\s+TO\s+CONFIRM\s+THAT|CERTIFY\s+THAT|EMPLOYEE)[:\s]*\n?\s*(?:MR|MRS|MS|MISS|DR)?\.?\s*([A-Z][A-Z\s]+?)(?=\s+IS|\s+HAS|\s+HOLDS|,|\n)/i,
            /(?:DEAR|NAME\s+OF\s+EMPLOYEE)[:\s]*\n?\s*(?:MR|MRS|MS|MISS|DR)?\.?\s*([A-Z][A-Z\s]+?)(?=\n|,|$)/i,
            /(?:EMPLOYEE\s+NAME)[:\s]*([A-Z][A-Z\s]+?)(?=\n|EMPLOYEE\s+ID|$)/i
        ];

        for (const pattern of employeePatterns) {
            const match = text.match(pattern);
            if (match) {
                fields.employeeName = match[1].trim().replace(/\s+/g, ' ');
                break;
            }
        }

        // Employee ID / EC Number
        const empIdMatch = text.match(/(?:EMPLOYEE\s+(?:ID|NO|NUMBER)|EC\s+(?:NO|NUMBER)|STAFF\s+(?:ID|NO))[:\s]*([A-Z0-9]+)/i);
        if (empIdMatch) fields.employeeId = empIdMatch[1];

        // Job Title / Position
        const titlePatterns = [
            /(?:POSITION|JOB\s+TITLE|DESIGNATION|ROLE|CAPACITY)[:\s]*\n?\s*([A-Z][A-Z\s]+?)(?=\n|IN\s+THE|AT|$)/i,
            /(?:AS\s+(?:A|AN)?)\s+([A-Z][A-Z\s]+?)(?=\s+IN|\s+AT|\s+WITH|,|\.|$)/i,
            /(?:HOLDS\s+THE\s+POSITION\s+OF)\s+([A-Z][A-Z\s]+?)(?=\s+IN|\s+AT|,|\.|$)/i
        ];

        for (const pattern of titlePatterns) {
            const match = text.match(pattern);
            if (match) {
                fields.jobTitle = match[1].trim().replace(/\s+/g, ' ');
                break;
            }
        }

        // Department
        const deptMatch = text.match(/(?:DEPARTMENT|DIVISION|SECTION|UNIT)[:\s]*\n?\s*([A-Z][A-Z\s]+?)(?=\n|$)/i);
        if (deptMatch) fields.department = deptMatch[1].trim();

        // Start Date / Employment Date
        const startPatterns = [
            /(?:START\s+DATE|COMMENCEMENT\s+DATE|DATE\s+OF\s+EMPLOYMENT|EMPLOYED\s+(?:SINCE|FROM))[:\s]*(\d{1,2}[-\/]\w{3}[-\/]\d{4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i,
            /(?:SINCE|FROM)\s+(\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+\d{4})/i
        ];

        for (const pattern of startPatterns) {
            const match = text.match(pattern);
            if (match) {
                fields.startDate = match[1];
                break;
            }
        }

        // Contract Type
        if (upper.includes('PERMANENT')) {
            fields.contractType = 'permanent';
        } else if (upper.includes('CONTRACT') && !upper.includes('EMPLOYMENT CONTRACT')) {
            fields.contractType = 'contract';
        } else if (upper.includes('TEMPORARY')) {
            fields.contractType = 'temporary';
        } else if (upper.includes('PROBATION')) {
            fields.contractType = 'probationary';
        }

        // Salary
        const salaryPatterns = [
            /(?:SALARY|REMUNERATION|BASIC\s+PAY|GROSS\s+SALARY)[:\s]*\$?\s*([\d,]+\.?\d*)\s*(?:PER\s+)?(MONTH|ANNUM|YEAR)?/i,
            /(?:EARNS?|RECEIVES?)\s+\$?\s*([\d,]+\.?\d*)\s*(?:PER\s+)?(MONTH|ANNUM|YEAR)?/i
        ];

        for (const pattern of salaryPatterns) {
            const match = text.match(pattern);
            if (match) {
                fields.salary = this.parseAmount(match[1]);
                if (match[2]) {
                    fields.salaryPeriod = match[2].toLowerCase().includes('annum') || match[2].toLowerCase().includes('year') ? 'annual' : 'monthly';
                }
                break;
            }
        }

        // Signature date
        const sigDateMatch = text.match(/(?:DATED?|SIGNED)[:\s]*(?:THIS)?\s*(\d{1,2}[-\/\s]\w{3,9}[-\/\s]\d{4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i);
        if (sigDateMatch) fields.signatureDate = sigDateMatch[1];

        // Check for signature indicators
        if (upper.match(/SIGNATURE|SIGNED|AUTHORIZED|AUTHORISED|HR\s+MANAGER|HUMAN\s+RESOURCES/)) {
            fields.hasSignature = true;
        }

        // Validate document
        fields.isValid = !!(fields.employerName && (fields.employeeName || fields.employeeId) && fields.hasLetterhead);

        return fields;
    }

    /**
     * Parse amount string to number
     */
    parseAmount(value) {
        if (!value) return null;
        const cleaned = value.toString().replace(/[,$\s]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    }

    /**
     * Detect document type from text
     */
    detectDocumentType(text) {
        const upper = text.toUpperCase();

        if (upper.match(/REPUBLIC\s+OF\s+ZIMBABWE.*NATIONAL|IDENTITY\s+CARD/)) {
            if (upper.includes('CHIEF') || upper.includes('DISTRICT')) {
                return 'id_back';
            }
            return 'national_id';
        }

        if (upper.match(/BANK\s+STATEMENT|ACCOUNT\s+STATEMENT|STATEMENT\s+OF\s+ACCOUNT/)) {
            return 'bank_statement';
        }

        if (upper.match(/PAY\s*SLIP|SALARY\s+ADVICE|REMUNERATION|EARNINGS\s+STATEMENT/)) {
            return 'payslip';
        }

        if (upper.match(/ECOCASH|ECO\s*CASH|ECONET/)) {
            return 'ecocash_statement';
        }

        if (upper.match(/EMPLOYMENT\s+LETTER|LETTER\s+OF\s+EMPLOYMENT|TO\s+WHOM\s+IT\s+MAY\s+CONCERN.*EMPLOY/)) {
            return 'employment_letter';
        }

        if (upper.match(/ZESA|ZETDC|ELECTRICITY|POWER|KWATT/)) {
            return 'proof_of_residence';
        }

        if (upper.match(/ZINWA|WATER\s+AUTHORITY|WATER\s+BILL/)) {
            return 'proof_of_residence';
        }

        if (upper.match(/CITY\s+OF\s+HARARE|CITY\s+OF\s+BULAWAYO|MUNICIPALITY|COUNCIL|RATES/)) {
            return 'proof_of_residence';
        }

        if (upper.match(/LEASE|RENTAL|TENANCY|LANDLORD|TENANT/)) {
            return 'proof_of_residence';
        }

        if (upper.match(/TELONE|ECONET|NETONE|TELECEL/).test(upper) && upper.includes('BILL')) {
            return 'proof_of_residence';
        }

        return 'unknown';
    }

    /**
     * Comprehensive document analysis
     */
    async analyzeDocument(imageBuffer, expectedType = null) {
        if (!this.client) {
            return { success: false, message: 'Google Document AI not configured' };
        }

        try {
            console.log(`🔍 Analyzing document with Google Document AI...`);

            // First, do OCR to get text and detect type
            const ocrResult = await this.extractText(imageBuffer);
            
            if (!ocrResult.success) {
                return ocrResult;
            }

            const detectedType = this.detectDocumentType(ocrResult.fullText);
            const docType = expectedType || detectedType;

            console.log(`   Detected type: ${detectedType}`);
            console.log(`   Processing as: ${docType}`);

            // Process with appropriate specialized parser
            let extractedFields = {};
            let processorUsed = 'OCR';

            switch (docType) {
                case 'national_id':
                case 'id_back':
                    const idResult = await this.extractIDText(imageBuffer);
                    if (idResult.success) {
                        extractedFields = idResult.detectedFields;
                        processorUsed = 'ID Parser';
                    }
                    break;

                case 'payslip':
                    const payResult = await this.extractPayslipData(imageBuffer);
                    if (payResult.success) {
                        extractedFields = payResult.extractedFields;
                        processorUsed = 'Pay Slip Parser';
                    }
                    break;

                case 'bank_statement':
                    const bankResult = await this.extractBankStatementData(imageBuffer);
                    if (bankResult.success) {
                        extractedFields = bankResult.extractedFields;
                        processorUsed = 'Bank Statement Parser';
                    }
                    break;

                case 'proof_of_residence':
                case 'utility_bill':
                case 'utility_bill_electricity':
                case 'utility_bill_water':
                case 'council_rates':
                case 'lease_agreement':
                    const porResult = await this.extractProofOfResidenceData(imageBuffer);
                    if (porResult.success) {
                        extractedFields = porResult.extractedFields;
                        processorUsed = 'Proof of Residence Parser';
                    }
                    break;

                case 'employment_letter':
                case 'employment_contract':
                    // Use form parser for employment documents
                    extractedFields = this.parseEmploymentContractFields([], ocrResult.fullText);
                    processorUsed = 'Employment Contract Parser';
                    break;

                default:
                    // Use form parser for unknown types
                    extractedFields = this.parseIDFields([], ocrResult.fullText);
                    processorUsed = 'Form Parser';
            }

            return {
                success: true,
                documentType: docType,
                detectedType: detectedType,
                typeMatch: expectedType ? detectedType === expectedType : true,
                fullText: ocrResult.fullText,
                extractedFields: extractedFields,
                confidence: ocrResult.confidence,
                ocrEngine: `Google Document AI - ${processorUsed}`,
                recommendation: ocrResult.confidence >= 70 ? 'approve' : 'review'
            };

        } catch (error) {
            console.error('❌ Document analysis error:', error);
            return {
                success: false,
                message: 'Failed to analyze document',
                error: error.message
            };
        }
    }
    /**
     * Verify document against user profile data
     * @param {Object} extractedFields - Fields extracted from document
     * @param {Object} userProfile - User's profile data
     * @param {string} documentType - Type of document being verified
     * @returns {Object} Verification result with match scores
     */
    verifyDocumentAgainstProfile(extractedFields, userProfile, documentType) {
        const result = {
            verified: false,
            confidence: 0,
            matches: {},
            mismatches: {},
            warnings: [],
            recommendation: 'review'
        };

        if (!extractedFields || !userProfile) {
            result.warnings.push('Missing data for verification');
            return result;
        }

        let matchCount = 0;
        let totalChecks = 0;

        // Helper function to compare names (fuzzy match)
        const compareNames = (name1, name2) => {
            if (!name1 || !name2) return false;
            const n1 = name1.toUpperCase().replace(/\s+/g, ' ').trim();
            const n2 = name2.toUpperCase().replace(/\s+/g, ' ').trim();
            
            // Exact match
            if (n1 === n2) return true;
            
            // Check if one contains the other
            if (n1.includes(n2) || n2.includes(n1)) return true;
            
            // Check individual name parts
            const parts1 = n1.split(' ');
            const parts2 = n2.split(' ');
            const matchingParts = parts1.filter(p => parts2.includes(p));
            return matchingParts.length >= 2; // At least 2 name parts match
        };

        // Helper to compare addresses
        const compareAddresses = (addr1, addr2) => {
            if (!addr1 || !addr2) return false;
            const a1 = addr1.toUpperCase().replace(/[,.\-]/g, ' ').replace(/\s+/g, ' ').trim();
            const a2 = addr2.toUpperCase().replace(/[,.\-]/g, ' ').replace(/\s+/g, ' ').trim();
            
            // Check for significant overlap
            const words1 = a1.split(' ').filter(w => w.length > 2);
            const words2 = a2.split(' ').filter(w => w.length > 2);
            const matchingWords = words1.filter(w => words2.includes(w));
            return matchingWords.length >= 3; // At least 3 significant words match
        };

        switch (documentType) {
            case 'payslip':
                // Verify employee name
                if (extractedFields.employeeName) {
                    totalChecks++;
                    const fullName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
                    if (compareNames(extractedFields.employeeName, fullName)) {
                        result.matches.employeeName = { extracted: extractedFields.employeeName, profile: fullName };
                        matchCount++;
                    } else {
                        result.mismatches.employeeName = { extracted: extractedFields.employeeName, profile: fullName };
                    }
                }

                // Verify employee ID / EC Number
                if (extractedFields.employeeId && userProfile.ec_number) {
                    totalChecks++;
                    if (extractedFields.employeeId.toUpperCase() === userProfile.ec_number.toUpperCase()) {
                        result.matches.employeeId = { extracted: extractedFields.employeeId, profile: userProfile.ec_number };
                        matchCount++;
                    } else {
                        result.mismatches.employeeId = { extracted: extractedFields.employeeId, profile: userProfile.ec_number };
                    }
                }

                // Verify employer name
                if (extractedFields.employerName && userProfile.employer_name) {
                    totalChecks++;
                    if (compareNames(extractedFields.employerName, userProfile.employer_name)) {
                        result.matches.employerName = { extracted: extractedFields.employerName, profile: userProfile.employer_name };
                        matchCount++;
                    } else {
                        result.mismatches.employerName = { extracted: extractedFields.employerName, profile: userProfile.employer_name };
                    }
                }

                // Check salary consistency
                if (extractedFields.netSalary && userProfile.monthly_income) {
                    totalChecks++;
                    const tolerance = 0.1; // 10% tolerance
                    const diff = Math.abs(extractedFields.netSalary - userProfile.monthly_income) / userProfile.monthly_income;
                    if (diff <= tolerance) {
                        result.matches.salary = { extracted: extractedFields.netSalary, profile: userProfile.monthly_income };
                        matchCount++;
                    } else {
                        result.warnings.push(`Salary mismatch: Payslip shows $${extractedFields.netSalary}, profile shows $${userProfile.monthly_income}`);
                    }
                }
                break;

            case 'proof_of_residence':
            case 'utility_bill':
            case 'utility_bill_electricity':
            case 'utility_bill_water':
            case 'utility_bill_telecom':
            case 'council_rates':
            case 'lease_agreement':
            case 'bank_statement_with_address':
                // REQUIRED: Verify account holder name matches user's full name
                const porFullName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
                totalChecks++;
                
                if (extractedFields.accountHolder) {
                    if (compareNames(extractedFields.accountHolder, porFullName)) {
                        result.matches.accountHolder = { 
                            extracted: extractedFields.accountHolder, 
                            profile: porFullName,
                            status: 'MATCHED'
                        };
                        matchCount++;
                    } else {
                        result.mismatches.accountHolder = { 
                            extracted: extractedFields.accountHolder, 
                            profile: porFullName,
                            status: 'MISMATCH',
                            reason: 'Name on document does not match your registered name'
                        };
                        result.warnings.push(`Name mismatch: Document shows "${extractedFields.accountHolder}", but your registered name is "${porFullName}"`);
                    }
                } else {
                    result.mismatches.accountHolder = { 
                        extracted: null, 
                        profile: porFullName,
                        status: 'NOT_FOUND',
                        reason: 'Could not find name on document'
                    };
                    result.warnings.push('Could not extract name from document. Please ensure your full name is clearly visible.');
                }

                // REQUIRED: Verify address matches user's registered address
                totalChecks++;
                
                if (extractedFields.serviceAddress && userProfile.address) {
                    if (compareAddresses(extractedFields.serviceAddress, userProfile.address)) {
                        result.matches.address = { 
                            extracted: extractedFields.serviceAddress, 
                            profile: userProfile.address,
                            status: 'MATCHED'
                        };
                        matchCount++;
                    } else {
                        result.mismatches.address = { 
                            extracted: extractedFields.serviceAddress, 
                            profile: userProfile.address,
                            status: 'MISMATCH',
                            reason: 'Address on document does not match your registered address'
                        };
                        result.warnings.push(`Address mismatch: Document shows "${extractedFields.serviceAddress}", but your registered address is "${userProfile.address}"`);
                    }
                } else if (!extractedFields.serviceAddress) {
                    result.mismatches.address = { 
                        extracted: null, 
                        profile: userProfile.address,
                        status: 'NOT_FOUND',
                        reason: 'Could not find address on document'
                    };
                    result.warnings.push('Could not extract address from document. Please ensure your address is clearly visible.');
                } else if (!userProfile.address) {
                    result.warnings.push('Please update your profile with your residential address first.');
                }

                // Verify city if available
                if (extractedFields.city && userProfile.city) {
                    totalChecks++;
                    if (extractedFields.city.toUpperCase() === userProfile.city.toUpperCase()) {
                        result.matches.city = { 
                            extracted: extractedFields.city, 
                            profile: userProfile.city,
                            status: 'MATCHED'
                        };
                        matchCount++;
                    } else {
                        result.mismatches.city = { 
                            extracted: extractedFields.city, 
                            profile: userProfile.city,
                            status: 'MISMATCH'
                        };
                    }
                }

                // Check document recency (must be within 3 months)
                if (!extractedFields.isRecent) {
                    result.warnings.push('Document appears to be older than 3 months. Please upload a recent document.');
                }

                // For proof of residence, BOTH name AND address must match
                if (result.mismatches.accountHolder || result.mismatches.address) {
                    result.verified = false;
                    result.recommendation = 'reject';
                    if (result.mismatches.accountHolder && result.mismatches.address) {
                        result.rejectionReason = 'Both name and address on document do not match your profile';
                    } else if (result.mismatches.accountHolder) {
                        result.rejectionReason = 'Name on document does not match your registered name';
                    } else {
                        result.rejectionReason = 'Address on document does not match your registered address';
                    }
                }
                break;

            case 'employment_contract':
            case 'employment_letter':
                // Verify employee name
                if (extractedFields.employeeName) {
                    totalChecks++;
                    const fullName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
                    if (compareNames(extractedFields.employeeName, fullName)) {
                        result.matches.employeeName = { extracted: extractedFields.employeeName, profile: fullName };
                        matchCount++;
                    } else {
                        result.mismatches.employeeName = { extracted: extractedFields.employeeName, profile: fullName };
                    }
                }

                // Verify employer
                if (extractedFields.employerName && userProfile.employer_name) {
                    totalChecks++;
                    if (compareNames(extractedFields.employerName, userProfile.employer_name)) {
                        result.matches.employerName = { extracted: extractedFields.employerName, profile: userProfile.employer_name };
                        matchCount++;
                    } else {
                        result.mismatches.employerName = { extracted: extractedFields.employerName, profile: userProfile.employer_name };
                    }
                }

                // Verify job title
                if (extractedFields.jobTitle && userProfile.occupation) {
                    totalChecks++;
                    if (compareNames(extractedFields.jobTitle, userProfile.occupation)) {
                        result.matches.jobTitle = { extracted: extractedFields.jobTitle, profile: userProfile.occupation };
                        matchCount++;
                    } else {
                        result.warnings.push(`Job title may differ: Document shows "${extractedFields.jobTitle}", profile shows "${userProfile.occupation}"`);
                    }
                }

                // Check document validity
                if (!extractedFields.hasLetterhead) {
                    result.warnings.push('Document may not have official letterhead');
                }
                if (!extractedFields.hasSignature) {
                    result.warnings.push('Document may not be signed');
                }
                break;
        }

        // Calculate confidence
        result.confidence = totalChecks > 0 ? Math.round((matchCount / totalChecks) * 100) : 0;
        
        // Determine verification status
        if (result.confidence >= 80 && Object.keys(result.mismatches).length === 0) {
            result.verified = true;
            result.recommendation = 'approve';
        } else if (result.confidence >= 60) {
            result.verified = false;
            result.recommendation = 'review';
        } else {
            result.verified = false;
            result.recommendation = 'reject';
        }

        return result;
    }
}

module.exports = GoogleDocAIService;
