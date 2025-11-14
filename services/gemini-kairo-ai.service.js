/**
 * Gemini-Powered Kairo AI Service (FREE)
 * Uses Google's Gemini Pro model with generous free tier
 */

const KairoAIService = require('./kairo-ai.service');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiKairoAIService extends KairoAIService {
    constructor() {
        super();
        
        // Initialize Gemini only if API key is provided
        this.useAI = !!process.env.GEMINI_API_KEY;
        
        if (this.useAI) {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        }
        
        console.log(`🤖 Kairo AI initialized with ${this.useAI ? 'Gemini AI' : 'Rule-based'} responses`);
    }

    /**
     * Enhanced message processing with Gemini AI
     */
    async processMessage(userId, message, conversationContext = {}) {
        try {
            // Analyze intent first
            const intent = await this.analyzeIntent(message);
            
            // Get user profile
            const userProfile = await this.getUserFinancialProfile(userId);
            
            let response;
            
            // Decide whether to use AI or rules
            if (this.shouldUseAI(intent, message)) {
                response = await this.generateGeminiResponse(message, userProfile, conversationContext);
            } else {
                response = await this.generateResponse(intent, message, userProfile, conversationContext);
            }
            
            // Save conversation
            await this.saveConversation(userId, message, response, intent);
            
            return {
                success: true,
                response: response,
                intent: intent,
                suggestions: await this.generateSuggestions(intent, userProfile),
                aiPowered: this.shouldUseAI(intent, message) && this.useAI,
                model: this.useAI ? 'gemini-pro' : 'rule-based'
            };
        } catch (error) {
            console.error('Gemini Kairo AI processing error:', error);
            
            // Fallback to rule-based response
            return await super.processMessage(userId, message, conversationContext);
        }
    }

    /**
     * Determine if AI should be used for this query
     */
    shouldUseAI(intent, message) {
        if (!this.useAI) return false;
        
        // Use AI for complex queries
        const complexKeywords = [
            'explain', 'why', 'how does', 'what if', 'compare', 'analyze',
            'strategy', 'plan', 'advice', 'recommend', 'should i', 'help me decide',
            'tell me about', 'what are the benefits', 'pros and cons'
        ];
        
        const hasComplexKeywords = complexKeywords.some(keyword => 
            message.toLowerCase().includes(keyword)
        );
        
        const isLongMessage = message.length > 40;
        const isOpenEndedQuestion = message.includes('?') && message.length > 20;
        
        return hasComplexKeywords || isLongMessage || isOpenEndedQuestion;
    }

    /**
     * Generate AI-powered response using Gemini
     */
    async generateGeminiResponse(userMessage, userProfile, conversationContext) {
        try {
            const prompt = this.buildGeminiPrompt(userMessage, userProfile);
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let aiResponse = response.text();
            
            // Post-process response
            aiResponse = this.enhanceResponseWithBranding(aiResponse, userProfile);
            
            return aiResponse;
        } catch (error) {
            console.error('Gemini API error:', error);
            
            // Check if it's a rate limit error
            if (error.message?.includes('quota') || error.message?.includes('rate')) {
                console.log('⚠️ Gemini rate limit reached, falling back to rules');
            }
            
            // Fallback to rule-based response
            const intent = await this.analyzeIntent(userMessage);
            return await this.generateResponse(intent, userMessage, userProfile, {});
        }
    }

    /**
     * Build comprehensive Gemini prompt
     */
    buildGeminiPrompt(userMessage, userProfile) {
        const firstName = userProfile.profile.first_name || 'there';
        
        return `You are Kairo, the friendly AI financial assistant for ZimCrowd, Zimbabwe's leading fintech platform.

CONTEXT:
- User: ${firstName}
- ZimScore: ${userProfile.zimScore}/85 (credit score affecting loan rates)
- Wallet Balance: $${userProfile.walletBalance}
- Has Active Loans: ${userProfile.hasActiveLoans ? 'Yes' : 'No'}
- Has Investments: ${userProfile.hasInvestments ? 'Yes' : 'No'}

ZIMCROWD PRODUCTS & RATES:
🏦 LOANS (Primary Market):
- Personal Loans: $500-$50,000, rates 8.5%-24.9% (based on ZimScore)
- Business Loans: $1,000-$100,000, rates 7.5%-22.9%
- Emergency Loans: $100-$10,000, rates 12%-29.9%

📈 INVESTMENTS (Secondary Market):
- Fixed Deposit: 5-8% annual returns, guaranteed, low risk
- Peer-to-Peer Lending: 8-15% returns, medium risk
- Equity Fund: 10-20% returns, high risk, long-term growth
- Money Market: 3-6% returns, very low risk, high liquidity
- Bond Fund: 6-12% returns, low risk, steady income

💳 ZIMSCORE BENEFITS:
- 70-85: Premium rates (8.5%-12%), up to $50K loans
- 60-69: Good rates (12%-15.9%), up to $20K loans
- 50-59: Standard rates (15.9%-19.9%), up to $10K loans
- 30-49: Building rates (19.9%-24.9%), up to $5K loans

PERSONALITY & STYLE:
- Warm, supportive, and encouraging
- Use simple, clear language (avoid jargon)
- Be specific and actionable
- Address user as "${firstName}"
- Keep responses under 250 words
- Always end with a helpful question or next step

ZIMBABWE CONTEXT:
- Mention EcoCash, OneMoney for payments
- Reference USD/ZWL currency considerations
- Understand local economic challenges
- Promote financial inclusion and literacy

USER MESSAGE: "${userMessage}"

Provide a helpful, personalized response that addresses their question while promoting ZimCrowd's services appropriately. Be genuine and supportive.`;
    }

    /**
     * Enhance AI response with ZimCrowd-specific information
     */
    enhanceResponseWithBranding(aiResponse, userProfile) {
        // Ensure response mentions ZimCrowd features when relevant
        if (aiResponse.includes('loan') && !aiResponse.includes('ZimScore') && userProfile.zimScore) {
            aiResponse += `\n\n💡 With your ZimScore of ${userProfile.zimScore}, you qualify for specific rates on our platform.`;
        }
        
        // Add wallet balance context if relevant
        if (aiResponse.includes('invest') && userProfile.walletBalance > 0) {
            aiResponse += `\n\n💰 I see you have $${userProfile.walletBalance} in your wallet - perfect for starting your investment journey!`;
        }
        
        // Ensure there's a call-to-action
        if (!aiResponse.includes('?') && !aiResponse.includes('Would you like') && !aiResponse.includes('Need help')) {
            aiResponse += '\n\nHow else can I help you today?';
        }
        
        return aiResponse;
    }

    /**
     * Generate financial insights using Gemini
     */
    async generatePersonalizedInsights(userProfile) {
        if (!this.useAI) return [];

        try {
            const prompt = `Based on this financial profile, generate 3 brief, actionable insights (max 20 words each):
            
            ZimScore: ${userProfile.zimScore}/85
            Wallet: $${userProfile.walletBalance}
            Active Loans: ${userProfile.hasActiveLoans}
            Has Investments: ${userProfile.hasInvestments}
            
            Focus on immediate, practical steps they can take to improve their financial situation.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            
            return response.text()
                .split('\n')
                .filter(line => line.trim() && !line.match(/^\d+\./))
                .slice(0, 3)
                .map(insight => insight.replace(/^[-•*]\s*/, '').trim());
        } catch (error) {
            console.error('Gemini insights error:', error);
            return [];
        }
    }

    /**
     * Smart conversation starters based on user profile
     */
    async generateConversationStarters(userProfile) {
        if (!this.useAI) {
            return [
                "How can I improve my ZimScore?",
                "What investment should I start with?",
                "Tell me about loan options",
                "Help me create a budget"
            ];
        }

        try {
            const prompt = `Generate 4 conversation starters (questions) a user might ask based on their profile:
            
            ZimScore: ${userProfile.zimScore}
            Wallet: $${userProfile.walletBalance}
            Has Loans: ${userProfile.hasActiveLoans}
            Has Investments: ${userProfile.hasInvestments}
            
            Make them specific, relevant, and under 8 words each.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            
            return response.text()
                .split('\n')
                .filter(line => line.trim())
                .slice(0, 4)
                .map(starter => starter.replace(/^[-•*\d.]\s*/, '').trim());
        } catch (error) {
            return [
                "How can I improve my ZimScore?",
                "What investment should I start with?",
                "Tell me about loan options",
                "Help me create a budget"
            ];
        }
    }

    /**
     * Check API usage and limits
     */
    async checkAPIStatus() {
        return {
            provider: 'Google Gemini',
            model: 'gemini-pro',
            enabled: this.useAI,
            limits: {
                requestsPerMinute: 15,
                requestsPerDay: 1500,
                tokensPerMonth: 1000000
            },
            cost: 'FREE',
            features: [
                'Natural conversation',
                'Context awareness',
                'Personalized advice',
                'Zimbabwe-specific knowledge'
            ]
        };
    }
}

module.exports = GeminiKairoAIService;
