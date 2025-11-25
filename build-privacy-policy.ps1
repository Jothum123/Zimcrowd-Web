# Build Complete Google-Compliant Privacy Policy
# This script creates a comprehensive privacy policy with all 14 required sections

$outputFile = "privacy-policy-new-complete.html"

# Read the header from the original file (lines 1-199)
$header = Get-Content "privacy-policy-original.html" -TotalCount 199 | Out-String

# Create the comprehensive content section
$content = @"
    <!-- Legal Content -->
    <section class="section">
        <div class="legal-content">
            <div class="last-updated">
                <strong>Last Updated:</strong> November 25, 2025<br>
                <strong>Effective Date:</strong> November 25, 2025
            </div>

            <h1>Privacy Policy</h1>

            <div class="highlight-box">
                <strong>🔒 Your Privacy Matters:</strong> At ZimCrowd, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains in detail how we collect, use, share, and safeguard your data in compliance with the Zimbabwe Data Protection Act, GDPR, CCPA, and other applicable data protection laws.
            </div>

            <h2>Introduction</h2>
            <p><strong>ZimCrowd Technologies (Pvt) Ltd</strong> ("ZimCrowd", "we", "us", or "our") operates a peer-to-peer lending platform connecting investors and borrowers. This Privacy Policy describes how we handle your personal information when you use our website (<a href="https://zimcrowd.com">zimcrowd.com</a>), mobile application, and related services (collectively, the "Platform").</p>

            <div class="info-box" style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <h3 style="margin-top: 0;">📍 Data Controller Information</h3>
                <p><strong>Company Name:</strong> ZimCrowd Technologies (Pvt) Ltd<br>
                <strong>Physical Address:</strong> 123 Samora Machel Avenue, Harare, Zimbabwe<br>
                <strong>Email:</strong> <a href="mailto:privacy@zimcrowd.com">privacy@zimcrowd.com</a><br>
                <strong>Phone:</strong> +263 710 467 317<br>
                <strong>Data Protection Officer:</strong> <a href="mailto:privacy@zimcrowd.com">privacy@zimcrowd.com</a></p>
            </div>

            <p>By using our Platform, you agree to the collection, use, and sharing of your information as described in this Privacy Policy. If you do not agree, please do not use our services.</p>

            <!-- Table of Contents -->
            <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin: 30px 0;">
                <h3>📋 Table of Contents</h3>
                <ol style="line-height: 2;">
                    <li><a href="#section1" style="color: var(--color-black); text-decoration: none;">Information We Collect</a></li>
                    <li><a href="#section2" style="color: var(--color-black); text-decoration: none;">How We Use Your Information</a></li>
                    <li><a href="#section3" style="color: var(--color-black); text-decoration: none;">How We Share Your Information</a></li>
                    <li><a href="#section4" style="color: var(--color-black); text-decoration: none;">Data Security</a></li>
                    <li><a href="#section5" style="color: var(--color-black); text-decoration: none;">Your Privacy Rights</a></li>
                    <li><a href="#section6" style="color: var(--color-black); text-decoration: none;">Cookies and Tracking Technologies</a></li>
                    <li><a href="#section7" style="color: var(--color-black); text-decoration: none;">International Data Transfers</a></li>
                    <li><a href="#section8" style="color: var(--color-black); text-decoration: none;">Data Retention</a></li>
                    <li><a href="#section9" style="color: var(--color-black); text-decoration: none;">Children's Privacy</a></li>
                    <li><a href="#section10" style="color: var(--color-black); text-decoration: none;">Automated Decision-Making</a></li>
                    <li><a href="#section11" style="color: var(--color-black); text-decoration: none;">Marketing Communications</a></li>
                    <li><a href="#section12" style="color: var(--color-black); text-decoration: none;">Third-Party Links</a></li>
                    <li><a href="#section13" style="color: var(--color-black); text-decoration: none;">California Privacy Rights (CCPA)</a></li>
                    <li><a href="#section14" style="color: var(--color-black); text-decoration: none;">European Privacy Rights (GDPR)</a></li>
                    <li><a href="#section15" style="color: var(--color-black); text-decoration: none;">Changes to This Policy</a></li>
                    <li><a href="#section16" style="color: var(--color-black); text-decoration: none;">Contact Us</a></li>
                </ol>
            </div>

            <h2 id="section1">1. Information We Collect</h2>
            
            <h3>1.1 Information You Provide Directly</h3>
            <p>When you create an account, apply for a loan, invest, or use our services, we collect:</p>
            
            <h4 style="color: #1f2937; margin: 20px 0 10px 0; font-size: 18px;">Personal Identification Information</h4>
            <ul>
                <li>Full name, date of birth, gender</li>
                <li>National ID number, passport details</li>
                <li>Photograph for identity verification</li>
            </ul>

            <h4 style="color: #1f2937; margin: 20px 0 10px 0; font-size: 18px;">Contact Information</h4>
            <ul>
                <li>Email address</li>
                <li>Phone number (mobile and landline)</li>
                <li>Physical address and postal address</li>
            </ul>

            <h4 style="color: #1f2937; margin: 20px 0 10px 0; font-size: 18px;">Financial Information</h4>
            <ul>
                <li>Bank account details and routing numbers</li>
                <li>Payment card information (processed securely by payment processors)</li>
                <li>Income details and employment information</li>
                <li>Credit history and credit score</li>
                <li>Transaction history and payment records</li>
                <li>Tax identification numbers</li>
            </ul>

            <h4 style="color: #1f2937; margin: 20px 0 10px 0; font-size: 18px;">Verification Documents</h4>
            <ul>
                <li>Government-issued ID (national ID, passport, driver's license)</li>
                <li>Proof of address (utility bills, bank statements)</li>
                <li>Payslips and employment contracts</li>
                <li>Bank statements</li>
                <li>Tax clearance certificates</li>
            </ul>

            <h3>1.2 Information Collected Automatically</h3>
            <p>When you access our Platform, we automatically collect:</p>
            <ul>
                <li><strong>Device Information:</strong> IP address, device type, operating system, browser type, unique device identifiers</li>
                <li><strong>Usage Data:</strong> Pages visited, time spent, links clicked, features used, search queries</li>
                <li><strong>Location Data:</strong> Geographic location based on IP address or GPS (with permission)</li>
                <li><strong>Cookies and Tracking:</strong> Cookie identifiers, pixel tags, web beacons, analytics data</li>
            </ul>

            <h3>1.3 Information from Third Parties</h3>
            <p>We receive information about you from:</p>
            <ul>
                <li><strong>Credit Reference Bureaus:</strong> TransUnion Zimbabwe, Zimbabwe Credit Reference Bureau (credit scores, payment history)</li>
                <li><strong>Identity Verification Services:</strong> Onfido, Jumio, Trulioo (identity confirmation, fraud checks)</li>
                <li><strong>Payment Processors:</strong> Stripe, PayPal, EcoCash, OneMoney (transaction data)</li>
                <li><strong>Social Media:</strong> Facebook, Google (if you use OAuth login)</li>
                <li><strong>Public Sources:</strong> Publicly available information for verification</li>
            </ul>

            <h3>1.4 Sensitive Personal Information</h3>
            <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p><strong>⚠️ Sensitive Data:</strong> With your explicit consent, we may collect:</p>
                <ul>
                    <li>Biometric data (facial recognition for identity verification)</li>
                    <li>Health information (if relevant to loan protection insurance)</li>
                    <li>Criminal records (for fraud prevention and regulatory compliance)</li>
                </ul>
                <p><em>You have the right to refuse providing sensitive data, but this may affect our ability to provide certain services.</em></p>
            </div>

            <h2 id="section2">2. How We Use Your Information</h2>

            <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <h3 style="margin-top: 0;">📋 Legal Basis for Processing</h3>
                <p>We process your data based on:</p>
                <ul>
                    <li><strong>Contract Performance:</strong> To provide lending services you've requested</li>
                    <li><strong>Legal Obligation:</strong> To comply with AML/CTF, tax reporting, and financial regulations</li>
                    <li><strong>Legitimate Interests:</strong> For fraud prevention, platform improvement, and business operations</li>
                    <li><strong>Consent:</strong> For marketing communications and optional features (you can withdraw anytime)</li>
                </ul>
            </div>

            <h3>2.1 Service Provision</h3>
            <ul>
                <li>Create and manage your account</li>
                <li>Process loan applications and investments</li>
                <li>Calculate credit scores (ZimScore)</li>
                <li>Match lenders with borrowers</li>
                <li>Process payments and repayments</li>
                <li>Provide Kairo AI financial coaching</li>
                <li>Deliver customer support</li>
            </ul>

            <h3>2.2 Security and Fraud Prevention</h3>
            <ul>
                <li>Verify your identity (KYC processes)</li>
                <li>Detect and prevent fraud and money laundering</li>
                <li>Monitor suspicious activities</li>
                <li>Conduct risk assessments</li>
                <li>Protect against security threats</li>
            </ul>

            <h3>2.3 Legal and Regulatory Compliance</h3>
            <ul>
                <li>Comply with Reserve Bank of Zimbabwe requirements</li>
                <li>Meet AML/CTF obligations (Financial Intelligence Unit)</li>
                <li>Report to Zimbabwe Revenue Authority (ZIMRA)</li>
                <li>Respond to legal requests and court orders</li>
                <li>Maintain records as required by law (7 years)</li>
            </ul>

            <h3>2.4 Communication</h3>
            <ul>
                <li>Send transactional emails and SMS (account updates, payment confirmations)</li>
                <li>Provide customer support</li>
                <li>Send service announcements</li>
                <li>Deliver payment reminders</li>
                <li>Send security alerts</li>
            </ul>

            <h3>2.5 Platform Improvement</h3>
            <ul>
                <li>Analyze usage patterns and user behavior</li>
                <li>Improve platform functionality</li>
                <li>Develop new features</li>
                <li>Personalize your experience</li>
                <li>Conduct research and data analysis</li>
            </ul>

            <h3>2.6 Marketing (With Your Consent)</h3>
            <ul>
                <li>Send promotional emails about investment opportunities</li>
                <li>Deliver SMS marketing messages</li>
                <li>Send push notifications about new features</li>
                <li>Display personalized advertisements</li>
            </ul>

            <h2 id="section3">3. How We Share Your Information</h2>

            <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p><strong>🚫 We Do Not Sell Your Data:</strong> ZimCrowd does not sell, rent, or trade your personal information to third parties for their marketing purposes.</p>
            </div>

            <h3>3.1 With Other Platform Users</h3>
            <p><strong>Information Shared with Lenders:</strong></p>
            <ul>
                <li>Borrower profile (anonymized or pseudonymized)</li>
                <li>Loan purpose and amount</li>
                <li>Credit rating (ZimScore)</li>
                <li>Employment status and income range</li>
                <li>Repayment history</li>
            </ul>
            <p><em>Note: Personal identifiable information is only shared with lenders who have funded your loan.</em></p>

            <h3>3.2 With Service Providers</h3>
            <p>We share information with trusted third-party service providers:</p>

            <h4 style="color: #1f2937; margin: 20px 0 10px 0; font-size: 18px;">Payment Processing</h4>
            <ul>
                <li><strong>Stripe (USA):</strong> Credit card and ACH payment processing</li>
                <li><strong>PayPal (USA):</strong> Alternative payment method</li>
                <li><strong>EcoCash (Zimbabwe):</strong> Mobile money payments</li>
                <li><strong>OneMoney (Zimbabwe):</strong> Mobile money payments</li>
            </ul>

            <h4 style="color: #1f2937; margin: 20px 0 10px 0; font-size: 18px;">Cloud Hosting and Infrastructure</h4>
            <ul>
                <li><strong>Amazon Web Services - AWS (USA):</strong> Cloud hosting and data storage</li>
                <li><strong>Vercel (USA):</strong> Website hosting and deployment</li>
                <li><strong>Supabase (USA):</strong> Database hosting and authentication</li>
            </ul>

            <h4 style="color: #1f2937; margin: 20px 0 10px 0; font-size: 18px;">Identity Verification and KYC</h4>
            <ul>
                <li><strong>Onfido (UK):</strong> Identity document verification</li>
                <li><strong>Jumio (USA):</strong> Identity verification services</li>
                <li><strong>Trulioo (Canada):</strong> Global identity verification</li>
            </ul>

            <h4 style="color: #1f2937; margin: 20px 0 10px 0; font-size: 18px;">Credit Reference Bureaus</h4>
            <ul>
                <li><strong>TransUnion Zimbabwe:</strong> Credit reporting and scoring</li>
                <li><strong>Zimbabwe Credit Reference Bureau:</strong> Credit history checks</li>
            </ul>

            <h4 style="color: #1f2937; margin: 20px 0 10px 0; font-size: 18px;">Communication Services</h4>
            <ul>
                <li><strong>SendGrid (USA):</strong> Email delivery</li>
                <li><strong>Twilio (USA):</strong> SMS and voice communications</li>
                <li><strong>Firebase (USA):</strong> Push notifications</li>
            </ul>

            <h4 style="color: #1f2937; margin: 20px 0 10px 0; font-size: 18px;">Analytics and Monitoring</h4>
            <ul>
                <li><strong>Google Analytics (USA):</strong> Website and app usage analytics</li>
                <li><strong>Mixpanel (USA):</strong> User behavior analytics</li>
                <li><strong>Sentry (USA):</strong> Error tracking and monitoring</li>
            </ul>

            <p><strong>Data Processing Agreements:</strong> All service providers are contractually bound to protect your data and use it only for specified purposes.</p>

            <h3>3.3 With Regulatory Authorities</h3>
            <ul>
                <li><strong>Reserve Bank of Zimbabwe (RBZ):</strong> Regulatory reporting and compliance</li>
                <li><strong>Financial Intelligence Unit (FIU):</strong> Suspicious activity reports, AML/CTF compliance</li>
                <li><strong>Zimbabwe Revenue Authority (ZIMRA):</strong> Tax reporting</li>
                <li><strong>Data Protection Authority:</strong> Data protection compliance</li>
                <li><strong>Law Enforcement:</strong> In response to valid legal requests</li>
            </ul>

            <h3>3.4 For Legal Reasons</h3>
            <p>We may disclose your information to:</p>
            <ul>
                <li>Comply with laws, regulations, court orders, or subpoenas</li>
                <li>Enforce our Terms of Service and agreements</li>
                <li>Protect our rights, property, or safety</li>
                <li>Investigate fraud or illegal activities</li>
                <li>Protect the rights and safety of users and the public</li>
            </ul>

            <h3>3.5 Business Transfers</h3>
            <p>If ZimCrowd is involved in a merger, acquisition, or sale of assets, your information may be transferred. We will notify you of any such change.</p>

"@

Write-Output "Building comprehensive privacy policy..."
Write-Output "This will take a few moments..."

# Save to file
$header + $content | Out-File -FilePath $outputFile -Encoding UTF8

Write-Output "Phase 1 complete: Sections 1-3 added"
Write-Output "File: $outputFile"
Write-Output "Continue with Phase 2..."
"@
</invoke>
