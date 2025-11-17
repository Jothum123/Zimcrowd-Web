/**
 * Azure OpenAI Service
 * Integrates Azure OpenAI GPT models with Kairo AI system
 * Provides enhanced conversational AI and financial analysis
 */

const { OpenAI } = require('openai');
const { supabase } = require('../utils/supabase-auth');

class AzureOpenAIService {
    constructor() {
        // Azure OpenAI Configuration
        this.apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21-preview';
        this.resourceName = process.env.AZURE_OPENAI_RESOURCE_NAME;
        this.apiKey = process.env.AZURE_OPENAI_API_KEY;
        
        // Azure AI Foundry uses newer API endpoint structure
        // Try the newer inference endpoint format
        this.openai = new OpenAI({
            apiKey: this.apiKey,
            baseURL: `https://${this.resourceName}.openai.azure.com/openai/deployments`,
            defaultQuery: { 'api-version': '2024-02-15-preview' }, // Try older stable version
            defaultHeaders: {
                'api-key': this.apiKey,
            }
        });
        
        // Model configurations - Current supported models only
        this.models = {
            gpt4o: process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT || 'gpt-4o',
            gpt4oMini: process.env.AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT || 'gpt-4o-mini',
            embedding: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-large'
        };
        
        // System prompts for different contexts
        this.systemPrompts = {
            financial_advisor: `You are Kairo, an expert financial advisor for ZimCrowd, a Zimbabwean fintech platform. 
            You help users with loans, investments, ZimScore improvement, and financial planning.
            
            Key Context:
            - ZimScore: Credit scoring system (0-100, higher is better)
            - DTNI: Debt-to-Net-Income ratio for loan eligibility
            - Employment types: Government (+10 pts), Private (+6 pts), Business (+3 pts), Informal (+0 pts)
            - Currency: USD (Zimbabwe uses USD)
            - Local context: Understand Zimbabwean economic conditions
            
            Guidelines:
            - Be friendly, professional, and culturally aware
            - Provide actionable financial advice
            - Reference ZimScore and DTNI when relevant
            - Suggest specific loan amounts and terms based on user profile
            - Recommend investment options suitable for Zimbabwe
            - Use simple language, avoid complex financial jargon
            - Always prioritize user's financial wellbeing`,
            
            risk_analyst: `You are an AI risk analyst for ZimCrowd financial platform.
            Analyze user financial data and provide risk assessments.
            
            Focus on:
            - Loan default probability
            - Investment risk tolerance
            - Fraud detection patterns
            - Market risk factors in Zimbabwe
            - Employment stability assessment
            
            Provide structured risk scores and recommendations.`,
            
            loan_specialist: `You are a loan specialist AI for ZimCrowd.
            Help users understand loan options, eligibility, and terms.
            
            Key factors:
            - DTNI calculation and limits
            - ZimScore impact on interest rates
            - Employment type considerations
            - Loan purpose and suitability
            - Repayment capacity analysis
            
            Always explain loan terms clearly and suggest optimal loan structures.`,
            
            investment_advisor: `You are an investment advisor AI for ZimCrowd.
            Provide investment guidance suitable for Zimbabwean market conditions.
            
            Consider:
            - User risk tolerance and ZimScore
            - Local investment opportunities
            - Currency stability factors
            - Diversification strategies
            - Time horizon and goals
            
            Recommend specific investment products and allocation strategies.`
        };
    }

    /**
     * Generate AI response using Azure OpenAI
     */
    async generateResponse(userMessage, context = {}) {
        try {
            const {
                userId,
                conversationHistory = [],
                userProfile = {},
                intent = 'general',
                systemContext = 'financial_advisor'
            } = context;

            // Select appropriate model based on complexity
            const model = this.selectModel(intent, userMessage);
            
            // Build conversation messages
            const messages = this.buildMessages(userMessage, conversationHistory, userProfile, systemContext);
            
            // Call Azure OpenAI with deployment name
            const response = await this.openai.chat.completions.create({
                model: model, // This should be the deployment name
                messages: messages,
                max_tokens: 800,
                temperature: 0.7,
                top_p: 0.9,
                frequency_penalty: 0.1,
                presence_penalty: 0.1,
                user: userId || 'anonymous'
            });

            const aiResponse = response.choices[0].message.content;
            
            // Extract insights and suggestions
            const analysis = await this.analyzeResponse(aiResponse, userMessage, intent);
            
            // Log interaction for learning
            await this.logInteraction(userId, userMessage, aiResponse, intent, analysis);
            
            return {
                success: true,
                response: aiResponse,
                intent: intent,
                confidence: analysis.confidence,
                suggestions: analysis.suggestions,
                followUpQuestions: analysis.followUpQuestions,
                model: model,
                tokens: response.usage?.total_tokens || 0
            };

        } catch (error) {
            console.error('Azure OpenAI error:', error);
            return {
                success: false,
                error: error.message,
                response: "I'm having trouble processing your request right now. Please try again in a moment."
            };
        }
    }

    /**
     * Select appropriate model based on request complexity
     */
    selectModel(intent, message) {
        const complexIntents = ['investment_analysis', 'risk_assessment', 'loan_structuring', 'financial_planning'];
        const veryComplexIntents = ['comprehensive_financial_planning', 'complex_investment_analysis', 'multi_scenario_analysis'];
        
        // Use GPT-4o for very complex scenarios
        if (veryComplexIntents.includes(intent) || message.length > 500) {
            return this.models.gpt4o;
        }
        
        // Use GPT-4o Mini for all other scenarios (replaces GPT-3.5)
        return this.models.gpt4oMini;
    }

    /**
     * Build conversation messages for OpenAI
     */
    buildMessages(userMessage, conversationHistory, userProfile, systemContext) {
        const messages = [];
        
        // System prompt
        messages.push({
            role: 'system',
            content: this.systemPrompts[systemContext] + this.buildUserContext(userProfile)
        });
        
        // Add recent conversation history (last 5 messages)
        const recentHistory = conversationHistory.slice(-5);
        recentHistory.forEach(msg => {
            messages.push({
                role: 'user',
                content: msg.user_message
            });
            messages.push({
                role: 'assistant',
                content: msg.ai_response
            });
        });
        
        // Current user message
        messages.push({
            role: 'user',
            content: userMessage
        });
        
        return messages;
    }

    /**
     * Build user context for personalized responses
     */
    buildUserContext(userProfile) {
        if (!userProfile || Object.keys(userProfile).length === 0) {
            return '\n\nUser Profile: New user, no profile data available.';
        }

        const context = `\n\nUser Profile:
        - ZimScore: ${userProfile.zimScore || 'Not calculated'}
        - Employment: ${userProfile.employment_type || 'Not specified'}
        - Active Loans: ${userProfile.hasActiveLoans ? 'Yes' : 'No'}
        - Investments: ${userProfile.hasInvestments ? 'Yes' : 'No'}
        - Wallet Balance: $${userProfile.walletBalance || '0'}
        - Risk Level: ${this.calculateRiskLevel(userProfile)}
        - DTNI Utilization: ${this.calculateDTNIUtilization(userProfile)}%`;

        return context;
    }

    /**
     * Analyze AI response for insights and suggestions
     */
    async analyzeResponse(aiResponse, userMessage, intent) {
        try {
            // Use a simpler model for analysis
            const analysisPrompt = `Analyze this financial AI response and extract:
            1. Confidence level (0-1)
            2. 2-3 follow-up suggestions
            3. 1-2 follow-up questions
            
            User asked: "${userMessage}"
            AI responded: "${aiResponse}"
            
            Respond in JSON format:
            {
                "confidence": 0.85,
                "suggestions": ["suggestion1", "suggestion2"],
                "followUpQuestions": ["question1", "question2"]
            }`;

            const analysisResponse = await this.openai.chat.completions.create({
                model: this.models.gpt4oMini,
                messages: [
                    { role: 'system', content: 'You are an AI response analyzer. Return only valid JSON.' },
                    { role: 'user', content: analysisPrompt }
                ],
                max_tokens: 200,
                temperature: 0.3
            });

            const analysis = JSON.parse(analysisResponse.choices[0].message.content);
            return {
                confidence: analysis.confidence || 0.8,
                suggestions: analysis.suggestions || [],
                followUpQuestions: analysis.followUpQuestions || []
            };

        } catch (error) {
            console.error('Response analysis error:', error);
            return {
                confidence: 0.7,
                suggestions: ["Tell me more about your financial goals", "Would you like loan recommendations?"],
                followUpQuestions: ["What's your main financial priority?", "How can I help you further?"]
            };
        }
    }

