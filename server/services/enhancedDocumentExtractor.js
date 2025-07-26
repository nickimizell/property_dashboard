/**
 * Enhanced Document Extractor Service
 * Handles PDF splitting, multi-document processing, and AI-powered document identification
 */

const pdfParse = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');
const Tesseract = require('tesseract.js');
const mammoth = require('mammoth');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class EnhancedDocumentExtractor {
    constructor(dbPool, grokClient) {
        this.db = dbPool;
        this.grokClient = grokClient;
        
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

        // Document type patterns for intelligent splitting
        this.documentPatterns = {
            'listing_agreement': [
                /listing\s+agreement/i,
                /exclusive\s+right\s+to\s+sell/i,
                /mls\s+listing/i
            ],
            'purchase_agreement': [
                /purchase\s+agreement/i,
                /sales\s+contract/i,
                /real\s+estate\s+purchase/i,
                /contract\s+to\s+purchase/i
            ],
            'disclosure': [
                /property\s+disclosure/i,
                /seller\s+disclosure/i,
                /lead\s+based\s+paint/i,
                /disclosure\s+statement/i
            ],
            'inspection_report': [
                /inspection\s+report/i,
                /home\s+inspection/i,
                /inspection\s+summary/i
            ],
            'appraisal': [
                /appraisal\s+report/i,
                /uniform\s+residential\s+appraisal/i,
                /property\s+valuation/i
            ],
            'title_document': [
                /title\s+commitment/i,
                /title\s+report/i,
                /deed/i,
                /title\s+insurance/i
            ]
        };

        console.log('📄 Enhanced Document Extractor initialized with PDF splitting capabilities');
    }

    /**
     * Main extraction method that handles both single and multi-document PDFs
     */
    async extractText(buffer, mimeType, filename) {
        const startTime = Date.now();
        console.log(`🔍 Extracting from ${filename} (${mimeType})`);

        try {
            if (mimeType === 'application/pdf') {
                // Check if this is a multi-document PDF (like ZipForms bundle)
                const isMultiDocument = await this.detectMultiDocumentPDF(buffer, filename);
                
                if (isMultiDocument) {
                    console.log(`📋 Detected multi-document PDF: ${filename}`);
                    return await this.splitAndProcessPDF(buffer, filename);
                }
            }

            // Standard single document processing
            const method = this.supportedTypes[mimeType];
            if (!method) {
                return {
                    text: '',
                    success: false,
                    error: `Unsupported file type: ${mimeType}`,
                    processingTime: Date.now() - startTime
                };
            }

            const result = await this[method](buffer, filename);
            const processingTime = Date.now() - startTime;
            
            return {
                text: result.text || '',
                success: true,
                metadata: result.metadata || {},
                processingTime: processingTime,
                method: method,
                documents: [{ // Single document wrapper
                    text: result.text || '',
                    metadata: result.metadata || {},
                    documentType: await this.identifyDocumentType(result.text || ''),
                    filename: filename
                }]
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error(`❌ Error extracting from ${filename}:`, error.message);
            
            return {
                text: '',
                success: false,
                error: error.message,
                processingTime: processingTime
            };
        }
    }

    /**
     * Detect if PDF contains multiple distinct documents
     */
    async detectMultiDocumentPDF(buffer, filename) {
        try {
            // Indicators of multi-document PDFs
            const multiDocIndicators = [
                /zipforms/i,
                /multiple\s+documents/i,
                /document\s+bundle/i,
                /combined\s+forms/i
            ];

            // Check filename first
            const filenameMatch = multiDocIndicators.some(pattern => pattern.test(filename));
            if (filenameMatch) return true;

            // Quick text extraction to check content
            const quickParse = await pdfParse(buffer, { max: 5 }); // First 5 pages only
            const text = quickParse.text || '';

            // Look for multiple document titles or form headers
            const documentTitleCount = this.countDocumentTitles(text);
            const pageBreakCount = (text.match(/page\s+\d+\s+of\s+\d+/gi) || []).length;

            // If we find multiple document patterns or excessive page breaks, likely multi-doc
            return documentTitleCount >= 2 || pageBreakCount >= 3 || quickParse.numpages > 10;

        } catch (error) {
            console.error('Error detecting multi-document PDF:', error);
            return false;
        }
    }

    /**
     * Count potential document titles/headers in text
     */
    countDocumentTitles(text) {
        let count = 0;
        for (const [docType, patterns] of Object.entries(this.documentPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    count++;
                    break; // Only count each document type once
                }
            }
        }
        return count;
    }

    /**
     * Split multi-document PDF and process each document separately
     */
    async splitAndProcessPDF(buffer, filename) {
        const startTime = Date.now();
        console.log(`🔄 Splitting multi-document PDF: ${filename}`);

        try {
            // Parse entire PDF with fallback handling
            const fullPDF = await pdfParse(buffer);
            let pdfDoc, pageCount;
            
            try {
                pdfDoc = await PDFDocument.load(buffer, { 
                    ignoreEncryption: true,
                    capNumbers: false,
                    throwOnInvalidObject: false
                });
                pageCount = pdfDoc.getPageCount();
            } catch (pdfLibError) {
                console.log(`⚠️ PDF-lib failed, using fallback method: ${pdfLibError.message}`);
                // Fallback: estimate page count from text content
                const textPages = fullPDF.text.split('\f').filter(page => page.trim().length > 0);
                pageCount = Math.max(textPages.length, 1);
                console.log(`📊 Estimated ${pageCount} pages using text analysis fallback`);
            }
            
            console.log(`📊 PDF has ${pageCount} pages, analyzing for document boundaries...`);

            // Extract text page by page for analysis
            const pages = await this.extractPageByPage(buffer);
            
            // Use AI to identify document boundaries and types
            const documentBoundaries = await this.identifyDocumentBoundaries(pages);
            
            console.log(`📑 Identified ${documentBoundaries.length} documents in PDF`);

            // Split PDF based on identified boundaries
            const splitDocuments = [];
            
            for (let i = 0; i < documentBoundaries.length; i++) {
                const boundary = documentBoundaries[i];
                const splitPdfDoc = await PDFDocument.create();
                
                // Copy pages for this document
                const pagesToCopy = [];
                for (let pageNum = boundary.startPage; pageNum <= boundary.endPage; pageNum++) {
                    pagesToCopy.push(pageNum - 1); // PDF-lib uses 0-based indexing
                }
                
                const copiedPages = await splitPdfDoc.copyPages(pdfDoc, pagesToCopy);
                copiedPages.forEach(page => splitPdfDoc.addPage(page));
                
                // Generate PDF buffer for this document
                const splitBuffer = await splitPdfDoc.save();
                
                // Extract text from split document
                const splitText = await pdfParse(Buffer.from(splitBuffer));
                
                // Generate filename for split document
                const docFileName = `${filename.replace('.pdf', '')}_${boundary.type}_${i+1}.pdf`;
                
                splitDocuments.push({
                    buffer: Buffer.from(splitBuffer),
                    text: splitText.text,
                    metadata: {
                        originalFile: filename,
                        documentNumber: i + 1,
                        totalDocuments: documentBoundaries.length,
                        pageRange: `${boundary.startPage}-${boundary.endPage}`,
                        totalPages: boundary.endPage - boundary.startPage + 1,
                        confidence: boundary.confidence
                    },
                    documentType: boundary.type,
                    filename: docFileName,
                    startPage: boundary.startPage,
                    endPage: boundary.endPage
                });
            }

            const processingTime = Date.now() - startTime;
            console.log(`✅ Split PDF into ${splitDocuments.length} documents in ${processingTime}ms`);

            return {
                text: fullPDF.text, // Combined text
                success: true,
                metadata: {
                    originalPages: pageCount,
                    splitInto: splitDocuments.length,
                    originalFilename: filename
                },
                processingTime: processingTime,
                method: 'splitAndProcessPDF',
                documents: splitDocuments,
                isMultiDocument: true
            };

        } catch (error) {
            console.error('❌ Error splitting PDF:', error);
            
            // Try PDF-plumber fallback first (if available)
            console.log('🐍 Trying PDF-plumber fallback...');
            try {
                const plumberResult = await this.extractWithPDFPlumber(buffer, filename);
                
                if (plumberResult.success) {
                    console.log(`✅ PDF-plumber extraction successful: ${plumberResult.totalChars} characters`);
                    return {
                        text: plumberResult.totalText || '',
                        extractedCount: 1,
                        extractionTime: Date.now() - startTime,
                        method: 'pdfplumber_fallback',
                        metadata: plumberResult.metadata
                    };
                } else {
                    console.log(`⚠️ PDF-plumber failed: ${plumberResult.error}`);
                }
            } catch (plumberError) {
                console.log(`⚠️ PDF-plumber fallback error: ${plumberError.message}`);
            }
            
            // Final fallback to regular PDF parsing
            console.log('📋 Falling back to standard PDF parsing...');
            try {
                const fallbackResult = await pdfParse(buffer);
                return {
                    text: fallbackResult.text || '',
                    extractedCount: fallbackResult.text ? 1 : 0,
                    extractionTime: Date.now() - startTime,
                    method: 'fallback_standard',
                    error: `PDF splitting failed: ${error.message}. PDF-plumber also failed: ${plumberResult.error || 'Unknown error'}`
                };
            } catch (fallbackError) {
                throw new Error(`All PDF extraction methods failed. Original error: ${error.message}. Fallback error: ${fallbackError.message}`);
            }
        }
    }

    /**
     * Extract text using PDF-plumber Python script
     */
    async extractWithPDFPlumber(buffer, filename) {
        return new Promise((resolve) => {
            try {
                const scriptPath = path.join(__dirname, '../scripts/pdf_plumber_extractor.py');
                const python = spawn('python3', [scriptPath], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let stdout = '';
                let stderr = '';

                python.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                python.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                python.on('close', (code) => {
                    if (code === 0) {
                        try {
                            const result = JSON.parse(stdout);
                            resolve(result);
                        } catch (parseError) {
                            resolve({
                                success: false,
                                error: `JSON parse error: ${parseError.message}`,
                                stdout,
                                stderr
                            });
                        }
                    } else {
                        resolve({
                            success: false,
                            error: `Python script exited with code ${code}`,
                            stderr,
                            stdout
                        });
                    }
                });

                python.on('error', (error) => {
                    console.log('🐍 Python process error:', error.message);
                    resolve({
                        success: false,
                        error: `Failed to start Python script: ${error.message}`
                    });
                });

                // Handle stdin errors (EPIPE, etc.)
                python.stdin.on('error', (error) => {
                    console.log('🐍 Python stdin error:', error.message);
                    resolve({
                        success: false,
                        error: `Python stdin error: ${error.message}`
                    });
                });

                // Send PDF buffer to Python script with error handling
                try {
                    python.stdin.write(buffer);
                    python.stdin.end();
                } catch (writeError) {
                    console.log('🐍 Error writing to Python script:', writeError.message);
                    resolve({
                        success: false,
                        error: `Error writing to Python script: ${writeError.message}`
                    });
                }

            } catch (error) {
                resolve({
                    success: false,
                    error: `PDF-plumber extraction error: ${error.message}`
                });
            }
        });
    }

    /**
     * Extract text from PDF page by page
     */
    async extractPageByPage(buffer) {
        try {
            const pdfDoc = await PDFDocument.load(buffer, { 
                ignoreEncryption: true,
                capNumbers: false,
                throwOnInvalidObject: false
            });
            const pageCount = pdfDoc.getPageCount();
            const pages = [];

            for (let i = 0; i < pageCount; i++) {
                // Create single-page PDF
                const singlePageDoc = await PDFDocument.create();
                const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [i]);
                singlePageDoc.addPage(copiedPage);
                
                // Extract text from single page
                const pageBuffer = await singlePageDoc.save();
                const pageText = await pdfParse(Buffer.from(pageBuffer));
                
                pages.push({
                    pageNumber: i + 1,
                    text: pageText.text || '',
                    wordCount: pageText.text ? pageText.text.split(/\s+/).length : 0
                });
            }

            return pages;
        } catch (error) {
            console.error('Error extracting pages:', error);
            // Return empty pages array instead of throwing - let upper layer handle fallback
            console.log('📋 Returning empty pages array due to extraction error');
            return [];
        }
    }

    /**
     * Use AI to identify document boundaries within multi-page PDF
     */
    async identifyDocumentBoundaries(pages) {
        try {
            console.log('🤖 Using AI to identify document boundaries...');

            // Prepare page summaries for AI analysis
            const pageSummaries = pages.map(page => ({
                page: page.pageNumber,
                firstLines: page.text.split('\n').slice(0, 5).join(' ').substring(0, 200),
                wordCount: page.wordCount,
                hasFormHeader: this.hasFormHeader(page.text),
                documentTypeIndicators: this.getDocumentTypeIndicators(page.text)
            }));

            const prompt = `
Analyze this multi-page PDF and identify where individual documents begin and end. This appears to be a ZipForms bundle with multiple real estate documents combined into one PDF.

Page Analysis:
${JSON.stringify(pageSummaries, null, 2)}

Please identify document boundaries and return a JSON array with the following structure:
[
  {
    "startPage": 1,
    "endPage": 3,
    "type": "listing_agreement",
    "confidence": 0.95,
    "reasoning": "Pages 1-3 contain listing agreement language and signatures"
  },
  {
    "startPage": 4,
    "endPage": 6,
    "type": "property_disclosure",
    "confidence": 0.88,
    "reasoning": "Pages 4-6 contain property disclosure statements"
  }
]

Document types should be one of: listing_agreement, purchase_agreement, disclosure, inspection_report, appraisal, title_document, amendment, other.

Look for:
- Document headers and titles
- Form numbers and names
- Signature pages
- Page numbering resets
- Different document formatting
- Legal document language patterns
`;

            const response = await this.grokClient.analyzeBoundaries(prompt);
            
            if (response && Array.isArray(response)) {
                console.log(`🎯 AI identified ${response.length} document boundaries`);
                return response;
            }

            // Fallback: Use rule-based splitting if AI fails
            console.log('⚠️ AI boundary detection failed, using rule-based fallback');
            return this.fallbackBoundaryDetection(pages);

        } catch (error) {
            console.error('❌ Error in AI boundary detection:', error);
            return this.fallbackBoundaryDetection(pages);
        }
    }

    /**
     * Fallback rule-based document boundary detection
     */
    fallbackBoundaryDetection(pages) {
        const boundaries = [];
        let currentStart = 1;
        let currentType = 'other';

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const detectedType = this.identifyDocumentTypeSync(page.text);
            
            // Check if this looks like a new document start
            const isNewDocument = this.looksLikeDocumentStart(page.text) || 
                                 (detectedType !== 'other' && detectedType !== currentType);

            if (isNewDocument && i > 0) {
                // End previous document
                boundaries.push({
                    startPage: currentStart,
                    endPage: i,
                    type: currentType,
                    confidence: 0.7,
                    reasoning: 'Rule-based detection'
                });
                
                currentStart = i + 1;
                currentType = detectedType !== 'other' ? detectedType : currentType;
            } else if (detectedType !== 'other') {
                currentType = detectedType;
            }
        }

        // Add final document
        boundaries.push({
            startPage: currentStart,
            endPage: pages.length,
            type: currentType,
            confidence: 0.7,
            reasoning: 'Rule-based detection'
        });

        return boundaries;
    }

    /**
     * Check if page text looks like the start of a new document
     */
    looksLikeDocumentStart(text) {
        const startIndicators = [
            /^[A-Z\s]{10,}\n/m, // All caps header
            /form\s+\d+/i,
            /page\s+1\s+of\s+\d+/i,
            /agreement\s*$/im,
            /disclosure\s*$/im,
            /contract\s*$/im
        ];

        return startIndicators.some(pattern => pattern.test(text.substring(0, 500)));
    }

    /**
     * Get document type indicators from text
     */
    getDocumentTypeIndicators(text) {
        const indicators = [];
        for (const [type, patterns] of Object.entries(this.documentPatterns)) {
            if (patterns.some(pattern => pattern.test(text))) {
                indicators.push(type);
            }
        }
        return indicators;
    }

    /**
     * Check if page has form header characteristics
     */
    hasFormHeader(text) {
        const headerPatterns = [
            /form\s+\d+/i,
            /^[A-Z\s]{20,}$/m,
            /real\s+estate/i,
            /california\s+association\s+of\s+realtors/i,
            /zipforms/i
        ];

        return headerPatterns.some(pattern => pattern.test(text.substring(0, 300)));
    }

    /**
     * Identify document type using AI
     */
    async identifyDocumentType(text) {
        try {
            // First try pattern matching for speed
            const patternType = this.identifyDocumentTypeSync(text);
            if (patternType !== 'other') {
                return patternType;
            }

            // Use AI for more complex identification
            const prompt = `
Analyze this document text and identify the type of real estate document. 

Text sample:
${text.substring(0, 1000)}

Return only one of these document types:
- listing_agreement
- purchase_agreement  
- disclosure
- inspection_report
- appraisal
- title_document
- amendment
- other

Document type:`;

            const response = await this.grokClient.analyzeDocumentType(prompt);
            return response || 'other';

        } catch (error) {
            console.error('Error identifying document type:', error);
            return 'other';
        }
    }

    /**
     * Synchronous pattern-based document type identification
     */
    identifyDocumentTypeSync(text) {
        for (const [type, patterns] of Object.entries(this.documentPatterns)) {
            if (patterns.some(pattern => pattern.test(text))) {
                return type;
            }
        }
        return 'other';
    }

    /**
     * Standard PDF extraction (for single documents)
     */
    async extractFromPDF(buffer, filename) {
        try {
            console.log(`📋 Processing single PDF: ${filename}`);
            
            const data = await pdfParse(buffer, {
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
     * Extract text from Word documents
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
            
            const { data } = await Tesseract.recognize(buffer, 'eng', {
                logger: info => {
                    if (info.status === 'recognizing text') {
                        console.log(`📸 OCR Progress: ${Math.round(info.progress * 100)}%`);
                    }
                },
                tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?()[]{}\"-$% '
            });

            const metadata = {
                confidence: data.confidence,
                wordCount: data.text ? data.text.split(/\s+/).length : 0,
                ocrBlocks: data.blocks ? data.blocks.length : 0
            };

            // Clean up OCR text
            let cleanedText = data.text || '';
            cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
            cleanedText = cleanedText.replace(/[|]/g, 'l');
            cleanedText = cleanedText.replace(/0/g, 'O');

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
     * Delete document from database and file system
     */
    async deleteDocument(documentId) {
        const client = await this.db.connect();
        
        try {
            await client.query('BEGIN');

            // Get document info
            const docResult = await client.query(`
                SELECT file_oid, original_filename, transaction_document_id 
                FROM email_document_storage 
                WHERE id = $1
            `, [documentId]);

            if (docResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, error: 'Document not found' };
            }

            const doc = docResult.rows[0];

            // Delete Large Object if it exists
            if (doc.file_oid) {
                await client.query('SELECT lo_unlink($1)', [doc.file_oid]);
            }

            // Delete transaction document record if linked
            if (doc.transaction_document_id) {
                await client.query(
                    'DELETE FROM transaction_documents WHERE id = $1',
                    [doc.transaction_document_id]
                );
            }

            // Delete email document storage record
            await client.query('DELETE FROM email_document_storage WHERE id = $1', [documentId]);

            await client.query('COMMIT');
            
            console.log(`🗑️ Deleted document: ${doc.original_filename} (ID: ${documentId})`);
            return { success: true, filename: doc.original_filename };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error deleting document:', error);
            return { success: false, error: error.message };
        } finally {
            client.release();
        }
    }

    /**
     * Store document in database with PostgreSQL Large Objects
     */
    async storeDocument(emailQueueId, propertyId, attachment, extractionResult, analysis) {
        const client = await this.db.connect();
        
        try {
            await client.query('BEGIN');

            // Create Large Object
            const oidResult = await client.query('SELECT lo_create(0)');
            const oid = oidResult.rows[0].lo_create;

            // Write file data to Large Object
            const bufferSize = 16384;
            let offset = 0;
            
            while (offset < attachment.content.length) {
                const chunk = attachment.content.slice(offset, offset + bufferSize);
                await client.query('SELECT lo_write($1, $2, $3)', [oid, offset, chunk]);
                offset += bufferSize;
            }

            // Store document metadata
            const docResult = await client.query(`
                INSERT INTO email_document_storage (
                    email_queue_id, property_id, original_filename, 
                    file_oid, file_size, content_type, 
                    extracted_text, extraction_success, document_type,
                    grok_analysis, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                RETURNING id
            `, [
                emailQueueId,
                propertyId,
                attachment.filename,
                oid,
                attachment.content.length,
                attachment.contentType,
                extractionResult.text || '',
                extractionResult.success || attachment.extractionSuccess,
                analysis?.documentType || 'unknown',
                JSON.stringify(analysis || {})
            ]);

            // Create transaction document if property is linked
            if (propertyId) {
                const transDocResult = await client.query(`
                    INSERT INTO transaction_documents (
                        property_id, document_name, document_type, file_path,
                        upload_date, uploaded_by, document_category
                    ) VALUES ($1, $2, $3, $4, NOW(), $5, $6)
                    RETURNING id
                `, [
                    propertyId,
                    attachment.filename,
                    analysis?.documentType || 'email_attachment',
                    `email_storage_${docResult.rows[0].id}`,
                    'Email Processor',
                    analysis?.documentType || 'other'
                ]);

                // Link email document to transaction document
                await client.query(`
                    UPDATE email_document_storage 
                    SET transaction_document_id = $1 
                    WHERE id = $2
                `, [transDocResult.rows[0].id, docResult.rows[0].id]);
            }

            await client.query('COMMIT');
            console.log(`💾 Stored document: ${attachment.filename} (ID: ${docResult.rows[0].id})`);
            return docResult.rows[0].id;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`❌ Error storing document ${attachment.filename}:`, error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = EnhancedDocumentExtractor;