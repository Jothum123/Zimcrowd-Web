/**
 * Google Vision API Service
 * Handles OCR text detection and face detection for ZimScore module
 */

const vision = require('@google-cloud/vision');
const path = require('path');

class GoogleVisionService {
    constructor() {
        // Initialize Vision API client
        // Credentials should be in GOOGLE_APPLICATION_CREDENTIALS env variable
        // or passed as keyFilename
        this.client = new vision.ImageAnnotatorClient({
            keyFilename: process.env.GOOGLE_VISION_KEY_PATH || path.join(__dirname, '../config/google-vision-key.json')
        });
    }

    /**
     * Extract text from an image using OCR
     * @param {string|Buffer} imageSource - File path, URL, or Buffer
     * @returns {Promise<Object>} OCR results with text and confidence
     */
    async extractText(imageSource) {
        try {
            console.log('🔍 Running OCR on image...');
            
            const [result] = await this.client.textDetection(imageSource);
            const detections = result.textAnnotations;

            if (!detections || detections.length === 0) {
                return {
                    success: false,
                    text: '',
                    confidence: 0,
                    message: 'No text detected in image'
                };
            }

            // First annotation contains the full text
            const fullText = detections[0].description;
            
            // Calculate average confidence from all detections
            const confidenceScores = detections.slice(1).map(d => d.confidence || 0);
            const avgConfidence = confidenceScores.length > 0
                ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
                : 0;

            console.log(`✅ OCR complete. Extracted ${fullText.length} characters with ${(avgConfidence * 100).toFixed(1)}% confidence`);

            return {
                success: true,
                text: fullText,
                confidence: avgConfidence,
                detections: detections.slice(1), // Individual word/line detections
                fullResponse: result
            };
        } catch (error) {
            console.error('❌ OCR Error:', error);
            return {
                success: false,
                text: '',
                confidence: 0,
                error: error.message
            };
        }
    }

