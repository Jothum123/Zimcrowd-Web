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
     * Parse Zimbabwe ID fields from Azure result
     */
    parseIDFields(azureFields) {
        if (!azureFields) return null;

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
            nationality: null
        };

        // Map Azure fields to our structure
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

            // Parse fields
            const parsedFields = this.parseIDFields(textResult.fields);

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
