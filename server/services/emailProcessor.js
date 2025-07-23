/**
 * Email Processing Service
 * Handles IMAP email reading, classification, and processing for OOTB Property Dashboard
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const crypto = require('crypto');
const { Pool } = require('pg');

class EmailProcessor {
    constructor(dbPool) {
        this.db = dbPool;
        this.imapConfig = {
            user: 'transaction.coordinator.agent@gmail.com',
            password: 'xmvi xvso zblo oewe', // App password from Gmail
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { servername: 'imap.gmail.com' },
            connTimeout: 60000,
            authTimeout: 5000,
            keepalive: true
        };
        
        this.pollInterval = 60000; // 1 minute
        this.isProcessing = false;
        this.lastCheckTime = new Date();
        
        console.log('📧 Email Processor initialized');
    }

    /**
     * Start the email processing service
     */
    async start() {
        console.log('🚀 Starting Email Processing Service...');
        
        // Initial check
        await this.checkForNewEmails();
        
        // Set up periodic checking
        this.pollTimer = setInterval(async () => {
            if (!this.isProcessing) {
                await this.checkForNewEmails();
            }
        }, this.pollInterval);
        
        console.log(`✅ Email Processing Service started - checking every ${this.pollInterval/1000} seconds`);
    }

    /**
     * Stop the email processing service
     */
    stop() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        console.log('🛑 Email Processing Service stopped');
    }

    /**
     * Check for new emails and process them
     */
    async checkForNewEmails() {
        if (this.isProcessing) {
            console.log('⚠️ Already processing emails, skipping this check');
            return;
        }

        this.isProcessing = true;
        console.log(`[${new Date().toISOString()}] 🔍 Checking for new emails...`);

        try {
            const emails = await this.fetchUnreadEmails();
            
            if (emails.length === 0) {
                console.log('✅ No new emails found');
                return;
            }

            console.log(`📬 Found ${emails.length} new emails to process`);
            
            for (const email of emails) {
                await this.processEmail(email);
            }

            this.lastCheckTime = new Date();
            console.log(`✅ Processed ${emails.length} emails successfully`);

        } catch (error) {
            console.error('❌ Error checking emails:', error.message);
            console.error(error.stack);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Fetch unread emails from IMAP server
     */
    async fetchUnreadEmails() {
        return new Promise((resolve, reject) => {
            const emails = [];
            const imap = new Imap(this.imapConfig);

            imap.once('ready', () => {
                imap.openBox('INBOX', false, (err, box) => {
                    if (err) {
                        imap.end();
                        return reject(err);
                    }

                    // Search for unread emails
                    imap.search(['UNSEEN'], (err, results) => {
                        if (err) {
                            imap.end();
                            return reject(err);
                        }

                        if (!results || results.length === 0) {
                            imap.end();
                            return resolve([]);
                        }

                        console.log(`📨 Found ${results.length} unread emails`);

                        const fetch = imap.fetch(results, {
                            bodies: '',
                            struct: true,
                            markSeen: false // Don't mark as read yet
                        });

                        let processed = 0;

                        fetch.on('message', (msg, seqno) => {
                            let buffer = '';
                            let uid = null;

                            msg.on('body', (stream) => {
                                stream.on('data', (chunk) => {
                                    buffer += chunk.toString('utf8');
                                });
                            });

                            msg.once('attributes', (attrs) => {
                                uid = attrs.uid;
                            });

                            msg.once('end', () => {
                                simpleParser(buffer)
                                    .then(parsed => {
                                        emails.push({
                                            uid: uid,
                                            messageId: parsed.messageId,
                                            from: parsed.from,
                                            to: parsed.to,
                                            cc: parsed.cc,
                                            bcc: parsed.bcc,
                                            subject: parsed.subject,
                                            text: parsed.text,
                                            html: parsed.html,
                                            date: parsed.date,
                                            attachments: parsed.attachments || [],
                                            headers: parsed.headers
                                        });

                                        processed++;
                                        if (processed === results.length) {
                                            imap.end();
                                            resolve(emails);
                                        }
                                    })
                                    .catch(parseErr => {
                                        console.error('❌ Error parsing email:', parseErr);
                                        processed++;
                                        if (processed === results.length) {
                                            imap.end();
                                            resolve(emails);
                                        }
                                    });
                            });
                        });

                        fetch.once('error', (fetchErr) => {
                            console.error('❌ Fetch error:', fetchErr);
                            imap.end();
                            reject(fetchErr);
                        });

                        fetch.once('end', () => {
                            if (processed === 0) {
                                imap.end();
                                resolve([]);
                            }
                        });
                    });
                });
            });

            imap.once('error', (err) => {
                console.error('❌ IMAP connection error:', err);
                reject(err);
            });

            imap.once('end', () => {
                console.log('📫 IMAP connection ended');
            });

            imap.connect();
        });
    }

    /**
     * Process a single email
     */
    async processEmail(email) {
        console.log(`📧 Processing email: "${email.subject}" from ${email.from.text}`);

        try {
            // 1. Store email in processing queue
            const emailRecord = await this.storeEmailInQueue(email);
            
            // 2. Quick check if email is already processed (duplicate prevention)
            if (!emailRecord) {
                console.log('⚠️ Email already processed, skipping');
                return;
            }

            // 3. Extract and store attachments first (needed for Grok analysis)
            const attachmentData = await this.processAttachments(email, emailRecord.id);

            // 4. Classify email with Grok (this will be implemented in next todo)
            // For now, we'll use a simple keyword-based classification
            const classification = await this.simpleClassifyEmail(email, attachmentData);

            // 5. Update classification results
            await this.updateEmailClassification(emailRecord.id, classification);

            if (!classification.isPropertyRelated) {
                console.log(`📭 Email "${email.subject}" is not property-related, leaving as unread`);
                return;
            }

            // 6. Mark as read since it's property-related
            await this.markEmailAsRead(email.uid);
            console.log(`✅ Marked email "${email.subject}" as read`);

            // 7. Property matching (to be implemented in next todo)
            // For now, mark for manual review
            await this.markForManualReview(emailRecord.id, 'Property-related email needs manual property assignment');

        } catch (error) {
            console.error(`❌ Error processing email "${email.subject}":`, error);
            // Mark processing as failed
            await this.markProcessingFailed(email, error.message);
        }
    }

    /**
     * Store email in processing queue
     */
    async storeEmailInQueue(email) {
        try {
            // Check if email already processed
            const existing = await this.db.query(
                'SELECT id FROM email_processing_queue WHERE email_uid = $1 OR message_id = $2',
                [email.uid.toString(), email.messageId]
            );

            if (existing.rows.length > 0) {
                return null; // Already processed
            }

            // Extract email addresses and names
            const fromEmail = email.from.value[0].address;
            const fromName = email.from.value[0].name;
            const toEmail = email.to ? email.to.value[0].address : null;
            const ccEmails = email.cc ? email.cc.value.map(addr => addr.address) : [];
            const bccEmails = email.bcc ? email.bcc.value.map(addr => addr.address) : [];

            const result = await this.db.query(`
                INSERT INTO email_processing_queue (
                    email_uid, message_id, from_email, from_name, to_email, 
                    cc_emails, bcc_emails, subject, body_text, body_html, received_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `, [
                email.uid.toString(),
                email.messageId,
                fromEmail,
                fromName,
                toEmail,
                ccEmails,
                bccEmails,
                email.subject,
                email.text || '',
                email.html || '',
                email.date
            ]);

            console.log(`💾 Stored email in queue: ${email.subject}`);
            return result.rows[0];

        } catch (error) {
            console.error('❌ Error storing email in queue:', error);
            throw error;
        }
    }

    /**
     * Process email attachments
     */
    async processAttachments(email, emailQueueId) {
        const attachmentData = [];

        if (!email.attachments || email.attachments.length === 0) {
            return attachmentData;
        }

        console.log(`📎 Processing ${email.attachments.length} attachments...`);

        for (const attachment of email.attachments) {
            try {
                // Generate file hash for deduplication
                const fileHash = crypto
                    .createHash('sha256')
                    .update(attachment.content)
                    .digest('hex');

                // Store attachment data for Grok analysis
                const attachmentInfo = {
                    filename: attachment.filename,
                    contentType: attachment.contentType,
                    size: attachment.content.length,
                    hash: fileHash,
                    content: attachment.content
                };

                attachmentData.push(attachmentInfo);

                // For now, just log - actual document storage will be implemented in next todo
                console.log(`📄 Attachment: ${attachment.filename} (${attachment.contentType}, ${attachment.content.length} bytes)`);

            } catch (error) {
                console.error(`❌ Error processing attachment ${attachment.filename}:`, error);
            }
        }

        return attachmentData;
    }

    /**
     * Simple email classification (placeholder until Grok integration)
     */
    async simpleClassifyEmail(email, attachmentData) {
        const propertyKeywords = [
            'property', 'house', 'home', 'address', 'listing', 'mls',
            'closing', 'escrow', 'inspection', 'appraisal', 'purchase',
            'sale', 'buyer', 'seller', 'agent', 'contract', 'offer',
            'mortgage', 'loan', 'title', 'deed', 'real estate'
        ];

        const emailText = `${email.subject} ${email.text}`.toLowerCase();
        let score = 0;
        let reasons = [];

        // Check for property keywords
        const foundKeywords = propertyKeywords.filter(keyword => 
            emailText.includes(keyword)
        );

        if (foundKeywords.length > 0) {
            score += foundKeywords.length * 0.1;
            reasons.push(`Found property keywords: ${foundKeywords.join(', ')}`);
        }

        // Check attachments
        if (attachmentData.length > 0) {
            const docAttachments = attachmentData.filter(att => 
                /\.(pdf|doc|docx)$/i.test(att.filename)
            );
            
            if (docAttachments.length > 0) {
                score += 0.3;
                reasons.push(`Has ${docAttachments.length} document attachments`);
            }
        }

        const isPropertyRelated = score >= 0.3;
        const confidence = Math.min(score, 1.0);

        console.log(`🤖 Classification: ${isPropertyRelated ? 'PROPERTY RELATED' : 'NOT PROPERTY RELATED'} (confidence: ${confidence.toFixed(2)})`);
        
        return {
            isPropertyRelated,
            confidence,
            reasons: reasons.join('; '),
            analysis: {
                keywords_found: foundKeywords,
                attachment_count: attachmentData.length,
                score: score
            }
        };
    }

    /**
     * Update email classification results
     */
    async updateEmailClassification(emailQueueId, classification) {
        try {
            await this.db.query(`
                UPDATE email_processing_queue 
                SET is_property_related = $1, 
                    property_related_confidence = $2,
                    classification_reason = $3,
                    grok_analysis = $4,
                    updated_at = NOW()
                WHERE id = $5
            `, [
                classification.isPropertyRelated,
                classification.confidence,
                classification.reasons,
                JSON.stringify(classification.analysis),
                emailQueueId
            ]);

            console.log(`📊 Updated classification for email ${emailQueueId}`);
        } catch (error) {
            console.error('❌ Error updating classification:', error);
            throw error;
        }
    }

    /**
     * Mark email as read in IMAP
     */
    async markEmailAsRead(uid) {
        return new Promise((resolve, reject) => {
            const imap = new Imap(this.imapConfig);

            imap.once('ready', () => {
                imap.openBox('INBOX', false, (err, box) => {
                    if (err) {
                        imap.end();
                        return reject(err);
                    }

                    imap.addFlags(uid, '\\Seen', (err) => {
                        imap.end();
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
                });
            });

            imap.once('error', (err) => {
                reject(err);
            });

            imap.connect();
        });
    }

    /**
     * Mark email for manual review
     */
    async markForManualReview(emailQueueId, reason) {
        try {
            await this.db.query(`
                UPDATE email_processing_queue 
                SET processing_status = 'manual_review',
                    manual_review_required = true,
                    manual_review_reason = $1,
                    updated_at = NOW()
                WHERE id = $2
            `, [reason, emailQueueId]);

            console.log(`⚠️ Marked email ${emailQueueId} for manual review: ${reason}`);
        } catch (error) {
            console.error('❌ Error marking for manual review:', error);
        }
    }

    /**
     * Mark processing as failed
     */
    async markProcessingFailed(email, errorMessage) {
        try {
            // Try to find the email record
            const result = await this.db.query(
                'SELECT id FROM email_processing_queue WHERE email_uid = $1 OR message_id = $2',
                [email.uid?.toString(), email.messageId]
            );

            if (result.rows.length > 0) {
                await this.db.query(`
                    UPDATE email_processing_queue 
                    SET processing_status = 'failed',
                        processing_error = $1,
                        updated_at = NOW()
                    WHERE id = $2
                `, [errorMessage, result.rows[0].id]);
            }
        } catch (error) {
            console.error('❌ Error marking processing as failed:', error);
        }
    }

    /**
     * Get processing statistics
     */
    async getProcessingStats() {
        try {
            const result = await this.db.query(`
                SELECT 
                    COUNT(*) as total_processed,
                    COUNT(*) FILTER (WHERE is_property_related = true) as property_related,
                    COUNT(*) FILTER (WHERE processing_status = 'manual_review') as manual_review_needed,
                    COUNT(*) FILTER (WHERE processing_status = 'failed') as failed,
                    MAX(received_at) as last_email_received,
                    MAX(processed_at) as last_processed
                FROM email_processing_queue 
                WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            `);

            return result.rows[0];
        } catch (error) {
            console.error('❌ Error getting processing stats:', error);
            return null;
        }
    }
}

module.exports = EmailProcessor;