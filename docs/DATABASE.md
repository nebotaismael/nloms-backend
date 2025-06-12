# Database Documentation

## Overview

The NLOMS database is built on PostgreSQL and provides a comprehensive schema for managing land ownership, registration processes, and related data. The database is designed with data integrity, audit trails, and performance in mind.

## Database Architecture

### Core Principles
- **Data Integrity**: Foreign key constraints and check constraints ensure data consistency
- **Audit Trail**: Complete change tracking for compliance and accountability
- **UUID Support**: Universal unique identifiers for external system integration
- **Performance**: Optimized indexes for common query patterns
- **Security**: Role-based access control and data encryption support

### Schema Overview
```
NLOMS Database Schema
├── Core Tables
│   ├── users (User accounts and profiles)
│   ├── land_parcels (Land registry)
│   ├── land_registrations (Applications)
│   └── certificates (Digital certificates)
├── Supporting Tables
│   ├── documents (File management)
│   ├── audit_logs (Activity tracking)
│   ├── notifications (User notifications)
│   ├── payment_transactions (Payment tracking)
│   └── system_config (System settings)
├── Custom Types (ENUMs)
├── Indexes (Performance optimization)
├── Triggers (Automatic updates)
├── Functions (Business logic)
└── Views (Reporting convenience)
```

## Tables

### Core Tables

#### `users` - User Management
Stores user accounts, profiles, and authentication data.

**Columns:**
- `user_id` (SERIAL PRIMARY KEY) - Auto-incrementing user ID
- `user_uuid` (UUID UNIQUE) - External reference UUID
- `name` (VARCHAR(255)) - Full name
- `email` (VARCHAR(255) UNIQUE) - Email address
- `password_hash` (VARCHAR(255)) - Bcrypt hashed password
- `role` (user_role ENUM) - User role (citizen, official, chief, admin)
- `registration_status` (registration_status ENUM) - Account status
- `phone_number` (VARCHAR(20)) - Contact phone number
- `address` (TEXT) - Physical address
- `national_id` (VARCHAR(50) UNIQUE) - National ID number
- `date_of_birth` (DATE) - Date of birth
- `profile_image_url` (VARCHAR(500)) - Profile image URL
- `email_verified` (BOOLEAN) - Email verification status
- `email_verification_token` (VARCHAR(255)) - Email verification token
- `password_reset_token` (VARCHAR(255)) - Password reset token
- `password_reset_expires` (TIMESTAMPTZ) - Token expiration
- `last_login` (TIMESTAMPTZ) - Last login timestamp
- `failed_login_attempts` (INTEGER) - Failed login counter
- `account_locked_until` (TIMESTAMPTZ) - Account lockout expiration
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Constraints:**
- Email format validation
- Phone number format validation
- National ID minimum length validation
- Password complexity enforced at application level

**Indexes:**
- `idx_users_email` - Email lookup
- `idx_users_role` - Role-based queries
- `idx_users_status` - Status filtering
- `idx_users_created_at` - Chronological sorting

#### `land_parcels` - Land Registry
Comprehensive land parcel information with GIS support.

**Columns:**
- `land_parcel_id` (SERIAL PRIMARY KEY) - Auto-incrementing parcel ID
- `parcel_uuid` (UUID UNIQUE) - External reference UUID
- `parcel_number` (VARCHAR(50) UNIQUE) - Official parcel number
- `location` (TEXT) - Physical location description
- `area` (DECIMAL(12,4)) - Area in hectares
- `land_type` (land_type ENUM) - Type classification
- `coordinates` (POINT) - PostGIS point coordinates
- `latitude` (DECIMAL(10,8)) - Latitude coordinate
- `longitude` (DECIMAL(11,8)) - Longitude coordinate
- `boundaries` (TEXT) - Boundary description
- `status` (parcel_status ENUM) - Current status
- `market_value` (DECIMAL(15,2)) - Estimated market value
- `survey_number` (VARCHAR(100)) - Survey reference number
- `sub_division` (VARCHAR(100)) - Subdivision name
- `village` (VARCHAR(255)) - Village/locality
- `district` (VARCHAR(255)) - District
- `state_province` (VARCHAR(255)) - State/province
- `country` (VARCHAR(100)) - Country (default: Cameroon)
- `elevation` (DECIMAL(8,2)) - Elevation in meters
- `soil_type` (VARCHAR(100)) - Soil classification
- `water_access` (BOOLEAN) - Water access availability
- `electricity_access` (BOOLEAN) - Electricity availability
- `road_access` (BOOLEAN) - Road access availability
- `zoning_classification` (VARCHAR(100)) - Zoning category
- `land_use_restrictions` (TEXT) - Usage restrictions
- `environmental_clearance` (BOOLEAN) - Environmental approval
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Constraints:**
- Area must be positive
- Coordinate validation (latitude: -90 to 90, longitude: -180 to 180)
- Parcel number minimum length

