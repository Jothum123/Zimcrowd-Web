const { DocumentAnalysisClient, AzureKeyCredential } = require('@azure/ai-form-recognizer');

class AzureDocumentOCRService {
    constructor() {
        // Initialize Azure Document Intelligence client
        const endpoint = process.env.AZURE_DOCUMENT_ENDPOINT;
        const apiKey = process.env.AZURE_DOCUMENT_KEY;

        if (!endpoint || !apiKey) {
            console.warn('⚠️  Azure Document Intelligence not configured');
            console.log('   Set AZURE_DOCUMENT_ENDPOINT and AZURE_DOCUMENT_KEY in .env');
            this.client = null;
            return;
        }

        try {
            this.client = new DocumentAnalysisClient(
                endpoint,
                new AzureKeyCredential(apiKey)
            );
            console.log('✅ Azure Document Intelligence initialized');
        } catch (error) {
            console.error('❌ Azure Document Intelligence initialization failed:', error.message);
            this.client = null;
        }
    }

    /**
     * Check if Azure service is available
     */
    isAvailable() {
        return this.client !== null;
    }

    /**
     * Extract text from ID document using Azure Document Intelligence
     */
    async extractIDText(imageBuffer) {
        if (!this.client) {
            return {
                success: false,
                message: 'Azure Document Intelligence not configured'
            };
        }

        try {
            console.log('🔍 Starting Azure Document Intelligence OCR...');
            console.log('📦 Image buffer size:', imageBuffer.length, 'bytes');

            // Use prebuilt-idDocument model for ID cards
            const poller = await this.client.beginAnalyzeDocument(
                'prebuilt-idDocument',
                imageBuffer
            );

            const result = await poller.pollUntilDone();

            console.log('✅ Azure OCR Complete!');

            if (!result.documents || result.documents.length === 0) {
                console.warn('⚠️  No documents detected');
                return {
                    success: false,
                    message: 'No ID document detected in image'
                };
            }

            const document = result.documents[0];
            const fields = document.fields || {};

            // Extract all text content
            let fullText = '';
            if (result.content) {
                fullText = result.content;
            }

            console.log('📝 Text length:', fullText.length);
            console.log('🎯 Confidence:', Math.round(document.confidence * 100) + '%');
            console.log('📊 Fields detected:', Object.keys(fields).length);

            return {
                success: true,
                fullText: fullText,
                confidence: Math.round(document.confidence * 100),
                fields: fields,
                documentType: document.docType,
                blockCount: result.pages ? result.pages.length : 0
            };

        } catch (error) {
            console.error('❌ Azure Document Intelligence error:', error);
            return {
                success: false,
                message: 'Failed to extract text with Azure',
                error: error.message
            };
        }
    }

