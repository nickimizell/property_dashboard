const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const { seedDatabase } = require('./seed-db');
const { updatePropertyCoordinates, geocodeAddress } = require('./geocoding');
const { hashPassword, comparePassword, generateToken, authenticateToken, requireRole } = require('./auth');
const { sendUserInvitation, sendPasswordReset, generateSetupToken, testEmailConfig } = require('./emailService');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React build
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'OOTB Property API is running' });
});

// Dashboard stats endpoint
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM dashboard_stats');
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Properties endpoints
app.get('/api/properties', async (req, res) => {
  try {
    const { search, status, propertyType, isRented, minPrice, maxPrice } = req.query;
    
    let query = `
      SELECT p.*, 
             cd.earnest_money, cd.inspection, cd.title, cd.appraisal, cd.lending, cd.occupancy,
             COUNT(t.id) as task_count
      FROM properties p
      LEFT JOIN contingency_dates cd ON p.id = cd.property_id
      LEFT JOIN tasks t ON p.id = t.property_id AND t.status != 'Completed'
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    // Search filter
    if (search) {
      paramCount++;
      query += ` AND (p.address ILIKE $${paramCount} OR p.client_name ILIKE $${paramCount} OR p.selling_agent ILIKE $${paramCount} OR p.notes ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Status filter
    if (status) {
      const statuses = status.split(',');
      paramCount++;
      query += ` AND p.status = ANY($${paramCount})`;
      params.push(statuses);
    }

    // Property type filter
    if (propertyType) {
      const types = propertyType.split(',');
      paramCount++;
      query += ` AND p.property_type = ANY($${paramCount})`;
      params.push(types);
    }

    // Rental status filter
    if (isRented !== undefined) {
      paramCount++;
      query += ` AND p.is_rented = $${paramCount}`;
      params.push(isRented === 'true');
    }

    // Price range filter
    if (minPrice) {
      paramCount++;
      query += ` AND COALESCE(p.current_list_price, p.starting_list_price, 0) >= $${paramCount}`;
      params.push(parseInt(minPrice));
    }
    
    if (maxPrice) {
      paramCount++;
      query += ` AND COALESCE(p.current_list_price, p.starting_list_price, 0) <= $${paramCount}`;
      params.push(parseInt(maxPrice));
    }

    query += ' GROUP BY p.id, cd.property_id, cd.earnest_money, cd.inspection, cd.title, cd.appraisal, cd.lending, cd.occupancy ORDER BY p.updated_at DESC';

    const result = await pool.query(query, params);
    
    // Transform the result to match frontend expectations
    const properties = result.rows.map(row => ({
      id: row.id,
      address: row.address,
      clientName: row.client_name,
      sellingAgent: row.selling_agent,
      loanNumber: row.loan_number,
      basisPoints: row.basis_points,
      closingDate: row.closing_date,
      underContractPrice: row.under_contract_price,
      startingListPrice: row.starting_list_price,
      currentListPrice: row.current_list_price,
      status: row.status,
      propertyType: row.property_type,
      workflowType: row.workflow_type,
      isRented: row.is_rented,
      notes: row.notes,
      coordinates: {
        lat: parseFloat(row.coordinates_lat),
        lng: parseFloat(row.coordinates_lng)
      },
      listingDate: row.listing_date,
      lastPriceReduction: row.last_price_reduction,
      contingencyDates: row.earnest_money ? {
        earnestMoney: row.earnest_money,
        inspection: row.inspection,
        title: row.title,
        appraisal: row.appraisal,
        lending: row.lending,
        occupancy: row.occupancy
      } : undefined,
      taskCount: parseInt(row.task_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json(properties);
  } catch (err) {
    console.error('Properties fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Get single property
app.get('/api/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*, 
             cd.earnest_money, cd.inspection, cd.title, cd.appraisal, cd.lending, cd.occupancy
      FROM properties p
      LEFT JOIN contingency_dates cd ON p.id = cd.property_id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const row = result.rows[0];
    const property = {
      id: row.id,
      address: row.address,
      clientName: row.client_name,
      sellingAgent: row.selling_agent,
      loanNumber: row.loan_number,
      basisPoints: row.basis_points,
      closingDate: row.closing_date,
      underContractPrice: row.under_contract_price,
      startingListPrice: row.starting_list_price,
      currentListPrice: row.current_list_price,
      status: row.status,
      propertyType: row.property_type,
      workflowType: row.workflow_type,
      isRented: row.is_rented,
      notes: row.notes,
      coordinates: {
        lat: parseFloat(row.coordinates_lat),
        lng: parseFloat(row.coordinates_lng)
      },
      listingDate: row.listing_date,
      lastPriceReduction: row.last_price_reduction,
      contingencyDates: row.earnest_money ? {
        earnestMoney: row.earnest_money,
        inspection: row.inspection,
        title: row.title,
        appraisal: row.appraisal,
        lending: row.lending,
        occupancy: row.occupancy
      } : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    res.json(property);
  } catch (err) {
    console.error('Property fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// Tasks endpoints
app.get('/api/tasks', async (req, res) => {
  try {
    const { propertyId, status, priority, category } = req.query;
    
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (propertyId) {
      paramCount++;
      query += ` AND property_id = $${paramCount}`;
      params.push(propertyId);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (priority) {
      paramCount++;
      query += ` AND priority = $${paramCount}`;
      params.push(priority);
    }

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    query += ' ORDER BY due_date ASC, priority DESC';

    const result = await pool.query(query, params);
    
    // Transform to match frontend expectations
    const tasks = result.rows.map(row => ({
      id: row.id,
      propertyId: row.property_id,
      title: row.title,
      description: row.description,
      dueDate: row.due_date,
      priority: row.priority,
      status: row.status,
      category: row.category,
      taskType: row.task_type,
      assignedTo: row.assigned_to,
      completionNotes: row.completion_notes,
      completedAt: row.completed_at,
      isAutoGenerated: row.is_auto_generated
    }));

    res.json(tasks);
  } catch (err) {
    console.error('Tasks fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create property endpoint
app.post('/api/properties', async (req, res) => {
  try {
    const property = req.body;
    
    const result = await pool.query(`
      INSERT INTO properties (
        address, client_name, selling_agent, loan_number, basis_points,
        closing_date, under_contract_price, starting_list_price, current_list_price,
        status, property_type, workflow_type, is_rented, notes, coordinates_lat, coordinates_lng,
        listing_date, last_price_reduction
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      property.address, property.clientName, property.sellingAgent, property.loanNumber, property.basisPoints,
      property.closingDate, property.underContractPrice, property.startingListPrice, property.currentListPrice,
      property.status, property.propertyType, property.workflowType || 'Conventional', property.isRented, property.notes, 
      property.coordinates?.lat, property.coordinates?.lng, property.listingDate, property.lastPriceReduction
    ]);

    // Insert contingency dates if provided
    if (property.contingencyDates && (property.status === 'Under Contract' || property.status === 'Pending')) {
      await pool.query(`
        INSERT INTO contingency_dates (
          property_id, earnest_money, inspection, title, appraisal, lending, occupancy
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        result.rows[0].id, property.contingencyDates.earnestMoney, property.contingencyDates.inspection,
        property.contingencyDates.title, property.contingencyDates.appraisal, 
        property.contingencyDates.lending, property.contingencyDates.occupancy
      ]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Property creation error:', err);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// Update property endpoint
app.put('/api/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const property = req.body;
    
    const result = await pool.query(`
      UPDATE properties SET
        address = COALESCE($1, address),
        client_name = COALESCE($2, client_name),
        selling_agent = COALESCE($3, selling_agent),
        loan_number = COALESCE($4, loan_number),
        basis_points = COALESCE($5, basis_points),
        closing_date = COALESCE($6, closing_date),
        under_contract_price = COALESCE($7, under_contract_price),
        starting_list_price = COALESCE($8, starting_list_price),
        current_list_price = COALESCE($9, current_list_price),
        status = COALESCE($10, status),
        property_type = COALESCE($11, property_type),
        workflow_type = COALESCE($12, workflow_type),
        is_rented = COALESCE($13, is_rented),
        notes = COALESCE($14, notes),
        coordinates_lat = COALESCE($15, coordinates_lat),
        coordinates_lng = COALESCE($16, coordinates_lng),
        listing_date = COALESCE($17, listing_date),
        last_price_reduction = COALESCE($18, last_price_reduction),
        updated_at = NOW()
      WHERE id = $19
      RETURNING *
    `, [
      property.address, property.clientName, property.sellingAgent, property.loanNumber, property.basisPoints,
      property.closingDate, property.underContractPrice, property.startingListPrice, property.currentListPrice,
      property.status, property.propertyType, property.workflowType, property.isRented, property.notes,
      property.coordinates?.lat, property.coordinates?.lng, property.listingDate, property.lastPriceReduction, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Property update error:', err);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

// Create task endpoint
app.post('/api/tasks', async (req, res) => {
  try {
    const task = req.body;
    
    const result = await pool.query(`
      INSERT INTO tasks (
        property_id, title, description, due_date, priority, status,
        category, task_type, assigned_to, is_auto_generated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      task.propertyId, task.title, task.description, task.dueDate, task.priority, task.status,
      task.category, task.taskType, task.assignedTo, task.isAutoGenerated || false
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Task creation error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Complete task endpoint
app.put('/api/tasks/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { completionNotes } = req.body;

    const result = await pool.query(
      'UPDATE tasks SET status = $1, completed_at = NOW(), completion_notes = $2 WHERE id = $3 RETURNING *',
      ['Completed', completionNotes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task completed successfully', task: result.rows[0] });
  } catch (err) {
    console.error('Task completion error:', err);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// Database migration endpoint for users table
app.post('/api/database/migrate-users', async (req, res) => {
  try {
    console.log('🔄 Creating/updating users table and seeding with admin users...');
    
    const client = await pool.connect();
    try {
      // Drop existing users table if it exists (to handle schema changes)
      await client.query('DROP TABLE IF EXISTS users CASCADE');
      
      // Create users table with complete schema
      await client.query(`
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          name TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('Admin', 'Agent', 'Viewer')) DEFAULT 'Agent',
          is_active BOOLEAN DEFAULT TRUE,
          setup_token TEXT,
          setup_token_expires TIMESTAMP WITH TIME ZONE,
          reset_token TEXT,
          reset_token_expires TIMESTAMP WITH TIME ZONE,
          last_login TIMESTAMP WITH TIME ZONE,
          password_changed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create trigger for updated_at if it doesn't exist
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
            CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
        END
        $$;
      `);

      // Generate proper password hash for 'training1'
      const passwordHash = await hashPassword('training1');
      
      // Insert admin users with dynamically generated hash
      await client.query(`
        INSERT INTO users (id, username, email, password_hash, name, role, is_active) VALUES 
        (
          '550e8400-e29b-41d4-a716-446655440401',
          'mattmizell',
          'matt.mizell@gmail.com',
          $1,
          'Matt Mizell',
          'Admin',
          TRUE
        ),
        (
          '550e8400-e29b-41d4-a716-446655440402',
          'nickimizell',
          'nicki@outofthebox.properties',
          $1,
          'Nicki Mizell',
          'Admin',
          TRUE
        )
      `, [passwordHash]);
      console.log('✅ Admin users created successfully with hash:', passwordHash.substring(0, 20) + '...');

    } finally {
      client.release();
    }
    
    res.json({ success: true, message: 'Users table created and admin users seeded successfully' });
  } catch (err) {
    console.error('User migration error:', err);
    res.status(500).json({ error: 'Failed to migrate users table: ' + err.message });
  }
});

// Database management endpoints
app.post('/api/database/reseed', async (req, res) => {
  try {
    console.log('🔄 Manual database re-seed triggered - THIS WILL DELETE ALL DATA!');
    
    // Force clear and re-seed for manual requests
    const tempPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const client = await tempPool.connect();
    try {
      console.log('🗑️ Manually clearing all existing data...');
      await client.query('DELETE FROM tasks');
      await client.query('DELETE FROM contingency_dates');  
      await client.query('DELETE FROM properties');
      console.log('✅ Data cleared, now re-seeding...');
    } finally {
      client.release();
      await tempPool.end();
    }
    
    await seedDatabase();
    res.json({ success: true, message: 'Database forcefully re-seeded with Trident Properties' });
  } catch (err) {
    console.error('Manual re-seed error:', err);
    res.status(500).json({ error: 'Failed to re-seed database' });
  }
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username or email
    const result = await pool.query(
      'SELECT * FROM users WHERE (username = $1 OR email = $1) AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user (protected route)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, name, role, last_login, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get all users (admin only)
app.get('/api/users', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, name, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC'
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Create user (admin only) - sends invitation email
app.post('/api/users', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { username, email, name, role } = req.body;

    if (!username || !email || !name) {
      return res.status(400).json({ error: 'Username, email, and name are required' });
    }

    // Check if username or email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Generate setup token
    const setupToken = generateSetupToken();
    const setupTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user without password (will be set via email invitation)
    const result = await pool.query(`
      INSERT INTO users (username, email, name, role, setup_token, setup_token_expires, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, false)
      RETURNING id, username, email, name, role, is_active, created_at
    `, [username, email, name, role || 'Agent', setupToken, setupTokenExpires]);

    const newUser = result.rows[0];

    // Send invitation email
    const emailSent = await sendUserInvitation({
      ...newUser,
      role: role || 'Agent'
    }, setupToken);

    if (!emailSent) {
      console.warn('Failed to send invitation email, but user was created');
    }

    res.status(201).json({
      ...newUser,
      emailSent,
      message: emailSent ? 'User created and invitation email sent' : 'User created but email failed to send'
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user password
app.put('/api/users/:id/password', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Users can only change their own password unless they're admin
    if (req.user.id !== id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized to change this password' });
    }

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // If not admin, verify current password
    if (req.user.id === id && req.user.role !== 'Admin') {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }

      const user = await pool.query('SELECT password_hash FROM users WHERE id = $1', [id]);
      if (user.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValidPassword = await comparePassword(currentPassword, user.rows[0].password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2',
      [passwordHash, id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Setup password for new users (public endpoint with token)
app.post('/api/auth/setup-password', async (req, res) => {
  try {
    const { token, username, password } = req.body;

    if (!token || !username || !password) {
      return res.status(400).json({ error: 'Token, username, and password are required' });
    }

    // Find user with valid setup token
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND setup_token = $2 AND setup_token_expires > NOW()',
      [username, token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired setup token' });
    }

    const user = result.rows[0];

    // Hash password
    const passwordHash = await hashPassword(password);

    // Update user with password and activate account
    await pool.query(`
      UPDATE users SET 
        password_hash = $1, 
        setup_token = NULL, 
        setup_token_expires = NULL,
        is_active = true,
        password_changed_at = NOW()
      WHERE id = $2
    `, [passwordHash, user.id]);

    res.json({ message: 'Password setup successful. You can now log in.' });
  } catch (err) {
    console.error('Setup password error:', err);
    res.status(500).json({ error: 'Failed to setup password' });
  }
});

// Request password reset (public endpoint)
app.post('/api/auth/request-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    // Always return success for security (don't reveal if email exists)
    if (result.rows.length === 0) {
      return res.json({ message: 'If an account with this email exists, a reset link has been sent.' });
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = generateSetupToken();
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetToken, resetTokenExpires, user.id]
    );

    // Send reset email
    const emailSent = await sendPasswordReset(user, resetToken);

    if (!emailSent) {
      console.warn('Failed to send password reset email');
    }

    res.json({ message: 'If an account with this email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Request reset error:', err);
    res.status(500).json({ error: 'Failed to process reset request' });
  }
});

// Reset password with token (public endpoint)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, username, password } = req.body;

    if (!token || !username || !password) {
      return res.status(400).json({ error: 'Token, username, and password are required' });
    }

    // Find user with valid reset token
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND reset_token = $2 AND reset_token_expires > NOW()',
      [username, token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = result.rows[0];

    // Hash password
    const passwordHash = await hashPassword(password);

    // Update password and clear reset token
    await pool.query(`
      UPDATE users SET 
        password_hash = $1, 
        reset_token = NULL, 
        reset_token_expires = NULL,
        password_changed_at = NOW()
      WHERE id = $2
    `, [passwordHash, user.id]);

    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Resend invitation email (admin only)
app.post('/api/users/:id/resend-invitation', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Get user
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // If user already has password, don't resend setup invitation
    if (user.password_hash) {
      return res.status(400).json({ error: 'User has already set up their password' });
    }

    // Generate new setup token
    const setupToken = generateSetupToken();
    const setupTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await pool.query(
      'UPDATE users SET setup_token = $1, setup_token_expires = $2 WHERE id = $3',
      [setupToken, setupTokenExpires, id]
    );

    // Send invitation email
    const emailSent = await sendUserInvitation(user, setupToken);

    res.json({
      success: emailSent,
      message: emailSent ? 'Invitation email resent successfully' : 'Failed to send invitation email'
    });
  } catch (err) {
    console.error('Resend invitation error:', err);
    res.status(500).json({ error: 'Failed to resend invitation' });
  }
});

// Update user (admin only)
app.put('/api/users/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, name, role, is_active } = req.body;

    const result = await pool.query(`
      UPDATE users SET
        username = COALESCE($1, username),
        email = COALESCE($2, email),
        name = COALESCE($3, name),
        role = COALESCE($4, role),
        is_active = COALESCE($5, is_active),
        updated_at = NOW()
      WHERE id = $6
      RETURNING id, username, email, name, role, is_active, created_at, updated_at
    `, [username, email, name, role, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Geocoding endpoints
app.post('/api/geocode/batch', async (req, res) => {
  try {
    console.log('🌍 Starting batch geocoding update...');
    await updatePropertyCoordinates(pool);
    res.json({ success: true, message: 'Property coordinates updated successfully' });
  } catch (err) {
    console.error('Geocoding error:', err);
    res.status(500).json({ error: 'Failed to update property coordinates' });
  }
});

app.post('/api/geocode/address', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    const coordinates = await geocodeAddress(address);
    if (coordinates) {
      res.json({ success: true, coordinates });
    } else {
      res.status(404).json({ error: 'Address not found' });
    }
  } catch (err) {
    console.error('Single address geocoding error:', err);
    res.status(500).json({ error: 'Failed to geocode address' });
  }
});

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Seed database on startup
    if (process.env.DATABASE_URL) {
      console.log('🗄️ Initializing database...');
      await seedDatabase();
    } else {
      console.log('⚠️ No DATABASE_URL found - running in localStorage mode');
    }
    
    // Start server
    app.listen(port, () => {
      console.log(`🚀 OOTB Property Full-Stack App running on port ${port}`);
      console.log(`📱 Frontend: http://localhost:${port}`);
      console.log(`🔌 API: http://localhost:${port}/api`);
      console.log(`❤️ Health: http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;