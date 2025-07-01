-- Out Of The Box Properties Database Schema
-- PostgreSQL Schema for Property Management Dashboard
-- Updated with Real Trident Properties Data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
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
    workflow_type TEXT NOT NULL CHECK (workflow_type IN ('Conventional', 'Investor')),
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
CREATE TABLE IF NOT EXISTS contingency_dates (
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
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status TEXT NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed')),
    category TEXT NOT NULL CHECK (category IN ('Listing Prep', 'Under Contract', 'Closing', 'Documentation', 'Contractor', 'Agent Follow-up', 'Legal', 'Inspection', 'Price Review', 'Other')),
    task_type TEXT NOT NULL CHECK (task_type IN ('listing-prep', 'under-contract', 'closing', 'price-review')),
    assigned_to TEXT,
    completion_notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_auto_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (for future team management)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Agent', 'Viewer')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity log table (for audit trail)
CREATE TABLE IF NOT EXISTS activity_log (
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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_listing_date ON properties(listing_date);
CREATE INDEX IF NOT EXISTS idx_properties_agent ON properties(selling_agent);
CREATE INDEX IF NOT EXISTS idx_tasks_property_id ON tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_activity_log_property_id ON activity_log(property_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contingency_dates_updated_at ON contingency_dates;
CREATE TRIGGER update_contingency_dates_updated_at BEFORE UPDATE ON contingency_dates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Clear existing data to start fresh
DELETE FROM tasks;
DELETE FROM contingency_dates;
DELETE FROM properties;

-- Insert Real Trident Properties Data
INSERT INTO properties (
    id, address, client_name, selling_agent, loan_number, basis_points,
    closing_date, under_contract_price, starting_list_price, current_list_price,
    status, property_type, workflow_type, is_rented, notes, coordinates_lat, coordinates_lng,
    listing_date, created_at, updated_at
) VALUES 
('a4fb7428-ea74-4d9a-86ee-9ce5852556f0', '7332 Wellington', 'Trident Properties', 'Trident Team', NULL, NULL, NULL, NULL, 249900, 199900, 'Hold', 'Single Family', 'Conventional', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: nan', 38.666000, -90.245400, '2024-05-16', '2025-07-01T22:50:13.616351', '2025-07-01T22:50:13.616357'),
('8560d453-7c0a-4cf0-90d5-d3a4112286ba', '3838 Oregon', 'Trident Properties', 'Trident Team', NULL, NULL, NULL, 130000, 99900, 129900, 'Active', 'Single Family', 'Conventional', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: nan', 38.584000, -90.247400, '2024-03-19', '2025-07-01T22:50:13.616507', '2025-07-01T22:50:13.616509'),
('bb39abc9-4ad2-4c26-9ba4-8b4bb1c9b894', '4278 E Sacremento', 'Trident Properties', 'Trident Team', NULL, NULL, NULL, NULL, 149900, 109900, 'Hold', 'Commercial', 'Investor', TRUE, 'Imported from Trident Properties spreadsheet. Original loan info: nan', 38.627600, -90.133400, '2024-05-18', '2025-07-01T22:50:13.616517', '2025-07-01T22:50:13.616519'),
('07e81ce8-afad-4ba0-8816-2b1dca66cde0', '2359 Michigan', 'Trident Properties', 'Trident Team', NULL, NULL, NULL, NULL, 159900, 159900, 'Hold', 'Single Family', 'Conventional', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: nan', 38.607800, -90.203400, '2024-10-16', '2025-07-01T22:50:13.616528', '2025-07-01T22:50:13.616529'),
('df8e71c8-d81c-4e56-a1f4-e2dfb5e1ef4f', '5175 Cabanne', 'Trident Properties', 'Trident Team', NULL, NULL, NULL, 40000, 69900, 54900, 'Active', 'Single Family', 'Conventional', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: nan', 38.612000, -90.262400, '2024-10-14', '2025-07-01T22:50:13.616538', '2025-07-01T22:50:13.616540'),
('d8f1b3b8-7ccf-4789-944b-3b9b4b7da7f9', '5168 Vernon', 'Trident Properties', 'Trident Team', 'LN-307624', NULL, NULL, NULL, 129000, 89900, 'Active', 'Single Family', 'Conventional', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: loan # 307624', 38.620800, -90.199400, '2024-10-30', '2025-07-01T22:50:13.616549', '2025-07-01T22:50:13.616551'),
('0dff8ac5-5be2-46e4-b5b6-c5c3b1b8a3c3', '4527 Minnesota', 'Trident Properties', 'Trident Team', 'LN-308284', 109520, '2025-07-08', 99900, 139900, 99900, 'Under Contract', 'Duplex', 'Investor', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: basis 109,520 loan # 308284', 38.642800, -90.249400, '2024-12-10', '2025-07-01T22:50:13.616560', '2025-07-01T22:50:13.616562'),
('e4d7bb6d-b87e-428f-9d7b-7b7e4e4bb6e7', '3936 Lexington', 'Trident Properties', 'Trident Team', NULL, NULL, NULL, NULL, 79900, 54900, 'Active', 'Duplex', 'Investor', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: nan', 38.666400, -90.219400, '2024-11-19', '2025-07-01T22:50:13.616571', '2025-07-01T22:50:13.616573'),
('1d3d8e9f-8c2b-4a3c-9e1f-3f3c1d8e9f1f', '3735 Wisconsin', 'Trident Properties', 'Trident Team', NULL, NULL, NULL, NULL, 199900, 139900, 'Active', 'Commercial', 'Investor', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: nan', 38.630000, -90.244400, '2024-12-10', '2025-07-01T22:50:13.616582', '2025-07-01T22:50:13.616584'),
('3e2f7a8b-9c3d-4e5f-8a2b-7b8c3d5f7a8b', '2131-2133 Stansbury St', 'Trident Properties', 'Trident Team', 'LN-307232', NULL, NULL, NULL, NULL, 199900, 'Hold', 'Duplex', 'Investor', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: loan # 307232', 38.642400, -90.183400, NULL, '2025-07-01T22:50:13.616593', '2025-07-01T22:50:13.616595'),
('4f5g8h9i-0j1k-2l3m-4n5o-6p7q8r9s0t1u', '1603 Belleau Lake Dr O''Fallon', 'Trident Properties', 'Trident Team', NULL, NULL, NULL, NULL, 129000, 89000, 'Active', 'Single Family', 'Conventional', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: nan', 38.607200, -90.228400, NULL, '2025-07-01T22:50:13.616604', '2025-07-01T22:50:13.616606'),
('5g6h9i0j-1k2l-3m4n-5o6p-7q8r9s0t1u2v', '3539 Michigan 220k Jason', 'Trident Properties', 'Trident Team', NULL, 220000, NULL, NULL, NULL, NULL, 'Hold', 'Commercial', 'Investor', TRUE, 'Imported from Trident Properties spreadsheet. Original loan info: 220k', 38.666600, -90.185400, NULL, '2025-07-01T22:50:13.616615', '2025-07-01T22:50:13.616617'),
('6h7i0j1k-2l3m-4n5o-6p7q-8r9s0t1u2v3w', '4369 Evans St Louis 66113', 'Trident Properties', 'Trident Team', 'LN-304975', 90177, NULL, NULL, NULL, 59900, 'Active', 'Single Family', 'Conventional', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: loan #304975  basis $90,177.49', 38.601200, -90.209400, NULL, '2025-07-01T22:50:13.616626', '2025-07-01T22:50:13.616628'),
('7i8j1k2l-3m4n-5o6p-7q8r-9s0t1u2v3w4x', '10533 Earl Dr', 'Trident Properties', 'Trident Team', NULL, NULL, '2025-07-02', 99900, NULL, 99000, 'Under Contract', 'Single Family', 'Conventional', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: nan', 38.591200, -90.177400, NULL, '2025-07-01T22:50:13.616637', '2025-07-01T22:50:13.616639'),
('8j9k2l3m-4n5o-6p7q-8r9s-0t1u2v3w4x5y', '3929 Pennsylvania', 'Trident Properties', 'Trident Team', 'LN-306994', 101675, NULL, 111650, 119900, 119900, 'Under Contract', 'Duplex', 'Investor', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: loan # 306994 basis $101,675', 38.653200, -90.221400, NULL, '2025-07-01T22:50:13.616648', '2025-07-01T22:50:13.616650'),
('9k0l3m4n-5o6p-7q8r-9s0t-1u2v3w4x5y6z', '7280 S Roland', 'Trident Properties', 'Trident Team', 'LN-305065', 244076, '2025-07-11', 265000, 299900, 279900, 'Under Contract', 'Single Family', 'Conventional', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: loan # 305065 basis $244,076', 38.600400, -90.155400, NULL, '2025-07-01T22:50:13.616659', '2025-07-01T22:50:13.616661'),
('0l1m4n5o-6p7q-8r9s-0t1u-2v3w4x5y6z7a', '3708 Bamberger Ave 63116', 'Trident Properties', 'Trident Team', 'LN-304061', 158242, NULL, NULL, NULL, NULL, 'Hold', 'Single Family', 'Conventional', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: loan #304061 basis $158,242', 38.607600, -90.242400, NULL, '2025-07-01T22:50:13.616670', '2025-07-01T22:50:13.616672'),
('1m2n5o6p-7q8r-9s0t-1u2v-3w4x5y6z7a8b', '3223 Taft 63111', 'Trident Properties', 'Trident Team', 'LN-307748', 77787, NULL, NULL, NULL, NULL, 'Hold', 'Single Family', 'Conventional', FALSE, 'Imported from Trident Properties spreadsheet. Original loan info: loan #307748. basis $77,787', 38.610000, -90.192400, NULL, '2025-07-01T22:50:13.616681', '2025-07-01T22:50:13.616683');

-- Insert basic tasks for each property
INSERT INTO tasks (
    id, property_id, title, description, due_date, priority, status, 
    category, task_type, is_auto_generated
) VALUES 
('a4fb7428-task-1', 'a4fb7428-ea74-4d9a-86ee-9ce5852556f0', 'Complete Pre-Listing Preparation', 'Property is on hold - complete all pre-listing requirements', '2025-07-01', 'High', 'Pending', 'Listing Prep', 'listing-prep', TRUE),
('8560d453-task-2', '8560d453-7c0a-4cf0-90d5-d3a4112286ba', 'Monitor Active Listing Performance', 'Track showing activity and market response', '2025-07-01', 'Medium', 'Pending', 'Listing Prep', 'listing-prep', TRUE),
('bb39abc9-task-1', 'bb39abc9-4ad2-4c26-9ba4-8b4bb1c9b894', 'Complete Pre-Listing Preparation', 'Property is on hold - complete all pre-listing requirements', '2025-07-01', 'High', 'Pending', 'Listing Prep', 'listing-prep', TRUE),
('07e81ce8-task-1', '07e81ce8-afad-4ba0-8816-2b1dca66cde0', 'Complete Pre-Listing Preparation', 'Property is on hold - complete all pre-listing requirements', '2025-07-01', 'High', 'Pending', 'Listing Prep', 'listing-prep', TRUE),
('df8e71c8-task-2', 'df8e71c8-d81c-4e56-a1f4-e2dfb5e1ef4f', 'Monitor Active Listing Performance', 'Track showing activity and market response', '2025-07-01', 'Medium', 'Pending', 'Listing Prep', 'listing-prep', TRUE),
('d8f1b3b8-task-2', 'd8f1b3b8-7ccf-4789-944b-3b9b4b7da7f9', 'Monitor Active Listing Performance', 'Track showing activity and market response', '2025-07-01', 'Medium', 'Pending', 'Listing Prep', 'listing-prep', TRUE),
('0dff8ac5-task-3', '0dff8ac5-5be2-46e4-b5b6-c5c3b1b8a3c3', 'Manage Contract Contingencies', 'Track inspection, appraisal, and financing deadlines', '2025-07-01', 'Urgent', 'Pending', 'Under Contract', 'under-contract', TRUE),
('e4d7bb6d-task-2', 'e4d7bb6d-b87e-428f-9d7b-7b7e4e4bb6e7', 'Monitor Active Listing Performance', 'Track showing activity and market response', '2025-07-01', 'Medium', 'Pending', 'Listing Prep', 'listing-prep', TRUE),
('1d3d8e9f-task-2', '1d3d8e9f-8c2b-4a3c-9e1f-3f3c1d8e9f1f', 'Monitor Active Listing Performance', 'Track showing activity and market response', '2025-07-01', 'Medium', 'Pending', 'Listing Prep', 'listing-prep', TRUE),
('3e2f7a8b-task-1', '3e2f7a8b-9c3d-4e5f-8a2b-7b8c3d5f7a8b', 'Complete Pre-Listing Preparation', 'Property is on hold - complete all pre-listing requirements', '2025-07-01', 'High', 'Pending', 'Listing Prep', 'listing-prep', TRUE),
('4f5g8h9i-task-2', '4f5g8h9i-0j1k-2l3m-4n5o-6p7q8r9s0t1u', 'Monitor Active Listing Performance', 'Track showing activity and market response', '2025-07-01', 'Medium', 'Pending', 'Listing Prep', 'listing-prep', TRUE),
('5g6h9i0j-task-1', '5g6h9i0j-1k2l-3m4n-5o6p-7q8r9s0t1u2v', 'Complete Pre-Listing Preparation', 'Property is on hold - complete all pre-listing requirements', '2025-07-01', 'High', 'Pending', 'Listing Prep', 'listing-prep', TRUE),
('6h7i0j1k-task-2', '6h7i0j1k-2l3m-4n5o-6p7q-8r9s0t1u2v3w', 'Monitor Active Listing Performance', 'Track showing activity and market response', '2025-07-01', 'Medium', 'Pending', 'Listing Prep', 'listing-prep', TRUE),
('7i8j1k2l-task-3', '7i8j1k2l-3m4n-5o6p-7q8r-9s0t1u2v3w4x', 'Manage Contract Contingencies', 'Track inspection, appraisal, and financing deadlines', '2025-07-01', 'Urgent', 'Pending', 'Under Contract', 'under-contract', TRUE),
('8j9k2l3m-task-3', '8j9k2l3m-4n5o-6p7q-8r9s-0t1u2v3w4x5y', 'Manage Contract Contingencies', 'Track inspection, appraisal, and financing deadlines', '2025-07-01', 'Urgent', 'Pending', 'Under Contract', 'under-contract', TRUE),
('9k0l3m4n-task-3', '9k0l3m4n-5o6p-7q8r-9s0t-1u2v3w4x5y6z', 'Manage Contract Contingencies', 'Track inspection, appraisal, and financing deadlines', '2025-07-01', 'Urgent', 'Pending', 'Under Contract', 'under-contract', TRUE),
('0l1m4n5o-task-1', '0l1m4n5o-6p7q-8r9s-0t1u-2v3w4x5y6z7a', 'Complete Pre-Listing Preparation', 'Property is on hold - complete all pre-listing requirements', '2025-07-01', 'High', 'Pending', 'Listing Prep', 'listing-prep', TRUE),
('1m2n5o6p-task-1', '1m2n5o6p-7q8r-9s0t-1u2v-3w4x5y6z7a8b', 'Complete Pre-Listing Preparation', 'Property is on hold - complete all pre-listing requirements', '2025-07-01', 'High', 'Pending', 'Listing Prep', 'listing-prep', TRUE);

-- Create a view for dashboard statistics
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
    COUNT(*) as total_properties,
    COUNT(*) FILTER (WHERE status = 'Active') as active_listings,
    COUNT(*) FILTER (WHERE status = 'Under Contract') as under_contract,
    COUNT(*) FILTER (WHERE status = 'Hold') as on_hold,
    (SELECT COUNT(*) FROM tasks WHERE status = 'Pending') as pending_tasks,
    (SELECT COUNT(*) FROM tasks WHERE priority = 'Urgent' AND status != 'Completed') as urgent_tasks,
    COALESCE(
        (SELECT ROUND(AVG(current_list_price))
         FROM properties 
         WHERE current_list_price IS NOT NULL), 
        0
    ) as avg_list_price
FROM properties;