    /**
     * Parse Zimbabwe ID BACK fields from text
     */
    parseZimbabweIDBackFromText(text) {
        const fields = {
            address: null,
            district: null,
            province: null,
            chiefName: null,
            signature: null,
            registrarSignature: null,
            dateIssued: null
        };

        // Address (multiple lines after ADDRESS or RESIDENTIAL ADDRESS)
        const addressMatch = text.match(/(?:RESIDENTIAL\s+)?ADDRESS[:\s]*\n?\s*([A-Z0-9\s,.-]+?)(?=\n[A-Z]+:|$)/i);
        if (addressMatch) {
            fields.address = addressMatch[1].trim().replace(/\s+/g, ' ');
        }

        // District
        const districtMatch = text.match(/DISTRICT[:\s]*\n?\s*([A-Z\s]+)/i);
        if (districtMatch) {
            fields.district = districtMatch[1].trim();
        }

        // Province
        const provinceMatch = text.match(/PROVINCE[:\s]*\n?\s*([A-Z\s]+)/i);
        if (provinceMatch) {
            fields.province = provinceMatch[1].trim();
        }

        // Chief Name
        const chiefMatch = text.match(/CHIEF[:\s]*\n?\s*([A-Z\s]+)/i);
        if (chiefMatch) {
            fields.chiefName = chiefMatch[1].trim();
        }

        // Date Issued (if different from front)
        const dateMatch = text.match(/(?:DATE\s+(?:OF\s+)?ISSUE|ISSUED)[:\s]*\n?\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (dateMatch) {
            fields.dateIssued = dateMatch[1];
        }

        return fields;
    }

    /**
     * Parse bank statement information from text
     */
    parseBankStatementFromText(text) {
        const fields = {
            bankName: null,
            accountNumber: null,
            accountHolder: null,
            statementPeriod: null,
            openingBalance: null,
            closingBalance: null,
            totalCredits: null,
            totalDebits: null,
            currency: null,
            branch: null,
            accountType: null
        };

        // Bank Name (common Zimbabwe banks)
        const bankMatch = text.match(/(CBZ|CABS|STEWARD|STANBIC|STANDARD\s+CHARTERED|FBC|NMB|ZB\s+BANK|ECOBANK|NEDBANK)/i);
        if (bankMatch) {
            fields.bankName = bankMatch[1].trim();
        }

        // Account Number (various formats)
        const accountMatch = text.match(/(?:ACCOUNT\s+(?:NO|NUMBER|#)[:\s]*|A\/C[:\s]*)(\d{8,16})/i);
        if (accountMatch) {
            fields.accountNumber = accountMatch[1];
        }

        // Account Holder Name
        const holderMatch = text.match(/(?:ACCOUNT\s+HOLDER|NAME)[:\s]*\n?\s*([A-Z\s]+?)(?=\n|ACCOUNT)/i);
        if (holderMatch) {
            fields.accountHolder = holderMatch[1].trim();
        }

        // Statement Period
        const periodMatch = text.match(/(?:STATEMENT\s+PERIOD|FROM)[:\s]*(\d{2}\/\d{2}\/\d{4})\s*(?:TO|-)\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (periodMatch) {
            fields.statementPeriod = `${periodMatch[1]} to ${periodMatch[2]}`;
        }

        // Opening Balance
        const openingMatch = text.match(/(?:OPENING|PREVIOUS)\s+BALANCE[:\s]*([A-Z]{3})?\s*([\d,]+\.\d{2})/i);
        if (openingMatch) {
            fields.currency = openingMatch[1] || 'USD';
            fields.openingBalance = openingMatch[2].replace(/,/g, '');
        }

        // Closing Balance
        const closingMatch = text.match(/(?:CLOSING|CURRENT)\s+BALANCE[:\s]*([A-Z]{3})?\s*([\d,]+\.\d{2})/i);
        if (closingMatch) {
            if (!fields.currency) fields.currency = closingMatch[1] || 'USD';
            fields.closingBalance = closingMatch[2].replace(/,/g, '');
        }

        // Total Credits
        const creditsMatch = text.match(/(?:TOTAL\s+)?CREDITS?[:\s]*([A-Z]{3})?\s*([\d,]+\.\d{2})/i);
        if (creditsMatch) {
            fields.totalCredits = creditsMatch[2].replace(/,/g, '');
        }

        // Total Debits
        const debitsMatch = text.match(/(?:TOTAL\s+)?DEBITS?[:\s]*([A-Z]{3})?\s*([\d,]+\.\d{2})/i);
        if (debitsMatch) {
            fields.totalDebits = debitsMatch[2].replace(/,/g, '');
        }

        // Branch
        const branchMatch = text.match(/BRANCH[:\s]*([A-Z\s]+?)(?=\n|$)/i);
        if (branchMatch) {
            fields.branch = branchMatch[1].trim();
        }

        // Account Type
        const typeMatch = text.match(/(SAVINGS|CURRENT|CHEQUE|TRANSMISSION)/i);
        if (typeMatch) {
            fields.accountType = typeMatch[1].trim();
        }

        return fields;
    }

    /**
     * Parse Zimbabwe ID FRONT fields from text
     */
    parseZimbabweIDFromText(text) {
        const fields = {
            idNumber: null,
            firstName: null,
            lastName: null,
            dateOfBirth: null,
            placeOfBirth: null,
            dateOfIssue: null,
            villageOfOrigin: null,
            address: null,
            sex: null,
            nationality: 'Zimbabwe'
        };

        // ID Number pattern: XX- XXXXXX F XX CIT M (with variable spacing)
        const idMatch = text.match(/ID\s+NUMBER[:\s]*\n?\s*(\d{2}[-\s]+\d{6}\s+[A-Z]\s+\d{2}\s+[A-Z]+\s+[A-Z])/i);
        if (idMatch) {
            // Normalize spacing: keep single spaces, remove extra spaces
            fields.idNumber = idMatch[1].replace(/\s+/g, ' ').replace(/- /g, '-').trim();
        }

        // First Name (after "FIRST NAME")
        const firstNameMatch = text.match(/FIRST\s+NAME[:\s]*\n?\s*([A-Z]+)/i);
        if (firstNameMatch) {
            fields.firstName = firstNameMatch[1].trim();
        }

        // Surname (after "SURNAME")
        const surnameMatch = text.match(/SURNAME[:\s]*\n?\s*([A-Z]+)/i);
        if (surnameMatch) {
            fields.lastName = surnameMatch[1].trim();
        }

        // Date of Birth (DD/MM/YYYY format)
        const dobMatch = text.match(/DATE\s+OF\s+BIRTH[:\s]*\n?\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (dobMatch) {
            fields.dateOfBirth = dobMatch[1];
        }

        // Place of Birth
        const pobMatch = text.match(/PLACE\s+OF\s+BIRTH[:\s]*\n?\s*([A-Z]+)/i);
        if (pobMatch) {
            fields.placeOfBirth = pobMatch[1].trim();
        }

        // Date of Issue
        const doiMatch = text.match(/DATE\s+OF\s+ISSUE[:\s]*\n?\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (doiMatch) {
            fields.dateOfIssue = doiMatch[1];
        }

        // Village of Origin
        const villageMatch = text.match(/VILLAGE\s+OF\s+ORIGIN[:\s]*\n?\s*([A-Z]+)/i);
        if (villageMatch) {
            fields.villageOfOrigin = villageMatch[1].trim();
        }

        // Sex (M or F - look for it after CIT or at end of ID number)
        const sexMatch = text.match(/CIT\s+([MF])\b/i) || text.match(/\d{2}\s+([MF])\b/);
        if (sexMatch) {
            fields.sex = sexMatch[1].toUpperCase() === 'M' ? 'Male' : 'Female';
        }

        return fields;
    }

    /**
     * Detect document type from text
     */
    detectDocumentTypeFromText(text) {
        // Bank Statement
        if (text.match(/BANK\s+STATEMENT|ACCOUNT\s+STATEMENT|STATEMENT\s+OF\s+ACCOUNT/i)) {
            return 'bank_statement';
        }
        
        // ID Back (has address, district, province)
        if (text.match(/RESIDENTIAL\s+ADDRESS|DISTRICT|PROVINCE|CHIEF/i) && 
            !text.match(/ID\s+NUMBER|FIRST\s+NAME|SURNAME/i)) {
            return 'id_back';
        }
        
        // ID Front (has ID number, names, DOB)
        if (text.match(/ID\s+NUMBER|NATIONAL\s+REGISTRATION/i)) {
            return 'id_front';
        }
        
        return 'unknown';
    }

    /**
     * Parse document fields based on type
     */
    parseIDFields(azureFields, fullText) {
        // Detect document type
        const docType = this.detectDocumentTypeFromText(fullText || '');
        
        let fields = {};

        // Try Azure fields first
        if (azureFields) {
            if (azureFields.DocumentNumber?.content) {
                fields.idNumber = azureFields.DocumentNumber.content;
            }
            if (azureFields.FirstName?.content) {
                fields.firstName = azureFields.FirstName.content;
            }
            if (azureFields.LastName?.content) {
                fields.lastName = azureFields.LastName.content;
            }
            if (azureFields.DateOfBirth?.content) {
                fields.dateOfBirth = azureFields.DateOfBirth.content;
            }
            if (azureFields.PlaceOfBirth?.content) {
                fields.placeOfBirth = azureFields.PlaceOfBirth.content;
            }
            if (azureFields.DateOfIssue?.content) {
                fields.dateOfIssue = azureFields.DateOfIssue.content;
            }
            if (azureFields.Address?.content) {
                fields.address = azureFields.Address.content;
            }
            if (azureFields.Sex?.content) {
                fields.sex = azureFields.Sex.content;
            }
            if (azureFields.CountryRegion?.content) {
                fields.nationality = azureFields.CountryRegion.content;
            }
        }

        // Fallback to text parsing based on document type
        if (fullText) {
            let textFields = {};
            
            if (docType === 'bank_statement') {
                textFields = this.parseBankStatementFromText(fullText);
            } else if (docType === 'id_back') {
                textFields = this.parseZimbabweIDBackFromText(fullText);
            } else {
                // Default to ID front
                textFields = this.parseZimbabweIDFromText(fullText);
            }
            
            // Fill in missing fields from text parsing
            Object.keys(textFields).forEach(key => {
                if (!fields[key] && textFields[key]) {
                    fields[key] = textFields[key];
                }
            });
        }

        // Add document type to fields
        fields.documentType = docType;

        return fields;
    }

    /**
     * Detect face in document (Azure can detect photos)
     */
    async detectFace(imageBuffer) {
        if (!this.client) {
            return {
                success: false,
                faceDetected: false,
                message: 'Azure Document Intelligence not configured'
            };
        }

        try {
            const poller = await this.client.beginAnalyzeDocument(
                'prebuilt-idDocument',
                imageBuffer
            );

            const result = await poller.pollUntilDone();

            // Check if document has a photo field
            const hasPhoto = result.documents?.[0]?.fields?.Photo !== undefined;

            return {
                success: true,
                faceDetected: hasPhoto,
                faceCount: hasPhoto ? 1 : 0,
                confidence: hasPhoto ? 90 : 0,
                message: hasPhoto ? 'Photo detected in ID document' : 'No photo detected'
            };

        } catch (error) {
            console.error('Face detection error:', error);
            return {
                success: false,
                faceDetected: false,
                message: 'Failed to detect face',
                error: error.message
            };
        }
    }

    /**
     * Verify image quality
     */
    async verifyQuality(imageBuffer) {
        if (!this.client) {
            return {
                success: false,
                message: 'Azure Document Intelligence not configured'
            };
        }

        try {
            const poller = await this.client.beginAnalyzeDocument(
                'prebuilt-read',
                imageBuffer
            );

            const result = await poller.pollUntilDone();

            // Check confidence scores
            const avgConfidence = result.pages?.reduce((sum, page) => {
                return sum + (page.confidence || 0);
            }, 0) / (result.pages?.length || 1);

            const isGoodQuality = avgConfidence > 0.7;

            return {
                success: true,
                isGoodQuality: isGoodQuality,
                quality: {
                    brightness: 'good',
                    sharpness: isGoodQuality ? 'good' : 'poor',
                    overall: isGoodQuality ? 'good' : 'poor',
                    suitable: isGoodQuality,
                    confidence: Math.round(avgConfidence * 100)
                },
                message: isGoodQuality ? 'Good quality image' : 'Poor quality image'
            };

        } catch (error) {
            console.error('Quality verification error:', error);
            return {
                success: false,
                message: 'Failed to verify quality',
                error: error.message
            };
        }
    }

    /**
     * Comprehensive document analysis
     */
    async analyzeDocument(imageBuffer, documentType) {
        if (!this.client) {
            return {
                success: false,
                message: 'Azure Document Intelligence not configured'
            };
        }

        try {
            console.log(`Analyzing ${documentType} document with Azure Document Intelligence...`);

            // Extract text and fields
            const textResult = await this.extractIDText(imageBuffer);

            if (!textResult.success) {
                return {
                    success: false,
                    message: textResult.message || 'Failed to extract text'
                };
            }

            // Parse fields (with text fallback)
            const parsedFields = this.parseIDFields(textResult.fields, textResult.fullText);

            // Face detection
            const faceResult = await this.detectFace(imageBuffer);

            // Quality check
            const qualityResult = await this.verifyQuality(imageBuffer);

            return {
                success: true,
                documentType: textResult.documentType || documentType || 'national_id',
                fullText: textResult.fullText,
                parsedFields: parsedFields,
                textExtracted: true,
                faceDetected: faceResult.faceDetected,
                qualityAcceptable: qualityResult.isGoodQuality,
                overallConfidence: textResult.confidence,
                ocrEngine: 'Azure Document Intelligence',
                azureFields: textResult.fields, // Include raw Azure fields
                note: 'Processed with Azure AI Document Intelligence'
            };

        } catch (error) {
            console.error('Document analysis error:', error);
            return {
                success: false,
                message: 'Failed to analyze document',
                error: error.message
            };
        }
    }
}

module.exports = AzureDocumentOCRService;