    /**
     * Generate financial insights using GPT-4
     */
    async generateFinancialInsights(userProfile, timeframe = '30d') {
        try {
            const insightsPrompt = `As a financial analyst, analyze this user's profile and generate personalized insights:

            User Profile:
            - ZimScore: ${userProfile.zimScore || 'Not available'}
            - Employment: ${userProfile.employment_type || 'Not specified'}
            - Active Loans: ${userProfile.loans?.length || 0}
            - Investments: ${userProfile.investments?.length || 0}
            - Wallet Balance: $${userProfile.walletBalance || 0}
            - Monthly Income: $${userProfile.monthly_income || 'Not specified'}
            
            Generate insights in JSON format:
            {
                "healthScore": 75,
                "riskLevel": "Medium",
                "recommendations": [
                    {
                        "type": "loan",
                        "title": "Improve Credit Mix",
                        "description": "Consider a small personal loan to diversify your credit profile",
                        "priority": "medium",
                        "impact": "Potential 5-10 point ZimScore increase"
                    }
                ],
                "predictions": {
                    "zimScoreIn3Months": 78,
                    "maxLoanCapacity": 5000,
                    "investmentRecommendation": "Conservative portfolio"
                },
                "alerts": [
                    {
                        "type": "opportunity",
                        "message": "You're eligible for better loan rates"
                    }
                ]
            }`;

            const response = await this.openai.chat.completions.create({
                model: this.models.gpt4o,
                messages: [
                    { role: 'system', content: 'You are a financial analyst AI. Return only valid JSON with detailed insights.' },
                    { role: 'user', content: insightsPrompt }
                ],
                max_tokens: 1000,
                temperature: 0.4
            });

            const insights = JSON.parse(response.choices[0].message.content);
            
            // Store insights in database
            await this.storeInsights(userProfile.id, insights);
            
            return {
                success: true,
                insights: insights,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Financial insights generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate loan recommendations using AI
     */
    async generateLoanRecommendations(userProfile, loanRequest = {}) {
        try {
            const { amount, purpose, term } = loanRequest;
            
            const prompt = `As a loan specialist, analyze this loan request and provide recommendations:

            User Profile:
            - ZimScore: ${userProfile.zimScore || 'Not available'}
            - Employment: ${userProfile.employment_type || 'Not specified'}
            - Monthly Income: $${userProfile.monthly_income || 'Not specified'}
            - Current Loans: ${userProfile.loans?.length || 0}
            - DTNI Utilization: ${this.calculateDTNIUtilization(userProfile)}%

            Loan Request:
            - Amount: $${amount || 'Not specified'}
            - Purpose: ${purpose || 'Not specified'}
            - Term: ${term || 'Not specified'}

            Provide recommendations in JSON format:
            {
                "eligibility": {
                    "approved": true,
                    "maxAmount": 15000,
                    "recommendedAmount": 10000,
                    "interestRate": "12-15%",
                    "maxTerm": 36
                },
                "recommendations": [
                    {
                        "type": "Personal Loan",
                        "amount": 10000,
                        "term": 24,
                        "rate": "13.5%",
                        "monthlyPayment": 485,
                        "reason": "Optimal balance of amount and affordability"
                    }
                ],
                "improvements": [
                    "Increase ZimScore by 10 points to qualify for 11% rate",
                    "Consider shorter term to reduce total interest"
                ],
                "alternatives": [
                    "Secured loan with collateral for better rates",
                    "Smaller amount for immediate approval"
                ]
            }`;

            const response = await this.openai.chat.completions.create({
                model: this.models.gpt4o,
                messages: [
                    { role: 'system', content: 'You are a loan specialist AI. Return only valid JSON with detailed loan analysis.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 800,
                temperature: 0.3
            });

            const recommendations = JSON.parse(response.choices[0].message.content);

            return {
                success: true,
                recommendations: recommendations,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Loan recommendations error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate investment advice using AI
     */
    async generateInvestmentAdvice(userProfile, investmentRequest = {}) {
        try {
            const { amount, riskTolerance, timeHorizon, goals } = investmentRequest;
            
            const prompt = `As an investment advisor for Zimbabwe market, provide investment advice:

            User Profile:
            - ZimScore: ${userProfile.zimScore || 'Not available'}
            - Age: ${userProfile.age || 'Not specified'}
            - Employment: ${userProfile.employment_type || 'Not specified'}
            - Monthly Income: $${userProfile.monthly_income || 'Not specified'}
            - Current Investments: ${userProfile.investments?.length || 0}
            - Wallet Balance: $${userProfile.walletBalance || 0}

            Investment Request:
            - Amount: $${amount || 'Not specified'}
            - Risk Tolerance: ${riskTolerance || 'Not specified'}
            - Time Horizon: ${timeHorizon || 'Not specified'}
            - Goals: ${goals || 'Not specified'}

            Consider Zimbabwe market conditions and provide advice in JSON format:
            {
                "riskProfile": "Conservative",
                "recommendedAllocation": {
                    "fixedDeposits": 40,
                    "equityFunds": 30,
                    "moneyMarket": 20,
                    "bonds": 10
                },
                "specificRecommendations": [
                    {
                        "product": "ZSE Equity Fund",
                        "allocation": 30,
                        "expectedReturn": "12-15%",
                        "risk": "Medium",
                        "reason": "Diversified exposure to Zimbabwe Stock Exchange"
                    }
                ],
                "timeline": {
                    "shortTerm": "Build emergency fund first",
                    "mediumTerm": "Diversify into equity funds",
                    "longTerm": "Consider property investments"
                },
                "warnings": [
                    "Start with smaller amounts to test strategies",
                    "Maintain 6-month emergency fund before investing"
                ]
            }`;

            const response = await this.openai.chat.completions.create({
                model: this.models.gpt4o,
                messages: [
                    { role: 'system', content: 'You are an investment advisor AI for Zimbabwe. Return only valid JSON with detailed investment advice.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 1000,
                temperature: 0.4
            });

            const advice = JSON.parse(response.choices[0].message.content);

            return {
                success: true,
                advice: advice,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Investment advice error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create embeddings for semantic search
     */
    async createEmbedding(text) {
        try {
            const response = await this.openai.embeddings.create({
                model: this.models.embedding,
                input: text
            });

            return {
                success: true,
                embedding: response.data[0].embedding,
                tokens: response.usage.total_tokens
            };

        } catch (error) {
            console.error('Embedding creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Log interaction for learning and analytics
     */
    async logInteraction(userId, userMessage, aiResponse, intent, analysis) {
        try {
            if (!userId) return;

            await supabase
                .from('kairo_conversations')
                .insert({
                    user_id: userId,
                    user_message: userMessage,
                    ai_response: aiResponse,
                    intent: intent,
                    confidence_score: analysis.confidence,
                    metadata: {
                        model: 'azure-openai',
                        suggestions: analysis.suggestions,
                        followUpQuestions: analysis.followUpQuestions,
                        tokens: analysis.tokens || 0
                    }
                });

            // Update feature usage
            await supabase.rpc('update_feature_usage', {
                p_user_id: userId,
                p_feature_name: 'azure_openai_chat'
            });

        } catch (error) {
            console.error('Interaction logging error:', error);
        }
    }

    /**
     * Store AI-generated insights
     */
    async storeInsights(userId, insights) {
        try {
            if (!userId) return;

            await supabase
                .from('ai_insights')
                .insert({
                    user_id: userId,
                    insight_type: 'azure_openai_analysis',
                    title: 'AI Financial Analysis',
                    description: 'Comprehensive financial profile analysis using Azure OpenAI',
                    category: 'financial_health',
                    data: insights,
                    confidence_score: 0.9,
                    impact_score: 0.8
                });

        } catch (error) {
            console.error('Insights storage error:', error);
        }
    }

    /**
     * Helper functions
     */
    calculateRiskLevel(userProfile) {
        const zimScore = userProfile.zimScore || 0;
        if (zimScore >= 70) return 'Low';
        if (zimScore >= 60) return 'Medium';
        return 'High';
    }

    calculateDTNIUtilization(userProfile) {
        const monthlyIncome = userProfile.monthly_income || 1000;
        const maxCapacity = monthlyIncome * 0.4;
        const currentUtilization = userProfile.loans?.reduce((sum, loan) => 
            sum + (loan.monthly_installment || 0), 0) || 0;
        return Math.round((currentUtilization / maxCapacity) * 100);
    }

    /**
     * Health check for Azure OpenAI service
     */
    async healthCheck() {
        try {
            const response = await this.openai.chat.completions.create({
                model: this.models.gpt4oMini,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 10
            });

            return {
                success: true,
                status: 'healthy',
                model: this.models.gpt4oMini,
                responseTime: Date.now()
            };

        } catch (error) {
            return {
                success: false,
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

module.exports = AzureOpenAIService;