**Indexes:**
- `idx_land_parcels_number` - Parcel number lookup
- `idx_land_parcels_location` - Full-text search on location
- `idx_land_parcels_type` - Type filtering
- `idx_land_parcels_status` - Status filtering
- `idx_land_parcels_coordinates` - Geospatial queries
- `idx_land_parcels_area` - Area-based searches

#### `land_registrations` - Application Workflow
Land registration applications and their processing status.

**Columns:**
- `application_id` (SERIAL PRIMARY KEY) - Auto-incrementing application ID
- `application_uuid` (UUID UNIQUE) - External reference UUID
- `user_id` (INTEGER FK) - Reference to users table
- `land_parcel_id` (INTEGER FK) - Reference to land_parcels table
- `application_type` (application_type ENUM) - Type of application
- `status` (application_status ENUM) - Current processing status
- `submitted_documents` (JSONB) - Array of submitted document references
- `application_fee` (DECIMAL(12,2)) - Required fee amount
- `payment_status` (payment_status ENUM) - Payment status
- `payment_reference` (VARCHAR(255)) - Payment reference number
- `payment_date` (TIMESTAMPTZ) - Payment completion date
- `notes` (TEXT) - Applicant notes
- `applicant_declaration` (TEXT) - Legal declaration
- `witness_details` (JSONB) - Witness information
- `supporting_documents` (JSONB) - Additional documents
- `reviewed_by` (INTEGER FK) - Reference to reviewing official
- `reviewed_at` (TIMESTAMPTZ) - Review completion timestamp
- `review_notes` (TEXT) - Official review notes
- `approval_conditions` (TEXT) - Conditions for approval
- `rejection_reason` (TEXT) - Reason for rejection
- `priority_level` (INTEGER) - Processing priority (1-5)
- `estimated_processing_days` (INTEGER) - Expected processing time
- `actual_processing_days` (INTEGER) - Actual processing time
- `created_at` (TIMESTAMPTZ) - Application submission timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Constraints:**
- One pending application per user per parcel
- Review data validation (approved/rejected applications must have reviewer)
- Priority level range validation (1-5)

**Indexes:**
- `idx_land_registrations_user_id` - User applications
- `idx_land_registrations_parcel_id` - Parcel applications
- `idx_land_registrations_status` - Status filtering
- `idx_land_registrations_type` - Type filtering
- `idx_applications_user_status` - Composite index for user status queries

#### `certificates` - Digital Certificates
Land ownership certificates with security features.

**Columns:**
- `certificate_id` (SERIAL PRIMARY KEY) - Auto-incrementing certificate ID
- `certificate_uuid` (UUID UNIQUE) - External reference UUID
- `certificate_number` (VARCHAR(100) UNIQUE) - Official certificate number
- `land_parcel_id` (INTEGER FK) - Reference to land parcel
- `application_id` (INTEGER FK) - Reference to source application
- `issued_by` (INTEGER FK) - Reference to issuing official
- `issued_date` (TIMESTAMPTZ) - Issuance date
- `expiry_date` (TIMESTAMPTZ) - Certificate expiration
- `status` (certificate_status ENUM) - Current status
- `certificate_hash` (VARCHAR(256)) - SHA-256 hash for verification
- `qr_code_url` (VARCHAR(500)) - QR code image URL
- `pdf_url` (VARCHAR(500)) - Certificate PDF URL
- `blockchain_hash` (VARCHAR(256)) - Blockchain reference (future use)
- `digital_signature` (TEXT) - Digital signature
- `verification_code` (VARCHAR(50) UNIQUE) - Public verification code
- `revocation_reason` (TEXT) - Reason for revocation
- `revoked_by` (INTEGER FK) - Reference to revoking official
- `revoked_at` (TIMESTAMPTZ) - Revocation timestamp
- `metadata` (JSONB) - Additional certificate data
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Constraints:**
- Expiry date must be after issue date
- Revocation data validation

**Indexes:**
- `idx_certificates_number` - Certificate number lookup
- `idx_certificates_verification_code` - Public verification
- `idx_certificates_parcel_id` - Parcel certificates
- `idx_certificates_status` - Status filtering

### Supporting Tables

#### `documents` - File Management
Document upload and verification tracking.

