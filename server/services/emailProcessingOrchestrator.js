/**
 * Email Processing Orchestrator
 * Coordinates all email processing services to handle the complete workflow
 */

const EmailProcessor = require('./emailProcessor');
const GrokClient = require('./grokClient');
const EnhancedDocumentExtractor = require('./enhancedDocumentExtractor');
const PropertyMatcher = require('./propertyMatcher');
const EmailResponder = require('./emailResponder');
const ActionExecutor = require('./actionExecutor');

class EmailProcessingOrchestrator {
    constructor(dbPool) {
        this.db = dbPool;
        
        // Initialize all service components
        this.emailProcessor = new EmailProcessor(dbPool);
        this.grokClient = new GrokClient();
        this.documentExtractor = new EnhancedDocumentExtractor(dbPool, this.grokClient);
        this.propertyMatcher = new PropertyMatcher(dbPool);
        this.emailResponder = new EmailResponder(dbPool);
        this.actionExecutor = new ActionExecutor(dbPool);
        
        this.isRunning = false;
        this.testingMode = true; // Default to testing mode
        this.processingInterval = null;
        this.processingStats = {
            emailsProcessed: 0,
            propertyMatches: 0,
            documentsStored: 0,
            tasksCreated: 0,
            calendarEventsCreated: 0,
            responsesSet: 0,
            errors: 0,
            lastProcessed: null
        };

        console.log('🎼 Email Processing Orchestrator initialized (Testing Mode)');
    }

    /**
     * Start the complete email processing system
     */
    async start(testingMode = true) {
        if (this.isRunning) {
            console.log('⚠️ Email processing is already running');
            return;
        }

        this.testingMode = testingMode;
        console.log(`🚀 Starting Email Processing System... (${testingMode ? 'Testing Mode' : 'Production Mode'})`);
        
        try {
            // Test all service connections
            await this.validateServices();
            
            if (testingMode) {
                // In testing mode, process existing emails once and stop
                console.log('🧪 Testing Mode: Processing existing emails once...');
                await this.runSingleProcessingCycle();
                console.log('✅ Testing cycle complete. System ready for manual control.');
            } else {
                // Production mode: continuous polling
                console.log('⚡ Production Mode: Starting continuous email monitoring...');
                
                // Override the basic email processor's processEmail method
                this.emailProcessor.processEmail = this.processEmailEnhanced.bind(this);
                
                // Start IMAP monitoring
                await this.emailProcessor.start();
                
                this.isRunning = true;
                console.log('✅ Email Processing System is running continuously');
            }
            
            // Print initial stats
            this.logStats();
            
        } catch (error) {
            console.error('❌ Failed to start Email Processing System:', error);
            throw error;
        }
    }

    /**
     * Run a single processing cycle (for testing)
     */
    async runSingleProcessingCycle() {
        console.log('🔄 Running single email processing cycle...');
        
        try {
            // Check for new emails and process them directly
            const emails = await this.checkEmailsDirectly();
            
            if (emails && emails.length > 0) {
                console.log(`📬 Found ${emails.length} new emails to process`);
                
                for (const email of emails) {
                    try {
                        await this.processEmailEnhanced(email);
                        this.processingStats.emailsProcessed++;
                    } catch (error) {
                        console.error('❌ Error processing email:', error);
                        this.processingStats.errors++;
                    }
                }
            } else {
                console.log('📭 No new emails found');
            }
            
            this.processingStats.lastProcessed = new Date().toISOString();
            
        } catch (error) {
            console.error('❌ Error in single processing cycle:', error);
            this.processingStats.errors++;
            throw error;
        }
    }

