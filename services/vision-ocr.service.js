const vision = require('@google-cloud/vision');
const path = require('path');
const TesseractOCRService = require('./tesseract-ocr.service');
const AzureDocumentOCRService = require('./azure-document-ocr.service');

class VisionOCRService {
    constructor() {
        this.useGoogleVision = false;
        this.useAzure = false;
        this.tesseractService = null;
        this.azureService = null;

        // Try Azure Document Intelligence first (best for IDs)
        this.azureService = new AzureDocumentOCRService();
        if (this.azureService.isAvailable()) {
            this.useAzure = true;
            console.log('✅ Using Azure Document Intelligence (Primary)');
        } else {
            console.log('⚠️  Azure not configured, using Tesseract OCR (Free)');
            this.tesseractService = new TesseractOCRService();
        }
        
        // Uncomment below to try Google Vision (requires billing enabled)
        /*
        try {
            // Try to initialize Google Vision
            if (process.env.GOOGLE_VISION_CREDENTIALS) {
                // Use environment variable (Render, production)
                const credentials = JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS);
                this.client = new vision.ImageAnnotatorClient({ credentials });
                this.useGoogleVision = true;
                console.log('✅ Google Vision initialized from environment variable');
            } else {
                // Use JSON key file (local development)
                const keyPath = path.join(__dirname, '../config/google-vision-key.json');
                this.client = new vision.ImageAnnotatorClient({ keyFilename: keyPath });
                this.useGoogleVision = true;
                console.log('✅ Google Vision initialized from key file');
            }
        } catch (error) {
            console.warn('⚠️  Google Vision initialization failed:', error.message);
            console.log('🔄 Falling back to Tesseract OCR (Free)');
            this.tesseractService = new TesseractOCRService();
        }
        */
    }

    /**
     * Extract text from ID document
     */
    async extractIDText(imageBuffer) {
        // Use Azure if available (best accuracy)
        if (this.useAzure && this.azureService) {
            return await this.azureService.extractIDText(imageBuffer);
        }
        
        // Fallback to Tesseract (free OCR)
        if (this.tesseractService) {
            return await this.tesseractService.extractIDText(imageBuffer);
        }

        try {
            const [result] = await this.client.textDetection(imageBuffer);
            const detections = result.textAnnotations;
            
            if (!detections || detections.length === 0) {
                return {
                    success: false,
                    message: 'No text detected in image'
                };
            }

            const fullText = detections[0].description;
            const blocks = detections.slice(1).map(text => ({
                text: text.description,
                confidence: text.confidence || 0,
                bounds: text.boundingPoly
            }));

            return {
                success: true,
                fullText: fullText,
                blocks: blocks,
                detectedFields: this.parseIDFields(fullText),
                blockCount: blocks.length
            };
        } catch (error) {
            console.error('Vision AI OCR Error:', error);
            return {
                success: false,
                message: 'OCR processing failed',
                error: error.message
            };
        }
    }