    /**
     * Extract structured data from a Zimbabwean ID
     * @param {string|Buffer} imageSource - ID image
     * @returns {Promise<Object>} Extracted ID data
     */
    async extractZimID(imageSource) {
        try {
            console.log('🆔 Extracting Zim ID data...');
            
            const ocrResult = await this.extractText(imageSource);
            
            if (!ocrResult.success) {
                return {
                    success: false,
                    error: 'Failed to extract text from ID'
                };
            }

            const text = ocrResult.text;
            
            // Parse Zim ID format
            // Example: "12-345678A12" or "63-123456B12"
            const idNumberPattern = /(\d{2}-\d{6,7}[A-Z]\d{2})/;
            const idMatch = text.match(idNumberPattern);

            // Extract name (usually appears as "Surname" and "First Names")
            const namePattern = /(?:Surname|SURNAME)[:\s]*([A-Z\s]+)[\n\r]+(?:First Names|FIRST NAMES)[:\s]*([A-Z\s]+)/i;
            const nameMatch = text.match(namePattern);

            // Extract date of birth
            const dobPattern = /(?:Date of Birth|DOB|Birth)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i;
            const dobMatch = text.match(dobPattern);

            // Extract village/place of origin
            const villagePattern = /(?:Village of Origin|Village)[:\s]*([A-Z\s]+)/i;
            const villageMatch = text.match(villagePattern);

            const extractedData = {
                success: true,
                idNumber: idMatch ? idMatch[1].trim() : null,
                surname: nameMatch ? nameMatch[1].trim() : null,
                firstNames: nameMatch ? nameMatch[2].trim() : null,
                fullName: nameMatch ? `${nameMatch[2].trim()} ${nameMatch[1].trim()}` : null,
                dateOfBirth: dobMatch ? dobMatch[1].trim() : null,
                villageOfOrigin: villageMatch ? villageMatch[1].trim() : null,
                rawText: text,
                confidence: ocrResult.confidence
            };

            console.log('✅ ID extraction complete:', {
                idNumber: extractedData.idNumber,
                name: extractedData.fullName
            });

            return extractedData;
        } catch (error) {
            console.error('❌ ID Extraction Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Detect faces in an image
     * @param {string|Buffer} imageSource - Image with face
     * @returns {Promise<Object>} Face detection results
     */
    async detectFaces(imageSource) {
        try {
            console.log('👤 Detecting faces...');
            
            const [result] = await this.client.faceDetection(imageSource);
            const faces = result.faceAnnotations;

            if (!faces || faces.length === 0) {
                return {
                    success: false,
                    faceCount: 0,
                    message: 'No faces detected'
                };
            }

            console.log(`✅ Detected ${faces.length} face(s)`);

            return {
                success: true,
                faceCount: faces.length,
                faces: faces.map(face => ({
                    confidence: face.detectionConfidence,
                    joyLikelihood: face.joyLikelihood,
                    sorrowLikelihood: face.sorrowLikelihood,
                    angerLikelihood: face.angerLikelihood,
                    surpriseLikelihood: face.surpriseLikelihood,
                    boundingPoly: face.boundingPoly,
                    landmarks: face.landmarks
                })),
                fullResponse: result
            };
        } catch (error) {
            console.error('❌ Face Detection Error:', error);
            return {
                success: false,
                faceCount: 0,
                error: error.message
            };
        }
    }

    /**
     * Compare two faces for similarity
     * @param {string|Buffer} image1 - First image (e.g., ID photo)
     * @param {string|Buffer} image2 - Second image (e.g., selfie)
     * @returns {Promise<Object>} Face match results
     */
    async compareFaces(image1, image2) {
        try {
            console.log('🔄 Comparing faces...');
            
            // Detect faces in both images
            const [faces1, faces2] = await Promise.all([
                this.detectFaces(image1),
                this.detectFaces(image2)
            ]);

            if (!faces1.success || !faces2.success) {
                return {
                    success: false,
                    match: false,
                    score: 0,
                    message: 'Could not detect faces in one or both images'
                };
            }

            if (faces1.faceCount === 0 || faces2.faceCount === 0) {
                return {
                    success: false,
                    match: false,
                    score: 0,
                    message: 'No faces found in one or both images'
                };
            }

            if (faces1.faceCount > 1 || faces2.faceCount > 1) {
                return {
                    success: false,
                    match: false,
                    score: 0,
                    message: 'Multiple faces detected. Please ensure only one face is visible.'
                };
            }

            // Calculate similarity based on facial landmarks
            const face1 = faces1.faces[0];
            const face2 = faces2.faces[0];

            // Simple similarity calculation based on landmark positions
            // In production, you might want to use a more sophisticated algorithm
            // or a dedicated face recognition service
            const similarity = this.calculateFaceSimilarity(face1.landmarks, face2.landmarks);

            const matchThreshold = 0.7; // 70% similarity threshold
            const isMatch = similarity >= matchThreshold;

            console.log(`✅ Face comparison complete. Similarity: ${(similarity * 100).toFixed(1)}%`);

            return {
                success: true,
                match: isMatch,
                score: similarity,
                threshold: matchThreshold,
                confidence1: face1.confidence,
                confidence2: face2.confidence
            };
        } catch (error) {
            console.error('❌ Face Comparison Error:', error);
            return {
                success: false,
                match: false,
                score: 0,
                error: error.message
            };
        }
    }

    /**
     * Calculate similarity between two sets of facial landmarks
     * @private
     */
    calculateFaceSimilarity(landmarks1, landmarks2) {
        if (!landmarks1 || !landmarks2 || landmarks1.length === 0 || landmarks2.length === 0) {
            return 0;
        }

        // Create maps of landmarks by type
        const map1 = new Map(landmarks1.map(l => [l.type, l.position]));
        const map2 = new Map(landmarks2.map(l => [l.type, l.position]));

        // Key facial landmarks to compare
        const keyLandmarks = [
            'LEFT_EYE',
            'RIGHT_EYE',
            'NOSE_TIP',
            'UPPER_LIP',
            'LOWER_LIP',
            'LEFT_EAR_TRAGION',
            'RIGHT_EAR_TRAGION'
        ];

        let totalDistance = 0;
        let comparedCount = 0;

        for (const landmarkType of keyLandmarks) {
            const pos1 = map1.get(landmarkType);
            const pos2 = map2.get(landmarkType);

            if (pos1 && pos2) {
                // Calculate Euclidean distance
                const distance = Math.sqrt(
                    Math.pow(pos1.x - pos2.x, 2) +
                    Math.pow(pos1.y - pos2.y, 2) +
                    Math.pow((pos1.z || 0) - (pos2.z || 0), 2)
                );
                totalDistance += distance;
                comparedCount++;
            }
        }

        if (comparedCount === 0) {
            return 0;
        }

        // Normalize distance to similarity score (0-1)
        // Lower distance = higher similarity
        const avgDistance = totalDistance / comparedCount;
        const maxExpectedDistance = 100; // Adjust based on testing
        const similarity = Math.max(0, 1 - (avgDistance / maxExpectedDistance));

        return similarity;
    }

    /**
     * Extract financial data from bank/EcoCash statement
     * @param {string|Buffer} imageSource - Statement image/PDF
     * @returns {Promise<Object>} Extracted financial data
     */
    async extractStatementData(imageSource) {
        try {
            console.log('💰 Extracting statement data...');
            
            const ocrResult = await this.extractText(imageSource);
            
            if (!ocrResult.success) {
                return {
                    success: false,
                    error: 'Failed to extract text from statement'
                };
            }

            const text = ocrResult.text;
            
            // This will be further processed by StatementParser service
            // Here we just return the raw OCR text
            return {
                success: true,
                rawText: text,
                confidence: ocrResult.confidence,
                detections: ocrResult.detections
            };
        } catch (error) {
            console.error('❌ Statement Extraction Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Batch process multiple documents
     * @param {Array} documents - Array of {type, imageSource}
     * @returns {Promise<Array>} Results for each document
     */
    async batchProcessDocuments(documents) {
        console.log(`📦 Batch processing ${documents.length} documents...`);
        
        const results = await Promise.allSettled(
            documents.map(async (doc) => {
                switch (doc.type) {
                    case 'ZIM_ID':
                    case 'PASSPORT':
                        return await this.extractZimID(doc.imageSource);
                    case 'SELFIE':
                        return await this.detectFaces(doc.imageSource);
                    case 'BANK_STATEMENT':
                    case 'ECOCASH_STATEMENT':
                        return await this.extractStatementData(doc.imageSource);
                    default:
                        return await this.extractText(doc.imageSource);
                }
            })
        );

        return results.map((result, index) => ({
            type: documents[index].type,
            success: result.status === 'fulfilled',
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason : null
        }));
    }
}

// Singleton instance
let visionServiceInstance = null;

function getVisionService() {
    if (!visionServiceInstance) {
        visionServiceInstance = new GoogleVisionService();
    }
    return visionServiceInstance;
}

module.exports = {
    GoogleVisionService,
    getVisionService
};
