/**
 * Grok AI Client for Email Processing
 * Adapted from existing Fathom Broker Admin Backend implementation
 */

const https = require('https');

class GrokClient {
    constructor() {
        this.apiKey = process.env.GROK_API_KEY || '';
        this.apiUrl = 'https://api.x.ai/v1/chat/completions';
        this.model = 'grok-3-latest';
        
        // Rate limiting: 5 calls per minute max
        this.callCount = 0;
        this.callHistory = [];
        
        if (!this.apiKey) {
            console.warn('⚠️ GROK_API_KEY not found in environment variables. Email processing will not work without it.');
        } else {
            console.log('🤖 Grok AI Client initialized');
        }
    }

    /**
     * Rate limiting check
     */
    async checkRateLimit() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // Remove calls older than 1 minute
        this.callHistory = this.callHistory.filter(time => time > oneMinuteAgo);
        
        if (this.callHistory.length >= 5) {
            const waitTime = this.callHistory[0] + 60000 - now;
            console.log(`⏳ Rate limit reached, waiting ${Math.ceil(waitTime/1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.checkRateLimit(); // Recheck after waiting
        }
        
        this.callHistory.push(now);
        return true;
    }

    /**
     * Make API call to Grok
     */
    async makeApiCall(messages, tools = null) {
        await this.checkRateLimit();
        
        const payload = {
            model: this.model,
            messages: messages,
            temperature: 0.1,
            max_tokens: 2000
        };

        if (tools) {
            payload.tools = tools;
            payload.tool_choice = 'auto';
        }

        return new Promise((resolve, reject) => {
            const data = JSON.stringify(payload);
            
            const options = {
                hostname: 'api.x.ai',
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonResponse = JSON.parse(responseData);
                        
                        if (res.statusCode === 200) {
                            resolve(jsonResponse);
                        } else {
                            reject(new Error(`API Error: ${res.statusCode} - ${jsonResponse.error?.message || 'Unknown error'}`));
                        }
                    } catch (parseError) {
                        reject(new Error(`Failed to parse response: ${parseError.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.write(data);
            req.end();
        });
    }

    /**
     * Classify email for real estate relevance
     */
    async classifyEmail(emailData, attachmentData = []) {
        try {
            console.log(`🔍 Analyzing email with Grok: "${emailData.subject}"`);

            const attachmentInfo = attachmentData.length > 0 
                ? `\n\nATTACHMENTS (${attachmentData.length}): ${attachmentData.map(att => `${att.filename} (${att.contentType})`).join(', ')}`
                : '';

            const messages = [
                {
                    role: 'system',
                    content: `You are an expert real estate transaction coordinator AI that analyzes emails to determine if they relate to real estate transactions, property management, or real estate business.

TASK: Analyze the provided email and determine if it's related to real estate business.

CLASSIFICATION CRITERIA:
- Real estate transactions (buying, selling, contracts)
- Property management and maintenance
- MLS listings and property searches
- Inspections, appraisals, title work
- Mortgage and lending communications
- Real estate agent communications
- Property showings and appointments
- Closing coordination
- Property documents and contracts

RESPOND WITH JSON ONLY in this exact format:
{
    "isPropertyRelated": boolean,
    "confidence": number (0.0-1.0),
    "reasoning": "brief explanation",
    "category": "transaction|listing|management|inspection|lending|other",
    "extractedInfo": {
        "addresses": ["array of any property addresses found"],
        "mlsNumbers": ["array of any MLS numbers found"],
        "clientNames": ["array of any client/customer names found"],
        "agentNames": ["array of any agent names found"],
        "importantDates": ["array of any important dates mentioned"],
        "actionItems": ["array of any tasks or action items mentioned"]
    }
}`
                },
                {
                    role: 'user',
                    content: `ANALYZE THIS EMAIL:

FROM: ${emailData.from_email} (${emailData.from_name || 'Unknown'})
TO: ${emailData.to_email || 'Unknown'}
SUBJECT: ${emailData.subject}

BODY:
${emailData.body_text || emailData.body_html || 'No body content'}${attachmentInfo}`
                }
            ];

            const response = await this.makeApiCall(messages);
            
            if (!response.choices || response.choices.length === 0) {
                throw new Error('No response choices from Grok');
            }

            const content = response.choices[0].message.content.trim();
            
            // Try to parse JSON response
            let analysis;
            try {
                analysis = JSON.parse(content);
            } catch (parseError) {
                // Fallback to simple parsing if JSON fails
                console.warn('⚠️ Failed to parse Grok JSON response, using fallback');
                analysis = this.fallbackParseResponse(content, emailData);
            }

            console.log(`🎯 Grok classification: ${analysis.isPropertyRelated ? 'PROPERTY RELATED' : 'NOT PROPERTY RELATED'} (${(analysis.confidence * 100).toFixed(1)}%)`);
            
            return {
                isPropertyRelated: analysis.isPropertyRelated,
                confidence: analysis.confidence,
                reasoning: analysis.reasoning,
                category: analysis.category,
                extractedInfo: analysis.extractedInfo || {},
                fullResponse: analysis
            };

        } catch (error) {
            console.error('❌ Error in Grok classification:', error.message);
            
            // Fallback to simple classification
            return this.fallbackClassification(emailData, attachmentData);
        }
    }

