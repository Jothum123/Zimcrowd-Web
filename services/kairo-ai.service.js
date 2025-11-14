/**
 * Kairo AI Agent Service
 * Intelligent financial assistant for ZimCrowd platform
 * Provides personalized financial advice, loan guidance, and investment recommendations
 */

const { supabase } = require('../utils/supabase-auth');
const ZimScoreService = require('./ZimScoreService');

class KairoAIService {
    constructor() {
        this.zimScoreService = new ZimScoreService();
        
        // AI Agent personality and capabilities
        this.agentProfile = {
            name: 'Kairo',
            role: 'Personal Financial Assistant',
            personality: 'Friendly, knowledgeable, and supportive',
            expertise: [
                'Loan recommendations',
                'Investment advice',
                'ZimScore improvement',
                'Financial planning',
                'Risk assessment',
                'Market insights'
            ],
            languages: ['English', 'Shona', 'Ndebele']
        };

        // Conversation templates and responses
        this.responseTemplates = {
            greeting: [
                "Hello! I'm Kairo, your personal financial assistant. How can I help you achieve your financial goals today?",
                "Hi there! Kairo here, ready to help you make smart financial decisions. What would you like to know?",
                "Welcome! I'm Kairo, your AI financial advisor. Let's work together to improve your financial future!"
            ],
            loan_inquiry: [
                "I'd be happy to help you find the perfect loan! Let me analyze your profile and recommend the best options.",
                "Looking for a loan? Great! I can help you understand your options and improve your chances of approval.",
                "Let's find you the right loan with the best terms based on your financial profile."
            ],
            investment_advice: [
                "Investing is a smart move! Let me help you choose investments that match your risk tolerance and goals.",
                "I can help you build a diversified portfolio that grows your wealth over time.",
                "Let's explore investment options that align with your financial situation and objectives."
            ],
            zimscore_help: [
                "Your ZimScore is key to better loan terms! Let me show you how to improve it.",
                "I can help you understand your ZimScore and provide actionable steps to boost it.",
                "Let's work on improving your ZimScore for better financial opportunities."
            ]
        };

        // Financial advice database
        this.financialAdvice = {
            budgeting: {
                title: "Smart Budgeting Tips",
                tips: [
                    "Follow the 50/30/20 rule: 50% needs, 30% wants, 20% savings",
                    "Track your expenses for at least one month to understand spending patterns",
                    "Use mobile money transaction history to analyze your spending",
                    "Set up automatic savings transfers to build emergency funds"
                ]
            },
            saving: {
                title: "Building Your Savings",
                tips: [
                    "Start with a goal to save 3-6 months of expenses as emergency fund",
                    "Use ZimCrowd's fixed deposit investments for guaranteed returns",
                    "Save in USD to protect against inflation",
                    "Consider money market funds for short-term liquid savings"
                ]
            },
            investing: {
                title: "Investment Strategies",
                tips: [
                    "Diversify across different investment types to reduce risk",
                    "Start with low-risk investments like fixed deposits",
                    "Consider peer-to-peer lending for medium-risk returns",
                    "Invest regularly (dollar-cost averaging) rather than lump sums"
                ]
            },
            credit: {
                title: "Building Good Credit",
                tips: [
                    "Always pay loans on time to improve your ZimScore",
                    "Keep your debt-to-income ratio below 30%",
                    "Start with smaller loans and build your credit history",
                    "Maintain stable employment and income sources"
                ]
            }
        };

        // Market insights and trends
        this.marketInsights = {
            zimbabwe_economy: {
                inflation: "Monitor USD vs ZWL rates for investment decisions",
                interest_rates: "Current lending rates range from 8.5% to 24.9%",
                mobile_money: "EcoCash and OneMoney dominate payment landscape",
                investment_climate: "Growing fintech adoption creates opportunities"
            },
            loan_trends: {
                personal_loans: "Most popular for debt consolidation and emergencies",
                business_loans: "High demand for SME financing and working capital",
                interest_rates: "Rates vary significantly based on ZimScore (8.5%-24.9%)"
            },
            investment_trends: {
                peer_lending: "Growing alternative to traditional banking",
                fixed_deposits: "Safe haven during economic uncertainty",
                equity_funds: "Long-term growth potential despite volatility"
            }
        };
    }

