const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;

/**
 * Google Document AI Service
 * PRIMARY OCR provider for ZimCrowd KYC verification
 * Supports: National IDs, Payslips, Bank Statements, Forms
 */
class GoogleDocAIService {
    constructor() {
        this.client = null;
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
     * Initialize Google Document AI client
     */
    initializeClient() {
        try {
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
     * Check if service is available
     */
    isAvailable() {
        return this.client !== null && this.projectId !== null;
    }

    /**
     * Get processor name for API calls
     */
    getProcessorName(processorId) {
        return `projects/${this.projectId}/locations/${this.location}/processors/${processorId}`;
    }

    /**
     * Process document with specified processor
     */
    async processDocument(imageBuffer, processorId, mimeType = 'image/jpeg') {
        if (!this.client) {
            return { success: false, message: 'Google Document AI not configured' };
        }

        try {
            const processorName = this.getProcessorName(processorId);
            
            console.log(`🔍 Processing with Google Document AI...`);
            console.log(`   Processor: ${processorId}`);

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

        if (upper.match(/UTILITY|ELECTRICITY|WATER|ZESA|ZETDC/)) {
            return 'utility_bill';
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
}

module.exports = GoogleDocAIService;
