/**
 * Enhanced Kairo AI Service with OpenAI Integration
 * Hybrid approach: AI for complex queries, rules for simple ones
 */

const KairoAIService = require('./kairo-ai.service');
const OpenAI = require('openai');

class EnhancedKairoAIService extends KairoAIService {
    constructor() {
        super();
        
        // Initialize OpenAI only if API key is provided
        this.useAI = !!process.env.OPENAI_API_KEY;
        
        if (this.useAI) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
        }
        
        // Define which intents should use AI vs rules
        this.aiIntents = [
            'complex_financial_planning',
            'investment_strategy',
            'debt_consolidation',
            'business_advice',
            'general_inquiry'
        ];
        
        this.ruleBasedIntents = [
            'zimscore_check',
            'loan_rates',
            'investment_types',
            'greeting'
        ];
    }

    /**
     * Enhanced message processing with AI integration
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
                response = await this.generateAIResponse(message, userProfile, conversationContext);
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
                aiPowered: this.shouldUseAI(intent, message) && this.useAI
            };
        } catch (error) {
            console.error('Enhanced Kairo AI processing error:', error);
            
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
            'strategy', 'plan', 'advice', 'recommend', 'should i', 'help me decide'
        ];
        
        const hasComplexKeywords = complexKeywords.some(keyword => 
            message.toLowerCase().includes(keyword)
        );
        
        const isLongMessage = message.length > 50;
        const isAIIntent = this.aiIntents.includes(intent);
        
        return hasComplexKeywords || isLongMessage || isAIIntent;
    }

    /**
     * Generate AI-powered response using OpenAI
     */
    async generateAIResponse(userMessage, userProfile, conversationContext) {
        try {
            const systemPrompt = this.buildSystemPrompt(userProfile);
            const conversationHistory = this.buildConversationHistory(conversationContext);
            
            const messages = [
                { role: "system", content: systemPrompt },
                ...conversationHistory,
                { role: "user", content: userMessage }
            ];

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini", // Cost-effective model
                messages: messages,
                max_tokens: 500,
                temperature: 0.7,
                presence_penalty: 0.1,
                frequency_penalty: 0.1
            });

            let aiResponse = response.choices[0].message.content;
            
            // Post-process response to ensure ZimCrowd branding
            aiResponse = this.enhanceResponseWithBranding(aiResponse, userProfile);
            
            return aiResponse;
        } catch (error) {
            console.error('OpenAI API error:', error);
            
            // Fallback to rule-based response
            const intent = await this.analyzeIntent(userMessage);
            return await this.generateResponse(intent, userMessage, userProfile, {});
        }
    }

    /**
     * Build comprehensive system prompt
     */
    buildSystemPrompt(userProfile) {
        const firstName = userProfile.profile.first_name || 'there';
        
        return `You are Kairo, the friendly AI financial assistant for ZimCrowd, Zimbabwe's leading fintech platform.

PERSONALITY:
- Warm, supportive, and knowledgeable
- Use simple, clear language
- Be encouraging and positive
- Address user as "${firstName}"

USER PROFILE:
- ZimScore: ${userProfile.zimScore}/85 (affects loan rates)
- Wallet Balance: $${userProfile.walletBalance}
- Active Loans: ${userProfile.hasActiveLoans ? 'Yes' : 'No'}
- Has Investments: ${userProfile.hasInvestments ? 'Yes' : 'No'}

ZIMCROWD PRODUCTS:
1. LOANS (Primary Market):
   - Personal: $500-$50K, 8.5%-24.9% (based on ZimScore)
   - Business: $1K-$100K, 7.5%-22.9%
   - Emergency: $100-$10K, 12%-29.9%

2. INVESTMENTS (Secondary Market):
   - Fixed Deposit: 5-8% returns, low risk
   - P2P Lending: 8-15% returns, medium risk
   - Equity Fund: 10-20% returns, high risk
   - Money Market: 3-6% returns, very low risk
   - Bond Fund: 6-12% returns, low risk

3. ZIMSCORE BENEFITS:
   - 70+: Premium rates (8.5%-12%)
   - 60-69: Good rates (12%-15.9%)
   - 50-59: Standard rates (15.9%-19.9%)
   - <50: Building rates (19.9%-24.9%)

GUIDELINES:
- Always provide specific, actionable advice
- Reference ZimCrowd products and features
- Keep responses under 300 words
- Include next steps when appropriate
- Be Zimbabwe-context aware (mention EcoCash, USD/ZWL, etc.)
- Never give advice outside your expertise
- Always encourage responsible financial behavior

RESPONSE FORMAT:
- Start with a warm greeting using their name
- Provide clear, structured advice
- End with a question or call-to-action`;
    }

    /**
     * Build conversation history for context
     */
    buildConversationHistory(conversationContext) {
        const history = conversationContext.recentMessages || [];
        return history.slice(-4).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));
    }

    /**
     * Enhance AI response with ZimCrowd-specific information
     */
    enhanceResponseWithBranding(aiResponse, userProfile) {
        // Add specific ZimCrowd features if not mentioned
        if (aiResponse.includes('loan') && !aiResponse.includes('ZimScore')) {
            aiResponse += '\n\n💡 Tip: Your ZimScore of ' + userProfile.zimScore + ' affects your loan rates. Higher scores get better rates!';
        }
        
        if (aiResponse.includes('invest') && !aiResponse.includes('Secondary Market')) {
            aiResponse += '\n\n📈 Explore our Secondary Market for diversified investment options.';
        }
        
        // Add call-to-action if response is informational
        if (!aiResponse.includes('?') && !aiResponse.includes('Would you like')) {
            aiResponse += '\n\nWould you like me to help you with anything specific?';
        }
        
        return aiResponse;
    }

    /**
     * Generate smart follow-up suggestions using AI
     */
    async generateSmartSuggestions(userMessage, userProfile, intent) {
        if (!this.useAI) {
            return await this.generateSuggestions(intent, userProfile);
        }

        try {
            const prompt = `Based on this user message: "${userMessage}" and their profile (ZimScore: ${userProfile.zimScore}, Has Loans: ${userProfile.hasActiveLoans}, Has Investments: ${userProfile.hasInvestments}), suggest 3 relevant follow-up questions they might ask. Keep each under 6 words.`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 100,
                temperature: 0.8
            });

            const suggestions = response.choices[0].message.content
                .split('\n')
                .filter(line => line.trim())
                .slice(0, 3)
                .map(line => line.replace(/^\d+\.\s*/, '').trim());

            return suggestions.length > 0 ? suggestions : await this.generateSuggestions(intent, userProfile);
        } catch (error) {
            return await this.generateSuggestions(intent, userProfile);
        }
    }

    /**
     * Analyze user sentiment for better responses
     */
    async analyzeSentiment(message) {
        if (!this.useAI) return 'neutral';

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{
                    role: "user",
                    content: `Analyze the sentiment of this message in one word (positive/negative/neutral/frustrated/excited): "${message}"`
                }],
                max_tokens: 10,
                temperature: 0.1
            });

            return response.choices[0].message.content.toLowerCase().trim();
        } catch (error) {
            return 'neutral';
        }
    }

    /**
     * Get AI-powered financial insights
     */
    async generatePersonalizedInsights(userProfile) {
        if (!this.useAI) return [];

        try {
            const prompt = `Generate 3 personalized financial insights for a user with:
            - ZimScore: ${userProfile.zimScore}
            - Wallet: $${userProfile.walletBalance}
            - Active Loans: ${userProfile.hasActiveLoans}
            - Investments: ${userProfile.hasInvestments}
            
            Format as brief, actionable tips (max 25 words each).`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 200,
                temperature: 0.7
            });

            return response.choices[0].message.content
                .split('\n')
                .filter(line => line.trim())
                .slice(0, 3);
        } catch (error) {
            return [];
        }
    }
}

module.exports = EnhancedKairoAIService;