    /**
     * Process user message and generate AI response
     */
    async processMessage(userId, message, conversationContext = {}) {
        try {
            // Analyze user intent
            const intent = await this.analyzeIntent(message);
            
            // Get user financial profile
            const userProfile = await this.getUserFinancialProfile(userId);
            
            // Generate personalized response
            const response = await this.generateResponse(intent, message, userProfile, conversationContext);
            
            // Save conversation to database
            await this.saveConversation(userId, message, response, intent);
            
            return {
                success: true,
                response: response,
                intent: intent,
                suggestions: await this.generateSuggestions(intent, userProfile)
            };
        } catch (error) {
            console.error('Kairo AI processing error:', error);
            return {
                success: false,
                response: "I apologize, but I'm having trouble processing your request right now. Please try again or contact support if the issue persists.",
                error: error.message
            };
        }
    }

    /**
     * Analyze user intent from message
     */
    async analyzeIntent(message) {
        const lowerMessage = message.toLowerCase();
        
        // Loan-related keywords
        if (lowerMessage.includes('loan') || lowerMessage.includes('borrow') || lowerMessage.includes('credit')) {
            if (lowerMessage.includes('apply') || lowerMessage.includes('application')) {
                return 'loan_application';
            }
            if (lowerMessage.includes('rate') || lowerMessage.includes('interest')) {
                return 'loan_rates';
            }
            if (lowerMessage.includes('qualify') || lowerMessage.includes('eligible')) {
                return 'loan_eligibility';
            }
            return 'loan_inquiry';
        }
        
        // Investment-related keywords
        if (lowerMessage.includes('invest') || lowerMessage.includes('investment') || lowerMessage.includes('portfolio')) {
            if (lowerMessage.includes('recommend') || lowerMessage.includes('advice')) {
                return 'investment_advice';
            }
            if (lowerMessage.includes('risk') || lowerMessage.includes('safe')) {
                return 'investment_risk';
            }
            if (lowerMessage.includes('return') || lowerMessage.includes('profit')) {
                return 'investment_returns';
            }
            return 'investment_inquiry';
        }
        
        // ZimScore-related keywords
        if (lowerMessage.includes('zimscore') || lowerMessage.includes('credit score') || lowerMessage.includes('rating')) {
            if (lowerMessage.includes('improve') || lowerMessage.includes('increase')) {
                return 'zimscore_improvement';
            }
            if (lowerMessage.includes('check') || lowerMessage.includes('what is')) {
                return 'zimscore_check';
            }
            return 'zimscore_inquiry';
        }
        
        // Financial planning keywords
        if (lowerMessage.includes('budget') || lowerMessage.includes('save') || lowerMessage.includes('plan')) {
            return 'financial_planning';
        }
        
        // Greeting keywords
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('help')) {
            return 'greeting';
        }
        
