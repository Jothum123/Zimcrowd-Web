# Zimcrowd Web Portal Dashboard — Mobile App Integration Guide


## Overview
The Zimcrowd Web Portal Dashboard provides lenders and borrowers with a comprehensive web-based interface to manage their investments, loans, and financial activities. This dashboard seamlessly integrates with the mobile app, enabling users to switch between web and mobile platforms while maintaining real-time synchronization of data and actions.


## Core Features


### Unified User Dashboard
A web-based version of the mobile app dashboard with enhanced cross-platform capabilities.


#### Dashboard Components:
- **Balance Overview**: Real-time wallet balance with Zimcrowd Cash and CrowdCredits
- **ZimScore Display**: Credit score with tier information and improvement suggestions
- **Quick Actions**: Request loans, invest in opportunities, manage payments
- **Recent Activity**: Transaction history and loan status updates
- **Overdue Warnings**: Payment reminders and late fee alerts
- **Portfolio Summary**: Investment performance and loan status overview


#### Mobile App Integration Features:
- **Device Pairing**: Link web sessions with mobile app for seamless transitions
- **Cross-Platform Sync**: Real-time data synchronization between web and mobile
- **Push Notifications**: Send alerts to mobile app from web actions
- **Deep Link Generation**: Create mobile app shortcuts for quick access
- **QR Code Actions**: Generate QR codes for payments and sharing


## Mobile App Connection Methods


### Device Pairing via QR Code
Link your web portal session with the mobile app for enhanced functionality.


#### How to Pair Devices:
1. **Access Pairing Section**: Navigate to Settings > Device Pairing in web portal
2. **Generate QR Code**: Click "Generate Pairing Code" to create unique QR code
3. **Scan with Mobile App**: Open mobile app and scan QR code in Settings > Web Sync
4. **Confirm Connection**: Approve pairing on both devices
5. **Start Syncing**: Data and actions now sync between web and mobile platforms


#### Pairing Benefits:
- **Seamless Switching**: Continue where you left off when switching devices
- **Real-Time Updates**: Changes made on web instantly appear on mobile and vice versa
- **Unified Notifications**: Receive notifications on both platforms
- **Action Continuity**: Start a process on web, complete it on mobile


### Push Notifications to Mobile App
Send targeted notifications from web portal to your mobile device.


#### Notification Types:
- **Payment Reminders**: Upcoming payment alerts sent to mobile app
- **Investment Updates**: Portfolio performance notifications
- **Loan Status Changes**: Approval, rejection, or modification alerts
- **ZimScore Updates**: Credit score improvement notifications
- **Market Opportunities**: New investment opportunities
- **Security Alerts**: Login attempts and account changes


#### Managing Notifications:
```javascript
// Send notification to paired mobile device
const sendToMobile = async (notification) => {
  await fetch('/api/user/notifications/mobile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: currentUser.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      deepLink: notification.deepLink
    })
  });
};
```


### Deep Link Integration
Generate secure links that open specific screens in your mobile app.


#### Supported Deep Links:
- **Loan Details**: `zimcrowd://loan/{loan_id}` - View specific loan information
- **Payment Screen**: `zimcrowd://payment/{payment_id}` - Make a payment
- **Investment Details**: `zimcrowd://investment/{investment_id}` - Track investment
- **Market Opportunity**: `zimcrowd://market/{loan_id}` - View loan opportunity
- **Wallet Deposit**: `zimcrowd://wallet/deposit` - Add funds to wallet
- **Portfolio View**: `zimcrowd://portfolio/overview` - Investment dashboard
- **ZimCredit Apply**: `zimcrowd://zimcredit/apply` - Apply for instant loan


#### Deep Link Usage:
```javascript
// Generate deep link from web portal
const generateDeepLink = (action, params) => {
  const baseUrl = 'zimcrowd://';
  const queryParams = new URLSearchParams({
    source: 'web_portal',
    timestamp: Date.now(),
    ...params
  });


  return `${baseUrl}${action}?${queryParams.toString()}`;
};


// Example: Open loan details on mobile
const loanLink = generateDeepLink('loan/123', { highlight: 'payment_due' });
```


