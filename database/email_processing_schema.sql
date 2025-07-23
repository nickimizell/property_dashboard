-- Email Processing Schema Extension
-- Extends existing OOTB Property Dashboard schema for email automation
-- Built to work with existing properties, tasks, transaction_documents, and transaction_timeline tables

-- Email inbox processing queue
CREATE TABLE email_processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Email identification
    email_uid VARCHAR(255) UNIQUE NOT NULL,      -- IMAP UID for tracking
    message_id VARCHAR(255),                     -- Email Message-ID header
    thread_id VARCHAR(255),                      -- For email threading
    
    -- Email metadata
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    to_email VARCHAR(255) NOT NULL,
    cc_emails TEXT[],                            -- Array of CC recipients
    bcc_emails TEXT[],                           -- Array of BCC recipients
    subject TEXT NOT NULL,
    body_text TEXT,                              -- Plain text version
    body_html TEXT,                              -- HTML version
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Grok AI classification results
    is_property_related BOOLEAN DEFAULT FALSE,
    property_related_confidence DECIMAL(3,2),   -- 0.00-1.00
    classification_reason TEXT,                  -- Why Grok classified it this way
    grok_analysis JSONB,                        -- Full Grok response for debugging
    
    -- Property matching results  
    matched_property_id UUID REFERENCES properties(id),
    match_confidence DECIMAL(3,2),              -- 0.00-1.00
    match_method VARCHAR(50),                    -- 'address', 'mls_number', 'client_name', etc
    match_details JSONB,                         -- Details about the match (addresses found, etc)
    
    -- Processing status and results
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN 
        ('pending', 'processing', 'processed', 'failed', 'ignored', 'manual_review')),
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_error TEXT,
    
    -- Actions taken
    actions_taken JSONB,                         -- Array of actions like ['document_saved', 'task_created']
    documents_saved INTEGER DEFAULT 0,
    tasks_created INTEGER DEFAULT 0,
    calendar_events_created INTEGER DEFAULT 0,
    notes_added INTEGER DEFAULT 0,
    
    -- Response handling
    auto_response_sent BOOLEAN DEFAULT FALSE,
    response_email_id UUID,                      -- Links to email_responses_sent
    manual_review_required BOOLEAN DEFAULT FALSE,
    manual_review_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced document storage extending transaction_documents 