    /**
     * Extract property information from documents
     */
    async extractPropertyInfo(documentText, filename) {
        try {
            console.log(`📄 Extracting property info from document: ${filename}`);

            const messages = [
                {
                    role: 'system',
                    content: `You are an expert real estate document analyzer. Extract key property and transaction information from the provided document text.

RESPOND WITH JSON ONLY in this exact format:
{
    "documentType": "purchase_agreement|inspection_report|appraisal|title_document|listing_agreement|disclosure|other",
    "confidence": number (0.0-1.0),
    "propertyInfo": {
        "addresses": ["array of property addresses found"],
        "mlsNumber": "MLS number if found",
        "salePrice": "sale price if found",
        "listPrice": "listing price if found",
        "clientNames": ["buyer/seller names"],
        "agentNames": ["agent names"],
        "propertyType": "single_family|duplex|condo|commercial|other",
        "squareFootage": "square footage if found",
        "bedrooms": "number of bedrooms",
        "bathrooms": "number of bathrooms"
    },
    "importantDates": {
        "closingDate": "closing date if found",
        "inspectionDate": "inspection date if found",
        "appraisalDate": "appraisal date if found",
        "contingencyDates": ["other important dates"]
    },
    "actionItems": ["tasks or items that need attention"]
}`
                },
                {
                    role: 'user',
                    content: `ANALYZE THIS DOCUMENT:

FILENAME: ${filename}

DOCUMENT TEXT:
${documentText.substring(0, 8000)}` // Limit text to avoid token limits
                }
            ];

            const response = await this.makeApiCall(messages);
            
            if (!response.choices || response.choices.length === 0) {
                throw new Error('No response choices from Grok');
            }

            const content = response.choices[0].message.content.trim();
            
            try {
                const analysis = JSON.parse(content);
                console.log(`📋 Document analysis: ${analysis.documentType} (${(analysis.confidence * 100).toFixed(1)}% confidence)`);
                return analysis;
            } catch (parseError) {
                console.warn('⚠️ Failed to parse document analysis JSON');
                return {
                    documentType: 'other',
                    confidence: 0.5,
                    propertyInfo: {},
                    importantDates: {},
                    actionItems: []
                };
            }

        } catch (error) {
            console.error('❌ Error extracting property info:', error.message);
            return {
                documentType: 'other',
                confidence: 0.0,
                propertyInfo: {},
                importantDates: {},
                actionItems: []
            };
        }
    }

    /**
     * Generate tasks and calendar events from email/document analysis
     */
    async generateTasksAndEvents(propertyInfo, documentAnalysis, emailSubject) {
        try {
            console.log('📅 Generating tasks and events with Grok...');

            const messages = [
                {
                    role: 'system',
                    content: `You are an expert real estate transaction coordinator. Based on the email and property information provided, generate appropriate tasks and calendar events.

RESPOND WITH JSON ONLY in this exact format:
{
    "tasks": [
        {
            "title": "task title",
            "description": "detailed description",
            "category": "Pre-Listing|Under Contract|Documentation|Contractor|Agent Follow-up|Legal|Inspection|Price Review|Other",
            "priority": "Low|Medium|High|Urgent",
            "dueDate": "YYYY-MM-DD",
            "assignedTo": "agent name or 'Transaction Coordinator'"
        }
    ],
    "calendarEvents": [
        {
            "title": "event title",
            "description": "event description",
            "eventType": "inspection|appraisal|closing|showing|meeting|deadline|follow_up",
            "eventDate": "YYYY-MM-DD",
            "eventTime": "HH:MM",
            "duration": 60,
            "attendees": ["email addresses"],
            "priority": "Low|Medium|High|Urgent"
        }
    ],
    "notes": [
        "Important note to add to property record",
        "Another note if relevant"
    ]
}`
                },
                {
                    role: 'user',
                    content: `GENERATE TASKS AND EVENTS FOR:

EMAIL SUBJECT: ${emailSubject}

PROPERTY INFO:
${JSON.stringify(propertyInfo, null, 2)}

DOCUMENT ANALYSIS:
${JSON.stringify(documentAnalysis, null, 2)}

Current Date: ${new Date().toISOString().split('T')[0]}`
                }
            ];

            const response = await this.makeApiCall(messages);
            
            if (!response.choices || response.choices.length === 0) {
                throw new Error('No response choices from Grok');
            }

            const content = response.choices[0].message.content.trim();
            
            try {
                const generated = JSON.parse(content);
                console.log(`✅ Generated ${generated.tasks?.length || 0} tasks and ${generated.calendarEvents?.length || 0} events`);
                return generated;
            } catch (parseError) {
                console.warn('⚠️ Failed to parse task generation JSON');
                return {
                    tasks: [],
                    calendarEvents: [],
                    notes: []
                };
            }

        } catch (error) {
            console.error('❌ Error generating tasks and events:', error.message);
            return {
                tasks: [],
                calendarEvents: [],
                notes: []
            };
        }
    }

