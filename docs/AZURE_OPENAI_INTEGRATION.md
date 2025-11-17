# Azure OpenAI Integration Guide

## 🚀 **Complete Azure OpenAI Integration for ZimCrowd Kairo AI**

This guide shows how to integrate Azure OpenAI with your existing Kairo AI system to create a powerful hybrid AI financial assistant.

---

## 📋 **Prerequisites**

### **1. Azure OpenAI Service Setup**
1. **Create Azure OpenAI Resource:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Create new resource → Search "OpenAI"
   - Select "Azure OpenAI" and create
   - Choose your region (preferably East US or West Europe)

2. **Deploy Models:**
   - In your Azure OpenAI resource, go to "Model deployments"
   - Deploy these current supported models:
     - **GPT-4o** (deployment name: `gpt-4o`) - Most capable for complex analysis
     - **GPT-4o Mini** (deployment name: `gpt-4o-mini`) - Fast, cost-effective, replaces GPT-3.5
     - **Text Embedding 3 Large** (deployment name: `text-embedding-3-large`) - Latest embedding model
   
   ⚠️ **Note**: GPT-3.5 Turbo was deprecated on Nov 14, 2025. Use GPT-4o Mini instead.

3. **Get Credentials:**
   - Go to "Keys and Endpoint"
   - Copy **Key 1** and **Endpoint**
   - Note your **Resource Name** from the endpoint URL

### **2. Install Dependencies**
```bash
npm install openai
```

---

## ⚙️ **Configuration**

### **1. Environment Variables**
Add to your `.env` file:
```env
# Azure OpenAI Configuration
AZURE_OPENAI_ENABLED=true
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_RESOURCE_NAME=your-resource-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Model Deployments - Current supported models only
AZURE_OPENAI_GPT4O_DEPLOYMENT=gpt-4o
AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large

# Note: GPT-3.5 Turbo deprecated as of Nov 14, 2025
```

### **2. Update Main App**
Add the new routes to your `app.js`:
```javascript
// Add Azure OpenAI routes
const kairoAzureRoutes = require('./routes/kairo-azure');
app.use('/api/kairo-azure', kairoAzureRoutes);
```

---

## 🧠 **AI System Architecture**

### **Hybrid AI Strategy:**
```
User Message
     ↓
Message Analysis
     ↓
┌─────────────────────────────────────┐
│  Strategy Selection:                │
│  • Simple → Local Kairo AI         │
│  • Complex → Azure OpenAI          │
│  • Medium → Hybrid (Both)          │
└─────────────────────────────────────┘
     ↓
Response Generation
     ↓
Enhanced Response with Suggestions
```

### **AI Models Used:**

#### **Local Kairo AI:**
- ✅ **Fast responses** for simple queries
- ✅ **ZimScore calculations** and basic advice
- ✅ **Loan eligibility** checks
- ✅ **Navigation** and simple help

#### **Azure OpenAI GPT-4o:**
- 🧠 **Most complex financial analysis**
- 🧠 **Multi-scenario planning**
- 🧠 **Comprehensive investment strategies**
- 🧠 **Advanced risk modeling**

#### **Azure OpenAI GPT-4o Mini:**
- ⚡ **All other scenarios** (replaces GPT-3.5)
- ⚡ **General conversations**
- ⚡ **Investment recommendations**
- ⚡ **Risk assessment**
- ⚡ **Personalized financial advice**
- ⚡ **Quick analysis** and summaries

---

## 🔌 **API Endpoints**

### **Enhanced Chat**
```javascript
POST /api/kairo-azure/chat
{
  "message": "How should I invest $10,000 for retirement?",
  "useAzure": true  // Optional: force Azure OpenAI
}

Response:
{
  "success": true,
  "response": "Based on your profile and retirement goals...",
  "intent": "investment_advice",
  "confidence": 0.92,
  "suggestions": ["Diversify portfolio", "Consider index funds"],
  "quickActions": [{"text": "View portfolios", "action": "view_investments"}],
  "source": "azure-openai",
  "model": "gpt-4"
}
```

### **Advanced Loan Analysis**
```javascript
POST /api/kairo-azure/loan-analysis
{
  "amount": 15000,
  "purpose": "Business expansion",
  "term": 36
}

Response:
{
  "success": true,
  "analysis": {
    "eligibility": {
      "approved": true,
      "maxAmount": 20000,
      "interestRate": "12-15%"
    },
    "recommendations": [...],
    "improvements": [...]
  },
  "source": "azure-openai"
}
```

### **Investment Advice**
```javascript
POST /api/kairo-azure/investment-advice
{
  "amount": 5000,
  "riskTolerance": "medium",
  "timeHorizon": "long",
  "goals": "Retirement planning"
}
```

### **Financial Planning**
```javascript
POST /api/kairo-azure/financial-planning
{
  "goals": ["Emergency fund", "House deposit"],
  "timeframe": "3years",
  "priorities": ["Stability", "Growth"]
}
```

---

## 🎯 **Integration Examples**

### **Frontend Integration**
```jsx
// Enhanced Kairo Chatbot with Azure OpenAI
import React, { useState } from 'react';

const EnhancedKairoChat = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (message) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/kairo-azure/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ message })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, {
          type: 'ai',
          content: data.response,
          suggestions: data.suggestions,
          quickActions: data.quickActions,
          source: data.source,
          confidence: data.confidence
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="enhanced-kairo-chat">
      {/* Chat interface with Azure OpenAI indicators */}
    </div>
  );
};
```