CREATE TABLE email_document_storage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_queue_id UUID NOT NULL REFERENCES email_processing_queue(id) ON DELETE CASCADE,
    transaction_document_id UUID REFERENCES transaction_documents(id), -- Link to existing doc system
    property_id UUID REFERENCES properties(id),
    
    -- File storage (using PostgreSQL Large Objects)
    file_oid OID,                               -- Large Object ID for file data
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64),                      -- SHA-256 for deduplication
    
    -- Document analysis from Grok
    extracted_text TEXT,                        -- Full text extracted from document
    document_type VARCHAR(100),                 -- Grok's classification
    document_confidence DECIMAL(3,2),          -- Confidence in classification
    key_information JSONB,                      -- Structured data extracted by Grok
    
    -- Property information found in document
    found_addresses TEXT[],                     -- All addresses found
    found_mls_numbers TEXT[],                   -- MLS numbers found  
    found_client_names TEXT[],                  -- Client names found
    found_agent_names TEXT[],                   -- Agent names found
    found_loan_numbers TEXT[],                  -- Loan numbers found
    found_dates JSONB,                         -- Important dates found (closing, inspection, etc)
    
    -- Processing metadata
    ocr_performed BOOLEAN DEFAULT FALSE,
    processing_time_ms INTEGER,                 -- How long processing took
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email-generated notes metadata (notes are added directly to properties.notes field)
CREATE TABLE email_generated_notes_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_queue_id UUID NOT NULL REFERENCES email_processing_queue(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Note metadata  
    note_text TEXT NOT NULL,                        -- Copy of what was added to properties.notes
    note_type VARCHAR(50) DEFAULT 'email' CHECK (note_type IN 
        ('email', 'document_summary', 'important_date', 'action_item')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Source information
    source_email_subject TEXT,
    source_sender VARCHAR(255),
    auto_generated BOOLEAN DEFAULT TRUE,
    
    -- Tracking integration with existing system
    note_position_in_property INTEGER,              -- Character position where note was added
    note_delimiter VARCHAR(20) DEFAULT '\n---\n',  -- Delimiter used to separate notes
    
    created_by UUID REFERENCES users(id),           -- System user for automated notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-generated tasks (extends existing tasks table)
CREATE TABLE email_generated_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_queue_id UUID NOT NULL REFERENCES email_processing_queue(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Task generation details
    generation_reason TEXT,                     -- Why this task was created
    source_document_id UUID REFERENCES email_document_storage(id),
    trigger_keywords TEXT[],                    -- Keywords that triggered task creation
    grok_recommendation TEXT,                   -- Grok's reasoning
    
    -- Task automation
    auto_assigned BOOLEAN DEFAULT TRUE,
    original_due_date DATE,                     -- Original due date before any changes
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar events (extends transaction_timeline table) 
CREATE TABLE email_generated_calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_queue_id UUID NOT NULL REFERENCES email_processing_queue(id) ON DELETE CASCADE,
    timeline_id UUID REFERENCES transaction_timeline(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Event details
    event_title VARCHAR(255) NOT NULL,
    event_description TEXT,
    event_date DATE NOT NULL,
    event_time TIME,
    duration_minutes INTEGER DEFAULT 60,
    
    -- Event type and priority
    event_type VARCHAR(50) DEFAULT 'meeting' CHECK (event_type IN 
        ('inspection', 'appraisal', 'closing', 'showing', 'meeting', 'deadline', 'follow_up')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Attendees and parties
    attendee_emails TEXT[],                     -- Email addresses to invite
    attendee_names TEXT[],                      -- Names corresponding to emails
    organizer_email VARCHAR(255),
    
    -- External calendar integration
    google_calendar_id VARCHAR(255),           -- Google Calendar event ID if synced
    ical_uid VARCHAR(255),                     -- iCal UID for calendar invites
    calendar_invite_sent BOOLEAN DEFAULT FALSE,
    
    -- Source information
    extracted_from_document BOOLEAN DEFAULT FALSE,
    extraction_confidence DECIMAL(3,2),
    source_document_id UUID REFERENCES email_document_storage(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email response templates and tracking
CREATE TABLE email_response_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(100) UNIQUE NOT NULL,
    
    -- Template content
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    template_variables TEXT[] NOT NULL,         -- Required variables like {{property_address}}
    
    -- Template categorization
    category VARCHAR(50) NOT NULL CHECK (category IN 
        ('property_matched', 'property_not_found', 'documents_received', 'task_created', 
         'calendar_event_created', 'processing_error', 'manual_review_required')),
    
    -- Template settings
    active BOOLEAN DEFAULT TRUE,
    send_automatically BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tracking sent email responses
CREATE TABLE email_responses_sent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_email_id UUID NOT NULL REFERENCES email_processing_queue(id) ON DELETE CASCADE,
    template_id UUID REFERENCES email_response_templates(id),
    
    -- Response details
    to_email VARCHAR(255) NOT NULL,
    cc_emails TEXT[],
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    
    -- Sending status
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status VARCHAR(50) DEFAULT 'sent' CHECK (delivery_status IN 
        ('sent', 'delivered', 'failed', 'bounced')),
    delivery_error TEXT,
    
    -- Tracking
    opened_at TIMESTAMP WITH TIME ZONE,         -- If read receipts enabled
    replied_at TIMESTAMP WITH TIME ZONE,        -- If recipient replied
    
    sent_by UUID REFERENCES users(id),          -- System user for automated responses
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email processing configuration and rules
CREATE TABLE email_processing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) UNIQUE NOT NULL,
    
    -- Rule conditions
    sender_pattern VARCHAR(255),               -- Regex pattern for sender email
    subject_pattern VARCHAR(255),              -- Regex pattern for subject
    body_keywords TEXT[],                      -- Keywords to look for in body
    attachment_types TEXT[],                   -- File types to match
    
    -- Rule actions
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN 
        ('auto_process', 'skip', 'priority', 'assign_agent', 'require_review')),
    action_parameters JSONB,                   -- Additional parameters for action
    
    -- Rule settings
    active BOOLEAN DEFAULT TRUE,
    priority_order INTEGER DEFAULT 0,          -- Higher numbers = higher priority
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System configuration for email processing
CREATE TABLE email_system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    config_type VARCHAR(20) DEFAULT 'string' CHECK (config_type IN ('string', 'integer', 'boolean', 'json')),
    description TEXT,
    
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for optimal performance
CREATE INDEX idx_email_queue_status ON email_processing_queue(processing_status);
CREATE INDEX idx_email_queue_property_related ON email_processing_queue(is_property_related);
CREATE INDEX idx_email_queue_received_at ON email_processing_queue(received_at);
CREATE INDEX idx_email_queue_property_id ON email_processing_queue(matched_property_id);
CREATE INDEX idx_email_queue_from_email ON email_processing_queue(from_email);

CREATE INDEX idx_email_docs_property_id ON email_document_storage(property_id);
CREATE INDEX idx_email_docs_email_id ON email_document_storage(email_queue_id);
CREATE INDEX idx_email_docs_file_hash ON email_document_storage(file_hash);
CREATE INDEX idx_email_docs_doc_type ON email_document_storage(document_type);

CREATE INDEX idx_email_notes_metadata_property_id ON email_generated_notes_metadata(property_id);
CREATE INDEX idx_email_notes_metadata_email_id ON email_generated_notes_metadata(email_queue_id);
CREATE INDEX idx_email_notes_metadata_type ON email_generated_notes_metadata(note_type);

CREATE INDEX idx_email_tasks_property_id ON email_generated_tasks(property_id);
CREATE INDEX idx_email_tasks_email_id ON email_generated_tasks(email_queue_id);

CREATE INDEX idx_email_events_property_id ON email_generated_calendar_events(property_id);
CREATE INDEX idx_email_events_date ON email_generated_calendar_events(event_date);
CREATE INDEX idx_email_events_type ON email_generated_calendar_events(event_type);

CREATE INDEX idx_email_responses_original_id ON email_responses_sent(original_email_id);
CREATE INDEX idx_email_responses_status ON email_responses_sent(delivery_status);

-- Add triggers for updated_at columns
CREATE TRIGGER update_email_processing_queue_updated_at BEFORE UPDATE ON email_processing_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_document_storage_updated_at BEFORE UPDATE ON email_document_storage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_generated_notes_metadata_updated_at BEFORE UPDATE ON email_generated_notes_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_generated_calendar_events_updated_at BEFORE UPDATE ON email_generated_calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_response_templates_updated_at BEFORE UPDATE ON email_response_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_processing_rules_updated_at BEFORE UPDATE ON email_processing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_system_config_updated_at BEFORE UPDATE ON email_system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default email response templates
INSERT INTO email_response_templates (template_name, category, subject_template, body_template, template_variables, send_automatically) VALUES 

('property_matched_documents_saved', 'documents_received', 
 '✅ Documents Received - {{property_address}}',
 'Hi {{sender_name}},

Thank you for your email regarding "{{email_subject}}".

Your documents have been successfully received and saved to the property file for:
**{{property_address}}**

Documents saved:
{{document_list}}

Property Details:
- Client: {{client_name}}  
- Status: {{property_status}}
- Assigned Agent: {{selling_agent}}

You can view all property documents and status updates at:
{{property_dashboard_url}}

{{additional_actions}}

Best regards,
Out Of The Box Properties
Transaction Coordinator Team',
 ARRAY['sender_name', 'email_subject', 'property_address', 'document_list', 'client_name', 'property_status', 'selling_agent', 'property_dashboard_url', 'additional_actions'],
 true),

('property_not_found', 'property_not_found',
 '⚠️ Property Not Found - Action Required',
 'Hi {{sender_name}},

Thank you for your email regarding "{{email_subject}}".

We couldn''t find a matching property in our Transaction Coordinator system for:
{{searched_addresses}}

To ensure we can properly track documents and manage tasks for this property, please:

1. **Add the property** to our system at: {{dashboard_url}}
2. **Reply with correct details** (property address, MLS number, client name)
3. **Contact your agent** to have them add the property to our system

Once the property is added, please resend your documents and they will be automatically filed and organized.

If you believe this property should already be in our system, please contact support at {{support_email}}.

Best regards,
Out Of The Box Properties  
Transaction Coordinator Team',
 ARRAY['sender_name', 'email_subject', 'searched_addresses', 'dashboard_url', 'support_email'],
 true),

('tasks_and_calendar_created', 'task_created',
 '📅 Tasks & Calendar Events Created - {{property_address}}', 
 'Hi {{sender_name}},

Based on your email regarding {{property_address}}, we''ve automatically created the following:

**Tasks Created:**
{{task_list}}

**Calendar Events Scheduled:**  
{{calendar_list}}

**Important Dates Tracked:**
{{important_dates}}

All tasks and events have been assigned to the appropriate team members and added to our tracking system.

View full property timeline: {{property_dashboard_url}}

Best regards,
Transaction Coordinator Team',
 ARRAY['sender_name', 'property_address', 'task_list', 'calendar_list', 'important_dates', 'property_dashboard_url'],
 true);

-- Insert default system configuration
INSERT INTO email_system_config (config_key, config_value, config_type, description) VALUES
('imap_poll_interval_seconds', '60', 'integer', 'How often to check for new emails in seconds'),
('max_emails_per_batch', '20', 'integer', 'Maximum number of emails to process at once'),
('grok_api_url', 'https://api.x.ai/v1/chat/completions', 'string', 'Grok API endpoint URL'),
('grok_model', 'grok-3-latest', 'string', 'Grok model to use for processing'),
('auto_response_enabled', 'true', 'boolean', 'Whether to send automatic email responses'),
('require_manual_review_threshold', '0.5', 'string', 'Confidence threshold below which manual review is required'),
('max_document_size_mb', '10', 'integer', 'Maximum document size to process in MB'),
('supported_document_types', '["pdf","doc","docx","jpg","jpeg","png","tiff"]', 'json', 'Supported document file types'),
('dashboard_base_url', 'https://ootb-property-dashboard.onrender.com', 'string', 'Base URL for property dashboard links'),
('support_email', 'support@outoftheboxproperties.com', 'string', 'Support email address for responses');

-- Create view for email processing dashboard
CREATE VIEW email_processing_dashboard AS
SELECT 
    DATE(received_at) as processing_date,
    COUNT(*) as total_emails,
    COUNT(*) FILTER (WHERE is_property_related = true) as property_related_emails,
    COUNT(*) FILTER (WHERE matched_property_id IS NOT NULL) as matched_emails,
    COUNT(*) FILTER (WHERE processing_status = 'processed') as processed_emails,
    COUNT(*) FILTER (WHERE processing_status = 'manual_review') as manual_review_needed,
    COUNT(*) FILTER (WHERE auto_response_sent = true) as responses_sent,
    AVG(documents_saved) as avg_documents_saved,
    AVG(tasks_created) as avg_tasks_created,
    AVG(calendar_events_created) as avg_calendar_events_created
FROM email_processing_queue 
WHERE received_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(received_at)
ORDER BY processing_date DESC;