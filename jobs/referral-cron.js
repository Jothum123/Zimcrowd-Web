/**
 * Referral System Cron Jobs
 * 
 * Schedule these jobs using your preferred scheduler:
 * - node-cron
 * - Render Cron Jobs
 * - Vercel Cron
 * - External service (e.g., cron-job.org)
 * 
 * SCHEDULE:
 * - Daily (midnight UTC): Credit expiration, warnings, fraud detection
 * - Monthly (1st of month): Leaderboard calculation
 */

const cron = require('node-cron');
const ReferralAutomationService = require('../services/referral-automation.service');

const referralAutomation = new ReferralAutomationService();

/**
 * Initialize cron jobs
 */
function initializeCronJobs() {
    console.log('🕐 Initializing referral cron jobs...');
    
    // Daily job at midnight UTC (00:00)
    // Runs: credit expiration, expiration warnings, fraud detection
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ Running daily referral jobs...');
        const result = await referralAutomation.runScheduledJobs('daily');
        console.log('Daily jobs result:', JSON.stringify(result, null, 2));
    }, {
        timezone: 'UTC'
    });
    
    // Monthly job on 1st of each month at 01:00 UTC
    // Runs: leaderboard calculation with bonuses
    cron.schedule('0 1 1 * *', async () => {
        console.log('⏰ Running monthly referral jobs...');
        const result = await referralAutomation.runScheduledJobs('monthly');
        console.log('Monthly jobs result:', JSON.stringify(result, null, 2));
    }, {
        timezone: 'UTC'
    });
    
    console.log('✅ Referral cron jobs initialized');
    console.log('   - Daily jobs: 00:00 UTC (expiration, warnings, fraud)');
    console.log('   - Monthly jobs: 01:00 UTC on 1st (leaderboard)');
}

/**
 * Run jobs manually (for testing or API triggers)
 */
async function runJobsManually(jobType = 'all') {
    console.log(`🔧 Running ${jobType} jobs manually...`);
    return await referralAutomation.runScheduledJobs(jobType);
}

/**
 * Run specific job
 */
async function runSpecificJob(jobName) {
    console.log(`🔧 Running specific job: ${jobName}`);
    
    switch (jobName) {
        case 'expiration':
            return await referralAutomation.runDailyCreditExpiration();
        case 'warnings':
            return await referralAutomation.runExpirationWarnings();
        case 'fraud':
            return await referralAutomation.runFraudDetection();
        case 'leaderboard':
            return await referralAutomation.runMonthlyLeaderboardCalculation();
        default:
            return { success: false, error: `Unknown job: ${jobName}` };
    }
}

module.exports = {
    initializeCronJobs,
    runJobsManually,
    runSpecificJob,
    referralAutomation
};