    /**
     * Check emails directly using IMAP (simplified for testing)
     */
    async checkEmailsDirectly() {
        console.log('📧 Connecting to Gmail IMAP...');
        
        const Imap = require('imap');
        const { simpleParser } = require('mailparser');
        
        const imapConfig = {
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASS,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { servername: 'imap.gmail.com' }
        };
        
        return new Promise((resolve, reject) => {
            const imap = new Imap(imapConfig);
            const emails = [];
            
            imap.once('ready', () => {
                console.log('📬 Connected to Gmail');
                
                imap.openBox('INBOX', false, (err, box) => {
                    if (err) {
                        console.error('❌ Error opening inbox:', err);
                        return reject(err);
                    }
                    
                    // Search for recent unread emails (last 7 days)
                    const searchCriteria = ['UNSEEN', ['SINCE', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]];
                    
                    imap.search(searchCriteria, (err, results) => {
                        if (err) {
                            console.error('❌ Search error:', err);
                            return reject(err);
                        }
                        
                        if (!results || results.length === 0) {
                            console.log('📭 No unread emails found');
                            imap.end();
                            return resolve([]);
                        }
                        
                        console.log(`📬 Found ${results.length} unread emails`);
                        
                        // Limit to first 5 emails for testing
                        const emailsToProcess = results.slice(0, 5);
                        let processedCount = 0;
                        
                        const fetch = imap.fetch(emailsToProcess, { bodies: '', struct: true });
                        
                        fetch.on('message', (msg, seqno) => {
                            let buffer = '';
                            let uid = null;
                            
                            msg.on('body', (stream, info) => {
                                stream.on('data', (chunk) => {
                                    buffer += chunk.toString('utf8');
                                });
                            });
                            
                            msg.once('attributes', (attrs) => {
                                uid = attrs.uid;
                            });
                            
                            msg.once('end', async () => {
                                try {
                                    const parsed = await simpleParser(buffer);
                                    parsed.uid = uid; // Add UID to parsed email
                                    emails.push(parsed);
                                    processedCount++;
                                    
                                    console.log(`📧 Processed email ${processedCount}/${emailsToProcess.length}: "${parsed.subject}"`);
                                    
                                    if (processedCount === emailsToProcess.length) {
                                        imap.end();
                                        resolve(emails);
                                    }
                                } catch (parseError) {
                                    console.error('❌ Error parsing email:', parseError);
                                    processedCount++;
                                    
                                    if (processedCount === emailsToProcess.length) {
                                        imap.end();
                                        resolve(emails);
                                    }
                                }
                            });
                        });
                        
                        fetch.once('error', (err) => {
                            console.error('❌ Fetch error:', err);
                            reject(err);
                        });
                    });
                });
            });
            
            imap.once('error', (err) => {
                console.error('❌ IMAP connection error:', err);
                reject(err);
            });
            
            imap.connect();
        });
    }

    /**
     * Process emails manually (for testing interface)
     */
    async processEmailsManually() {
        if (this.isRunning && !this.testingMode) {
            throw new Error('Cannot run manual processing while system is in production mode');
        }
        
        console.log('🔧 Manual email processing triggered...');
        await this.runSingleProcessingCycle();
        return this.getStatus();
    }

    /**
     * Stop the email processing system
     */
    stop() {
        console.log('🛑 Stopping Email Processing System...');
        
        if (this.emailProcessor) {
            this.emailProcessor.stop();
        }
        
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        
        this.isRunning = false;
        console.log('✅ Email Processing System stopped');
        
        // Print final stats
        this.logStats();
    }

