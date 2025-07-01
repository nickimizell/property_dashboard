const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connected successfully!');
    
    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('⏰ Current database time:', result.rows[0].now);
    
    client.release();
    console.log('🎯 Ready to run migration!');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  } finally {
    await pool.end();
  }
}

testConnection();