    /**
     * Fallback classification when Grok fails
     */
    fallbackClassification(emailData, attachmentData) {
        const propertyKeywords = [
            'property', 'house', 'home', 'address', 'listing', 'mls',
            'closing', 'escrow', 'inspection', 'appraisal', 'purchase',
            'sale', 'buyer', 'seller', 'agent', 'contract', 'offer'
        ];

        const emailText = `${emailData.subject} ${emailData.body_text}`.toLowerCase();
        const foundKeywords = propertyKeywords.filter(keyword => 
            emailText.includes(keyword)
        );

        const hasDocuments = attachmentData.some(att => 
            /\.(pdf|doc|docx)$/i.test(att.filename)
        );

        const score = (foundKeywords.length * 0.1) + (hasDocuments ? 0.3 : 0);
        const isPropertyRelated = score >= 0.3;

        return {
            isPropertyRelated,
            confidence: Math.min(score, 0.7), // Lower confidence for fallback
            reasoning: `Fallback classification based on keywords: ${foundKeywords.join(', ')}`,
            category: 'other',
            extractedInfo: {
                addresses: [],
                mlsNumbers: [],
                clientNames: [],
                agentNames: [],
                importantDates: [],
                actionItems: []
            },
            fullResponse: null
        };
    }

    /**
     * Fallback response parser
     */
    fallbackParseResponse(content, emailData) {
        // Simple text parsing fallback
        const isPropertyRelated = /property|real estate|mls|listing|closing|inspection/i.test(content);
        
        return {
            isPropertyRelated,
            confidence: 0.5,
            reasoning: 'Fallback text analysis',
            category: 'other',
            extractedInfo: {
                addresses: [],
                mlsNumbers: [],
                clientNames: [],
                agentNames: [],
                importantDates: [],
                actionItems: []
            }
        };
    }

    /**
     * Analyze document boundaries within multi-page PDF
     */
    async analyzeBoundaries(prompt) {
        try {
            console.log('🤖 Analyzing document boundaries with Grok...');
            
            const messages = [
                {
                    role: 'system',
                    content: 'You are an expert at analyzing real estate documents and identifying where individual documents begin and end within multi-document PDFs. Always respond with valid JSON arrays only.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ];

            const response = await this.makeApiCall(messages);
            
            if (response.choices && response.choices[0] && response.choices[0].message) {
                const content = response.choices[0].message.content.trim();
                
                // Try to extract JSON from the response
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const boundaries = JSON.parse(jsonMatch[0]);
                    console.log(`✅ Grok identified ${boundaries.length} document boundaries`);
                    return boundaries;
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Grok boundary analysis error:', error);
            return null;
        }
    }

    /**
     * Analyze document type using AI
     */
    async analyzeDocumentType(prompt) {
        try {
            console.log('🤖 Analyzing document type with Grok...');
            
            const messages = [
                {
                    role: 'system',
                    content: 'You are an expert at identifying real estate document types. Respond with only the document type, no additional text.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ];

            const response = await this.makeApiCall(messages);
            
            if (response.choices && response.choices[0] && response.choices[0].message) {
                const content = response.choices[0].message.content.trim();
                console.log(`✅ Grok identified document type: ${content}`);
                return content;
            }

            return 'other';
        } catch (error) {
            console.error('❌ Grok document type analysis error:', error);
            return 'other';
        }
    }

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            console.log('🧪 Testing Grok API connection...');
            
            const messages = [
                {
                    role: 'user',
                    content: 'Hello, please respond with "Connection successful" if you can receive this message.'
                }
            ];

            const response = await this.makeApiCall(messages);
            
            if (response.choices && response.choices.length > 0) {
                console.log('✅ Grok API connection successful');
                return true;
            } else {
                console.log('❌ Grok API connection failed - no response');
                return false;
            }
        } catch (error) {
            console.error('❌ Grok API connection test failed:', error.message);
            return false;
        }
    }
}

module.exports = GrokClient;