    /**
     * Get current system status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            testingMode: this.testingMode,
            emailsProcessed: this.processingStats.emailsProcessed,
            propertyMatches: this.processingStats.propertyMatches,
            documentsStored: this.processingStats.documentsStored,
            tasksCreated: this.processingStats.tasksCreated,
            errors: this.processingStats.errors,
            lastProcessed: this.processingStats.lastProcessed
        };
    }

    /**
     * Enhanced email processing method that orchestrates all services
     */
    async processEmailEnhanced(email) {
        const startTime = Date.now();
        console.log(`\n🔄 === PROCESSING EMAIL ===`);
        console.log(`📧 Subject: "${email.subject}"`);
        console.log(`👤 From: ${email.from.text}`);
        console.log(`📎 Attachments: ${email.attachments.length}`);

        let emailRecord = null;
        
        try {
            // Step 1: Store email in processing queue
            console.log('\n📝 Step 1: Storing email in processing queue...');
            emailRecord = await this.emailProcessor.storeEmailInQueue(email);
            
            if (!emailRecord) {
                console.log('⚠️ Email already processed, skipping');
                return;
            }

            // Step 2: Process and extract text from attachments
            console.log('\n📄 Step 2: Processing attachments...');
            const attachmentData = [];
            
            for (const attachment of email.attachments) {
                try {
                    const extractionResult = await this.documentExtractor.extractText(
                        attachment.content, 
                        attachment.contentType, 
                        attachment.filename
                    );
                    
                    attachmentData.push({
                        filename: attachment.filename,
                        contentType: attachment.contentType,
                        size: attachment.content.length,
                        content: attachment.content,
                        extractedText: extractionResult.text,
                        extractionSuccess: extractionResult.success
                    });

                    console.log(`  ✅ ${attachment.filename}: ${extractionResult.text.length} characters extracted`);
                } catch (error) {
                    console.error(`  ❌ Failed to extract from ${attachment.filename}:`, error.message);
                }
            }

            // Step 3: Classify email with Grok AI
            console.log('\n🤖 Step 3: Classifying email with Grok...');
            const classification = await this.grokClient.classifyEmail({
                from_email: email.from.value[0].address,
                from_name: email.from.value[0].name,
                to_email: email.to ? email.to.value[0].address : null,
                subject: email.subject,
                body_text: email.text,
                body_html: email.html
            }, attachmentData);

            // Update classification in database
            await this.updateEmailClassification(emailRecord.id, classification);
            console.log(`  📊 Classification: ${classification.isPropertyRelated ? '✅ PROPERTY RELATED' : '❌ NOT PROPERTY'} (${(classification.confidence * 100).toFixed(1)}%)`);

            if (!classification.isPropertyRelated) {
                console.log('📭 Email is not property-related, leaving as unread');
                await this.markProcessingComplete(emailRecord.id, 'ignored', 'Not property related');
                return;
            }

            // Step 4: Mark email as read (it's property-related)
            console.log('\n✅ Step 4: Marking email as read...');
            if (email.uid) {
                await this.emailProcessor.markEmailAsRead(email.uid);
            } else {
                console.log('  ⚠️ No UID available, skipping mark as read');
            }

            // Step 5: Extract detailed information from documents using Grok
            console.log('\n📋 Step 5: Analyzing documents with Grok...');
            const documentAnalyses = [];
            
            for (const attachment of attachmentData) {
                if (attachment.extractedText && attachment.extractionSuccess) {
                    try {
                        const analysis = await this.grokClient.extractPropertyInfo(
                            attachment.extractedText, 
                            attachment.filename
                        );
                        documentAnalyses.push({ attachment, analysis });
                        console.log(`  📄 ${attachment.filename}: ${analysis.documentType} (${(analysis.confidence * 100).toFixed(1)}% confidence)`);
                    } catch (error) {
                        console.error(`  ❌ Failed to analyze ${attachment.filename}:`, error.message);
                    }
                }
            }

            // Step 6: Combine extracted information from email and documents
            console.log('\n🔍 Step 6: Combining extracted information...');
            const combinedInfo = this.combineExtractedInfo(classification.extractedInfo, documentAnalyses);
            console.log(`  📍 Found: ${combinedInfo.addresses.length} addresses, ${combinedInfo.clientNames.length} clients, ${combinedInfo.agentNames.length} agents`);

            // Step 7: Match to existing property
            console.log('\n🎯 Step 7: Matching to existing property...');
            const matchResult = await this.propertyMatcher.findPropertyMatch({
                subject: email.subject,
                from_email: email.from.value[0].address,
                from_name: email.from.value[0].name
            }, combinedInfo);

            // Update match results in database
            await this.propertyMatcher.updateEmailWithMatch(emailRecord.id, matchResult);

            let propertyId = null;
            if (matchResult) {
                propertyId = matchResult.property.id;
                console.log(`  ✅ MATCHED: ${matchResult.property.address} (${(matchResult.confidence * 100).toFixed(1)}% confidence)`);
                this.processingStats.propertyMatches++;
            } else {
                console.log('  ❌ NO MATCH FOUND');
            }

            // Step 8: Execute actions from email (if property matched)
            let actionResults = { propertyUpdates: [], tasksCreated: [], errors: [] };
            console.log('\n🔍 Step 8: Checking for action execution...');
            console.log(`  Property ID: ${propertyId}`);
            console.log(`  Action Items: ${JSON.stringify(classification.extractedInfo?.actionItems)}`);
            
            if (propertyId && classification.extractedInfo?.actionItems?.length > 0) {
                console.log('\n⚡ Step 8: Executing email actions...');
                try {
                    actionResults = await this.actionExecutor.executeEmailActions(
                        {
                            ...emailRecord,
                            grok_analysis: {
                                extractedInfo: classification.extractedInfo
                            }
                        },
                        propertyId
                    );
                    
                    // Update statistics
                    this.processingStats.tasksCreated += actionResults.tasksCreated.length;
                    console.log(`  ✅ Executed: ${actionResults.propertyUpdates.length} property updates, ${actionResults.tasksCreated.length} tasks created`);
                } catch (error) {
                    console.error('  ❌ Action execution failed:', error);
                    actionResults.errors.push(`Action execution failed: ${error.message}`);
                }
            } else {
                console.log('  ⏭️ Skipping action execution - no property match or no action items');
            }

            // Step 9: Store documents in database
            console.log('\n💾 Step 9: Storing documents...');
            const storedDocuments = [];
            
            for (const docData of documentAnalyses) {
                try {
                    const docId = await this.documentExtractor.storeDocument(
                        emailRecord.id,
                        propertyId,
                        docData.attachment,
                        { text: docData.attachment.extractedText },
                        docData.analysis
                    );
                    storedDocuments.push(docId);
                    console.log(`  💾 Stored: ${docData.attachment.filename}`);
                    this.processingStats.documentsStored++;
                } catch (error) {
                    console.error(`  ❌ Failed to store ${docData.attachment.filename}:`, error.message);
                }
            }

            // Step 9: Generate tasks and calendar events (if property matched)
            let generatedContent = { tasks: [], calendarEvents: [], notes: [], propertyUpdates: [] };
            
            if (propertyId) {
                console.log('\n📅 Step 9: Analyzing email for actions and updates...');
                
                try {
                    // Analyze email content for action requests (always, not just with attachments)
                    console.log(`  📧 Email content being analyzed:`);
                    console.log(`    Subject: "${email.subject}"`);
                    console.log(`    From: "${email.from.text}"`);
                    console.log(`    Body: "${email.text || email.html || 'No body'}"`);
                    
                    generatedContent = await this.grokClient.analyzeEmailForActions({
                        subject: email.subject,
                        body: email.text || email.html,
                        from: email.from.text,
                        propertyInfo: combinedInfo,
                        documentAnalysis: documentAnalyses[0]?.analysis || null
                    });
                    
                    console.log(`  📋 Generated: ${generatedContent.tasks.length} tasks, ${generatedContent.calendarEvents.length} events, ${generatedContent.notes.length} notes, ${generatedContent.propertyUpdates?.length || 0} property updates`);
                    
                    // Execute property updates if any
                    if (generatedContent.propertyUpdates && generatedContent.propertyUpdates.length > 0) {
                        console.log('\n🔄 Step 9a: Executing property updates...');
                        await this.executePropertyUpdates(propertyId, generatedContent.propertyUpdates, emailRecord.id);
                    }
                    
                } catch (error) {
                    console.error('  ❌ Failed to analyze email for actions:', error.message);
                }

                // Create tasks in database
                if (generatedContent.tasks.length > 0) {
                    await this.createTasksFromGenerated(propertyId, emailRecord.id, generatedContent.tasks);
                    this.processingStats.tasksCreated += generatedContent.tasks.length;
                }

                // Create calendar events in database
                if (generatedContent.calendarEvents.length > 0) {
                    await this.createCalendarEventsFromGenerated(propertyId, emailRecord.id, generatedContent.calendarEvents);
                    this.processingStats.calendarEventsCreated += generatedContent.calendarEvents.length;
                }

                // Add notes to property
                if (generatedContent.notes.length > 0) {
                    await this.addNotesToProperty(propertyId, emailRecord.id, generatedContent.notes);
                }
            }

            // Step 10: Update processing counts
            await this.updateProcessingCounts(emailRecord.id, {
                documents_saved: storedDocuments.length,
                tasks_created: generatedContent.tasks.length,
                calendar_events_created: generatedContent.calendarEvents.length,
                notes_added: generatedContent.notes.length
            });

            // Step 11: Send automated response
            console.log('\n📤 Step 11: Sending automated response...');
            try {
                await this.emailResponder.sendProcessingResponse(emailRecord.id, actionResults);
                this.processingStats.responsesSet++;
                console.log('  ✅ Response sent successfully');
            } catch (error) {
                console.error('  ❌ Failed to send response:', error.message);
            }

            // Step 12: Mark processing as complete
            await this.markProcessingComplete(emailRecord.id, 'processed', null);

            const processingTime = Date.now() - startTime;
            this.processingStats.emailsProcessed++;
            
            console.log(`\n🎉 === EMAIL PROCESSING COMPLETE ===`);
            console.log(`⏱️  Processing time: ${processingTime}ms`);
            console.log(`📊 Actions: ${storedDocuments.length} docs, ${generatedContent.tasks.length} tasks, ${generatedContent.calendarEvents.length} events`);

        } catch (error) {
            console.error('❌ Error in enhanced email processing:', error);
            this.processingStats.errors++;
            
            try {
                await this.markProcessingComplete(emailRecord?.id, 'failed', error.message);
            } catch (markError) {
                console.error('❌ Failed to mark processing as failed:', markError);
            }
        }
    }

