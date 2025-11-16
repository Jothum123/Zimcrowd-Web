const { FaceClient } = require('@azure/cognitiveservices-face');
const { ApiKeyCredentials } = require('@azure/ms-rest-js');

class AzureFaceService {
    constructor() {
        const endpoint = process.env.AZURE_FACE_ENDPOINT;
        const apiKey = process.env.AZURE_FACE_KEY;

        if (!endpoint || !apiKey) {
            console.warn('⚠️  Azure Face API not configured');
            console.log('   Set AZURE_FACE_ENDPOINT and AZURE_FACE_KEY in .env');
            this.client = null;
            return;
        }

        try {
            const credentials = new ApiKeyCredentials({ 
                inHeader: { 'Ocp-Apim-Subscription-Key': apiKey } 
            });
            this.client = new FaceClient(credentials, endpoint);
            console.log('✅ Azure Face API initialized');
        } catch (error) {
            console.error('❌ Azure Face API initialization failed:', error.message);
            this.client = null;
        }
    }

    /**
     * Check if Face API is available
     */
    isAvailable() {
        return this.client !== null;
    }

    /**
     * Detect face in image
     */
    async detectFace(imageBuffer) {
        if (!this.client) {
            return {
                success: false,
                message: 'Azure Face API not configured'
            };
        }

        try {
            console.log('🔍 Detecting face in image...');
            
            const detectedFaces = await this.client.face.detectWithStream(
                imageBuffer,
                {
                    returnFaceId: true,
                    returnFaceLandmarks: false,
                    returnFaceAttributes: ['age', 'gender', 'smile', 'glasses', 'emotion', 'blur', 'exposure', 'noise']
                }
            );

            if (!detectedFaces || detectedFaces.length === 0) {
                return {
                    success: false,
                    faceDetected: false,
                    message: 'No face detected in image'
                };
            }

            const face = detectedFaces[0];
            const attributes = face.faceAttributes;

            console.log('✅ Face detected!');
            console.log('   Age:', attributes.age);
            console.log('   Gender:', attributes.gender);
            console.log('   Quality:', attributes.blur.blurLevel);

            return {
                success: true,
                faceDetected: true,
                faceId: face.faceId,
                faceCount: detectedFaces.length,
                attributes: {
                    age: attributes.age,
                    gender: attributes.gender,
                    smile: attributes.smile,
                    glasses: attributes.glasses,
                    emotion: attributes.emotion,
                    quality: {
                        blur: attributes.blur.blurLevel,
                        exposure: attributes.exposure.exposureLevel,
                        noise: attributes.noise.noiseLevel
                    }
                },
                faceRectangle: face.faceRectangle,
                confidence: this.calculateConfidence(attributes)
            };

        } catch (error) {
            console.error('❌ Face detection error:', error);
            return {
                success: false,
                faceDetected: false,
                message: 'Failed to detect face',
                error: error.message
            };
        }
    }

    /**
     * Compare two faces (ID photo vs selfie)
     */
    async compareFaces(idImageBuffer, selfieImageBuffer) {
        if (!this.client) {
            return {
                success: false,
                message: 'Azure Face API not configured'
            };
        }

        try {
            console.log('🔍 Comparing faces...');

            // Detect face in ID
            const idFaceResult = await this.detectFace(idImageBuffer);
            if (!idFaceResult.success || !idFaceResult.faceDetected) {
                return {
                    success: false,
                    message: 'No face detected in ID image',
                    idFaceDetected: false
                };
            }

            // Detect face in selfie
            const selfieFaceResult = await this.detectFace(selfieImageBuffer);
            if (!selfieFaceResult.success || !selfieFaceResult.faceDetected) {
                return {
                    success: false,
                    message: 'No face detected in selfie image',
                    selfieFaceDetected: false
                };
            }

            // Verify faces match
            const verifyResult = await this.client.face.verifyFaceToFace(
                idFaceResult.faceId,
                selfieFaceResult.faceId
            );

            const isMatch = verifyResult.isIdentical;
            const confidence = Math.round(verifyResult.confidence * 100);

            console.log('✅ Face comparison complete!');
            console.log('   Match:', isMatch ? 'YES' : 'NO');
            console.log('   Confidence:', confidence + '%');

            return {
                success: true,
                isMatch: isMatch,
                confidence: confidence,
                idFace: {
                    detected: true,
                    attributes: idFaceResult.attributes,
                    quality: idFaceResult.attributes.quality
                },
                selfieFace: {
                    detected: true,
                    attributes: selfieFaceResult.attributes,
                    quality: selfieFaceResult.attributes.quality
                },
                recommendation: this.getRecommendation(isMatch, confidence),
                details: {
                    threshold: 'High confidence match requires 70%+ similarity',
                    result: confidence >= 70 ? 'PASS' : 'FAIL'
                }
            };

        } catch (error) {
            console.error('❌ Face comparison error:', error);
            return {
                success: false,
                message: 'Failed to compare faces',
                error: error.message
            };
        }
    }