### **Backend Service Usage**
```javascript
const EnhancedKairoAIService = require('./services/enhanced-kairo-ai-with-azure.service');
const enhancedKairo = new EnhancedKairoAIService();

// Process message with hybrid AI
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  const userId = req.user.id;
  
  const response = await enhancedKairo.processMessage(userId, message);
  
  res.json({
    response: response.response,
    source: response.source,  // 'local-kairo', 'azure-openai', or 'hybrid'
    confidence: response.confidence
  });
});
```

---

## 📊 **Monitoring and Analytics**

### **AI Performance Tracking**
```javascript
// Check AI system health
GET /api/kairo-azure/health

Response:
{
  "success": true,
  "health": {
    "status": "healthy",
    "checks": {
      "localKairo": {"status": "healthy"},
      "azureOpenAI": {"status": "healthy"},
      "database": {"status": "healthy"}
    }
  }
}
```

### **Model Status**
```javascript
// Get available models and their status
GET /api/kairo-azure/models

Response:
{
  "models": {
    "local": {
      "name": "Kairo Local AI",
      "status": "active",
      "capabilities": ["basic_chat", "intent_detection"]
    },
    "azure": {
      "name": "Azure OpenAI",
      "status": "active",
      "models": {
        "gpt4": "gpt-4",
        "gpt35": "gpt-35-turbo"
      }
    }
  }
}
```

---

## 🔧 **Advanced Features**

### **1. Intelligent Routing**
The system automatically chooses the best AI model based on:
- **Query complexity** (simple vs complex)
- **Intent type** (basic info vs financial analysis)
- **User context** (new user vs experienced)
- **Response confidence** (fallback if low confidence)

### **2. Hybrid Responses**
For medium complexity queries, the system:
- Gets responses from **both** local and Azure AI
- **Compares quality** and confidence scores
- **Selects the best** response
- Provides **alternative** response as backup

### **3. Personalization**
Azure OpenAI responses are enhanced with:
- **User financial profile** context
- **ZimScore-based** recommendations
- **Employment type** considerations
- **Local market** conditions (Zimbabwe)

### **4. Learning and Improvement**
- **Conversation logging** for analysis
- **Feedback collection** for model improvement
- **Performance metrics** tracking
- **A/B testing** capabilities

---

## 🚀 **Deployment Steps**

### **1. Development Setup**
```bash
# 1. Install dependencies
npm install openai

# 2. Copy environment template
cp .env.azure-openai.example .env

# 3. Fill in your Azure OpenAI credentials
# Edit .env file with your API key and resource name

# 4. Test the integration
npm run test-azure-openai
```

### **2. Production Deployment**
```bash
# 1. Set environment variables
export AZURE_OPENAI_ENABLED=true
export AZURE_OPENAI_API_KEY=your-production-key

# 2. Deploy with enhanced routes
# Make sure kairo-azure routes are included

# 3. Monitor performance
# Check /api/kairo-azure/health endpoint
```

---

## 💡 **Best Practices**

### **1. Cost Optimization**
- Use **GPT-3.5** for simple queries (cheaper)
- Use **GPT-4** only for complex analysis
- Implement **caching** for similar queries
- Set **token limits** to control costs

### **2. Performance**
- **Parallel processing** for hybrid responses
- **Timeout handling** for Azure OpenAI calls
- **Graceful fallback** to local AI if Azure fails
- **Response caching** for common queries

### **3. Security**
- **Never log** API keys
- **Validate** all user inputs
- **Rate limit** API calls
- **Monitor** for unusual usage patterns

---

## 🎊 **Benefits of Azure OpenAI Integration**

### **🧠 Enhanced Intelligence:**
- **Advanced reasoning** for complex financial scenarios
- **Natural language** understanding and generation
- **Contextual awareness** across conversations
- **Personalized advice** based on user profile

### **🚀 Improved User Experience:**
- **More accurate** responses to complex questions
- **Better conversation** flow and context retention
- **Intelligent suggestions** and follow-up questions
- **Multi-turn** conversation support

### **📈 Business Value:**
- **Higher user engagement** with intelligent responses
- **Better financial advice** quality
- **Reduced support** burden with self-service AI
- **Competitive advantage** with advanced AI capabilities

---

## 🔍 **Testing the Integration**

### **Test Queries:**
```javascript
// Simple query (should use local Kairo)
"What's my ZimScore?"

// Complex query (should use Azure OpenAI)
"I have $50,000 to invest for retirement in 20 years. I'm 35, work in government, and want a balanced approach. What's the best strategy considering Zimbabwe's economic conditions?"

// Medium complexity (should use hybrid)
"Should I take a loan to invest in the stock market?"
```

### **Expected Behavior:**
- ✅ **Simple queries** → Fast local responses
- ✅ **Complex queries** → Detailed Azure OpenAI analysis
- ✅ **Fallback** → Local AI if Azure fails
- ✅ **Context retention** → Remembers conversation history
- ✅ **Personalization** → Uses user profile data

---

**🎯 Your Kairo AI system now has the power of Azure OpenAI for advanced financial intelligence! 🚀**
