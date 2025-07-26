/**
 * Action Executor Service
 * Executes actions identified by Grok from email content
 */

class ActionExecutor {
    constructor(dbPool) {
        this.db = dbPool;
    }

    /**
     * Execute all actions from an email
     * @param {Object} emailData - Processed email data with Grok analysis
     * @param {string} propertyId - Matched property ID
     * @returns {Object} Execution results
     */
    async executeEmailActions(emailData, propertyId) {
        const results = {
            propertyUpdates: [],
            tasksCreated: [],
            errors: [],
            success: true
        };

        try {
            // 1. Process action items from Grok analysis
            if (emailData.grok_analysis?.extractedInfo?.actionItems) {
                for (const actionItem of emailData.grok_analysis.extractedInfo.actionItems) {
                    console.log(`  📋 Processing action: ${actionItem}`);
                    
                    // Parse price change actions
                    const priceMatch = actionItem.match(/(?:change|adjust|update|set).*?(?:price|list price|listing price|contract price).*?(?:from.*?)?\$?([\d,]+)K?\s*(?:to|at|for)?\s*\$?([\d,]+)K?/i);
                    if (priceMatch) {
                        const newPrice = this.parsePrice(priceMatch[2] || priceMatch[1]);
                        if (newPrice && propertyId) {
                            await this.updatePropertyPrice(propertyId, newPrice, emailData, results);
                        }
                        continue;
                    }

                    // Parse simple price updates
                    const simplePriceMatch = actionItem.match(/(?:price|list price|listing price|contract price).*?\$?([\d,]+)K?/i);
                    if (simplePriceMatch && propertyId) {
                        const newPrice = this.parsePrice(simplePriceMatch[1]);
                        if (newPrice) {
                            await this.updatePropertyPrice(propertyId, newPrice, emailData, results);
                        }
                        continue;
                    }

                    // Create task for other action items
                    await this.createTaskFromAction(propertyId, actionItem, emailData, results);
                }
            }

            // 2. Process property updates from analyzeEmailForActions
            if (emailData.property_updates) {
                for (const update of emailData.property_updates) {
                    await this.executePropertyUpdate(propertyId, update, emailData, results);
                }
            }

        } catch (error) {
            console.error('❌ Error executing actions:', error);
            results.errors.push(error.message);
            results.success = false;
        }

        return results;
    }

    /**
     * Parse price from various formats
     * @param {string} priceStr - Price string like "80K", "$285,000", "1.2M"
     * @returns {number|null} Parsed price as number
     */
    parsePrice(priceStr) {
        if (!priceStr) return null;
        
        // Remove $ and commas
        let cleaned = priceStr.toString().replace(/[$,]/g, '').trim();
        
        // Handle K (thousands)
        if (cleaned.toLowerCase().endsWith('k')) {
            cleaned = cleaned.slice(0, -1);
            return parseFloat(cleaned) * 1000;
        }
        
        // Handle M (millions)
        if (cleaned.toLowerCase().endsWith('m')) {
            cleaned = cleaned.slice(0, -1);
            return parseFloat(cleaned) * 1000000;
        }
        
        // Regular number
        const price = parseFloat(cleaned);
        return isNaN(price) ? null : price;
    }

    /**
     * Update property price in database
     */
    async updatePropertyPrice(propertyId, newPrice, emailData, results) {
        try {
            // Get current property data
            const currentProp = await this.db.query(
                'SELECT current_list_price FROM properties WHERE id = $1',
                [propertyId]
            );

            if (currentProp.rows.length === 0) {
                throw new Error('Property not found');
            }

            const oldPrice = currentProp.rows[0].current_list_price;

            // Update the price
            await this.db.query(
                'UPDATE properties SET current_list_price = $1, updated_at = NOW() WHERE id = $2',
                [newPrice, propertyId]
            );

            // Add to property notes field
            const noteText = `Price updated from $${oldPrice?.toLocaleString() || 'N/A'} to $${newPrice.toLocaleString()} via email from ${emailData.from_name || emailData.from_email}`;
            
            // Append to existing notes
            await this.db.query(
                'UPDATE properties SET notes = CASE WHEN notes IS NULL OR notes = \'\' THEN $1 ELSE notes || $2 || $1 END WHERE id = $3',
                [noteText, '\n---\n', propertyId]
            );

            results.propertyUpdates.push({
                field: 'price',
                oldValue: oldPrice,
                newValue: newPrice,
                success: true
            });

            console.log(`    ✅ Price updated: $${oldPrice?.toLocaleString()} → $${newPrice.toLocaleString()}`);

        } catch (error) {
            console.error(`    ❌ Failed to update price: ${error.message}`);
            results.errors.push(`Price update failed: ${error.message}`);
        }
    }