    /**
     * Combine extracted information from email classification and document analysis
     */
    combineExtractedInfo(emailInfo, documentAnalyses) {
        const combined = {
            addresses: [...(emailInfo.addresses || [])],
            mlsNumbers: [...(emailInfo.mlsNumbers || [])],
            clientNames: [...(emailInfo.clientNames || [])],
            agentNames: [...(emailInfo.agentNames || [])],
            loanNumbers: [],
            importantDates: [...(emailInfo.importantDates || [])],
            actionItems: [...(emailInfo.actionItems || [])]
        };

        // Merge information from all document analyses
        for (const docData of documentAnalyses) {
            const info = docData.analysis.propertyInfo || {};
            const dates = docData.analysis.importantDates || {};

            if (info.addresses) combined.addresses.push(...info.addresses);
            if (info.mlsNumber) combined.mlsNumbers.push(info.mlsNumber);
            if (info.clientNames) combined.clientNames.push(...info.clientNames);
            if (info.agentNames) combined.agentNames.push(...info.agentNames);
            if (dates.contingencyDates) combined.importantDates.push(...dates.contingencyDates);
            if (docData.analysis.actionItems) combined.actionItems.push(...docData.analysis.actionItems);
        }

        // Remove duplicates
        combined.addresses = [...new Set(combined.addresses)];
        combined.mlsNumbers = [...new Set(combined.mlsNumbers)];
        combined.clientNames = [...new Set(combined.clientNames)];
        combined.agentNames = [...new Set(combined.agentNames)];
        combined.loanNumbers = [...new Set(combined.loanNumbers)];

        return combined;
    }

