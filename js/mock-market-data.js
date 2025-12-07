/**
 * Mock Market Data Service
 * Provides realistic mock data for Primary Market and Investment Portfolio
 * This simulates real loan data until production database is fully populated
 */

const MockMarketData = {
    // ZimScore Range: 30-85 points (from ZIMSCORE_COMPLETE_GUIDE.md)
    // Star Rating Display (from ZIMSCORE-AVATAR-DEPLOYMENT.md):
    //   80-85: ★★★★★ Excellent (#10b981 green)
    //   70-79: ★★★★☆ Good (#3b82f6 blue)
    //   60-69: ★★★☆☆ Fair (#f59e0b amber)
    //   50-59: ★★☆☆☆ Average (#6b7280 gray)
    //   40-49: ★☆☆☆☆ Below Average (#ef4444 red)
    //   30-39: ☆☆☆☆☆ Poor (#991b1b dark red)

    // Borrower profiles with avatars and ratings
    borrowers: [
        {
            id: 'b001',
            name: 'Sarah Moyo',
            initials: 'SM',
            avatar: null, // Will use initials
            occupation: 'Small Business Owner',
            location: 'Harare',
            rating: 5, // Excellent (ZimScore 80-85)
            totalLoans: 5,
            repaidOnTime: 5,
            memberSince: '2023-06-15',
            verified: true,
            zimScore: 82 // Very Low Risk - Max $1,000
        },
        {
            id: 'b002',
            name: 'Tendai Ndlovu',
            initials: 'TN',
            avatar: null,
            occupation: 'IT Professional',
            location: 'Bulawayo',
            rating: 4, // Good (ZimScore 70-79)
            totalLoans: 3,
            repaidOnTime: 3,
            memberSince: '2023-09-20',
            verified: true,
            zimScore: 75 // Low Risk - Max $800
        },
        {
            id: 'b003',
            name: 'Grace Chikwanha',
            initials: 'GC',
            avatar: null,
            occupation: 'Teacher',
            location: 'Mutare',
            rating: 5, // Excellent (ZimScore 80-85)
            totalLoans: 7,
            repaidOnTime: 7,
            memberSince: '2022-11-10',
            verified: true,
            zimScore: 84 // Very Low Risk - Max $1,000
        },
        {
            id: 'b004',
            name: 'Peter Mlambo',
            initials: 'PM',
            avatar: null,
            occupation: 'Farmer',
            location: 'Masvingo',
            rating: 3, // Fair (ZimScore 60-69)
            totalLoans: 4,
            repaidOnTime: 3,
            memberSince: '2024-01-05',
            verified: true,
            zimScore: 65 // Medium Risk - Max $600
        },
        {
            id: 'b005',
            name: 'Nyasha Chirwa',
            initials: 'NC',
            avatar: null,
            occupation: 'Nurse',
            location: 'Gweru',
            rating: 5, // Excellent (ZimScore 80-85)
            totalLoans: 6,
            repaidOnTime: 6,
            memberSince: '2023-03-22',
            verified: true,
            zimScore: 85 // Very Low Risk - Max $1,000 (Maximum score)
        },
        {
            id: 'b006',
            name: 'Tatenda Mugabe',
            initials: 'TM',
            avatar: null,
            occupation: 'Software Developer',
            location: 'Harare',
            rating: 4, // Good (ZimScore 70-79)
            totalLoans: 2,
            repaidOnTime: 2,
            memberSince: '2024-02-14',
            verified: true,
            zimScore: 78 // Low Risk - Max $800
        },
        {
            id: 'b007',
            name: 'Rumbidzai Ncube',
            initials: 'RN',
            avatar: null,
            occupation: 'Accountant',
            location: 'Harare',
            rating: 4, // Good (ZimScore 70-79)
            totalLoans: 4,
            repaidOnTime: 4,
            memberSince: '2023-07-30',
            verified: true,
            zimScore: 72 // Low Risk - Max $800
        },
        {
            id: 'b008',
            name: 'Farai Dube',
            initials: 'FD',
            avatar: null,
            occupation: 'Mechanic',
            location: 'Chitungwiza',
            rating: 2, // Average (ZimScore 50-59)
            totalLoans: 3,
            repaidOnTime: 2,
            memberSince: '2023-12-01',
            verified: false,
            zimScore: 55 // High Risk - Max $400
        },
        {
            id: 'b009',
            name: 'Chipo Mutasa',
            initials: 'CM',
            avatar: null,
            occupation: 'Market Vendor',
            location: 'Harare',
            rating: 1, // Below Average (ZimScore 40-49)
            totalLoans: 2,
            repaidOnTime: 1,
            memberSince: '2024-03-10',
            verified: false,
            zimScore: 45 // Very High Risk - Max $300
        },
        {
            id: 'b010',
            name: 'Blessing Moyo',
            initials: 'BM',
            avatar: null,
            occupation: 'Student',
            location: 'Gweru',
            rating: 0, // Poor (ZimScore 30-39)
            totalLoans: 1,
            repaidOnTime: 0,
            memberSince: '2024-05-01',
            verified: false,
            zimScore: 38 // Building Credit - Max $100
        }
    ],

    // Loan purposes/categories
    loanPurposes: [
        { category: 'Business Expansion', icon: 'fa-store', color: '#38e77b' },
        { category: 'Education', icon: 'fa-graduation-cap', color: '#3b82f6' },
        { category: 'Medical', icon: 'fa-heartbeat', color: '#ef4444' },
        { category: 'Agriculture', icon: 'fa-seedling', color: '#22c55e' },
        { category: 'Home Improvement', icon: 'fa-home', color: '#f59e0b' },
        { category: 'Vehicle', icon: 'fa-car', color: '#8b5cf6' },
        { category: 'Emergency', icon: 'fa-exclamation-triangle', color: '#f97316' },
        { category: 'Personal', icon: 'fa-user', color: '#06b6d4' }
    ],

    // Generate mock primary market loans
    generatePrimaryMarketLoans(count = 12) {
        const loans = [];
        const now = new Date();

        for (let i = 0; i < count; i++) {
            const borrower = this.borrowers[Math.floor(Math.random() * this.borrowers.length)];
            const purpose = this.loanPurposes[Math.floor(Math.random() * this.loanPurposes.length)];
            
            // Randomly assign currency: 60% USD, 40% ZWG
            const currency = Math.random() > 0.4 ? 'USD' : 'ZWG';
            
            // Amount based on currency
            const amount = currency === 'USD' 
                ? Math.floor(Math.random() * 9500) + 500  // USD: $500 - $10,000
                : Math.floor(Math.random() * 95000) + 5000; // ZWG: 5,000 - 100,000
            
            const term = [3, 6, 9, 12, 18, 24][Math.floor(Math.random() * 6)];
            
            // MONTHLY interest rates based on currency
            // USD: 5-10% monthly, ZWG: 7-15% monthly
            const interestRate = currency === 'USD'
                ? (Math.random() * 5 + 5).toFixed(1)  // 5% - 10%
                : (Math.random() * 8 + 7).toFixed(1); // 7% - 15%
            
            const fundedPercent = Math.floor(Math.random() * 100);
            const daysLeft = Math.floor(Math.random() * 25) + 5;
            const lendersCount = Math.floor(fundedPercent / 15) + 1;

            // Generate repayment schedule
            const schedule = this.generateRepaymentSchedule(amount, parseFloat(interestRate), term);

            loans.push({
                id: `loan_${Date.now()}_${i}`,
                currency: currency,
                borrower: borrower,
                purpose: purpose,
                title: this.generateLoanTitle(purpose.category),
                description: this.generateLoanDescription(purpose.category, borrower.occupation),
                amount: amount,
                fundedAmount: Math.floor(amount * fundedPercent / 100),
                fundedPercent: fundedPercent,
                interestRate: parseFloat(interestRate),
                term: term,
                monthlyPayment: schedule.monthlyPayment,
                totalRepayment: schedule.totalRepayment,
                riskLevel: this.calculateRiskLevel(borrower.zimScore),
                daysLeft: daysLeft,
                lendersCount: lendersCount,
                minInvestment: 25,
                maxInvestment: amount - Math.floor(amount * fundedPercent / 100),
                createdAt: new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'funding',
                schedule: schedule.payments,
                documents: this.generateDocuments(borrower.verified)
            });
        }

        return loans.sort((a, b) => b.fundedPercent - a.fundedPercent);
    },

    // Generate loan title based on category
    generateLoanTitle(category) {
        const titles = {
            'Business Expansion': ['Business Growth Loan', 'Shop Expansion Fund', 'Inventory Purchase', 'Equipment Upgrade'],
            'Education': ['Tuition Fee Loan', 'School Fees Support', 'University Funding', 'Skills Training'],
            'Medical': ['Medical Treatment Fund', 'Healthcare Expenses', 'Surgery Funding', 'Medical Emergency'],
            'Agriculture': ['Farm Equipment Loan', 'Seed & Fertilizer Fund', 'Irrigation Project', 'Livestock Purchase'],
            'Home Improvement': ['Home Renovation', 'Solar Installation', 'Roof Repair Fund', 'Kitchen Upgrade'],
            'Vehicle': ['Vehicle Purchase', 'Car Repair Fund', 'Transport Business', 'Delivery Vehicle'],
            'Emergency': ['Emergency Fund', 'Urgent Expenses', 'Family Emergency', 'Crisis Support'],
            'Personal': ['Personal Loan', 'Debt Consolidation', 'Wedding Fund', 'Relocation Expenses']
        };
        const options = titles[category] || ['General Loan'];
        return options[Math.floor(Math.random() * options.length)];
    },

    // Generate loan description
    generateLoanDescription(category, occupation) {
        const descriptions = {
            'Business Expansion': `As a ${occupation}, I'm seeking funding to expand my business operations. This investment will help me purchase additional inventory, upgrade equipment, and hire more staff to meet growing customer demand.`,
            'Education': `I'm pursuing further education to advance my career as a ${occupation}. This loan will cover tuition fees, books, and related expenses for my studies.`,
            'Medical': `I need financial assistance for medical treatment. As a ${occupation}, I'm committed to repaying this loan promptly once I recover and return to work.`,
            'Agriculture': `I'm a ${occupation} looking to invest in agricultural improvements. This funding will help me purchase seeds, fertilizers, and equipment to increase my farm's productivity.`,
            'Home Improvement': `As a ${occupation}, I'm looking to improve my home with essential renovations. This investment will increase my property value and improve living conditions for my family.`,
            'Vehicle': `I need a reliable vehicle for my work as a ${occupation}. This loan will help me purchase/repair a vehicle essential for my daily commute and business operations.`,
            'Emergency': `I'm facing an unexpected emergency situation. As a responsible ${occupation}, I have a solid repayment plan and will honor my commitment to lenders.`,
            'Personal': `I'm seeking a personal loan to manage important life expenses. With my stable income as a ${occupation}, I'm confident in my ability to repay on time.`
        };
        return descriptions[category] || `Seeking funding for personal needs. I work as a ${occupation} and have a reliable income source.`;
    },

    // Generate repayment schedule
    // NOTE: Rate parameter is MONTHLY interest rate (not annual)
    generateRepaymentSchedule(principal, monthlyInterestRate, termMonths) {
        const monthlyRate = monthlyInterestRate / 100; // Convert percentage to decimal
        const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
        const payments = [];
        let balance = principal;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() + 1);

        for (let i = 1; i <= termMonths; i++) {
            const interest = balance * monthlyRate;
            const principalPayment = monthlyPayment - interest;
            balance -= principalPayment;

            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i - 1);

            payments.push({
                installment: i,
                dueDate: dueDate.toISOString().split('T')[0],
                principal: Math.max(0, principalPayment).toFixed(2),
                interest: interest.toFixed(2),
                total: monthlyPayment.toFixed(2),
                balance: Math.max(0, balance).toFixed(2),
                status: 'pending'
            });
        }

        return {
            monthlyPayment: monthlyPayment.toFixed(2),
            totalRepayment: (monthlyPayment * termMonths).toFixed(2),
            totalInterest: ((monthlyPayment * termMonths) - principal).toFixed(2),
            payments: payments
        };
    },

    // Calculate risk level and category based on ZimScore (per ZIMSCORE-AVATAR-DEPLOYMENT.md)
    calculateRiskLevel(zimScore) {
        if (zimScore >= 80) return { level: 'Excellent', color: '#10b981', score: 'A+', maxLoan: 1000, stars: 5 };
        if (zimScore >= 70) return { level: 'Good', color: '#3b82f6', score: 'A', maxLoan: 800, stars: 4 };
        if (zimScore >= 60) return { level: 'Fair', color: '#f59e0b', score: 'B', maxLoan: 600, stars: 3 };
        if (zimScore >= 50) return { level: 'Average', color: '#6b7280', score: 'C', maxLoan: 400, stars: 2 };
        if (zimScore >= 40) return { level: 'Below Average', color: '#ef4444', score: 'D', maxLoan: 300, stars: 1 };
        return { level: 'Poor', color: '#991b1b', score: 'E', maxLoan: 100, stars: 0 };
    },

    // Calculate star rating from ZimScore (per ZIMSCORE-AVATAR-DEPLOYMENT.md)
    calculateStarRating(zimScore) {
        if (zimScore >= 80) return 5.0;
        if (zimScore >= 70) return 4.0;
        if (zimScore >= 60) return 3.0;
        if (zimScore >= 50) return 2.0;
        if (zimScore >= 40) return 1.0;
        return 0;
    },

    // Generate mock documents
    generateDocuments(verified) {
        const docs = [
            { name: 'ID Document', status: verified ? 'verified' : 'pending', icon: 'fa-id-card' },
            { name: 'Proof of Income', status: verified ? 'verified' : 'pending', icon: 'fa-file-invoice-dollar' },
            { name: 'Bank Statement', status: verified ? 'verified' : 'pending', icon: 'fa-university' }
        ];
        if (verified) {
            docs.push({ name: 'Address Verification', status: 'verified', icon: 'fa-map-marker-alt' });
        }
        return docs;
    },

    // Generate mock portfolio investments (loans user has invested in)
    generatePortfolioInvestments(count = 8) {
        const investments = [];
        const now = new Date();

        for (let i = 0; i < count; i++) {
            const borrower = this.borrowers[Math.floor(Math.random() * this.borrowers.length)];
            const purpose = this.loanPurposes[Math.floor(Math.random() * this.loanPurposes.length)];
            
            // Randomly assign currency: 60% USD, 40% ZWG
            const currency = Math.random() > 0.4 ? 'USD' : 'ZWG';
            
            // Amount based on currency
            const totalLoanAmount = currency === 'USD' 
                ? Math.floor(Math.random() * 8000) + 1000  // USD: $1,000 - $9,000
                : Math.floor(Math.random() * 80000) + 10000; // ZWG: 10,000 - 90,000
            
            const myInvestment = currency === 'USD'
                ? Math.floor(Math.random() * (totalLoanAmount * 0.4)) + 100  // USD: min $100
                : Math.floor(Math.random() * (totalLoanAmount * 0.4)) + 1000; // ZWG: min 1,000
            
            const term = [6, 9, 12, 18, 24][Math.floor(Math.random() * 5)];
            
            // MONTHLY interest rates based on currency
            // USD: 5-10% monthly, ZWG: 7-15% monthly
            const interestRate = currency === 'USD'
                ? (Math.random() * 5 + 5).toFixed(1)  // 5% - 10%
                : (Math.random() * 8 + 7).toFixed(1); // 7% - 15%
            
            const monthsElapsed = Math.floor(Math.random() * (term - 1)) + 1;
            const status = Math.random() > 0.15 ? 'active' : (Math.random() > 0.5 ? 'completed' : 'defaulted');

            // Calculate returns using MONTHLY interest rate (not annual)
            const monthlyReturn = (myInvestment * parseFloat(interestRate) / 100);
            const totalExpectedReturn = myInvestment + (monthlyReturn * term);
            const earnedSoFar = status === 'completed' ? totalExpectedReturn - myInvestment : monthlyReturn * monthsElapsed;

            investments.push({
                id: `inv_${Date.now()}_${i}`,
                loanId: `loan_${Date.now()}_${i}`,
                currency: currency,
                borrower: borrower,
                purpose: purpose,
                title: this.generateLoanTitle(purpose.category),
                totalLoanAmount: totalLoanAmount,
                myInvestment: myInvestment,
                ownershipPercent: ((myInvestment / totalLoanAmount) * 100).toFixed(1),
                interestRate: parseFloat(interestRate),
                term: term,
                monthsElapsed: monthsElapsed,
                monthsRemaining: Math.max(0, term - monthsElapsed),
                status: status,
                nextPaymentDate: this.getNextPaymentDate(monthsElapsed),
                nextPaymentAmount: (monthlyReturn + (myInvestment / term)).toFixed(2),
                totalExpectedReturn: totalExpectedReturn.toFixed(2),
                earnedSoFar: earnedSoFar.toFixed(2),
                returnRate: ((earnedSoFar / myInvestment) * 100).toFixed(1),
                riskLevel: this.calculateRiskLevel(borrower.zimScore),
                investedAt: new Date(now - (monthsElapsed * 30 * 24 * 60 * 60 * 1000)).toISOString(),
                canSellOnSecondary: status === 'active' && monthsElapsed >= 1,
                secondaryMarketValue: this.calculateSecondaryValue(myInvestment, earnedSoFar, monthsRemaining = term - monthsElapsed, status)
            });
        }

        return investments.sort((a, b) => new Date(b.investedAt) - new Date(a.investedAt));
    },

    // Get next payment date
    getNextPaymentDate(monthsElapsed) {
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        date.setDate(15); // Payments on 15th of each month
        return date.toISOString().split('T')[0];
    },

    // Calculate secondary market value
    calculateSecondaryValue(principal, earned, monthsRemaining, status) {
        if (status !== 'active') return 0;
        // Value = remaining principal + small premium for good loans
        const remainingValue = principal * (monthsRemaining / 12);
        const premium = status === 'active' ? 1.02 : 0.95; // 2% premium for active, 5% discount for others
        return (remainingValue * premium).toFixed(2);
    },

    // Generate star rating HTML with category-based colors (per ZIMSCORE-AVATAR-DEPLOYMENT.md)
    generateStarRating(rating, zimScore = null) {
        // Determine color based on rating/zimScore
        let color;
        if (zimScore !== null) {
            if (zimScore >= 80) color = '#10b981'; // Excellent - green
            else if (zimScore >= 70) color = '#3b82f6'; // Good - blue
            else if (zimScore >= 60) color = '#f59e0b'; // Fair - amber
            else if (zimScore >= 50) color = '#6b7280'; // Average - gray
            else if (zimScore >= 40) color = '#ef4444'; // Below Average - red
            else color = '#991b1b'; // Poor - dark red
        } else {
            // Fallback based on rating
            if (rating >= 5) color = '#10b981';
            else if (rating >= 4) color = '#3b82f6';
            else if (rating >= 3) color = '#f59e0b';
            else if (rating >= 2) color = '#6b7280';
            else if (rating >= 1) color = '#ef4444';
            else color = '#991b1b';
        }

        const fullStars = Math.floor(rating);
        const emptyStars = 5 - fullStars;
        
        let html = '';
        for (let i = 0; i < fullStars; i++) {
            html += `<i class="fas fa-star" style="color: ${color};"></i>`;
        }
        for (let i = 0; i < emptyStars; i++) {
            html += `<i class="far fa-star" style="color: ${color}; opacity: 0.4;"></i>`;
        }
        return html;
    },

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    },

    // Format date
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MockMarketData;
}
