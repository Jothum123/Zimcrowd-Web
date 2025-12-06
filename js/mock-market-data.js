/**
 * Mock Market Data Service
 * Provides realistic mock data for Primary Market and Investment Portfolio
 * This simulates real loan data until production database is fully populated
 */

const MockMarketData = {
    // Borrower profiles with avatars and ratings
    borrowers: [
        {
            id: 'b001',
            name: 'Sarah Moyo',
            initials: 'SM',
            avatar: null, // Will use initials
            occupation: 'Small Business Owner',
            location: 'Harare',
            rating: 4.8,
            totalLoans: 5,
            repaidOnTime: 5,
            memberSince: '2023-06-15',
            verified: true,
            zimScore: 720
        },
        {
            id: 'b002',
            name: 'Tendai Ndlovu',
            initials: 'TN',
            avatar: null,
            occupation: 'IT Professional',
            location: 'Bulawayo',
            rating: 4.5,
            totalLoans: 3,
            repaidOnTime: 3,
            memberSince: '2023-09-20',
            verified: true,
            zimScore: 695
        },
        {
            id: 'b003',
            name: 'Grace Chikwanha',
            initials: 'GC',
            avatar: null,
            occupation: 'Teacher',
            location: 'Mutare',
            rating: 4.9,
            totalLoans: 7,
            repaidOnTime: 7,
            memberSince: '2022-11-10',
            verified: true,
            zimScore: 745
        },
        {
            id: 'b004',
            name: 'Peter Mlambo',
            initials: 'PM',
            avatar: null,
            occupation: 'Farmer',
            location: 'Masvingo',
            rating: 4.2,
            totalLoans: 4,
            repaidOnTime: 3,
            memberSince: '2024-01-05',
            verified: true,
            zimScore: 650
        },
        {
            id: 'b005',
            name: 'Nyasha Chirwa',
            initials: 'NC',
            avatar: null,
            occupation: 'Nurse',
            location: 'Gweru',
            rating: 5.0,
            totalLoans: 6,
            repaidOnTime: 6,
            memberSince: '2023-03-22',
            verified: true,
            zimScore: 780
        },
        {
            id: 'b006',
            name: 'Tatenda Mugabe',
            initials: 'TM',
            avatar: null,
            occupation: 'Software Developer',
            location: 'Harare',
            rating: 4.7,
            totalLoans: 2,
            repaidOnTime: 2,
            memberSince: '2024-02-14',
            verified: true,
            zimScore: 710
        },
        {
            id: 'b007',
            name: 'Rumbidzai Ncube',
            initials: 'RN',
            avatar: null,
            occupation: 'Accountant',
            location: 'Harare',
            rating: 4.6,
            totalLoans: 4,
            repaidOnTime: 4,
            memberSince: '2023-07-30',
            verified: true,
            zimScore: 735
        },
        {
            id: 'b008',
            name: 'Farai Dube',
            initials: 'FD',
            avatar: null,
            occupation: 'Mechanic',
            location: 'Chitungwiza',
            rating: 4.3,
            totalLoans: 3,
            repaidOnTime: 2,
            memberSince: '2023-12-01',
            verified: false,
            zimScore: 620
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
            const amount = Math.floor(Math.random() * 9500) + 500; // $500 - $10,000
            const term = [3, 6, 9, 12, 18, 24][Math.floor(Math.random() * 6)];
            const interestRate = (Math.random() * 8 + 2).toFixed(1); // 2% - 10%
            const fundedPercent = Math.floor(Math.random() * 100);
            const daysLeft = Math.floor(Math.random() * 25) + 5;
            const lendersCount = Math.floor(fundedPercent / 15) + 1;

            // Generate repayment schedule
            const schedule = this.generateRepaymentSchedule(amount, parseFloat(interestRate), term);

            loans.push({
                id: `loan_${Date.now()}_${i}`,
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
                riskLevel: this.calculateRiskLevel(borrower.zimScore, fundedPercent),
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
    generateRepaymentSchedule(principal, annualRate, termMonths) {
        const monthlyRate = annualRate / 100 / 12;
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

    // Calculate risk level based on ZimScore
    calculateRiskLevel(zimScore, fundedPercent) {
        if (zimScore >= 720 && fundedPercent >= 50) return { level: 'Low', color: '#22c55e', score: 'A' };
        if (zimScore >= 680 && fundedPercent >= 30) return { level: 'Low-Medium', color: '#84cc16', score: 'B+' };
        if (zimScore >= 640) return { level: 'Medium', color: '#f59e0b', score: 'B' };
        if (zimScore >= 600) return { level: 'Medium-High', color: '#f97316', score: 'C' };
        return { level: 'High', color: '#ef4444', score: 'D' };
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
            const totalLoanAmount = Math.floor(Math.random() * 8000) + 1000;
            const myInvestment = Math.floor(Math.random() * (totalLoanAmount * 0.4)) + 100;
            const term = [6, 9, 12, 18, 24][Math.floor(Math.random() * 5)];
            const interestRate = (Math.random() * 6 + 3).toFixed(1);
            const monthsElapsed = Math.floor(Math.random() * (term - 1)) + 1;
            const status = Math.random() > 0.15 ? 'active' : (Math.random() > 0.5 ? 'completed' : 'defaulted');

            // Calculate returns
            const monthlyReturn = (myInvestment * parseFloat(interestRate) / 100 / 12);
            const totalExpectedReturn = myInvestment + (monthlyReturn * term);
            const earnedSoFar = status === 'completed' ? totalExpectedReturn - myInvestment : monthlyReturn * monthsElapsed;

            investments.push({
                id: `inv_${Date.now()}_${i}`,
                loanId: `loan_${Date.now()}_${i}`,
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
                riskLevel: this.calculateRiskLevel(borrower.zimScore, 100),
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

    // Generate star rating HTML
    generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let html = '';
        for (let i = 0; i < fullStars; i++) {
            html += '<i class="fas fa-star" style="color: #f59e0b;"></i>';
        }
        if (hasHalfStar) {
            html += '<i class="fas fa-star-half-alt" style="color: #f59e0b;"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            html += '<i class="far fa-star" style="color: #f59e0b;"></i>';
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