    /**
     * Execute property updates from email analysis
     */
    async executePropertyUpdates(propertyId, propertyUpdates, emailQueueId) {
        console.log(`\n🔄 Executing ${propertyUpdates.length} property updates...`);
        
        for (const update of propertyUpdates) {
            try {
                console.log(`  🔄 ${update.action}: ${update.field} = ${update.value}`);
                
                // Execute the database update
                let updateQuery = '';
                let params = [];
                
                switch (update.field) {
                    case 'price':
                    case 'listing_price':
                        updateQuery = `UPDATE properties SET listing_price = $1, updated_at = NOW() WHERE id = $2`;
                        params = [parseFloat(update.value), propertyId];
                        break;
                        
                    case 'status':
                        updateQuery = `UPDATE properties SET status = $1, updated_at = NOW() WHERE id = $2`;
                        params = [update.value, propertyId];
                        break;
                        
                    case 'notes':
                        const timestamp = new Date().toISOString().split('T')[0];
                        const noteText = `\n---\n[${timestamp}] Email Update from ${update.source}:\n${update.value}`;
                        updateQuery = `UPDATE properties SET notes = COALESCE(notes, '') || $1, updated_at = NOW() WHERE id = $2`;
                        params = [noteText, propertyId];
                        break;
                        
                    case 'client_name':
                        updateQuery = `UPDATE properties SET client_name = $1, updated_at = NOW() WHERE id = $2`;
                        params = [update.value, propertyId];
                        break;
                        
                    case 'selling_agent':
                    case 'listing_agent':
                        updateQuery = `UPDATE properties SET selling_agent = $1, updated_at = NOW() WHERE id = $2`;
                        params = [update.value, propertyId];
                        break;
                        
                    case 'closing_date':
                        updateQuery = `UPDATE properties SET closing_date = $1, updated_at = NOW() WHERE id = $2`;
                        params = [update.value, propertyId];
                        break;
                        
                    default:
                        console.log(`  ⚠️ Unsupported field update: ${update.field}`);
                        continue;
                }
                
                if (updateQuery) {
                    await this.db.query(updateQuery, params);
                    console.log(`  ✅ Updated ${update.field} successfully`);
                    
                    // Log the update in email processing queue (if column exists)
                    try {
                        await this.db.query(`
                            UPDATE email_processing_queue
                            SET property_updates_made = COALESCE(property_updates_made, 0) + 1
                            WHERE id = $1
                        `, [emailQueueId]);
                    } catch (columnError) {
                        // Column doesn't exist yet, ignore for now
                        console.log('  ⚠️ property_updates_made column not found, skipping counter update');
                    }
                }
                
            } catch (error) {
                console.error(`  ❌ Failed to update ${update.field}:`, error.message);
            }
        }
    }