### QR Code Actions
Create QR codes for various mobile app interactions and offline functionality.


#### QR Code Types:
- **Payment QR**: Generate QR codes for loan payments that can be scanned by others
- **Contact Sharing**: Share your lender/borrower profile via QR code
- **Referral Codes**: QR codes for referral program participation
- **Market Sharing**: Share loan opportunities via QR codes
- **Offline Transactions**: QR codes for payments when internet is unavailable


#### QR Code Generation:
```javascript
// Generate payment QR code
const generatePaymentQR = async (paymentData) => {
  const qrPayload = {
    type: 'payment_request',
    amount: paymentData.amount,
    reference: paymentData.reference,
    recipient: currentUser.id,
    expiry: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    description: paymentData.description
  };


  return await QRCode.toDataURL(JSON.stringify(qrPayload));
};
```


## Web Portal Dashboard Sections


### Home Dashboard
Mirrors the mobile app home screen with web-specific enhancements.


#### Key Components:
- **Welcome Header**: Personalized greeting with current date/time
- **Balance Card**: Total balance with Zimcrowd Cash and CrowdCredits breakdown
- **ZimScore Card**: Credit score display with tier information and improvement tips
- **Quick Actions**: Request loan, invest, add funds, view portfolio
- **Recent Activity**: Latest transactions, loan updates, and notifications
- **Overdue Alerts**: Payment reminders with direct action buttons


#### Mobile Integration:
- **Sync Status**: Shows connection status with paired mobile device
- **Cross-Platform Actions**: Buttons that can open mobile app or sync actions
- **Notification Preferences**: Control which alerts go to mobile vs web


### Market Dashboard
Web interface for the loan marketplace with advanced filtering and analysis.


#### Market Sections:
- **ZimCredit Offers**: Instant loan options with quick application
- **Primary Market**: Borrower loan requests seeking funding
- **Secondary Market**: Existing performing loans available for purchase
- **Search & Filters**: Advanced filtering by amount, interest rate, ZimScore, purpose


#### Investment Features:
- **Loan Details**: Comprehensive loan information and borrower profiles
- **Risk Assessment**: ZimScore analysis and risk indicators
- **Funding Calculator**: Calculate returns and fees before investing
- **Bulk Actions**: Invest in multiple loans simultaneously
- **Watch List**: Save loans for later consideration


#### Mobile Integration:
- **Deep Link Sharing**: Share loan opportunities directly to mobile app
- **Investment Sync**: Investments made on web appear instantly on mobile
- **Notification Alerts**: Get notified when loans you watch get funded


### Portfolio Dashboard
Comprehensive investment and loan management interface.


#### Portfolio Views:
- **Loans Owed**: Money you've borrowed from the community (borrower view)
- **Investments Made**: Loans you've funded (lender view)
- **ZimCredit Loans**: Instant loans with different terms
- **Secondary Market**: Purchased loan positions
- **Performance Analytics**: Returns, yields, and risk metrics


#### Advanced Features:
- **CrowdCredits Protection**: Monitor and manage late loan protection
- **Payment Tracking**: Upcoming payments and payment history
- **Yield Calculations**: Real-time return calculations
- **Risk Monitoring**: Portfolio diversification and risk assessment
- **Reporting**: Generate detailed portfolio reports


#### Mobile Integration:
- **Payment Reminders**: Sync payment schedules with mobile calendar
- **Portfolio Sharing**: Share portfolio performance via QR codes
- **Alert Management**: Set up custom alerts for portfolio events


### Wallet Dashboard
Complete financial management with payment processing.


#### Wallet Features:
- **Balance Management**: View and manage Zimcrowd Cash and CrowdCredits
- **Transaction History**: Complete history with filtering and search
- **Payment Methods**: Manage EcoCash, OneMoney, InnBucks, O'mari, cards, bank transfers
- **Add Funds**: Multiple deposit options with mobile money integration
- **Withdraw Funds**: Transfer money to external accounts


