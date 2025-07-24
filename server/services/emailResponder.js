/**
 * Email Response Service
 * Handles automated email responses based on processing results
 */

const nodemailer = require('nodemailer');
const { Pool } = require('pg');

class EmailResponder {
    constructor(dbPool) {
        this.db = dbPool;
        
        // Email configuration (reusing existing setup)
        this.emailConfig = {
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: 'transaction.coordinator.agent@gmail.com',
                pass: 'xmvi xvso zblo oewe' // App password from existing setup
            }
        };

        this.transporter = nodemailer.createTransport(this.emailConfig);
        
        // Dashboard base URL for links
        this.dashboardUrl = 'https://ootb-property-dashboard.onrender.com';
        
        console.log('📧 Email Responder initialized');
    }

    /**
     * Send appropriate response based on processing results
     */
    async sendProcessingResponse(emailQueueId) {
        try {
            console.log(`📤 Sending processing response for email ${emailQueueId}`);
            
            // Get email and processing data
            const emailData = await this.getEmailProcessingData(emailQueueId);
            
            if (!emailData) {
                console.log('⚠️ No email data found for response');
                return;
            }

            // Determine response type based on processing results
            const responseType = this.determineResponseType(emailData);
            
            if (responseType === 'none') {
                console.log('📭 No response needed for this email');
                return;
            }

            // Generate and send response
            const response = await this.generateResponse(responseType, emailData);
            const success = await this.sendEmail(response);
            
            if (success) {
                await this.logEmailResponse(emailQueueId, responseType, response);
                console.log(`✅ Response sent successfully: ${response.subject}`);
            }

        } catch (error) {
            console.error('❌ Error sending processing response:', error);
        }
    }

    /**
     * Get comprehensive email processing data
     */
    async getEmailProcessingData(emailQueueId) {
        try {
            const result = await this.db.query(`
                SELECT 
                    epq.*,
                    p.address as property_address,
                    p.client_name as property_client,
                    p.selling_agent,
                    p.status as property_status,
                    COUNT(eds.id) as documents_count,
                    COUNT(egt.id) as tasks_count,
                    COUNT(egce.id) as calendar_events_count,
                    COUNT(egnm.id) as notes_count
                FROM email_processing_queue epq
                LEFT JOIN properties p ON epq.matched_property_id = p.id
                LEFT JOIN email_document_storage eds ON epq.id = eds.email_queue_id
                LEFT JOIN email_generated_tasks egt ON epq.id = egt.email_queue_id
                LEFT JOIN email_generated_calendar_events egce ON epq.id = egce.email_queue_id
                LEFT JOIN email_generated_notes_metadata egnm ON epq.id = egnm.email_queue_id
                WHERE epq.id = $1
                GROUP BY epq.id, p.id
            `, [emailQueueId]);

            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Error getting email processing data:', error);
            return null;
        }
    }

    /**
     * Determine what type of response to send
     */
    determineResponseType(emailData) {
        // Don't send responses for non-property-related emails
        if (!emailData.is_property_related) {
            return 'none';
        }

        // Don't send responses if auto-response is disabled or already sent
        if (emailData.auto_response_sent) {
            return 'none';
        }

        // Determine response based on processing results
        if (emailData.matched_property_id) {
            // Property matched
            if (emailData.documents_count > 0 || emailData.tasks_count > 0 || emailData.calendar_events_count > 0) {
                return 'property_matched_actions_taken';
            } else {
                return 'property_matched_no_actions';
            }
        } else {
            // No property match
            if (emailData.processing_status === 'manual_review') {
                return 'property_not_found';
            } else if (emailData.processing_status === 'failed') {
                return 'processing_error';
            }
        }

        return 'none';
    }

    /**
     * Generate response email content
     */
    async generateResponse(responseType, emailData) {
        const templates = {
            'property_matched_actions_taken': {
                subject: `✅ Documents & Tasks Created - ${emailData.property_address || 'Property'}`,
                templateName: 'property_matched_documents_saved'
            },
            'property_matched_no_actions': {
                subject: `✅ Email Received - ${emailData.property_address || 'Property'}`,
                templateName: 'property_matched_no_actions'
            },
            'property_not_found': {
                subject: `⚠️ Property Not Found - Action Required`,
                templateName: 'property_not_found'
            },
            'processing_error': {
                subject: `❌ Processing Error - Manual Review Required`,
                templateName: 'processing_error'
            }
        };

        const template = templates[responseType];
        if (!template) {
            throw new Error(`Unknown response type: ${responseType}`);
        }

        // Get template from database
        const dbTemplate = await this.getEmailTemplate(template.templateName);
        
        // Prepare template variables
        const variables = await this.prepareTemplateVariables(emailData);
        
        // Generate final email content
        const subject = this.fillTemplate(template.subject, variables);
        const body = dbTemplate ? this.fillTemplate(dbTemplate.body_template, variables) : this.generateFallbackBody(responseType, variables);

        return {
            to: emailData.from_email,
            replyTo: 'transaction.coordinator.agent@gmail.com',
            subject: subject,
            html: this.formatEmailHTML(body),
            text: this.stripHTML(body),
            variables: variables,
            templateName: template.templateName
        };
    }

    /**
     * Prepare template variables for email content
     */
    async prepareTemplateVariables(emailData) {
        const variables = {
            sender_name: emailData.from_name || emailData.from_email.split('@')[0],
            email_subject: emailData.subject,
            property_address: emailData.property_address || 'Unknown Address',
            client_name: emailData.property_client || 'Unknown Client',
            selling_agent: emailData.selling_agent || 'Assigned Agent',
            property_status: emailData.property_status || 'Unknown Status',
            dashboard_url: this.dashboardUrl,
            support_email: 'support@outoftheboxproperties.com',
            processing_date: new Date().toLocaleDateString()
        };

        // Add action-specific variables
        if (emailData.matched_property_id) {
            variables.property_dashboard_url = `${this.dashboardUrl}/properties/${emailData.matched_property_id}`;
            
            // Get detailed action information
            const actionDetails = await this.getActionDetails(emailData.id);
            
            // Format document list with details
            variables.document_list = actionDetails.documents.length > 0 
                ? actionDetails.documents.map(doc => `• ${doc}`).join('\n')
                : '';
            
            // Format task list with details
            variables.task_list = actionDetails.tasks.length > 0 
                ? actionDetails.tasks.map(task => `• ${task}`).join('\n')
                : '';
            
            // Format calendar events with details
            variables.calendar_list = actionDetails.calendarEvents.length > 0 
                ? actionDetails.calendarEvents.map(event => `• ${event}`).join('\n')
                : '';
            
            // Format notes information
            variables.notes_list = actionDetails.notes.length > 0 
                ? actionDetails.notes.map(note => `• ${note}`).join('\n')
                : '';
            
            // Create summary counts
            variables.documents_count = actionDetails.documents.length;
            variables.tasks_count = actionDetails.tasks.length;
            variables.events_count = actionDetails.calendarEvents.length;
            variables.notes_count = actionDetails.notes.length;
            
            // Total actions taken
            variables.total_actions = variables.documents_count + variables.tasks_count + variables.events_count + variables.notes_count;
            
            variables.additional_actions = this.formatAdditionalActions(actionDetails);
        } else {
            // For property not found emails
            const extractedData = emailData.match_details ? JSON.parse(emailData.match_details) : {};
            variables.searched_addresses = extractedData.searchedAddresses?.join(', ') || 'No addresses found in email';
            
            // Add empty action variables
            variables.document_list = '';
            variables.task_list = '';
            variables.calendar_list = '';
            variables.notes_list = '';
            variables.documents_count = 0;
            variables.tasks_count = 0;
            variables.events_count = 0;
            variables.notes_count = 0;
            variables.total_actions = 0;
        }

        return variables;
    }

    /**
     * Get detailed information about actions taken
     */
    async getActionDetails(emailQueueId) {
        try {
            // Get documents with more details
            const docsResult = await this.db.query(`
                SELECT 
                    original_filename, 
                    document_type,
                    file_size,
                    extraction_success,
                    LENGTH(extracted_text) as text_length
                FROM email_document_storage 
                WHERE email_queue_id = $1
                ORDER BY created_at
            `, [emailQueueId]);

            // Get tasks with more details
            const tasksResult = await this.db.query(`
                SELECT 
                    t.title, 
                    t.due_date, 
                    t.priority,
                    t.category,
                    t.assigned_to,
                    t.status
                FROM email_generated_tasks egt
                JOIN tasks t ON egt.task_id = t.id
                WHERE egt.email_queue_id = $1
                ORDER BY t.due_date
            `, [emailQueueId]);

            // Get calendar events with more details
            const eventsResult = await this.db.query(`
                SELECT 
                    event_title, 
                    event_date, 
                    event_time,
                    event_type,
                    priority,
                    event_description
                FROM email_generated_calendar_events
                WHERE email_queue_id = $1
                ORDER BY event_date
            `, [emailQueueId]);

            // Get notes with details
            const notesResult = await this.db.query(`
                SELECT 
                    note_text, 
                    note_type,
                    created_at
                FROM email_generated_notes_metadata
                WHERE email_queue_id = $1
                ORDER BY created_at DESC
            `, [emailQueueId]);

            return {
                documents: docsResult.rows.map(doc => {
                    const size = doc.file_size ? `${Math.round(doc.file_size / 1024)}KB` : 'Unknown size';
                    const status = doc.extraction_success ? 
                        (doc.text_length > 0 ? `✅ Text extracted (${doc.text_length} chars)` : '✅ Processed') : 
                        '⚠️ Processing failed';
                    return `📄 ${doc.original_filename} (${doc.document_type || 'document'}) - ${size}, ${status}`;
                }),
                
                tasks: tasksResult.rows.map(task => {
                    const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date';
                    const assignee = task.assigned_to || 'Unassigned';
                    return `📋 ${task.title} - Due: ${dueDate}, Priority: ${task.priority}, Assigned to: ${assignee}`;
                }),
                
                calendarEvents: eventsResult.rows.map(event => {
                    const eventDate = event.event_date ? new Date(event.event_date).toLocaleDateString() : 'TBD';
                    const eventTime = event.event_time || '';
                    const description = event.event_description ? ` - ${event.event_description.substring(0, 50)}...` : '';
                    return `📅 ${event.event_title} - ${eventDate} ${eventTime} (${event.event_type})${description}`;
                }),
                
                notes: notesResult.rows.map(note => {
                    const noteDate = new Date(note.created_at).toLocaleDateString();
                    const preview = note.note_text.length > 80 ? 
                        `${note.note_text.substring(0, 80)}...` : 
                        note.note_text;
                    return `📝 ${preview} (Added: ${noteDate})`;
                })
            };
        } catch (error) {
            console.error('❌ Error getting action details:', error);
            return {
                documents: [],
                tasks: [],
                calendarEvents: [],
                notes: []
            };
        }
    }

    /**
     * Format additional actions taken
     */
    formatAdditionalActions(actionDetails) {
        const actions = [];
        
        if (actionDetails.tasks.length > 0) {
            actions.push(`✅ ${actionDetails.tasks.length} task${actionDetails.tasks.length > 1 ? 's' : ''} created and assigned`);
        }
        
        if (actionDetails.calendarEvents.length > 0) {
            actions.push(`✅ ${actionDetails.calendarEvents.length} calendar event${actionDetails.calendarEvents.length > 1 ? 's' : ''} scheduled`);
        }
        
        if (actionDetails.notes.length > 0) {
            actions.push(`✅ ${actionDetails.notes.length} note${actionDetails.notes.length > 1 ? 's' : ''} added to property record`);
        }

        return actions.length > 0 ? `\n**Additional Actions:**\n${actions.join('\n')}` : '';
    }

    /**
     * Get email template from database
     */
    async getEmailTemplate(templateName) {
        try {
            const result = await this.db.query(`
                SELECT * FROM email_response_templates 
                WHERE template_name = $1 AND active = true
            `, [templateName]);

            return result.rows[0] || null;
        } catch (error) {
            console.error(`❌ Error getting template ${templateName}:`, error);
            return null;
        }
    }

    /**
     * Fill template with variables
     */
    fillTemplate(template, variables) {
        let result = template;
        
        Object.keys(variables).forEach(key => {
            const placeholder = `{{${key}}}`;
            result = result.replace(new RegExp(placeholder, 'g'), variables[key] || '');
        });

        return result;
    }

    /**
     * Generate detailed fallback email body if template not found
     */
    generateFallbackBody(responseType, variables) {
        switch (responseType) {
            case 'property_matched_actions_taken':
                return this.generateActionsTakenEmail(variables);
            
            case 'property_matched_no_actions':
                return this.generateNoActionsEmail(variables);
            
            case 'property_not_found':
                return this.generatePropertyNotFoundEmail(variables);
            
            case 'processing_error':
                return this.generateProcessingErrorEmail(variables);
            
            default:
                return `Hi ${variables.sender_name},\n\nThank you for your email. We have received and processed your message.\n\nBest regards,\nTransaction Coordinator Team`;
        }
    }

    /**
     * Generate detailed actions taken email
     */
    generateActionsTakenEmail(variables) {
        let email = `Hi ${variables.sender_name},\n\n`;
        email += `Thank you for your email regarding "${variables.email_subject}".\n\n`;
        email += `✅ **EMAIL PROCESSED SUCCESSFULLY**\n\n`;
        email += `**Property:** ${variables.property_address}\n`;
        email += `**Client:** ${variables.client_name}\n`;
        email += `**Status:** ${variables.property_status}\n\n`;
        
        // Documents section
        if (variables.document_list && variables.document_list.trim()) {
            email += `**📄 DOCUMENTS SAVED:**\n`;
            email += `${variables.document_list}\n\n`;
        }
        
        // Tasks section
        if (variables.task_list && variables.task_list.trim()) {
            email += `**📋 TASKS CREATED:**\n`;
            email += `${variables.task_list}\n\n`;
        }
        
        // Calendar events section
        if (variables.calendar_list && variables.calendar_list.trim()) {
            email += `**📅 CALENDAR EVENTS SCHEDULED:**\n`;
            email += `${variables.calendar_list}\n\n`;
        }
        
        // Property notes section
        if (variables.additional_actions && variables.additional_actions.includes('note')) {
            email += `**📝 PROPERTY NOTES UPDATED:**\n`;
            email += `✅ Summary and key information from your email has been added to the property record\n\n`;
        }
        
        email += `**🔗 QUICK LINKS:**\n`;
        email += `• View Property: ${variables.property_dashboard_url}\n`;
        email += `• Dashboard Home: ${variables.dashboard_url}\n\n`;
        
        email += `**NEXT STEPS:**\n`;
        email += `• All created tasks have been assigned to the appropriate team members\n`;
        email += `• You will receive automatic reminders for upcoming deadlines\n`;
        email += `• Check the dashboard for real-time updates on this transaction\n\n`;
        
        email += `Best regards,\n`;
        email += `OOTB Properties Transaction Coordinator\n`;
        email += `Automated Processing System`;
        
        return email;
    }

    /**
     * Generate no actions taken email
     */
    generateNoActionsEmail(variables) {
        let email = `Hi ${variables.sender_name},\n\n`;
        email += `Thank you for your email regarding "${variables.email_subject}".\n\n`;
        email += `✅ **EMAIL RECEIVED & PROCESSED**\n\n`;
        email += `**Property:** ${variables.property_address}\n`;
        email += `**Client:** ${variables.client_name}\n`;
        email += `**Status:** ${variables.property_status}\n\n`;
        
        email += `**PROCESSING RESULT:**\n`;
        email += `• Your email has been successfully linked to the property record\n`;
        email += `• No immediate actions were required based on the email content\n`;
        email += `• The message has been logged for future reference\n\n`;
        
        email += `**🔗 QUICK LINKS:**\n`;
        email += `• View Property: ${variables.property_dashboard_url}\n`;
        email += `• Dashboard Home: ${variables.dashboard_url}\n\n`;
        
        email += `If you expected specific actions to be taken, please contact your transaction coordinator directly.\n\n`;
        
        email += `Best regards,\n`;
        email += `OOTB Properties Transaction Coordinator\n`;
        email += `Automated Processing System`;
        
        return email;
    }

    /**
     * Generate property not found email
     */
    generatePropertyNotFoundEmail(variables) {
        let email = `Hi ${variables.sender_name},\n\n`;
        email += `Thank you for your email regarding "${variables.email_subject}".\n\n`;
        email += `⚠️ **PROPERTY NOT FOUND**\n\n`;
        
        email += `**SEARCH ATTEMPTED:**\n`;
        email += `We searched our system for properties matching:\n`;
        email += `• Address: ${variables.searched_addresses}\n`;
        email += `• Email sender: ${variables.sender_name}\n`;
        email += `• Subject keywords: "${variables.email_subject}"\n\n`;
        
        email += `**NEXT STEPS REQUIRED:**\n`;
        email += `1. Add the property to our system: ${variables.dashboard_url}\n`;
        email += `2. Ensure the property address matches exactly\n`;
        email += `3. Contact your assigned agent if you need assistance\n\n`;
        
        email += `**MANUAL REVIEW:**\n`;
        email += `Your email has been forwarded to our team for manual review.\n`;
        email += `We will follow up within 24 hours to resolve this.\n\n`;
        
        email += `**SUPPORT:**\n`;
        email += `For immediate assistance: ${variables.support_email}\n\n`;
        
        email += `Best regards,\n`;
        email += `OOTB Properties Transaction Coordinator\n`;
        email += `Automated Processing System`;
        
        return email;
    }

    /**
     * Generate processing error email
     */
    generateProcessingErrorEmail(variables) {
        let email = `Hi ${variables.sender_name},\n\n`;
        email += `Thank you for your email regarding "${variables.email_subject}".\n\n`;
        email += `❌ **PROCESSING ERROR OCCURRED**\n\n`;
        
        email += `**WHAT HAPPENED:**\n`;
        email += `• Your email was received but encountered a processing error\n`;
        email += `• Our automated system could not complete the standard workflow\n`;
        email += `• This may be due to complex document formats or system connectivity\n\n`;
        
        email += `**IMMEDIATE ACTION TAKEN:**\n`;
        email += `• Your email has been flagged for manual review\n`;
        email += `• Our transaction coordinator team has been notified\n`;
        email += `• Processing will be completed manually within 4 hours\n\n`;
        
        email += `**EXPECTED TIMELINE:**\n`;
        email += `• Manual review: Within 2 hours\n`;
        email += `• Processing completion: Within 4 hours\n`;
        email += `• Follow-up confirmation: Within 6 hours\n\n`;
        
        email += `**SUPPORT:**\n`;
        email += `For urgent matters: ${variables.support_email}\n\n`;
        
        email += `We apologize for any inconvenience and will ensure your transaction stays on track.\n\n`;
        
        email += `Best regards,\n`;
        email += `OOTB Properties Transaction Coordinator\n`;
        email += `Automated Processing System`;
        
        return email;
    }

    /**
     * Format email as HTML
     */
    formatEmailHTML(textBody) {
        return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="border-bottom: 3px solid #007bff; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="color: #007bff; margin: 0;">Out Of The Box Properties</h2>
                <p style="color: #666; margin: 5px 0 0 0;">Transaction Coordinator Team</p>
            </div>
            
            <div style="line-height: 1.6; color: #333;">
                ${textBody.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
            </div>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 15px; font-size: 12px; color: #666;">
                <p>This is an automated message from the OOTB Properties Transaction Coordinator system.</p>
                <p>For support, contact: support@outoftheboxproperties.com</p>
            </div>
        </div>
        `;
    }

    /**
     * Strip HTML from text
     */
    stripHTML(html) {
        return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
    }

    /**
     * Send email using nodemailer
     */
    async sendEmail(emailContent) {
        try {
            const info = await this.transporter.sendMail({
                from: {
                    name: 'OOTB Properties - Transaction Coordinator',
                    address: this.emailConfig.auth.user
                },
                to: emailContent.to,
                replyTo: emailContent.replyTo,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text
            });

            console.log(`📧 Email sent: ${info.messageId}`);
            return true;

        } catch (error) {
            console.error('❌ Error sending email:', error);
            return false;
        }
    }

    /**
     * Log email response in database
     */
    async logEmailResponse(emailQueueId, responseType, emailContent) {
        try {
            // Find template ID
            let templateId = null;
            if (emailContent.templateName) {
                const templateResult = await this.db.query(
                    'SELECT id FROM email_response_templates WHERE template_name = $1',
                    [emailContent.templateName]
                );
                templateId = templateResult.rows[0]?.id || null;
            }

            // Log the response
            await this.db.query(`
                INSERT INTO email_responses_sent 
                (original_email_id, template_id, to_email, subject, body, delivery_status)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                emailQueueId,
                templateId,
                emailContent.to,
                emailContent.subject,
                emailContent.text,
                'sent'
            ]);

            // Mark original email as having response sent
            await this.db.query(`
                UPDATE email_processing_queue 
                SET auto_response_sent = true, updated_at = NOW()
                WHERE id = $1
            `, [emailQueueId]);

        } catch (error) {
            console.error('❌ Error logging email response:', error);
        }
    }

    /**
     * Test email configuration
     */
    async testEmailConfig() {
        try {
            await this.transporter.verify();
            console.log('✅ Email configuration is valid');
            return true;
        } catch (error) {
            console.error('❌ Email configuration test failed:', error);
            return false;
        }
    }

    /**
     * Get response statistics
     */
    async getResponseStats() {
        try {
            const result = await this.db.query(`
                SELECT 
                    COUNT(*) as total_responses,
                    COUNT(*) FILTER (WHERE delivery_status = 'sent') as sent_successfully,
                    COUNT(*) FILTER (WHERE delivery_status = 'failed') as failed,
                    COUNT(DISTINCT template_id) as templates_used,
                    MAX(sent_at) as last_response_sent
                FROM email_responses_sent 
                WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days'
            `);

            return result.rows[0];
        } catch (error) {
            console.error('❌ Error getting response stats:', error);
            return null;
        }
    }
}

module.exports = EmailResponder;