    /**
     * Create tasks from generated content
     */
    async createTasksFromGenerated(propertyId, emailQueueId, tasks) {
        for (const task of tasks) {
            try {
                // Create task in tasks table
                const result = await this.db.query(`
                    INSERT INTO tasks (
                        property_id, title, description, due_date, priority, 
                        status, category, task_type, assigned_to, is_auto_generated
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id
                `, [
                    propertyId,
                    task.title,
                    task.description,
                    task.dueDate,
                    task.priority,
                    'Pending',
                    task.category,
                    'auto-generated',
                    task.assignedTo || 'Transaction Coordinator',
                    true
                ]);

                // Create metadata record
                await this.db.query(`
                    INSERT INTO email_generated_tasks (
                        email_queue_id, task_id, property_id, generation_reason
                    ) VALUES ($1, $2, $3, $4)
                `, [
                    emailQueueId,
                    result.rows[0].id,
                    propertyId,
                    'Auto-generated from email processing'
                ]);

                console.log(`  📋 Created task: ${task.title}`);
            } catch (error) {
                console.error(`  ❌ Failed to create task "${task.title}":`, error.message);
            }
        }
    }

    /**
     * Create calendar events from generated content
     */
    async createCalendarEventsFromGenerated(propertyId, emailQueueId, events) {
        for (const event of events) {
            try {
                // Create timeline entry
                const timelineResult = await this.db.query(`
                    INSERT INTO transaction_timeline (
                        property_id, event_type, title, description, 
                        event_date, status
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                `, [
                    propertyId,
                    'event',
                    event.title,
                    event.description,
                    event.eventDate,
                    'upcoming'
                ]);

                // Create calendar event metadata
                await this.db.query(`
                    INSERT INTO email_generated_calendar_events (
                        email_queue_id, timeline_id, property_id, event_title,
                        event_description, event_date, event_time, event_type,
                        priority, attendee_emails
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    emailQueueId,
                    timelineResult.rows[0].id,
                    propertyId,
                    event.title,
                    event.description,
                    event.eventDate,
                    event.eventTime,
                    event.eventType,
                    event.priority,
                    event.attendees || []
                ]);

                console.log(`  📅 Created calendar event: ${event.title}`);
            } catch (error) {
                console.error(`  ❌ Failed to create calendar event "${event.title}":`, error.message);
            }
        }
    }

    /**
     * Add notes to property record
     */
    async addNotesToProperty(propertyId, emailQueueId, notes) {
        const timestamp = new Date().toISOString().split('T')[0];
        const notesText = notes.join('\n');
        const formattedNote = `\n---\n[${timestamp}] Email Auto-Processing:\n${notesText}`;

        try {
            // Add to property notes field
            await this.db.query(`
                UPDATE properties 
                SET notes = COALESCE(notes, '') || $1 
                WHERE id = $2
            `, [formattedNote, propertyId]);

            // Track metadata
            await this.db.query(`
                INSERT INTO email_generated_notes_metadata (
                    email_queue_id, property_id, note_text, note_type
                ) VALUES ($1, $2, $3, $4)
            `, [emailQueueId, propertyId, notesText, 'email']);

            console.log(`  📝 Added ${notes.length} notes to property`);
        } catch (error) {
            console.error('  ❌ Failed to add notes to property:', error.message);
        }
    }

    /**
     * Helper methods
     */
    async updateEmailClassification(emailQueueId, classification) {
        await this.db.query(`
            UPDATE email_processing_queue 
            SET is_property_related = $1, 
                property_related_confidence = $2,
                classification_reason = $3,
                grok_analysis = $4
            WHERE id = $5
        `, [
            classification.isPropertyRelated,
            classification.confidence,
            classification.reasoning,
            JSON.stringify(classification.fullResponse),
            emailQueueId
        ]);
    }

    async updateProcessingCounts(emailQueueId, counts) {
        await this.db.query(`
            UPDATE email_processing_queue 
            SET documents_saved = $1,
                tasks_created = $2,
                calendar_events_created = $3,
                notes_added = $4
            WHERE id = $5
        `, [
            counts.documents_saved,
            counts.tasks_created,
            counts.calendar_events_created,
            counts.notes_added,
            emailQueueId
        ]);
    }

    async markProcessingComplete(emailQueueId, status, error = null) {
        await this.db.query(`
            UPDATE email_processing_queue 
            SET processing_status = $1,
                processed_at = NOW(),
                processing_error = $2
            WHERE id = $3
        `, [status, error, emailQueueId]);
    }

    async validateServices() {
        console.log('🔍 Validating services...');
        
        // Test Grok API connection
        const grokTest = await this.grokClient.testConnection();
        if (!grokTest) {
            throw new Error('Grok API connection failed');
        }
        console.log('  ✅ Grok API connection verified');

        // Test email configuration
        const emailTest = await this.emailResponder.testEmailConfig();
        if (!emailTest) {
            throw new Error('Email configuration test failed');
        }
        console.log('  ✅ Email configuration verified');

        // Test database connection
        try {
            await this.db.query('SELECT 1');
            console.log('  ✅ Database connection verified');
        } catch (error) {
            throw new Error('Database connection failed');
        }
    }

    logStats() {
        console.log('\n📊 === PROCESSING STATISTICS ===');
        console.log(`📧 Emails processed: ${this.processingStats.emailsProcessed}`);
        console.log(`🎯 Property matches: ${this.processingStats.propertyMatches}`);
        console.log(`📄 Documents stored: ${this.processingStats.documentsStored}`);
        console.log(`📋 Tasks created: ${this.processingStats.tasksCreated}`);
        console.log(`📅 Calendar events: ${this.processingStats.calendarEventsCreated}`);
        console.log(`📤 Responses sent: ${this.processingStats.responsesSet}`);
        console.log(`❌ Errors: ${this.processingStats.errors}`);
        console.log('==================================\n');
    }

    // Getter for external monitoring
    getStats() {
        return { ...this.processingStats, isRunning: this.isRunning };
    }
}

module.exports = EmailProcessingOrchestrator;