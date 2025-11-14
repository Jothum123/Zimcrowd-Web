/**
 * PostgreSQL Database Connection Pool
 * Uses pg (node-postgres) for raw SQL queries
 */

const { Pool } = require('pg');

// Create connection pool
// This pool will be shared by all services
const dbPool = new Pool({
    user: process.env.DB_USER || process.env.PGUSER,
    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    database: process.env.DB_NAME || process.env.PGDATABASE || 'zimcrowd',
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
    port: process.env.DB_PORT || process.env.PGPORT || 5432,
    
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection cannot be established
});

// Test connection on startup
dbPool.on('connect', () => {
    console.log('✅ PostgreSQL database connected');
});

dbPool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
    process.exit(-1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Closing database pool...');
    await dbPool.end();
    process.exit(0);
});

// Helper function to execute queries with error handling
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await dbPool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error:', { text, error: error.message });
        throw error;
    }
}

// Helper function for transactions
async function transaction(callback) {
    const client = await dbPool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { 
    dbPool,
    query,
    transaction
};
