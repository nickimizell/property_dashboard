const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
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
        status, property_type, is_rented, notes, coordinates_lat, coordinates_lng,
        listing_date, last_price_reduction
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      property.address, property.clientName, property.sellingAgent, property.loanNumber, property.basisPoints,
      property.closingDate, property.underContractPrice, property.startingListPrice, property.currentListPrice,
      property.status, property.propertyType, property.isRented, property.notes, 
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
        is_rented = COALESCE($12, is_rented),
        notes = COALESCE($13, notes),
        coordinates_lat = COALESCE($14, coordinates_lat),
        coordinates_lng = COALESCE($15, coordinates_lng),
        listing_date = COALESCE($16, listing_date),
        last_price_reduction = COALESCE($17, last_price_reduction),
        updated_at = NOW()
      WHERE id = $18
      RETURNING *
    `, [
      property.address, property.clientName, property.sellingAgent, property.loanNumber, property.basisPoints,
      property.closingDate, property.underContractPrice, property.startingListPrice, property.currentListPrice,
      property.status, property.propertyType, property.isRented, property.notes,
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, () => {
  console.log(`OOTB Property API server running on port ${port}`);
});

module.exports = app;