#### Payment Processing:
- **Mobile Money**: EcoCash, OneMoney, InnBucks, O'mari integration
- **Card Payments**: Visa/Mastercard processing via PayNow
- **Bank Transfers**: Direct bank account transfers
- **Auto-Detection**: Smart mobile money type detection


#### Mobile Integration:
- **Payment Sync**: Transactions appear instantly across platforms
- **Receipt Delivery**: Digital receipts sent to both web and mobile
- **Payment Methods Sync**: Payment methods managed centrally


### Profile & Settings
User account management with cross-platform preferences.


#### Profile Features:
- **Personal Information**: Update contact details and preferences
- **ZimScore History**: Track credit score improvements over time
- **Document Management**: Upload and manage verification documents
- **Referral Program**: Track referrals and earnings
- **Notification Settings**: Control alerts across platforms


#### Settings:
- **Device Pairing**: Manage paired mobile devices
- **Privacy Controls**: Data sharing preferences
- **Security Settings**: Password, 2FA, login history
- **App Preferences**: Theme, language, currency preferences


## Cross-Platform Workflows


### Seamless Device Switching
Move between web portal and mobile app without losing context.


#### Switching Process:
1. **Start on Web**: Begin loan application or investment review on web portal
2. **Generate Mobile Link**: Create deep link to continue on mobile app
3. **Switch Devices**: Tap link to open mobile app at exact location
4. **Continue Seamlessly**: Pick up exactly where you left off
5. **Sync Changes**: All actions sync back to web portal automatically


### Unified Payment Management
Manage payments across both platforms with real-time synchronization.


#### Payment Workflow:
1. **Initiate on Web**: Start payment process in web portal
2. **Receive on Mobile**: Get push notification with payment details
3. **Complete on Mobile**: Use mobile app's payment interface for security
4. **Confirm on Web**: See payment confirmation instantly on web portal
5. **Receipt Delivery**: Receive digital receipt on both platforms


### Investment Tracking
Monitor investment portfolio with cross-platform analytics.


#### Portfolio Sync:
- **Real-Time Updates**: Investment performance updates instantly across devices
- **Alert Management**: Set up alerts that work on both web and mobile
- **Report Generation**: Create reports accessible from any device
- **Portfolio Sharing**: Share investment summaries via QR codes or links


## Technical Implementation


### Real-Time Synchronization
Maintain live data consistency between web portal and mobile app.


#### Sync Architecture:
```javascript
// Web portal sync implementation
import { supabase } from '../lib/supabase';


const syncWithMobile = async (userId, action, data) => {
  // Update database
  await supabase.from('user_actions').insert({
    user_id: userId,
    action_type: action,
    data: data,
    source: 'web_portal',
    timestamp: new Date()
  });


  // Send real-time update to mobile app
  await supabase.channel(`user_${userId}`).send({
    type: 'broadcast',
    event: 'web_action',
    payload: { action, data }
  });


  // Send push notification if needed
  if (action.requires_notification) {
    await sendPushNotification(userId, {
      title: 'Web Portal Action',
      body: `${action} completed on web portal`,
      deepLink: generateDeepLink(action, data)
    });
  }
};
```


### Mobile App Response:
```javascript
// Mobile app sync listener
import { supabase } from '../lib/supabase';


const setupWebSync = (userId) => {
  const channel = supabase.channel(`user_${userId}`);


  channel.on('broadcast', { event: 'web_action' }, (payload) => {
    // Handle web portal action on mobile
    handleWebAction(payload.payload);
  }).subscribe();
};
```


### Security and Privacy


#### Secure Cross-Platform Communication:
- **End-to-End Encryption**: All data transfers between web and mobile are encrypted
- **Device Authentication**: Paired devices must be authenticated
- **Session Management**: Secure session handling across platforms
- **Audit Logging**: Complete tracking of cross-platform activities


#### Privacy Controls:
- **Data Sharing Preferences**: Control what data syncs between devices
- **Notification Settings**: Granular control over cross-platform notifications
- **Device Management**: View and revoke paired device access
- **GDPR Compliance**: Full compliance with data protection regulations


## User Experience Features