    /**
     * Execute a property update from Grok analysis
     */
    async executePropertyUpdate(propertyId, update, emailData, results) {
        try {
            const { field, value, action, confidence } = update;
            
            // Map field names to database columns
            const fieldMap = {
                'listing_price': 'current_list_price',
                'price': 'current_list_price',
                'status': 'status',
                'client_name': 'client_name',
                'closing_date': 'closing_date',
                'listing_agent': 'listing_agent',
                'selling_agent': 'selling_agent'
            };

            const dbField = fieldMap[field];
            if (!dbField) {
                console.log(`    ⚠️ Unknown field: ${field}`);
                return;
            }

            // Special handling for price
            if (dbField === 'current_list_price') {
                const priceValue = this.parsePrice(value);
                if (priceValue) {
                    await this.updatePropertyPrice(propertyId, priceValue, emailData, results);
                }
                return;
            }

            // Update other fields
            await this.db.query(
                `UPDATE properties SET ${dbField} = $1, updated_at = NOW() WHERE id = $2`,
                [value, propertyId]
            );

            results.propertyUpdates.push({
                field: dbField,
                value: value,
                success: true
            });

            console.log(`    ✅ Updated ${field}: ${value}`);

        } catch (error) {
            console.error(`    ❌ Failed to update ${update.field}: ${error.message}`);
            results.errors.push(`${update.field} update failed: ${error.message}`);
        }
    }

    /**
     * Create a task from an action item
     */
    async createTaskFromAction(propertyId, actionItem, emailData, results) {
        try {
            // Determine task priority based on keywords
            let priority = 'Medium';
            if (actionItem.toLowerCase().includes('urgent') || 
                actionItem.toLowerCase().includes('asap') ||
                actionItem.toLowerCase().includes('immediately')) {
                priority = 'High';
            }

            // Determine category
            let category = 'General';
            if (actionItem.toLowerCase().includes('price') || 
                actionItem.toLowerCase().includes('listing')) {
                category = 'Listing';
            } else if (actionItem.toLowerCase().includes('contract')) {
                category = 'Contract';
            } else if (actionItem.toLowerCase().includes('inspection')) {
                category = 'Inspection';
            } else if (actionItem.toLowerCase().includes('closing')) {
                category = 'Closing';
            }

            // Create the task using the correct schema
            const taskResult = await this.db.query(
                `INSERT INTO tasks (
                    property_id, 
                    title, 
                    description, 
                    category, 
                    priority, 
                    status,
                    task_type,
                    assigned_to,
                    due_date,
                    is_auto_generated
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id`,
                [
                    propertyId,
                    actionItem.substring(0, 100), // Title (first 100 chars)
                    `From email: ${emailData.subject}\n\n${actionItem}\n\nRequested by: ${emailData.from_name || emailData.from_email}`,
                    category,
                    priority,
                    'Pending',
                    'pre-listing', // Default task type
                    'Email System', // assigned_to instead of created_by
                    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
                    true // is_auto_generated
                ]
            );

            results.tasksCreated.push({
                id: taskResult.rows[0].id,
                title: actionItem,
                category: category,
                priority: priority
            });

            console.log(`    ✅ Task created: ${actionItem.substring(0, 50)}...`);

        } catch (error) {
            console.error(`    ❌ Failed to create task: ${error.message}`);
            results.errors.push(`Task creation failed: ${error.message}`);
        }
    }
}

module.exports = ActionExecutor;