    /**
     * Parse Zimbabwe National ID fields
     */
    parseIDFields(text) {
        const fields = {};

        // Zimbabwe National ID: XX-XXXXXXX X XX
        const idPattern = /\b\d{2}-\d{6,7}\s?[A-Z]\s?\d{2}\b/;
        const idMatch = text.match(idPattern);
        if (idMatch) {
            fields.nationalId = idMatch[0].replace(/\s/g, '');
        }

        // Full name
        const namePatterns = [
            /(?:NAME|SURNAME|FULL NAME)[:\s]+([A-Z][A-Z\s]+)/i,
            /(?:SURNAME)[:\s]+([A-Z]+)\s+(?:NAME)[:\s]+([A-Z]+)/i
        ];
        
        for (const pattern of namePatterns) {
            const nameMatch = text.match(pattern);
            if (nameMatch) {
                if (nameMatch[2]) {
                    fields.fullName = `${nameMatch[1].trim()} ${nameMatch[2].trim()}`;
                } else {
                    fields.fullName = nameMatch[1].trim();
                }
                break;
            }
        }

        // Date of birth
        const dobPatterns = [
            /(?:DATE OF BIRTH|DOB|BORN)[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
            /(?:DATE OF BIRTH|DOB)[:\s]+(\d{1,2}\s+[A-Z]+\s+\d{4})/i
        ];
        
        for (const pattern of dobPatterns) {
            const dobMatch = text.match(pattern);
            if (dobMatch) {
                fields.dateOfBirth = dobMatch[1];
                break;
            }
        }

        // Gender
        const genderPattern = /(?:SEX|GENDER)[:\s]+(MALE|FEMALE|M|F)/i;
        const genderMatch = text.match(genderPattern);
        if (genderMatch) {
            const gender = genderMatch[1].toUpperCase();
            fields.gender = gender === 'M' || gender === 'MALE' ? 'M' : 'F';
        }

        // Address
        const addressPattern = /(?:ADDRESS|RESIDENCE)[:\s]+([A-Z0-9][A-Z0-9\s,.-]+?)(?=\n|$|VILLAGE|DISTRICT)/i;
        const addressMatch = text.match(addressPattern);
        if (addressMatch) {
            fields.address = addressMatch[1].trim();
        }

        // Village
        const villagePattern = /(?:VILLAGE|WARD)[:\s]+([A-Z][A-Z\s]+?)(?=\n|$|DISTRICT)/i;
        const villageMatch = text.match(villagePattern);
        if (villageMatch) {
            fields.village = villageMatch[1].trim();
        }

        // District
        const districtPattern = /(?:DISTRICT)[:\s]+([A-Z][A-Z\s]+?)(?=\n|$)/i;
        const districtMatch = text.match(districtPattern);
        if (districtMatch) {
            fields.district = districtMatch[1].trim();
        }

        return fields;
    }

    /**
     * Detect faces in document
     */
    async detectFace(imageBuffer) {
        try {
            const [result] = await this.client.faceDetection(imageBuffer);
            const faces = result.faceAnnotations;

            if (!faces || faces.length === 0) {
                return {
                    success: true,
                    faceDetected: false,
                    faceCount: 0,
                    confidence: 0
                };
            }

            return {
                success: true,
                faceDetected: true,
                faceCount: faces.length,
                confidence: faces[0].detectionConfidence,
                faces: faces.map(face => ({
                    confidence: face.detectionConfidence,
                    bounds: face.boundingPoly
                }))
            };
        } catch (error) {
            console.error('Face detection error:', error);
            return {
                success: false,
                faceDetected: false,
                error: error.message
            };
        }
    }

    /**
     * Verify document quality
     */
    async verifyQuality(imageBuffer) {
        try {
            const [result] = await this.client.imageProperties(imageBuffer);
            const props = result.imagePropertiesAnnotation;

            const colorCount = props.dominantColors.colors.length;
            const isGoodQuality = colorCount > 5;

            return {
                success: true,
                isGoodQuality: isGoodQuality,
                colorCount: colorCount,
                dominantColors: props.dominantColors.colors.slice(0, 3)
            };
        } catch (error) {
            console.error('Quality check error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Detect document type
     */
    async detectDocumentType(imageBuffer) {
        try {
            const [result] = await this.client.documentTextDetection(imageBuffer);
            const fullText = result.fullTextAnnotation?.text || '';
            const textUpper = fullText.toUpperCase();

            if (textUpper.includes('NATIONAL ID') || 
                textUpper.includes('IDENTITY CARD') || 
                textUpper.includes('REPUBLIC OF ZIMBABWE')) {
                return 'national_id';
            } else if (textUpper.includes('PASSPORT')) {
                return 'passport';
            } else if (textUpper.includes('DRIVER') || textUpper.includes('LICENSE')) {
                return 'drivers_license';
            } else if (textUpper.includes('UTILITY') || 
                       textUpper.includes('BILL') || 
                       textUpper.includes('STATEMENT')) {
                return 'proof_of_address';
            }

            return 'unknown';
        } catch (error) {
            console.error('Document type detection error:', error);
            return 'unknown';
        }
    }

    /**
     * Comprehensive document analysis
     */
    async analyzeDocument(imageBuffer, expectedType = null) {
        // Use Azure if available (best for ID documents)
        if (this.useAzure && this.azureService) {
            return await this.azureService.analyzeDocument(imageBuffer, expectedType);
        }
        
        // Fallback to Tesseract (free OCR)
        if (this.tesseractService) {
            return await this.tesseractService.analyzeDocument(imageBuffer, expectedType);
        }

        try {
            const [ocrResult, faceResult, qualityResult, detectedType] = await Promise.all([
                this.extractIDText(imageBuffer),
                this.detectFace(imageBuffer),
                this.verifyQuality(imageBuffer),
                this.detectDocumentType(imageBuffer)
            ]);

            const typeMatch = expectedType ? detectedType === expectedType : true;

            let confidenceScore = 0;
            let confidenceFactors = [];

            if (ocrResult.success && ocrResult.blockCount > 10) {
                confidenceScore += 30;
                confidenceFactors.push('Text detected');
            }

            if (faceResult.faceDetected && faceResult.confidence > 0.8) {
                confidenceScore += 30;
                confidenceFactors.push('Face detected');
            }

            if (qualityResult.isGoodQuality) {
                confidenceScore += 20;
                confidenceFactors.push('Good quality');
            }

            if (typeMatch) {
                confidenceScore += 20;
                confidenceFactors.push('Type matches');
            }

            return {
                success: true,
                documentType: detectedType,
                typeMatch: typeMatch,
                confidenceScore: confidenceScore,
                confidenceFactors: confidenceFactors,
                ocr: {
                    textDetected: ocrResult.success,
                    fullText: ocrResult.fullText,
                    detectedFields: ocrResult.detectedFields,
                    blockCount: ocrResult.blockCount
                },
                face: {
                    detected: faceResult.faceDetected,
                    count: faceResult.faceCount,
                    confidence: faceResult.confidence
                },
                quality: {
                    isGood: qualityResult.isGoodQuality,
                    colorCount: qualityResult.colorCount
                },
                recommendation: confidenceScore >= 70 ? 'approve' : 'review'
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

module.exports = VisionOCRService;
