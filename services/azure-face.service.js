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
                    returnFaceId: false,
                    returnFaceLandmarks: false
                    // Note: All face attributes (age, gender, smile, etc.) have been deprecated
                    // and require Limited Access approval from Microsoft
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

            console.log('✅ Face detected!');
            console.log('   Face count:', detectedFaces.length);
            console.log('   Face rectangle:', face.faceRectangle);

            return {
                success: true,
                faceDetected: true,
                faceCount: detectedFaces.length,
                faceRectangle: face.faceRectangle,
                attributes: null, // Attributes require Limited Access approval
                quality: null, // Quality analysis requires Limited Access approval
                confidence: 100, // Face was detected
                limitedAccessNote: 'Face attributes (age, gender, etc.) require Microsoft Limited Access approval'
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
     * NOTE: Face verification requires Limited Access approval from Microsoft
     * https://aka.ms/cog-services-limited-access
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

            // IMPORTANT: Face verification/comparison is a Limited Access feature
            // It requires approval from Microsoft: https://aka.ms/cog-services-limited-access
            // For now, we'll provide face detection results without comparison
            
            console.log('⚠️  Face comparison requires Limited Access approval from Microsoft');
            console.log('   Providing face detection results instead');

            return {
                success: true,
                isMatch: null, // Cannot determine without Limited Access
                confidence: null,
                idFace: {
                    detected: true,
                    faceCount: idFaceResult.faceCount,
                    attributes: null, // Requires Limited Access
                    quality: null // Requires Limited Access
                },
                selfieFace: {
                    detected: true,
                    faceCount: selfieFaceResult.faceCount,
                    attributes: null, // Requires Limited Access
                    quality: null // Requires Limited Access
                },
                recommendation: 'Face comparison requires Limited Access approval from Microsoft. Both faces detected successfully. Manual verification recommended.',
                details: {
                    threshold: 'Face verification requires Microsoft approval',
                    result: 'MANUAL_REVIEW',
                    note: 'Apply for Limited Access at: https://aka.ms/cog-services-limited-access'
                }
            };

        } catch (error) {
            console.error('❌ Face comparison error:', error);
            
            // Check if it's a Limited Access error
            if (error.message && error.message.includes('Limited Access')) {
                return {
                    success: false,
                    message: 'Face verification requires Limited Access approval from Microsoft',
                    error: 'Apply at: https://aka.ms/cog-services-limited-access',
                    limitedAccessRequired: true
                };
            }
            
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

            // Note: Quality and attributes are null without Limited Access
            return {
                success: true,
                faceDetected: true,
                faceCount: faceResult.faceCount,
                faceRectangle: faceResult.faceRectangle,
                quality: null, // Requires Limited Access
                isGoodQuality: null, // Requires Limited Access
                attributes: null, // Requires Limited Access
                limitedAccessNote: faceResult.limitedAccessNote,
                recommendations: ['Face detected successfully. Quality analysis requires Microsoft Limited Access approval.']
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
