-- Out Of The Box Properties Database Schema
-- PostgreSQL Schema for Property Management Dashboard

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Properties table
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address TEXT NOT NULL,
    client_name TEXT NOT NULL,
    selling_agent TEXT NOT NULL,
    loan_number TEXT,
    basis_points INTEGER,
    closing_date DATE,
    under_contract_price DECIMAL(12,2),
    starting_list_price DECIMAL(12,2),
    current_list_price DECIMAL(12,2),
    status TEXT NOT NULL CHECK (status IN ('Active', 'Under Contract', 'Pending', 'Closed', 'Hold')),
    property_type TEXT NOT NULL CHECK (property_type IN ('Single Family', 'Duplex', 'Rental', 'Commercial')),
    is_rented BOOLEAN DEFAULT FALSE,
    notes TEXT DEFAULT '',
    coordinates_lat DECIMAL(10,8),
    coordinates_lng DECIMAL(11,8),
    listing_date DATE,
    last_price_reduction DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contingency dates table
CREATE TABLE contingency_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    earnest_money DATE,
    inspection DATE,
    title DATE,
    appraisal DATE,
    lending DATE,
    occupancy DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status TEXT NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed')),
    category TEXT NOT NULL CHECK (category IN ('Pre-Listing', 'Under Contract', 'Documentation', 'Contractor', 'Agent Follow-up', 'Legal', 'Inspection', 'Price Review', 'Other')),
    task_type TEXT NOT NULL CHECK (task_type IN ('pre-listing', 'under-contract', 'price-review')),
    assigned_to TEXT,
    completion_notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_auto_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (for authentication and team management)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Agent', 'Viewer')) DEFAULT 'Agent',
    is_active BOOLEAN DEFAULT TRUE,
    setup_token TEXT,
    setup_token_expires TIMESTAMP WITH TIME ZONE,
    reset_token TEXT,
    reset_token_expires TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity log table (for audit trail)
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    property_id UUID REFERENCES properties(id),
    task_id UUID REFERENCES tasks(id),
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'completed'
    entity_type TEXT NOT NULL, -- 'property', 'task', 'user'
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction coordinator tables

-- Transaction documents table
CREATE TABLE transaction_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('Listing Agreement', 'Property Disclosures', 'Inspection Reports', 'Appraisal Documents', 'Contract & Amendments', 'Title Documents', 'Other')),
    document_name TEXT NOT NULL,
    file_path TEXT,
    file_size INTEGER,
    file_type TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'review', 'complete')) DEFAULT 'pending',
    uploaded_by UUID REFERENCES users(id),
    notes TEXT,
    zipforms_form_id TEXT,
    zipforms_status TEXT,
    zipforms_last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction parties table
CREATE TABLE transaction_parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('Seller', 'Selling Agent', 'Buyer', 'Buyer Agent', 'Title Company', 'Lender', 'Inspector', 'Appraiser', 'Other')),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'pending', 'inactive')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction workflow table
CREATE TABLE transaction_workflow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    phase TEXT NOT NULL CHECK (phase IN ('Pre-Listing', 'Active Marketing', 'Under Contract', 'Closing')),
    task_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in-progress', 'complete')) DEFAULT 'pending',
    due_date DATE,
    completed_date DATE,
    assigned_to UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction timeline table