        // Default to general inquiry
        return 'general_inquiry';
    }

    /**
     * Get user's financial profile for personalized advice
     */
    async getUserFinancialProfile(userId) {
        try {
            // Get user profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            // Get ZimScore
            const zimScoreResult = await this.zimScoreService.getUserScore(userId);
            
            // Get loans
            const { data: loans } = await supabase
                .from('loans')
                .select('*')
                .eq('user_id', userId);

            // Get investments
            const { data: investments } = await supabase
                .from('investments')
                .select('*')
                .eq('user_id', userId);

            // Get wallet balance
            const { data: wallet } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', userId)
                .single();

            return {
                profile: profile || {},
                zimScore: zimScoreResult?.data?.score_value || 30,
                loans: loans || [],
                investments: investments || [],
                walletBalance: wallet?.balance || 0,
                hasActiveLoans: loans?.some(loan => loan.status === 'active') || false,
                hasInvestments: investments?.length > 0 || false
            };
        } catch (error) {
            console.error('Error getting user profile:', error);
            return {
                profile: {},
                zimScore: 30,
                loans: [],
                investments: [],
                walletBalance: 0,
                hasActiveLoans: false,
                hasInvestments: false
            };
        }
    }

    /**
     * Generate personalized AI response
     */
    async generateResponse(intent, message, userProfile, context) {
        const firstName = userProfile.profile.first_name || 'there';
        
        switch (intent) {
            case 'greeting':
                return this.getRandomTemplate('greeting').replace('Hello!', `Hello ${firstName}!`);
                
            case 'loan_inquiry':
            case 'loan_application':
                return await this.generateLoanAdvice(userProfile);
                
            case 'loan_rates':
                return this.generateLoanRatesInfo(userProfile);
                
            case 'loan_eligibility':
                return await this.generateLoanEligibilityAdvice(userProfile);
                
            case 'investment_inquiry':
            case 'investment_advice':
                return this.generateInvestmentAdvice(userProfile);
                
            case 'investment_risk':
                return this.generateRiskAdvice(userProfile);
                
            case 'investment_returns':
                return this.generateReturnsInfo(userProfile);
                
            case 'zimscore_inquiry':
            case 'zimscore_check':
                return this.generateZimScoreInfo(userProfile);
                
            case 'zimscore_improvement':
                return this.generateZimScoreImprovementAdvice(userProfile);
                
            case 'financial_planning':
                return this.generateFinancialPlanningAdvice(userProfile);
                
            default:
                return `Hi ${firstName}! I can help you with loans, investments, ZimScore improvement, and financial planning. What specific area would you like to explore?`;
        }
    }

    /**
     * Generate loan advice based on user profile
     */
    async generateLoanAdvice(userProfile) {
        const { zimScore, hasActiveLoans, walletBalance } = userProfile;
        const firstName = userProfile.profile.first_name || 'there';
        
        let advice = `Hi ${firstName}! Based on your profile, here's my loan recommendation:\n\n`;
        
        if (hasActiveLoans) {
            advice += "🔍 I see you have an active loan. Focus on making timely payments to improve your ZimScore before applying for additional loans.\n\n";
        }
        
        // ZimScore-based recommendations
        if (zimScore >= 70) {
            advice += "🎉 Excellent! Your ZimScore of " + zimScore + " qualifies you for our best rates (8.5%-12%).\n";
            advice += "💰 You can apply for loans up to $50,000 with flexible terms.\n";
            advice += "📋 Recommended: Business loans for expansion or personal loans for major purchases.\n\n";
        } else if (zimScore >= 60) {
            advice += "👍 Good news! Your ZimScore of " + zimScore + " qualifies you for competitive rates (12%-15.9%).\n";
            advice += "💰 You can apply for loans up to $20,000.\n";
            advice += "📋 Recommended: Personal loans or emergency loans for immediate needs.\n\n";
        } else if (zimScore >= 50) {
            advice += "📈 Your ZimScore of " + zimScore + " qualifies you for standard rates (15.9%-19.9%).\n";
            advice += "💰 You can apply for loans up to $10,000.\n";
            advice += "📋 Recommended: Start with smaller personal loans to build credit history.\n\n";
        } else {
            advice += "🚀 Let's work on improving your ZimScore of " + zimScore + " for better loan terms.\n";
            advice += "💰 You can still apply for loans up to $5,000.\n";
            advice += "📋 Recommended: Emergency loans or small personal loans to start building credit.\n\n";
        }
        
        advice += "💡 **Next Steps:**\n";
        advice += "1. Use our loan calculator to see exact terms\n";
        advice += "2. Gather required documents (ID, income proof, bank statements)\n";
        advice += "3. Apply through our Primary Market section\n";
        advice += "4. Get approval within 24-48 hours\n\n";
        
        advice += "Would you like me to help you calculate loan terms or explain the application process?";
        
        return advice;
    }

    /**
     * Generate loan rates information
     */
    generateLoanRatesInfo(userProfile) {
        const { zimScore } = userProfile;
        
        let response = "📊 **ZimCrowd Loan Rates (Based on ZimScore):**\n\n";
        
        response += "🏆 **Excellent Credit (ZimScore 70+):** 8.5% - 12.0%\n";
        response += "✅ **Good Credit (ZimScore 60-69):** 12.0% - 15.9%\n";
        response += "⚠️ **Fair Credit (ZimScore 50-59):** 15.9% - 19.9%\n";
        response += "🔧 **Building Credit (ZimScore <50):** 19.9% - 24.9%\n\n";
        
        if (zimScore) {
            const rate = zimScore >= 70 ? "8.5% - 12.0%" :
                        zimScore >= 60 ? "12.0% - 15.9%" :
                        zimScore >= 50 ? "15.9% - 19.9%" : "19.9% - 24.9%";
            
            response += `🎯 **Your Rate Range:** ${rate} (ZimScore: ${zimScore})\n\n`;
        }
        
        response += "💰 **Loan Types:**\n";
        response += "• Personal Loans: $500 - $50,000 (3-60 months)\n";
        response += "• Business Loans: $1,000 - $100,000 (6-84 months)\n";
        response += "• Emergency Loans: $100 - $10,000 (1-12 months)\n\n";
        
        response += "📈 **Improve Your Rate:** Pay loans on time, maintain stable income, and keep debt-to-income ratio low.\n\n";
        response += "Ready to apply or need help calculating payments?";
        
        return response;
    }

    /**
     * Generate investment advice
     */
    generateInvestmentAdvice(userProfile) {
        const { walletBalance, hasInvestments, zimScore } = userProfile;
        const firstName = userProfile.profile.first_name || 'there';
        
        let advice = `Hi ${firstName}! Let me help you choose the right investments:\n\n`;
        
        if (walletBalance < 100) {
            advice += "💡 **Start Building:** Add funds to your wallet to begin investing (minimum $50).\n\n";
        }
        
        advice += "🎯 **Investment Recommendations Based on Your Profile:**\n\n";
        
        // Conservative recommendations for new investors
        if (!hasInvestments) {
            advice += "🌱 **For Beginners:**\n";
            advice += "• Money Market Fund (3-6% returns, very low risk)\n";
            advice += "• Fixed Deposit (5-8% returns, guaranteed)\n";
            advice += "• Start with $100-500 to learn the basics\n\n";
        }
        
        // Risk-based recommendations
        if (zimScore >= 70) {
            advice += "🚀 **Growth Portfolio (High ZimScore):**\n";
            advice += "• 40% Equity Fund (10-20% returns)\n";
            advice += "• 30% Peer-to-Peer Lending (8-15% returns)\n";
            advice += "• 20% Fixed Deposit (5-8% returns)\n";
            advice += "• 10% Money Market (3-6% returns)\n\n";
        } else if (zimScore >= 60) {
            advice += "⚖️ **Balanced Portfolio:**\n";
            advice += "• 30% Equity Fund (10-20% returns)\n";
            advice += "• 30% Peer-to-Peer Lending (8-15% returns)\n";
            advice += "• 30% Fixed Deposit (5-8% returns)\n";
            advice += "• 10% Money Market (3-6% returns)\n\n";
        } else {
            advice += "🛡️ **Conservative Portfolio:**\n";
            advice += "• 50% Fixed Deposit (5-8% returns)\n";
            advice += "• 30% Money Market (3-6% returns)\n";
            advice += "• 20% Peer-to-Peer Lending (8-15% returns)\n\n";
        }
        
        advice += "💡 **Investment Tips:**\n";
        advice += "1. Start small and increase gradually\n";
        advice += "2. Diversify across different investment types\n";
        advice += "3. Invest regularly (monthly contributions)\n";
        advice += "4. Keep 3-6 months expenses in emergency fund first\n\n";
        
        advice += "Would you like me to calculate returns for a specific investment or help you get started?";
        
        return advice;
    }

    /**
     * Generate ZimScore improvement advice
     */
    generateZimScoreImprovementAdvice(userProfile) {
        const { zimScore, hasActiveLoans, loans } = userProfile;
        const firstName = userProfile.profile.first_name || 'there';
        
        let advice = `Hi ${firstName}! Let's boost your ZimScore from ${zimScore}:\n\n`;
        
        advice += "🎯 **ZimScore Improvement Plan:**\n\n";
        
        // Payment history advice
        if (hasActiveLoans) {
            const hasLatePayments = loans.some(loan => loan.status === 'overdue');
            if (hasLatePayments) {
                advice += "🚨 **Priority 1:** Catch up on overdue payments immediately (+15 points)\n";
            }
            advice += "⏰ **Pay On Time:** Make all future payments before due date (+3 points each)\n";
            advice += "💰 **Pay Early:** Pay before due date for bonus points (+5 points each)\n\n";
        } else {
            advice += "🏦 **Build Credit History:** Apply for a small loan and pay it back perfectly\n\n";
        }
        
        // Income and employment advice
        advice += "💼 **Improve Income Profile:**\n";
        advice += "• Update employment details if you got a promotion\n";
        advice += "• Government/formal employment gets higher scores\n";
        advice += "• Maintain stable income sources\n\n";
        
        // Financial behavior advice
        advice += "📊 **Financial Behavior:**\n";
        advice += "• Keep debt-to-income ratio below 30%\n";
        advice += "• Maintain higher wallet/bank balances\n";
        advice += "• Avoid multiple loan applications in short periods\n\n";
        
        // Timeline expectations
        const targetScore = Math.min(85, zimScore + 20);
        advice += `📈 **Expected Timeline:**\n`;
        advice += `• Target ZimScore: ${targetScore} (achievable in 3-6 months)\n`;
        advice += `• With perfect payments: +3-5 points per month\n`;
        advice += `• With income improvements: +5-10 points boost\n\n`;
        
        // Benefits of higher score
        if (zimScore < 70) {
            advice += "🎁 **Benefits of Higher ZimScore:**\n";
            advice += "• Lower interest rates (save hundreds of dollars)\n";
            advice += "• Higher loan limits (up to $50,000+)\n";
            advice += "• Faster loan approvals\n";
            advice += "• Better investment opportunities\n\n";
        }
        
        advice += "Ready to start improving? I can help you create a specific action plan!";
        
        return advice;
    }

    /**
     * Generate financial planning advice
     */
    generateFinancialPlanningAdvice(userProfile) {
        const { walletBalance, hasActiveLoans, hasInvestments } = userProfile;
        const firstName = userProfile.profile.first_name || 'there';
        
        let advice = `Hi ${firstName}! Let's create your financial roadmap:\n\n`;
        
        advice += "🗺️ **Your Financial Journey:**\n\n";
        
        // Step 1: Emergency Fund
        const emergencyFundTarget = 3000; // Assume $3000 emergency fund target
        if (walletBalance < emergencyFundTarget) {
            advice += "🚨 **Step 1: Emergency Fund**\n";
            advice += `• Target: $${emergencyFundTarget} (3-6 months expenses)\n`;
            advice += `• Current: $${walletBalance}\n`;
            advice += `• Needed: $${emergencyFundTarget - walletBalance}\n`;
            advice += "• Strategy: Save $200-500 monthly in Money Market Fund\n\n";
        } else {
            advice += "✅ **Step 1 Complete:** Emergency fund established!\n\n";
        }
        
        // Step 2: Debt Management
        if (hasActiveLoans) {
            advice += "💳 **Step 2: Debt Management**\n";
            advice += "• Focus on paying loans on time\n";
            advice += "• Consider debt consolidation if multiple loans\n";
            advice += "• Avoid new debt until current loans are manageable\n\n";
        } else {
            advice += "✅ **Step 2 Complete:** No active debt to manage!\n\n";
        }
        
        // Step 3: Investment Building
        if (!hasInvestments) {
            advice += "📈 **Step 3: Start Investing**\n";
            advice += "• Begin with $100-500 in Fixed Deposits\n";
            advice += "• Add $100-200 monthly to investments\n";
            advice += "• Diversify as your portfolio grows\n\n";
        } else {
            advice += "📈 **Step 3: Grow Investments**\n";
            advice += "• Review and rebalance portfolio quarterly\n";
            advice += "• Increase monthly contributions by 10-20%\n";
            advice += "• Consider higher-return investments\n\n";
        }
        
        // Step 4: Wealth Building
        advice += "🏆 **Step 4: Wealth Building**\n";
        advice += "• Target: 20% of income to investments\n";
        advice += "• Explore business opportunities\n";
        advice += "• Consider real estate investments\n";
        advice += "• Plan for retirement and major goals\n\n";
        
        // Monthly action plan
        advice += "📅 **This Month's Action Plan:**\n";
        if (walletBalance < emergencyFundTarget) {
            advice += "1. Save $300 for emergency fund\n";
        }
        if (hasActiveLoans) {
            advice += "2. Make loan payment early\n";
        }
        if (!hasInvestments) {
            advice += "3. Start first investment ($100 Fixed Deposit)\n";
        } else {
            advice += "3. Add $200 to existing investments\n";
        }
        advice += "4. Track all expenses\n";
        advice += "5. Review and adjust budget\n\n";
        
        advice += "Need help with any specific step? I'm here to guide you!";
        
        return advice;
    }

    /**
     * Generate suggestions based on intent and user profile
     */
    async generateSuggestions(intent, userProfile) {
        const suggestions = [];
        
        switch (intent) {
            case 'loan_inquiry':
                suggestions.push(
                    "Calculate loan payments",
                    "Check loan eligibility",
                    "Compare loan types",
                    "Apply for a loan"
                );
                break;
                
            case 'investment_inquiry':
                suggestions.push(
                    "Calculate investment returns",
                    "Compare investment options",
                    "Start investing",
                    "Review my portfolio"
                );
                break;
                
            case 'zimscore_inquiry':
                suggestions.push(
                    "How to improve ZimScore",
                    "Check my current ZimScore",
                    "ZimScore benefits",
                    "Payment history tips"
                );
                break;
                
            default:
                suggestions.push(
                    "Help with loans",
                    "Investment advice",
                    "Improve ZimScore",
                    "Financial planning"
                );
        }
        
        return suggestions;
    }

    /**
     * Save conversation to database
     */
    async saveConversation(userId, userMessage, aiResponse, intent) {
        try {
            await supabase
                .from('kairo_conversations')
                .insert({
                    user_id: userId,
                    user_message: userMessage,
                    ai_response: aiResponse,
                    intent: intent,
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('Error saving conversation:', error);
        }
    }

    /**
     * Get conversation history
     */
    async getConversationHistory(userId, limit = 10) {
        try {
            const { data, error } = await supabase
                .from('kairo_conversations')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return {
                success: true,
                conversations: data || []
            };
        } catch (error) {
            console.error('Error getting conversation history:', error);
            return {
                success: false,
                conversations: []
            };
        }
    }

    /**
     * Get random template response
     */
    getRandomTemplate(type) {
        const templates = this.responseTemplates[type];
        return templates[Math.floor(Math.random() * templates.length)];
    }

    /**
     * Get financial tips by category
     */
    getFinancialTips(category) {
        return this.financialAdvice[category] || this.financialAdvice.budgeting;
    }

    /**
     * Get market insights
     */
    getMarketInsights(category = 'zimbabwe_economy') {
        return this.marketInsights[category] || this.marketInsights.zimbabwe_economy;
    }
}

module.exports = KairoAIService;