#### `audit_logs` - Activity Tracking
Comprehensive audit trail for all system activities.

#### `notifications` - User Notifications
System notifications and alerts.

#### `payment_transactions` - Payment Processing
Payment tracking and transaction records.

#### `system_config` - Configuration Management
System-wide configuration settings.

## Custom Types (ENUMs)

### `user_role`
- `citizen` - Regular citizens applying for land registration
- `official` - Government officials processing applications
- `chief` - Traditional chiefs with local authority
- `admin` - System administrators

### `registration_status`
- `pending` - Account pending verification
- `verified` - Account verified and active
- `suspended` - Account temporarily suspended

### `land_type`
- `residential` - Residential property
- `commercial` - Commercial property
- `agricultural` - Agricultural land
- `industrial` - Industrial property

### `parcel_status`
- `available` - Available for registration
- `registered` - Currently registered to an owner
- `disputed` - Under dispute
- `under_review` - Under administrative review

### `application_type`
- `registration` - Initial land registration
- `transfer` - Ownership transfer
- `subdivision` - Land subdivision
- `mutation` - Property mutation

### `application_status`
- `pending` - Submitted and awaiting review
- `under_review` - Currently being reviewed
- `approved` - Application approved
- `rejected` - Application rejected
- `cancelled` - Application cancelled

### `payment_status`
- `pending` - Payment pending
- `paid` - Payment completed
- `failed` - Payment failed
- `refunded` - Payment refunded

### `certificate_status`
- `active` - Certificate active and valid
- `revoked` - Certificate revoked
- `expired` - Certificate expired

## Database Functions

### `update_updated_at_column()`
Automatically updates the `updated_at` timestamp when records are modified.

### `calculate_processing_days()`
Automatically calculates actual processing time when applications are approved or rejected.

## Triggers

- **Timestamp Updates**: Automatic `updated_at` timestamp updates on all core tables
- **Processing Time Calculation**: Automatic calculation of application processing time

## Views

### `active_certificates`
Combines certificate, land parcel, and owner information for active certificates.

### `pending_applications`
Comprehensive view of pending applications with applicant and parcel details.

## Indexes and Performance

### Full-Text Search
- Land parcel location search with PostgreSQL full-text search capabilities
- Combined location, village, and district search

### Composite Indexes
- `idx_applications_user_status` - User applications by status
- `idx_applications_parcel_status` - Parcel applications by status
- `idx_certificates_parcel_status` - Parcel certificates by status

### Geographic Indexes
- Coordinate-based searches for geospatial queries
- Support for proximity searches and boundary queries

## Data Relationships

```
users (1) ----< land_registrations (M) >---- (1) land_parcels
  |                     |
  |                     |
  v                     v
audit_logs         certificates
  |                     |
  |                     |
  v                     v
notifications      documents
```

## Backup and Recovery

### Automated Backups
- Daily automated backups via Heroku PostgreSQL
- Point-in-time recovery available
- Backup retention: 30 days

### Manual Backup Commands
```sql
-- Create backup
pg_dump $DATABASE_URL > backup.sql

-- Restore backup
psql $DATABASE_URL < backup.sql
```

## Migration Management

### Schema Versioning
- Database migrations managed through `scripts/migrate.js`
- Version tracking in schema
- Rollback procedures documented

### Migration Files
- `migrations/init.sql` - Complete initial schema
- Future migrations will be numbered sequentially

## Security Considerations

### Access Control
- Role-based database access (planned)
- Row-level security for multi-tenant features (future)
- Encrypted sensitive data fields

### Data Protection
- Password hashing with bcrypt
- PII data handling compliance
- Audit trail for all data access

### Compliance
- Data retention policies
- GDPR-like privacy considerations
- Government record-keeping requirements

## Monitoring and Maintenance

### Performance Monitoring
- Query performance tracking
- Index usage analysis
- Connection pool monitoring

### Maintenance Tasks
- Regular VACUUM and ANALYZE
- Index rebuild as needed
- Statistics updates

## Development Guidelines

### Naming Conventions
- Tables: snake_case (e.g., `land_parcels`)
- Columns: snake_case (e.g., `user_id`)
- Indexes: `idx_tablename_columnname`
- Foreign Keys: `fk_tablename_columnname`

### Data Types
- Use appropriate PostgreSQL data types
- DECIMAL for monetary values
- TIMESTAMPTZ for all timestamps
- JSONB for flexible schema data

### Best Practices
- Always use foreign key constraints
- Add check constraints for data validation
- Use indexes for frequently queried columns
- Document complex queries and functions
