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
            variables.document_list = actionDetails.documents.join('\n');
            variables.task_list = actionDetails.tasks.join('\n');
            variables.calendar_list = actionDetails.calendarEvents.join('\n');
            variables.additional_actions = this.formatAdditionalActions(actionDetails);
        } else {
            // For property not found emails
            const extractedData = emailData.match_details ? JSON.parse(emailData.match_details) : {};
            variables.searched_addresses = extractedData.searchedAddresses?.join(', ') || 'No addresses found in email';
        }

        return variables;
    }

    /**
     * Get detailed information about actions taken
     */
    async getActionDetails(emailQueueId) {
        try {
            // Get documents
            const docsResult = await this.db.query(`
                SELECT original_filename, document_type 
                FROM email_document_storage 
                WHERE email_queue_id = $1
            `, [emailQueueId]);

            // Get tasks
            const tasksResult = await this.db.query(`
                SELECT t.title, t.due_date, t.priority
                FROM email_generated_tasks egt
                JOIN tasks t ON egt.task_id = t.id
                WHERE egt.email_queue_id = $1
            `, [emailQueueId]);

            // Get calendar events
            const eventsResult = await this.db.query(`
                SELECT event_title, event_date, event_type
                FROM email_generated_calendar_events
                WHERE email_queue_id = $1
            `, [emailQueueId]);

            // Get notes
            const notesResult = await this.db.query(`
                SELECT note_text, note_type
                FROM email_generated_notes_metadata
                WHERE email_queue_id = $1
            `, [emailQueueId]);

            return {
                documents: docsResult.rows.map(doc => `📄 ${doc.original_filename} (${doc.document_type || 'document'})`),
                tasks: tasksResult.rows.map(task => `📋 ${task.title} (Due: ${task.due_date}, Priority: ${task.priority})`),
                calendarEvents: eventsResult.rows.map(event => `📅 ${event.event_title} (${event.event_date}) - ${event.event_type}`),
                notes: notesResult.rows.map(note => `📝 ${note.note_text.substring(0, 100)}...`)
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
     * Generate fallback email body if template not found
     */
    generateFallbackBody(responseType, variables) {
        switch (responseType) {
            case 'property_matched_actions_taken':
                return `Hi ${variables.sender_name},\n\nThank you for your email regarding "${variables.email_subject}".\n\nYour email has been processed and linked to property: ${variables.property_address}\n\nActions taken:\n${variables.additional_actions}\n\nBest regards,\nTransaction Coordinator Team`;
            
            case 'property_not_found':
                return `Hi ${variables.sender_name},\n\nThank you for your email regarding "${variables.email_subject}".\n\nWe couldn't find a matching property in our system. Please add the property to our dashboard or contact your agent.\n\nDashboard: ${variables.dashboard_url}\n\nBest regards,\nTransaction Coordinator Team`;
            
            default:
                return `Hi ${variables.sender_name},\n\nThank you for your email. We have received and processed your message.\n\nBest regards,\nTransaction Coordinator Team`;
        }
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