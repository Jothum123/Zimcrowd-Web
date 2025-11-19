/**
 * Development utility to clear test accounts from Supabase
 * USE WITH CAUTION - Only for development/testing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Service role key required for admin operations
);

async function clearTestAccounts() {
    try {
        console.log('🧹 Clearing test accounts...');
        
        // Define test email patterns to clear
        const testEmailPatterns = [
            'test@',
            'demo@',
            '@example.com',
            '@test.com',
            'jchitewe@gmail.com' // Add specific test emails here
        ];
        
        // Get all users (admin operation)
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
            console.error('❌ Error listing users:', listError);
            return;
        }
        
        console.log(`📋 Found ${users.users.length} total users`);
        
        // Filter test users
        const testUsers = users.users.filter(user => {
            const email = user.email || '';
            const phone = user.phone || '';
            
            return testEmailPatterns.some(pattern => 
                email.includes(pattern) || 
                phone.includes('+263777') || // Test phone pattern
                phone.includes('+263123') // Another test phone pattern
            );
        });
        
        console.log(`🎯 Found ${testUsers.length} test accounts to clear`);
        
        if (testUsers.length === 0) {
            console.log('✅ No test accounts found to clear');
            return;
        }
        
        // Ask for confirmation
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
            rl.question(`⚠️  Are you sure you want to delete ${testUsers.length} test accounts? (yes/no): `, resolve);
        });
        
        rl.close();
        
        if (answer.toLowerCase() !== 'yes') {
            console.log('❌ Operation cancelled');
            return;
        }
        
        // Delete test users
        let deleted = 0;
        for (const user of testUsers) {
            try {
                console.log(`🗑️  Deleting user: ${user.email || user.phone} (${user.id})`);
                
                const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
                
                if (deleteError) {
                    console.error(`❌ Failed to delete ${user.email || user.phone}:`, deleteError.message);
                } else {
                    deleted++;
                    console.log(`✅ Deleted ${user.email || user.phone}`);
                }
            } catch (error) {
                console.error(`❌ Error deleting ${user.email || user.phone}:`, error.message);
            }
        }
        
        console.log(`\n🎉 Successfully deleted ${deleted} out of ${testUsers.length} test accounts`);
        
    } catch (error) {
        console.error('❌ Error clearing test accounts:', error);
    }
}

// Run if called directly
if (require.main === module) {
    clearTestAccounts().then(() => {
        console.log('✅ Clear test accounts operation completed');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Operation failed:', error);
        process.exit(1);
    });
}

module.exports = { clearTestAccounts };
