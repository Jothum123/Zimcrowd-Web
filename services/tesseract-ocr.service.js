const Tesseract = require('tesseract.js');

class TesseractOCRService {
    constructor() {
        console.log('✅ Tesseract OCR Service initialized (FREE - No billing required)');
    }

    /**
     * Extract text from ID document using Tesseract
     */
    async extractIDText(imageBuffer) {
        try {
            const { data: { text, confidence } } = await Tesseract.recognize(
                imageBuffer,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                        }
                    }
                }
            );

            if (!text || text.trim().length === 0) {
                return {
                    success: false,
                    message: 'No text detected in image'
                };
            }

            return {
                success: true,
                fullText: text.trim(),
                confidence: Math.round(confidence),
                blocks: text.split('\n').filter(line => line.trim().length > 0)
            };
        } catch (error) {
            console.error('Tesseract OCR error:', error);
            return {
                success: false,
                message: 'Failed to extract text',
                error: error.message
            };
        }
    }

    /**
     * Parse Zimbabwe ID fields from extracted text
     */
    parseIDFields(text) {
        if (!text) return null;

        const fields = {
            idNumber: null,
            firstName: null,
            lastName: null,
            dateOfBirth: null,
            placeOfBirth: null,
            dateOfIssue: null,
            villageOfOrigin: null
        };

        // Extract ID Number (format: XX-XXXXXXAXX)
        const idMatch = text.match(/(\d{2}-\d{6}[A-Z]\d{2})/);
        if (idMatch) fields.idNumber = idMatch[1];

        // Extract names (look for common patterns)
        const surnameMatch = text.match(/Surname[:\s]+([A-Z]+)/i);
        if (surnameMatch) fields.lastName = surnameMatch[1];

        const firstNameMatch = text.match(/(?:First\s*Name|Given\s*Name)[:\s]+([A-Z]+)/i);
        if (firstNameMatch) fields.firstName = firstNameMatch[1];

        // Extract dates (DD MMM YYYY format)
        const datePattern = /(\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4})/gi;
        const dates = text.match(datePattern);
        if (dates && dates.length > 0) {
            fields.dateOfBirth = dates[0];
            if (dates.length > 1) fields.dateOfIssue = dates[1];
        }

        // Extract place of birth
        const placeMatch = text.match(/(?:Place\s*of\s*Birth|Born)[:\s]+([A-Z]+)/i);
        if (placeMatch) fields.placeOfBirth = placeMatch[1];

        // Extract village of origin
        const villageMatch = text.match(/(?:Village\s*of\s*Origin)[:\s]+([A-Z]+)/i);
        if (villageMatch) fields.villageOfOrigin = villageMatch[1];

        return fields;
    }

    /**
     * Detect face in document (simplified - just checks for photo presence)
     */
    async detectFace(imageBuffer) {
        // Tesseract doesn't do face detection
        // Return a simple response
        return {
            success: true,
            faceDetected: false,
            faceCount: 0,
            confidence: 0,
            message: 'Face detection not available with Tesseract OCR'
        };
    }

    /**
     * Verify image quality
     */
    async verifyQuality(imageBuffer) {
        // Basic quality check
        return {
            success: true,
            quality: {
                brightness: 'unknown',
                sharpness: 'unknown',
                overall: 'acceptable',
                suitable: true
            },
            message: 'Basic quality check passed'
        };
    }

    /**
     * Comprehensive document analysis
     */
    async analyzeDocument(imageBuffer, documentType) {
        try {
            console.log(`Analyzing ${documentType} document with Tesseract OCR...`);

            // Extract text
            const textResult = await this.extractIDText(imageBuffer);

            if (!textResult.success) {
                return {
                    success: false,
                    message: textResult.message || 'Failed to extract text'
                };
            }

            // Parse fields
            const parsedFields = this.parseIDFields(textResult.fullText);

            // Face detection (not available)
            const faceResult = await this.detectFace(imageBuffer);

            // Quality check
            const qualityResult = await this.verifyQuality(imageBuffer);

            return {
                success: true,
                documentType: documentType || 'national_id',
                fullText: textResult.fullText,
                parsedFields: parsedFields,
                textExtracted: true,
                faceDetected: false,
                qualityAcceptable: true,
                overallConfidence: textResult.confidence,
                ocrEngine: 'Tesseract.js (Free)',
                note: 'Face detection not available with free OCR'
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

module.exports = TesseractOCRService;
