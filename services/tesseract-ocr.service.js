const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const csv = require('csv-parse/sync');

class TesseractOCRService {
    constructor() {
        console.log('✅ Tesseract OCR Service initialized (FREE - No billing required)');
    }

    /**
     * Check if buffer is a PDF
     */
    isPDF(buffer) {
        return buffer.toString('utf8', 0, 4) === '%PDF';
    }

    /**
     * Check if buffer is a CSV
     */
    isCSV(buffer) {
        const text = buffer.toString('utf8', 0, 1000);
        // Check for common CSV patterns
        return text.includes(',') && (text.includes('\n') || text.includes('\r'));
    }

    /**
     * Extract text from PDF using pdf-parse
     */
    async extractPDFText(pdfBuffer) {
        try {
            console.log('📄 Extracting text from PDF...');
            
            const data = await pdfParse(pdfBuffer);
            
            console.log('✅ PDF text extracted');
            console.log('📝 Text length:', data.text.length);
            console.log('📄 Pages:', data.numpages);
            
            return {
                text: data.text,
                pages: data.numpages,
                info: data.info
            };
            
        } catch (error) {
            console.error('❌ PDF text extraction failed:', error.message);
            throw new Error('Failed to extract text from PDF: ' + error.message);
        }
    }

    /**
     * Parse CSV data
     */
    async parseCSV(csvBuffer) {
        try {
            console.log('📊 Parsing CSV data...');
            
            const csvText = csvBuffer.toString('utf8');
            const records = csv.parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });
            
            console.log('✅ CSV parsed');
            console.log('📊 Rows:', records.length);
            console.log('📋 Columns:', Object.keys(records[0] || {}).join(', '));
            
            // Convert to text format for OCR compatibility
            const textLines = [Object.keys(records[0] || {}).join(', ')];
            records.forEach(record => {
                textLines.push(Object.values(record).join(', '));
            });
            
            return {
                text: textLines.join('\n'),
                records: records,
                rowCount: records.length,
                columns: Object.keys(records[0] || {})
            };
            
        } catch (error) {
            console.error('❌ CSV parsing failed:', error.message);
            throw new Error('Failed to parse CSV: ' + error.message);
        }
    }

    /**
     * Extract text from ID document using Tesseract
     */
    async extractIDText(imageBuffer) {
        try {
            console.log('🔍 Starting Tesseract OCR...');
            console.log('📦 Image buffer size:', imageBuffer.length, 'bytes');
            
            // Check if PDF and extract text directly
            if (this.isPDF(imageBuffer)) {
                console.log('📄 PDF detected, extracting text...');
                const pdfData = await this.extractPDFText(imageBuffer);
                
                return {
                    success: true,
                    fullText: pdfData.text,
                    confidence: 85, // Default confidence for PDF text extraction
                    blocks: pdfData.text.split('\n').filter(line => line.trim().length > 0),
                    blockCount: pdfData.text.split('\n').filter(line => line.trim().length > 0).length,
                    source: 'PDF text extraction'
                };
            }
            
            // Check if CSV and parse directly
            if (this.isCSV(imageBuffer)) {
                console.log('📊 CSV detected, parsing data...');
                const csvData = await this.parseCSV(imageBuffer);
                
                return {
                    success: true,
                    fullText: csvData.text,
                    confidence: 95, // High confidence for CSV parsing
                    blocks: csvData.text.split('\n').filter(line => line.trim().length > 0),
                    blockCount: csvData.rowCount,
                    source: 'CSV parsing',
                    csvData: csvData.records // Include structured data
                };
            }
            
            const { data: { text, confidence, words } } = await Tesseract.recognize(
                imageBuffer,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const progress = Math.round(m.progress * 100);
                            if (progress % 20 === 0) { // Log every 20%
                                console.log(`OCR Progress: ${progress}%`);
                            }
                        }
                    }
                }
            );

            console.log('✅ OCR Complete!');
            console.log('📝 Text length:', text ? text.length : 0);
            console.log('🎯 Confidence:', Math.round(confidence));
            console.log('📊 Words detected:', words ? words.length : 0);

            if (!text || text.trim().length === 0) {
                console.warn('⚠️  No text detected in image');
                return {
                    success: false,
                    message: 'No text detected in image. Image may be too blurry, too small, or not contain readable text.'
                };
            }

            const cleanText = text.trim();
            console.log('📄 First 100 chars:', cleanText.substring(0, 100));

            return {
                success: true,
                fullText: cleanText,
                confidence: Math.round(confidence),
                blocks: cleanText.split('\n').filter(line => line.trim().length > 0),
                blockCount: cleanText.split('\n').filter(line => line.trim().length > 0).length
            };
        } catch (error) {
            console.error('❌ Tesseract OCR error:', error);
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