CREATE TABLE transaction_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('milestone', 'update', 'event', 'deadline')),
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('complete', 'upcoming', 'overdue')) DEFAULT 'upcoming',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_listing_date ON properties(listing_date);
CREATE INDEX idx_properties_agent ON properties(selling_agent);
CREATE INDEX idx_tasks_property_id ON tasks(property_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_activity_log_property_id ON activity_log(property_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);

-- Transaction coordinator indexes
CREATE INDEX idx_transaction_documents_property_id ON transaction_documents(property_id);
CREATE INDEX idx_transaction_documents_category ON transaction_documents(category);
CREATE INDEX idx_transaction_documents_status ON transaction_documents(status);
CREATE INDEX idx_transaction_parties_property_id ON transaction_parties(property_id);
CREATE INDEX idx_transaction_parties_role ON transaction_parties(role);
CREATE INDEX idx_transaction_workflow_property_id ON transaction_workflow(property_id);
CREATE INDEX idx_transaction_workflow_phase ON transaction_workflow(phase);
CREATE INDEX idx_transaction_workflow_status ON transaction_workflow(status);
CREATE INDEX idx_transaction_timeline_property_id ON transaction_timeline(property_id);
CREATE INDEX idx_transaction_timeline_event_date ON transaction_timeline(event_date);
CREATE INDEX idx_transaction_timeline_status ON transaction_timeline(status);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contingency_dates_updated_at BEFORE UPDATE ON contingency_dates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Transaction coordinator triggers
CREATE TRIGGER update_transaction_documents_updated_at BEFORE UPDATE ON transaction_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_parties_updated_at BEFORE UPDATE ON transaction_parties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_workflow_updated_at BEFORE UPDATE ON transaction_workflow
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_timeline_updated_at BEFORE UPDATE ON transaction_timeline
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (convert from existing mock data)
INSERT INTO properties (
    id, address, client_name, selling_agent, loan_number, basis_points,
    closing_date, under_contract_price, starting_list_price, current_list_price,
    status, property_type, is_rented, notes, coordinates_lat, coordinates_lng,
    listing_date, last_price_reduction, created_at, updated_at
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001',
    '123 Main Street, Springfield, IL 62701',
    'Johnson Investment Group',
    'Sarah Johnson',
    'LN-2024-001',
    150,
    '2025-02-15',
    285000,
    299000,
    289000,
    'Under Contract',
    'Single Family',
    FALSE,
    'Beautiful 3BR/2BA home with updated kitchen. Buyer pre-approved with excellent credit.',
    39.7817,
    -89.6501,
    '2024-12-15',
    '2025-01-05',
    '2024-12-01',
    '2025-01-15'
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    '456 Oak Avenue, Springfield, IL 62702',
    'Miller Family Trust',
    'Michael Chen',
    'LN-2024-002',
    200,
    '2025-01-28',
    320000,
    335000,
    325000,
    'Under Contract',
    'Single Family',
    FALSE,
    'Corner lot property with large garage. Some minor repairs needed before closing.',
    39.7831,
    -89.6498,
    '2024-11-20',
    '2024-12-20',
    '2024-11-15',
    '2025-01-14'
);

-- Insert contingency dates
INSERT INTO contingency_dates (
    property_id, earnest_money, inspection, title, appraisal, lending, occupancy
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001',
    '2025-01-10', '2025-01-18', '2025-01-25', '2025-01-30', '2025-02-05', '2025-02-15'
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    '2025-01-05', '2025-01-15', '2025-01-20', '2025-01-22', '2025-01-25', '2025-01-28'
);

-- Insert sample tasks
INSERT INTO tasks (
    id, property_id, title, description, due_date, priority, status, 
    category, task_type, assigned_to, is_auto_generated
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440101',
    '550e8400-e29b-41d4-a716-446655440001',
    'Schedule Home Inspection',
    'Contact inspection company for 123 Main St property',
    '2025-01-18',
    'High',
    'Pending',
    'Under Contract',
    'under-contract',
    'Sarah Johnson',
    FALSE
),
(
    '550e8400-e29b-41d4-a716-446655440102',
    '550e8400-e29b-41d4-a716-446655440002',
    'Follow up with Buyer Agent',
    'Check status of loan approval for Oak Avenue property',
    '2025-01-16',
    'Urgent',
    'Pending',
    'Under Contract',
    'under-contract',
    'Michael Chen',
    FALSE
);

-- Insert default users (password is 'training1' hashed with bcrypt)
INSERT INTO users (
    id, username, email, password_hash, name, role, is_active
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440401',
    'mattmizell',
    'matt.mizell@gmail.com',
    '$2b$12$LQv3c1yqBwEHFAwKnzaOOeXYLZ8hT0G2UqK7eCj/YOEhXXNkHBZvy',
    'Matt Mizell',
    'Admin',
    TRUE
),
(
    '550e8400-e29b-41d4-a716-446655440402',
    'nickimizell',
    'nicki@outofthebox.properties',
    '$2b$12$LQv3c1yqBwEHFAwKnzaOOeXYLZ8hT0G2UqK7eCj/YOEhXXNkHBZvy',
    'Nicki Mizell',
    'Admin',
    TRUE
);

-- Insert sample transaction coordinator data
INSERT INTO transaction_parties (
    property_id, role, name, email, phone, company, status
) VALUES 
-- Property 1 parties
('550e8400-e29b-41d4-a716-446655440001', 'Seller', 'Johnson Investment Group', 'contact@johnsoninvest.com', '(217) 555-0123', 'Johnson Investment Group', 'active'),
('550e8400-e29b-41d4-a716-446655440001', 'Selling Agent', 'Sarah Johnson', 'sarah@ootbproperties.com', '(217) 555-0456', 'Out Of The Box Properties', 'active'),
('550e8400-e29b-41d4-a716-446655440001', 'Buyer', 'The Smith Family', 'john.smith@email.com', '(217) 555-0789', '', 'active'),
('550e8400-e29b-41d4-a716-446655440001', 'Buyer Agent', 'Mark Thompson', 'mark@realestate.com', '(217) 555-0321', 'Springfield Realty', 'active'),
-- Property 2 parties
('550e8400-e29b-41d4-a716-446655440002', 'Seller', 'Miller Family Trust', 'miller.trust@email.com', '(217) 555-0654', 'Miller Family Trust', 'active'),
('550e8400-e29b-41d4-a716-446655440002', 'Selling Agent', 'Michael Chen', 'michael@ootbproperties.com', '(217) 555-0987', 'Out Of The Box Properties', 'active');

INSERT INTO transaction_documents (
    property_id, category, document_name, status, uploaded_by
) VALUES 
-- Property 1 documents
('550e8400-e29b-41d4-a716-446655440001', 'Listing Agreement', 'Listing_Agreement_123_Main_St.pdf', 'complete', '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'Property Disclosures', 'Property_Disclosure_Statement.pdf', 'complete', '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'Property Disclosures', 'Lead_Based_Paint_Disclosure.pdf', 'complete', '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'Contract & Amendments', 'Purchase_Agreement.pdf', 'review', '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'Contract & Amendments', 'Amendment_1_Inspection_Items.pdf', 'review', '550e8400-e29b-41d4-a716-446655440401'),
-- Property 2 documents
('550e8400-e29b-41d4-a716-446655440002', 'Listing Agreement', 'Listing_Agreement_456_Oak_Ave.pdf', 'complete', '550e8400-e29b-41d4-a716-446655440402'),
('550e8400-e29b-41d4-a716-446655440002', 'Property Disclosures', 'Property_Disclosure_Statement.pdf', 'complete', '550e8400-e29b-41d4-a716-446655440402');

INSERT INTO transaction_workflow (
    property_id, phase, task_name, status, due_date, assigned_to
) VALUES 
-- Property 1 workflow (Under Contract)
('550e8400-e29b-41d4-a716-446655440001', 'Pre-Listing', 'Property Photos', 'complete', NULL, '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'Pre-Listing', 'Market Analysis', 'complete', NULL, '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'Pre-Listing', 'Listing Agreement', 'complete', NULL, '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'Pre-Listing', 'MLS Listing', 'complete', NULL, '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'Active Marketing', 'Schedule Showings', 'complete', NULL, '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'Active Marketing', 'Track Interest', 'complete', NULL, '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'Under Contract', 'Execute Contract', 'complete', NULL, '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'Under Contract', 'Schedule Inspection', 'in-progress', '2025-01-18', '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'Under Contract', 'Coordinate Appraisal', 'pending', '2025-01-30', '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'Under Contract', 'Title Work', 'pending', '2025-01-25', '550e8400-e29b-41d4-a716-446655440401'),
-- Property 2 workflow (Under Contract)
('550e8400-e29b-41d4-a716-446655440002', 'Pre-Listing', 'Property Photos', 'complete', NULL, '550e8400-e29b-41d4-a716-446655440402'),
('550e8400-e29b-41d4-a716-446655440002', 'Pre-Listing', 'Market Analysis', 'complete', NULL, '550e8400-e29b-41d4-a716-446655440402'),
('550e8400-e29b-41d4-a716-446655440002', 'Pre-Listing', 'Listing Agreement', 'complete', NULL, '550e8400-e29b-41d4-a716-446655440402'),
('550e8400-e29b-41d4-a716-446655440002', 'Pre-Listing', 'MLS Listing', 'complete', NULL, '550e8400-e29b-41d4-a716-446655440402'),
('550e8400-e29b-41d4-a716-446655440002', 'Active Marketing', 'Schedule Showings', 'complete', NULL, '550e8400-e29b-41d4-a716-446655440402'),
('550e8400-e29b-41d4-a716-446655440002', 'Under Contract', 'Execute Contract', 'complete', NULL, '550e8400-e29b-41d4-a716-446655440402'),
('550e8400-e29b-41d4-a716-446655440002', 'Under Contract', 'Schedule Inspection', 'complete', NULL, '550e8400-e29b-41d4-a716-446655440402'),
('550e8400-e29b-41d4-a716-446655440002', 'Under Contract', 'Coordinate Appraisal', 'in-progress', '2025-01-22', '550e8400-e29b-41d4-a716-446655440402');

INSERT INTO transaction_timeline (
    property_id, event_type, title, description, event_date, status, created_by
) VALUES 
-- Property 1 timeline
('550e8400-e29b-41d4-a716-446655440001', 'milestone', 'Property Listed', 'Listed on MLS at $299,000', '2024-12-15', 'complete', '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'update', 'Price Reduction', 'Reduced to $289,000', '2025-01-05', 'complete', '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'milestone', 'Under Contract', 'Accepted offer for $285,000', '2025-01-10', 'complete', '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'event', 'Home Inspection', 'Scheduled inspection with ABC Inspections', '2025-01-18', 'upcoming', '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'deadline', 'Appraisal Due', 'Appraisal must be completed', '2025-01-30', 'upcoming', '550e8400-e29b-41d4-a716-446655440401'),
('550e8400-e29b-41d4-a716-446655440001', 'milestone', 'Closing Date', 'Scheduled closing at title company', '2025-02-15', 'upcoming', '550e8400-e29b-41d4-a716-446655440401'),
-- Property 2 timeline
('550e8400-e29b-41d4-a716-446655440002', 'milestone', 'Property Listed', 'Listed on MLS at $335,000', '2024-11-20', 'complete', '550e8400-e29b-41d4-a716-446655440402'),
('550e8400-e29b-41d4-a716-446655440002', 'update', 'Price Reduction', 'Reduced to $325,000', '2024-12-20', 'complete', '550e8400-e29b-41d4-a716-446655440402'),
('550e8400-e29b-41d4-a716-446655440002', 'milestone', 'Under Contract', 'Accepted offer for $320,000', '2025-01-05', 'complete', '550e8400-e29b-41d4-a716-446655440402'),
('550e8400-e29b-41d4-a716-446655440002', 'event', 'Appraisal Scheduled', 'Appraisal scheduled for January 22', '2025-01-22', 'upcoming', '550e8400-e29b-41d4-a716-446655440402'),
('550e8400-e29b-41d4-a716-446655440002', 'milestone', 'Closing Date', 'Scheduled closing at title company', '2025-01-28', 'upcoming', '550e8400-e29b-41d4-a716-446655440402');

-- Create a view for dashboard statistics
CREATE VIEW dashboard_stats AS
SELECT 
    COUNT(*) as total_properties,
    COUNT(*) FILTER (WHERE status = 'Active') as active_listings,
    COUNT(*) FILTER (WHERE status = 'Under Contract') as under_contract,
    (SELECT COUNT(*) FROM tasks WHERE status = 'Pending') as pending_tasks,
    (SELECT COUNT(*) FROM tasks WHERE priority = 'Urgent' AND status != 'Completed') as urgent_tasks,
    COALESCE(
        (SELECT ROUND(AVG(updated_at::date - created_at::date))
         FROM properties 
         WHERE status = 'Closed'), 
        0
    ) as avg_days_to_close
FROM properties;