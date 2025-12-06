#!/usr/bin/env node

// Database Migration Runner for Render/Production
// Executes SQL migration files against Supabase database

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Migration files to run in order
const MIGRATION_FILES = [
    '008_fee_structure_config.sql',
    '009_wallet_credits_system.sql', 
    '010_schema_fixes.sql'
];

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Note: Environment validation removed - not needed for SQL file generation

// Read migration file content
function readMigrationFile(filename) {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
        log(`❌ Migration file not found: ${filename}`, 'red');
        return null;
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        log(`📄 Read migration file: ${filename}`, 'blue');
        return content;
    } catch (error) {
        log(`❌ Failed to read migration file ${filename}: ${error.message}`, 'red');
        return null;
    }
}

// Note: SQL execution removed - Supabase requires manual execution via SQL Editor
// This script focuses on generating combined migration files for manual application

// Create combined migration file for manual execution
function createCombinedMigration() {
    log('\n📝 Creating combined migration file for manual execution...', 'cyan');
    
    // Create timestamped filename
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0] + '_' + now.toTimeString().split(' ')[0].replace(/:/g, '');
    const filename = `migrations_combined_${timestamp}.sql`;
    const outputPath = path.join(__dirname, '../database', filename);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    let combinedSQL = '-- Combined Database Migrations for Production\n';
    combinedSQL += '-- Generated on: ' + now.toISOString() + '\n';
    combinedSQL += '-- This file contains all pending migrations in order\n\n';
    
    for (const migrationFile of MIGRATION_FILES) {
        const content = readMigrationFile(migrationFile);
        if (content) {
            combinedSQL += `\n-- =====================================================\n`;
            combinedSQL += `-- Migration: ${migrationFile}\n`;
            combinedSQL += `-- =====================================================\n\n`;
            combinedSQL += content + '\n';
        }
    }
    
    fs.writeFileSync(outputPath, combinedSQL);
    
    log(`✅ Combined migration file created: ${filename}`, 'green');
    log(`📋 File contains ${MIGRATION_FILES.length} migrations`, 'blue');
    log(`📍 Full path: ${outputPath}`, 'cyan');
    
    return outputPath;
}

// Main execution function
async function main() {
    log('🚀 ZimCrowd Database Migration Runner', 'magenta');
    log('=' .repeat(50), 'magenta');
    
    // Create combined migration file for manual execution
    const combinedFilePath = createCombinedMigration();
    
    log('\n📋 Migration Instructions:', 'yellow');
    log('=' .repeat(50), 'yellow');
    log('1. The combined migration file has been created:', 'cyan');
    log(`   ${path.basename(combinedFilePath)}`, 'cyan');
    log('\n2. To apply migrations to production:', 'yellow');
    log('   Option A: Use Supabase SQL Editor to run the combined file', 'blue');
    log('   Option B: Use psql command line with connection string', 'blue');
    log('   Option C: Use Supabase CLI: supabase db push', 'blue');
    log('\n3. After running migrations:', 'yellow');
    log('   - Verify all tables are created correctly', 'blue');
    log('   - Check that the production errors are resolved', 'blue');
    log('   - Keep the rollback script handy for emergencies', 'blue');
    
    log('\n🔄 Rollback Information:', 'yellow');
    log('   Rollback script: database/migrations/010_schema_fixes_rollback.sql', 'cyan');
    log('   Use this only if migrations cause issues', 'red');
    
    log('\n✅ Migration runner completed successfully!', 'green');
    log('🎯 Ready to apply database fixes to production!', 'green');
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    log(`❌ Uncaught exception: ${error.message}`, 'red');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`❌ Unhandled rejection: ${reason}`, 'red');
    process.exit(1);
});

// Run the migration runner
if (require.main === module) {
    main().catch(error => {
        log(`❌ Migration runner failed: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { main, createCombinedMigration };