    /**
     * Verify liveness (detect if selfie is live or photo of photo)
     */
    async verifyLiveness(imageBuffer) {
        if (!this.client) {
            return {
                success: false,
                message: 'Azure Face API not configured'
            };
        }

        try {
            const faceResult = await this.detectFace(imageBuffer);
            
            if (!faceResult.success || !faceResult.faceDetected) {
                return {
                    success: false,
                    message: 'No face detected for liveness check'
                };
            }

            const quality = faceResult.attributes.quality;
            
            // Liveness indicators
            const isLive = quality.blur === 'low' && 
                          quality.exposure !== 'overExposure' &&
                          quality.noise === 'low';

            return {
                success: true,
                isLive: isLive,
                confidence: faceResult.confidence,
                quality: quality,
                recommendation: isLive ? 
                    'Image appears to be a live photo' : 
                    'Image quality suggests it may be a photo of a photo'
            };

        } catch (error) {
            console.error('❌ Liveness verification error:', error);
            return {
                success: false,
                message: 'Failed to verify liveness',
                error: error.message
            };
        }
    }

    /**
     * Calculate overall confidence score
     */
    calculateConfidence(attributes) {
        let score = 100;

        // Reduce score for poor quality
        if (attributes.blur.blurLevel === 'high') score -= 20;
        if (attributes.blur.blurLevel === 'medium') score -= 10;
        
        if (attributes.exposure.exposureLevel === 'overExposure') score -= 15;
        if (attributes.exposure.exposureLevel === 'underExposure') score -= 10;
        
        if (attributes.noise.noiseLevel === 'high') score -= 15;
        if (attributes.noise.noiseLevel === 'medium') score -= 10;

        return Math.max(score, 0);
    }

    /**
     * Get recommendation based on match result
     */
    getRecommendation(isMatch, confidence) {
        if (isMatch && confidence >= 90) {
            return 'STRONG MATCH - Identity verified with high confidence';
        } else if (isMatch && confidence >= 70) {
            return 'GOOD MATCH - Identity verified with acceptable confidence';
        } else if (isMatch && confidence >= 50) {
            return 'WEAK MATCH - Manual review recommended';
        } else {
            return 'NO MATCH - Identity verification failed';
        }
    }

    /**
     * Analyze ID photo quality
     */
    async analyzeIDPhoto(imageBuffer) {
        if (!this.client) {
            return {
                success: false,
                message: 'Azure Face API not configured'
            };
        }

        try {
            const faceResult = await this.detectFace(imageBuffer);
            
            if (!faceResult.success || !faceResult.faceDetected) {
                return {
                    success: false,
                    message: 'No face detected in ID photo'
                };
            }

            const quality = faceResult.attributes.quality;
            const isGoodQuality = quality.blur === 'low' && 
                                 quality.exposure !== 'overExposure' &&
                                 quality.noise === 'low';

            return {
                success: true,
                faceDetected: true,
                quality: quality,
                isGoodQuality: isGoodQuality,
                attributes: faceResult.attributes,
                recommendations: this.getQualityRecommendations(quality)
            };

        } catch (error) {
            console.error('❌ ID photo analysis error:', error);
            return {
                success: false,
                message: 'Failed to analyze ID photo',
                error: error.message
            };
        }
    }

    /**
     * Get quality improvement recommendations
     */
    getQualityRecommendations(quality) {
        const recommendations = [];

        if (quality.blur !== 'low') {
            recommendations.push('Image is blurry - use a clearer photo');
        }
        if (quality.exposure === 'overExposure') {
            recommendations.push('Image is overexposed - reduce lighting');
        }
        if (quality.exposure === 'underExposure') {
            recommendations.push('Image is underexposed - add more lighting');
        }
        if (quality.noise !== 'low') {
            recommendations.push('Image has noise - use better camera or lighting');
        }

        if (recommendations.length === 0) {
            recommendations.push('Image quality is good!');
        }

        return recommendations;
    }
}

module.exports = AzureFaceService;
