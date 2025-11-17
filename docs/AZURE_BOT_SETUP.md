# Azure Bot Service Setup Guide

## Step 1: Create Azure Bot Service

1. **Go to Azure Portal** (https://portal.azure.com)
2. **Create a Resource** → Search for "Azure Bot"
3. **Select "Azure Bot"** and click Create
4. **Fill in the details:**
   - Bot handle: `zimcrowd-kairo-bot`
   - Subscription: Your Azure subscription
   - Resource group: Create new or use existing
   - Pricing tier: F0 (Free) for development
   - Microsoft App ID: Create new
   - Creation type: Create new Microsoft App ID

## Step 2: Get Bot Credentials

After creation, go to your bot resource:
1. **Configuration** → Note down:
   - Microsoft App ID
   - Generate and copy the Client Secret
   - Messaging endpoint (you'll set this later)

## Step 3: Enable Web Chat Channel

1. In your bot resource, go to **Channels**
2. **Web Chat** should be enabled by default
3. Click on **Web Chat** to get the embed code and secret keys

## Step 4: Set up Bot Framework SDK

Choose your preferred approach:
- **Option A**: Bot Framework SDK (Node.js) - Full control
- **Option B**: Direct REST API calls - Simpler integration
- **Option C**: Azure OpenAI + Bot Framework - AI-powered

## Required Environment Variables

Add these to your `.env` file:
```
# Azure Bot Service
AZURE_BOT_APP_ID=your-microsoft-app-id
AZURE_BOT_APP_PASSWORD=your-client-secret
AZURE_BOT_ENDPOINT=https://your-bot.azurewebsites.net/api/messages

# Web Chat (for frontend)
AZURE_BOT_WEBCHAT_SECRET=your-webchat-secret
```
