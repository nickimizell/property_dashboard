const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database migration...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await client.query(schema);
    
    console.log('✅ Database migration completed successfully!');
    console.log('📊 Tables created:');
    console.log('   - properties');
    console.log('   - contingency_dates'); 
    console.log('   - tasks');
    console.log('   - users');
    console.log('   - activity_log');
    console.log('📈 Views created:');
    console.log('   - dashboard_stats');
    console.log('🔍 Indexes created for optimal performance');
    console.log('📝 Sample data inserted');
    
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();