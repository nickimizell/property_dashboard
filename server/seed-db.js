const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  const client = await pool.connect();
  
  try {
    // Check if tables already exist
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'properties'
      );
    `);

    if (result.rows[0].exists) {
      console.log('✅ Database already seeded - tables exist');
      
      // Check if we have data
      const countResult = await client.query('SELECT COUNT(*) FROM properties');
      const propertyCount = parseInt(countResult.rows[0].count);
      
      console.log(`📊 Found ${propertyCount} properties in database`);
      
      if (propertyCount > 0) {
        console.log('🎯 Database already has data - skipping seed to preserve existing data');
        console.log('💡 To force re-seed, use the /api/database/reseed endpoint');
        return;
      }
    }

    console.log('🔧 Creating database schema and seeding data...');
    
    // Read and execute the schema file with Trident data
    const schemaPath = path.join(__dirname, '..', 'database', 'schema_with_trident_data.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema in parts (PostgreSQL sometimes has issues with large scripts)
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement.trim() + ';');
        } catch (err) {
          // Ignore "already exists" errors
          if (!err.message.includes('already exists')) {
            console.warn('Warning:', err.message);
          }
        }
      }
    }

    // Verify seeding worked
    const finalCount = await client.query('SELECT COUNT(*) FROM properties');
    const taskCount = await client.query('SELECT COUNT(*) FROM tasks');
    
    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Created ${finalCount.rows[0].count} properties`);
    console.log(`📋 Created ${taskCount.rows[0].count} tasks`);
    console.log('🎯 Ready for production use!');
    
  } catch (err) {
    console.error('❌ Database seeding failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding process completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 Seeding process failed:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };