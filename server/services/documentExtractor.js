/**
 * Document Text Extraction Service
 * Handles PDF, Word, and Image text extraction for email processing
 */

const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const mammoth = require('mammoth');
const { Pool } = require('pg');
const { LargeObjectManager } = require('pg-large-object');
const crypto = require('crypto');

class DocumentExtractor {
    constructor(dbPool) {
        this.db = dbPool;
        
        // Supported file types and their processing methods
        this.supportedTypes = {
            'application/pdf': 'extractFromPDF',
            'application/msword': 'extractFromWord',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'extractFromWord',
            'image/jpeg': 'extractFromImage',
            'image/jpg': 'extractFromImage',
            'image/png': 'extractFromImage',
            'image/tiff': 'extractFromImage',
            'image/tif': 'extractFromImage'
        };

        console.log('📄 Document Extractor initialized');
    }

    /**
     * Extract text from any supported document type
     */
    async extractText(buffer, mimeType, filename) {
        const startTime = Date.now();
        console.log(`🔍 Extracting text from ${filename} (${mimeType})`);

        try {
            const method = this.supportedTypes[mimeType];
            
            if (!method) {
                console.log(`⚠️ Unsupported file type: ${mimeType}`);
                return {
                    text: '',
                    success: false,
                    error: `Unsupported file type: ${mimeType}`,
                    processingTime: Date.now() - startTime
                };
            }

            const result = await this[method](buffer, filename);
            const processingTime = Date.now() - startTime;
            
            console.log(`✅ Extracted ${result.text.length} characters in ${processingTime}ms`);
            
            return {
                text: result.text || '',
                success: true,
                metadata: result.metadata || {},
                processingTime: processingTime,
                method: method
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error(`❌ Error extracting text from ${filename}:`, error.message);
            
            return {
                text: '',
                success: false,
                error: error.message,
                processingTime: processingTime
            };
        }
    }

    /**
     * Extract text from PDF documents
     */
    async extractFromPDF(buffer, filename) {
        try {
            console.log(`📋 Processing PDF: ${filename}`);
            
            const data = await pdfParse(buffer, {
                // Options for better text extraction
                max: 0, // No page limit
                version: 'default'
            });

            const metadata = {
                totalPages: data.numpages,
                pdfInfo: data.info,
                wordCount: data.text ? data.text.split(/\s+/).length : 0
            };

            return {
                text: data.text || '',
                metadata: metadata
            };

        } catch (error) {
            console.error(`❌ PDF extraction failed for ${filename}:`, error.message);
            throw new Error(`PDF extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract text from Word documents (.doc and .docx)
     */
    async extractFromWord(buffer, filename) {
        try {
            console.log(`📝 Processing Word document: ${filename}`);
            
            const result = await mammoth.extractRawText({ buffer: buffer });
            
            const metadata = {
                wordCount: result.value ? result.value.split(/\s+/).length : 0,
                warnings: result.messages || []
            };

            return {
                text: result.value || '',
                metadata: metadata
            };

        } catch (error) {
            console.error(`❌ Word extraction failed for ${filename}:`, error.message);
            throw new Error(`Word document extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract text from images using OCR
     */
    async extractFromImage(buffer, filename) {
        try {
            console.log(`🖼️ Processing image with OCR: ${filename}`);
            
            // Configure Tesseract for better accuracy
            const { data } = await Tesseract.recognize(buffer, 'eng', {
                logger: info => {
                    if (info.status === 'recognizing text') {
                        console.log(`📸 OCR Progress: ${Math.round(info.progress * 100)}%`);
                    }
                },
                tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?()[]{}"-$% '
            });

            const metadata = {
                confidence: data.confidence,
                wordCount: data.text ? data.text.split(/\s+/).length : 0,
                ocrBlocks: data.blocks ? data.blocks.length : 0
            };

            // Clean up OCR text (remove extra whitespace, fix common OCR errors)
            let cleanedText = data.text || '';
            cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
            cleanedText = cleanedText.replace(/[|]/g, 'l'); // Common OCR error
            cleanedText = cleanedText.replace(/0/g, 'O'); // Fix O/0 confusion in addresses

            return {
                text: cleanedText,
                metadata: metadata
            };

        } catch (error) {
            console.error(`❌ OCR extraction failed for ${filename}:`, error.message);
            throw new Error(`OCR extraction failed: ${error.message}`);
        }
    }

    /**
     * Store document and extracted text in database
     */
    async storeDocument(emailQueueId, propertyId, attachment, extractedText, grokAnalysis = null) {
        const client = await this.db.connect();
        
        try {
            await client.query('BEGIN');
            
            // Generate file hash for deduplication
            const fileHash = crypto
                .createHash('sha256')
                .update(attachment.content)
                .digest('hex');

            // Check for duplicate
            const existingDoc = await client.query(
                'SELECT id FROM email_document_storage WHERE file_hash = $1',
                [fileHash]
            );

            if (existingDoc.rows.length > 0) {
                console.log(`⚠️ Document ${attachment.filename} already exists (duplicate hash)`);
                await client.query('ROLLBACK');
                return existingDoc.rows[0].id;
            }

            // Store file as Large Object
            const lom = new LargeObjectManager({ pg: client });
            const [oid, stream] = await lom.createAndWritableStreamAsync();
            
            // Write file data
            stream.write(attachment.content);
            stream.end();

            // Wait for stream to finish
            await new Promise((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
            });

            // Prepare extracted information from Grok analysis
            let foundAddresses = [];
            let foundMLSNumbers = [];
            let foundClientNames = [];
            let foundAgentNames = [];
            let foundDates = {};
            let documentType = 'unknown';
            let documentConfidence = 0.0;
            let keyInformation = {};

            if (grokAnalysis) {
                foundAddresses = grokAnalysis.propertyInfo?.addresses || [];
                foundMLSNumbers = grokAnalysis.propertyInfo?.mlsNumber ? [grokAnalysis.propertyInfo.mlsNumber] : [];
                foundClientNames = grokAnalysis.propertyInfo?.clientNames || [];
                foundAgentNames = grokAnalysis.propertyInfo?.agentNames || [];
                foundDates = grokAnalysis.importantDates || {};
                documentType = grokAnalysis.documentType || 'unknown';
                documentConfidence = grokAnalysis.confidence || 0.0;
                keyInformation = grokAnalysis.propertyInfo || {};
            }

            // Store document metadata and extracted text
            const documentResult = await client.query(`
                INSERT INTO email_document_storage (
                    email_queue_id, property_id, file_oid, original_filename,
                    file_size, mime_type, file_hash, extracted_text,
                    document_type, document_confidence, key_information,
                    found_addresses, found_mls_numbers, found_client_names,
                    found_agent_names, found_dates, ocr_performed,
                    processing_time_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                RETURNING id
            `, [
                emailQueueId,
                propertyId,
                oid,
                attachment.filename,
                attachment.content.length,
                attachment.contentType,
                fileHash,
                extractedText.text,
                documentType,
                documentConfidence,
                JSON.stringify(keyInformation),
                foundAddresses,
                foundMLSNumbers,
                foundClientNames,
                foundAgentNames,
                JSON.stringify(foundDates),
                attachment.contentType.startsWith('image/'),
                extractedText.processingTime
            ]);

            // If document is linked to a property, also create/update transaction document record
            if (propertyId && grokAnalysis && documentConfidence > 0.5) {
                await this.createTransactionDocumentRecord(client, propertyId, documentResult.rows[0].id, attachment, grokAnalysis);
            }

            await client.query('COMMIT');
            
            console.log(`💾 Stored document: ${attachment.filename} (ID: ${documentResult.rows[0].id})`);
            return documentResult.rows[0].id;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error storing document:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Create corresponding transaction document record
     */
    async createTransactionDocumentRecord(client, propertyId, documentStorageId, attachment, grokAnalysis) {
        try {
            // Map Grok document types to transaction document categories
            const categoryMap = {
                'purchase_agreement': 'Contract & Amendments',
                'listing_agreement': 'Listing Agreement',
                'inspection_report': 'Inspection Reports',
                'appraisal': 'Appraisal Documents',
                'title_document': 'Title Documents',
                'disclosure': 'Property Disclosures',
                'other': 'Other'
            };

            const category = categoryMap[grokAnalysis.documentType] || 'Other';
            const documentName = attachment.filename.replace(/\.[^/.]+$/, ""); // Remove extension

            // Check if similar document already exists
            const existingDoc = await client.query(
                'SELECT id FROM transaction_documents WHERE property_id = $1 AND document_name = $2',
                [propertyId, documentName]
            );

            if (existingDoc.rows.length === 0) {
                const result = await client.query(`
                    INSERT INTO transaction_documents (
                        property_id, category, document_name, file_path,
                        file_size, file_type, status, notes
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id
                `, [
                    propertyId,
                    category,
                    documentName,
                    `email_storage_${documentStorageId}`, // Reference to email storage
                    attachment.content.length,
                    attachment.contentType,
                    'review',
                    `Auto-imported from email. Confidence: ${(grokAnalysis.confidence * 100).toFixed(1)}%`
                ]);

                // Update the email document storage to reference the transaction document
                await client.query(
                    'UPDATE email_document_storage SET transaction_document_id = $1 WHERE id = $2',
                    [result.rows[0].id, documentStorageId]
                );

                console.log(`📋 Created transaction document record: ${documentName}`);
            }

        } catch (error) {
            console.error('❌ Error creating transaction document record:', error);
            // Don't throw - this is a secondary operation
        }
    }

    /**
     * Retrieve document from database
     */
    async getDocument(documentId) {
        const client = await this.db.connect();
        
        try {
            // Get document metadata
            const docResult = await client.query(
                'SELECT * FROM email_document_storage WHERE id = $1',
                [documentId]
            );

            if (docResult.rows.length === 0) {
                return null;
            }

            const doc = docResult.rows[0];

            // Get file data from Large Object
            const lom = new LargeObjectManager({ pg: client });
            const [size, buffer] = await lom.readAsync(doc.file_oid);

            return {
                metadata: doc,
                content: buffer,
                size: size
            };

        } catch (error) {
            console.error('❌ Error retrieving document:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Delete document from database
     */
    async deleteDocument(documentId) {
        const client = await this.db.connect();
        
        try {
            await client.query('BEGIN');

            // Get document info
            const docResult = await client.query(
                'SELECT file_oid FROM email_document_storage WHERE id = $1',
                [documentId]
            );

            if (docResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return false;
            }

            const oid = docResult.rows[0].file_oid;

            // Delete Large Object
            const lom = new LargeObjectManager({ pg: client });
            await lom.unlinkAsync(oid);

            // Delete document record
            await client.query('DELETE FROM email_document_storage WHERE id = $1', [documentId]);

            await client.query('COMMIT');
            
            console.log(`🗑️ Deleted document: ${documentId}`);
            return true;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error deleting document:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get processing statistics
     */
    async getExtractionStats() {
        try {
            const result = await this.db.query(`
                SELECT 
                    COUNT(*) as total_documents,
                    COUNT(*) FILTER (WHERE extracted_text != '') as successfully_extracted,
                    COUNT(*) FILTER (WHERE ocr_performed = true) as ocr_processed,
                    AVG(processing_time_ms) as avg_processing_time,
                    SUM(file_size) as total_storage_bytes
                FROM email_document_storage 
                WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            `);

            return result.rows[0];
        } catch (error) {
            console.error('❌ Error getting extraction stats:', error);
            return null;
        }
    }

    /**
     * Search documents by text content
     */
    async searchDocuments(searchTerm, propertyId = null) {
        try {
            let query = `
                SELECT eds.*, epq.subject as email_subject, p.address as property_address
                FROM email_document_storage eds
                JOIN email_processing_queue epq ON eds.email_queue_id = epq.id
                LEFT JOIN properties p ON eds.property_id = p.id
                WHERE eds.extracted_text ILIKE $1
            `;
            
            const params = [`%${searchTerm}%`];

            if (propertyId) {
                query += ' AND eds.property_id = $2';
                params.push(propertyId);
            }

            query += ' ORDER BY eds.created_at DESC LIMIT 50';

            const result = await this.db.query(query, params);
            return result.rows;

        } catch (error) {
            console.error('❌ Error searching documents:', error);
            return [];
        }
    }
}

module.exports = DocumentExtractor;