### Progressive Web App (PWA) Capabilities
Enhanced web portal experience with app-like features.


#### PWA Features:
- **Install Prompt**: Add web portal to mobile home screen
- **Offline Access**: Basic functionality when internet is unavailable
- **Push Notifications**: Browser-based notifications when mobile app unavailable
- **Background Sync**: Automatic data synchronization when connection restored


### Contextual Actions
Smart suggestions based on user behavior across platforms.


#### Contextual Features:
- **Smart Reminders**: Payment reminders timed for optimal user engagement
- **Investment Suggestions**: Personalized recommendations based on web and mobile activity
- **ZimScore Tips**: Credit improvement suggestions
- **Market Alerts**: Notifications for relevant loan opportunities
- **Usage Insights**: Analytics showing most effective platform for different tasks


## Getting Started


### Setting Up Mobile App Integration


#### Initial Setup:
1. **Download Mobile App**: Ensure you have the latest version of Zimcrowd mobile app
2. **Log into Web Portal**: Access web portal from any browser
3. **Enable Integration**: Go to Settings > Mobile Integration
4. **Pair Devices**: Follow QR code pairing process
5. **Test Connection**: Verify notifications and sync are working


#### Quick Start Checklist:
- [ ] Mobile app downloaded and updated
- [ ] Web portal account created and verified
- [ ] Device pairing completed successfully
- [ ] Push notifications enabled on mobile
- [ ] Deep link handling tested
- [ ] Data synchronization verified


### Best Practices


#### Optimal Usage:
- **Web for Planning**: Use web portal for research, analysis, and complex tasks
- **Mobile for Action**: Use mobile app for payments, quick checks, and on-the-go management
- **Cross-Platform Tasks**: Start complex tasks on web, complete urgent actions on mobile
- **Regular Sync Checks**: Verify device pairing and sync status periodically


#### Performance Tips:
- **Keep Apps Updated**: Ensure both web and mobile platforms are current
- **Monitor Storage**: Clear cache regularly for optimal performance
- **Battery Optimization**: Allow background sync for real-time updates
- **Network Usage**: Monitor data usage for sync operations


## Troubleshooting


### Common Issues and Solutions


#### Device Pairing Problems:
- **QR Code Not Scanning**: Ensure camera permissions are enabled, try different lighting
- **Pairing Timeout**: Restart pairing process, check internet connection
- **Mobile App Crashes**: Update to latest app version, clear app cache


#### Synchronization Issues:
- **Data Not Syncing**: Check internet connection, refresh both platforms
- **Delayed Updates**: Wait for automatic sync or manually trigger refresh
- **Conflicting Changes**: Review and resolve conflicts in both platforms


#### Notification Problems:
- **Not Receiving Alerts**: Check notification permissions, verify device pairing
- **Wrong Device**: Ensure notifications are sent to correct paired device
- **Spam Filters**: Add Zimcrowd to safe senders list


### Diagnostic Tools


#### Built-in Diagnostics:
- **Connection Test**: Verify web-mobile connectivity
- **Sync Status**: Check real-time synchronization health
- **Notification Logs**: View sent and received notifications
- **Device List**: Manage paired devices and their status


## Support and Resources


### Help Resources:
- **Integration Guide**: Step-by-step setup tutorials
- **Video Tutorials**: Visual guides for pairing and using features
- **FAQ Section**: Common questions about cross-platform functionality
- **Community Forum**: User discussions and tips


### Contact Support:
- **In-App Support**: Use mobile app support chat
- **Web Portal Help**: Access help section in web portal
- **Email Support**: support@zimcrowd.co.zw
- **Phone Support**: +263 77 000 0000


## Future Enhancements


### Planned Features:
- **Advanced Analytics**: Cross-platform usage insights and recommendations
- **Voice Commands**: Voice-activated actions across web and mobile
- **Biometric Sync**: Secure authentication sharing between platforms
- **Offline Collaboration**: Work offline and sync when connection available
- **AI Assistant**: Intelligent suggestions based on cross-platform behavior


(Keep this guide updated as new web-mobile integration features are added.)