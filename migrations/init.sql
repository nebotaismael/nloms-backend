-- NLOMS Database Schema - Complete Migration
-- National Land Ownership Management System
-- Created: 2025-06-12
-- Author: Nebota Ismael

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('citizen', 'official', 'chief', 'admin');
CREATE TYPE registration_status AS ENUM ('pending', 'verified', 'suspended');
CREATE TYPE land_type AS ENUM ('residential', 'commercial', 'agricultural', 'industrial');
CREATE TYPE parcel_status AS ENUM ('available', 'registered', 'disputed', 'under_review');
CREATE TYPE application_type AS ENUM ('registration', 'transfer', 'subdivision', 'mutation');
CREATE TYPE application_status AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE certificate_status AS ENUM ('active', 'revoked', 'expired');

-- Users table with comprehensive fields
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    user_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM(name)) >= 2),
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'citizen',
    registration_status registration_status NOT NULL DEFAULT 'pending',
    phone_number VARCHAR(20) CHECK (phone_number IS NULL OR LENGTH(TRIM(phone_number)) >= 10),
    address TEXT,
    national_id VARCHAR(50) UNIQUE,
    date_of_birth DATE,
    profile_image_url VARCHAR(500),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_phone_format CHECK (
        phone_number IS NULL OR 
        phone_number ~ '^\+?[1-9]\d{1,14}$'
    ),
    CONSTRAINT valid_national_id CHECK (
        national_id IS NULL OR 
        LENGTH(TRIM(national_id)) >= 5
    )
);

-- Land parcels table with GIS support
CREATE TABLE land_parcels (
    land_parcel_id SERIAL PRIMARY KEY,
    parcel_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    parcel_number VARCHAR(50) UNIQUE NOT NULL CHECK (LENGTH(TRIM(parcel_number)) >= 3),
    location TEXT NOT NULL CHECK (LENGTH(TRIM(location)) >= 5),
    area DECIMAL(12,4) NOT NULL CHECK (area > 0),
    land_type land_type NOT NULL,
    coordinates POINT, -- PostGIS point for exact coordinates
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    boundaries TEXT,
    status parcel_status NOT NULL DEFAULT 'available',
    market_value DECIMAL(15,2) CHECK (market_value IS NULL OR market_value >= 0),
    survey_number VARCHAR(100),
    sub_division VARCHAR(100),
    village VARCHAR(255),
    district VARCHAR(255),
    state_province VARCHAR(255),
    country VARCHAR(100) DEFAULT 'Cameroon',
    elevation DECIMAL(8,2), -- meters above sea level
    soil_type VARCHAR(100),
    water_access BOOLEAN DEFAULT FALSE,
    electricity_access BOOLEAN DEFAULT FALSE,
    road_access BOOLEAN DEFAULT FALSE,
    zoning_classification VARCHAR(100),
    land_use_restrictions TEXT,
    environmental_clearance BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_coordinates CHECK (
        (latitude IS NULL AND longitude IS NULL) OR 
        (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    )
);

-- Land registration applications
CREATE TABLE land_registrations (
    application_id SERIAL PRIMARY KEY,
    application_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    land_parcel_id INTEGER NOT NULL REFERENCES land_parcels(land_parcel_id) ON DELETE CASCADE,
    application_type application_type NOT NULL,
    status application_status NOT NULL DEFAULT 'pending',
    submitted_documents JSONB DEFAULT '[]'::jsonb,
    application_fee DECIMAL(12,2) NOT NULL CHECK (application_fee >= 0),
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_reference VARCHAR(255),
    payment_date TIMESTAMPTZ,
    notes TEXT,
    applicant_declaration TEXT,
    witness_details JSONB,
    supporting_documents JSONB DEFAULT '[]'::jsonb,
    reviewed_by INTEGER REFERENCES users(user_id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    approval_conditions TEXT,
    rejection_reason TEXT,
    priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),
    estimated_processing_days INTEGER DEFAULT 30,
    actual_processing_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_pending_application UNIQUE (user_id, land_parcel_id, status) 
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT valid_review_data CHECK (
        (status IN ('pending', 'under_review') AND reviewed_by IS NULL) OR
        (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);

-- Digital certificates
CREATE TABLE certificates (
    certificate_id SERIAL PRIMARY KEY,
    certificate_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    land_parcel_id INTEGER NOT NULL REFERENCES land_parcels(land_parcel_id) ON DELETE RESTRICT,
    application_id INTEGER NOT NULL REFERENCES land_registrations(application_id) ON DELETE RESTRICT,
    issued_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    issued_date TIMESTAMPTZ DEFAULT NOW(),
    expiry_date TIMESTAMPTZ,
    status certificate_status NOT NULL DEFAULT 'active',
    certificate_hash VARCHAR(256) NOT NULL, -- SHA-256 hash for verification
    qr_code_url VARCHAR(500),
    pdf_url VARCHAR(500),
    blockchain_hash VARCHAR(256), -- For future blockchain integration
    digital_signature TEXT,
    verification_code VARCHAR(50) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    revocation_reason TEXT,
    revoked_by INTEGER REFERENCES users(user_id),
    revoked_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_expiry CHECK (expiry_date IS NULL OR expiry_date > issued_date),
    CONSTRAINT valid_revocation CHECK (
        (status = 'revoked' AND revoked_by IS NOT NULL AND revoked_at IS NOT NULL) OR
        (status != 'revoked' AND revoked_by IS NULL AND revoked_at IS NULL)
    )
);

-- Document management
CREATE TABLE documents (
    document_id SERIAL PRIMARY KEY,
    document_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    application_id INTEGER REFERENCES land_registrations(application_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    cloudinary_public_id VARCHAR(255),
    file_size INTEGER CHECK (file_size > 0),
    mime_type VARCHAR(100),
    file_hash VARCHAR(256), -- For integrity verification
    upload_status VARCHAR(50) DEFAULT 'pending',
    verification_status VARCHAR(50) DEFAULT 'pending',
    verified_by INTEGER REFERENCES users(user_id),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    retention_period_years INTEGER DEFAULT 7,
    deletion_scheduled_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs for comprehensive tracking
CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,
    log_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_url TEXT,
    response_status INTEGER,
    processing_time_ms INTEGER,
    severity VARCHAR(20) DEFAULT 'info',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_severity CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical'))
);

-- Notifications system
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    notification_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url VARCHAR(500),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_notification_type CHECK (
        type IN ('info', 'success', 'warning', 'error', 'reminder')
    )
);

-- System configuration
CREATE TABLE system_config (
    config_id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    updated_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_config_type CHECK (
        config_type IN ('string', 'number', 'boolean', 'json', 'encrypted')
    )
);

-- Payment transactions
CREATE TABLE payment_transactions (
    transaction_id SERIAL PRIMARY KEY,
    transaction_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    application_id INTEGER NOT NULL REFERENCES land_registrations(application_id) ON DELETE RESTRICT,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'XAF',
    payment_method VARCHAR(50),
    payment_gateway VARCHAR(100),
    gateway_transaction_id VARCHAR(255),
    gateway_reference VARCHAR(255),
    status payment_status NOT NULL DEFAULT 'pending',
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_currency CHECK (currency IN ('XAF', 'USD', 'EUR')),
    CONSTRAINT valid_payment_status_timing CHECK (
        (status = 'paid' AND completed_at IS NOT NULL) OR
        (status = 'failed' AND failed_at IS NOT NULL) OR
        (status IN ('pending', 'refunded'))
    )
);

-- Create indexes for optimal performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(registration_status);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_land_parcels_number ON land_parcels(parcel_number);
CREATE INDEX idx_land_parcels_location ON land_parcels USING GIN(to_tsvector('english', location));
CREATE INDEX idx_land_parcels_type ON land_parcels(land_type);
CREATE INDEX idx_land_parcels_status ON land_parcels(status);
CREATE INDEX idx_land_parcels_coordinates ON land_parcels(latitude, longitude);
CREATE INDEX idx_land_parcels_area ON land_parcels(area);

CREATE INDEX idx_land_registrations_user_id ON land_registrations(user_id);
CREATE INDEX idx_land_registrations_parcel_id ON land_registrations(land_parcel_id);
CREATE INDEX idx_land_registrations_status ON land_registrations(status);
CREATE INDEX idx_land_registrations_type ON land_registrations(application_type);
CREATE INDEX idx_land_registrations_created_at ON land_registrations(created_at);
CREATE INDEX idx_land_registrations_payment_status ON land_registrations(payment_status);

CREATE INDEX idx_certificates_number ON certificates(certificate_number);
CREATE INDEX idx_certificates_parcel_id ON certificates(land_parcel_id);
CREATE INDEX idx_certificates_status ON certificates(status);
CREATE INDEX idx_certificates_verification_code ON certificates(verification_code);
CREATE INDEX idx_certificates_issued_date ON certificates(issued_date);

CREATE INDEX idx_documents_application_id ON documents(application_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_upload_status ON documents(upload_status);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_payment_transactions_application_id ON payment_transactions(application_id);
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_gateway_ref ON payment_transactions(gateway_reference);

-- Create full-text search indexes
CREATE INDEX idx_land_parcels_fulltext ON land_parcels 
    USING GIN(to_tsvector('english', location || ' ' || COALESCE(village, '') || ' ' || COALESCE(district, '')));

-- Create composite indexes for common queries
CREATE INDEX idx_applications_user_status ON land_registrations(user_id, status);
CREATE INDEX idx_applications_parcel_status ON land_registrations(land_parcel_id, status);
CREATE INDEX idx_certificates_parcel_status ON certificates(land_parcel_id, status);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_land_parcels_updated_at BEFORE UPDATE ON land_parcels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_land_registrations_updated_at BEFORE UPDATE ON land_registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON certificates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate application processing days
CREATE OR REPLACE FUNCTION calculate_processing_days()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('approved', 'rejected') AND OLD.status NOT IN ('approved', 'rejected') THEN
        NEW.actual_processing_days = EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 86400;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_application_processing_days BEFORE UPDATE ON land_registrations
    FOR EACH ROW EXECUTE FUNCTION calculate_processing_days();

-- Insert default system configuration
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('application_fee_base', '50000', 'number', 'Base application fee in XAF'),
('application_fee_residential_multiplier', '1.0', 'number', 'Multiplier for residential land'),
('application_fee_commercial_multiplier', '2.0', 'number', 'Multiplier for commercial land'),
('application_fee_agricultural_multiplier', '0.5', 'number', 'Multiplier for agricultural land'),
('application_fee_industrial_multiplier', '1.5', 'number', 'Multiplier for industrial land'),
('certificate_validity_years', '99', 'number', 'Certificate validity period in years'),
('max_file_upload_size_mb', '10', 'number', 'Maximum file upload size in MB'),
('audit_log_retention_days', '2555', 'number', 'Audit log retention period in days (7 years)'),
('notification_retention_days', '90', 'number', 'Notification retention period in days'),
('email_verification_required', 'true', 'boolean', 'Whether email verification is required'),
('backup_retention_days', '30', 'number', 'Backup retention period in days'),
('system_maintenance_mode', 'false', 'boolean', 'System maintenance mode flag');

-- Insert default admin user (password: AdminPass123!)
INSERT INTO users (name, email, password_hash, role, registration_status, email_verified) VALUES
('System Administrator', 'admin@nloms.gov.cm', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsG/.2YF.', 'admin', 'verified', true);

-- Create views for common queries
CREATE VIEW active_certificates AS
SELECT 
    c.*,
    lp.parcel_number,
    lp.location,
    lp.area,
    lp.land_type,
    u.name as owner_name,
    u.email as owner_email
FROM certificates c
JOIN land_parcels lp ON c.land_parcel_id = lp.land_parcel_id
JOIN land_registrations lr ON c.application_id = lr.application_id
JOIN users u ON lr.user_id = u.user_id
WHERE c.status = 'active';

CREATE VIEW pending_applications AS
SELECT 
    lr.*,
    lp.parcel_number,
    lp.location,
    lp.area,
    lp.land_type,
    u.name as applicant_name,
    u.email as applicant_email,
    u.phone_number as applicant_phone
FROM land_registrations lr
JOIN land_parcels lp ON lr.land_parcel_id = lp.land_parcel_id
JOIN users u ON lr.user_id = u.user_id
WHERE lr.status = 'pending';

-- Grant permissions (commented out for Heroku deployment)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nloms_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nloms_app_user;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO nloms_read_user;

-- Create database user roles (run these separately with appropriate privileges)
-- CREATE ROLE nloms_app_user WITH LOGIN PASSWORD 'secure_app_password';
-- CREATE ROLE nloms_read_user WITH LOGIN PASSWORD 'secure_read_password';

-- Final schema validation
DO $$
BEGIN
    RAISE NOTICE 'NLOMS Database Schema Migration Completed Successfully!';
    RAISE NOTICE 'Created tables: %', (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public');
    RAISE NOTICE 'Created indexes: %', (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public');
    RAISE NOTICE 'Created functions: %', (SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public');
END $$;