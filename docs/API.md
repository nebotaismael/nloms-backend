# API Documentation

## Overview

The NLOMS API is a RESTful service that provides endpoints for managing land ownership and registration processes in Cameroon. All endpoints use JSON for request and response bodies.

## Base URLs

- **Development**: `http://localhost:8080/api`
- **Production**: `https://nloms-backend-e20d376292bc.herokuapp.com/api`

## Authentication

### JWT Token Authentication

Most endpoints require authentication via JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Getting a Token

1. **Register a new user** (POST `/auth/register`)
2. **Login** (POST `/auth/login`) to receive access and refresh tokens
3. **Refresh tokens** (POST `/auth/refresh`) when access token expires

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 5 requests per 15 minutes per IP

## Response Format

All API responses follow this structure:

```json
{
  "success": true|false,
  "message": "Description of the operation",
  "data": {
    // Response data
  },
  "pagination": {
    // Pagination info for list endpoints
    "page": 1,
    "limit": 20,
    "totalItems": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Error Responses

Error responses include appropriate HTTP status codes and detailed error information:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Endpoints

### Authentication (`/auth`)

#### POST `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "citizen",
  "phone_number": "+237123456789",
  "address": "123 Main St, Douala"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "user_id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "citizen",
      "registration_status": "pending"
    },
    "token": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

#### POST `/auth/login`
Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### POST `/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

#### GET `/auth/profile`
Get current user profile (requires authentication).

#### PUT `/auth/change-password`
Change user password (requires authentication).

### Users (`/users`)

#### GET `/users`
List all users (Admin/Official only).

**Query Parameters:**
- `role`: Filter by role (citizen, official, chief, admin)
- `status`: Filter by registration status
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

#### GET `/users/:id`
Get user details by ID.

#### PUT `/users/:id`
Update user information.

#### PUT `/users/:id/status`
Update user registration status (Official+ only).

### Land Parcels (`/land/parcels`)

#### POST `/land/parcels`
Create a new land parcel (Official/Chief/Admin only).

**Request Body:**
```json
{
  "parcel_number": "LP-2025-001",
  "location": "Block 5, Bonanjo, Douala",
  "area": 2.5,
  "land_type": "residential",
  "coordinates": "4.0511,-9.7679",
  "boundaries": "North: Main Road, South: River",
  "market_value": 50000000
}
```

#### GET `/land/parcels`
Search and list land parcels.

**Query Parameters:**
- `parcel_number`: Search by parcel number
- `location`: Search by location
- `land_type`: Filter by type (residential, commercial, agricultural, industrial)
- `status`: Filter by status (available, registered, disputed)
- `owner_name`: Search by owner name
- `page`: Page number
- `limit`: Items per page

#### GET `/land/parcels/:id`
Get detailed information about a specific land parcel.

### Applications (`/land/applications`)

#### POST `/land/applications`
Submit a new land registration application.

**Request Body:**
```json
{
  "land_parcel_id": 1,
  "application_type": "registration",
  "notes": "Initial registration for residential development"
}
```

#### GET `/land/applications`
Get applications (user's own or all for officials).

**Query Parameters:**
- `status`: Filter by status (pending, approved, rejected, under_review)
- `application_type`: Filter by type
- `page`: Page number
- `limit`: Items per page

#### GET `/land/applications/:id`
Get detailed application information.

### Admin (`/admin`)

#### PUT `/admin/applications/:id/review`
Review and approve/reject an application (Official+ only).

**Request Body:**
```json
{
  "action": "approve|reject",
  "review_notes": "Application review notes",
  "approval_conditions": "Conditions for approval (if applicable)"
}
```

#### GET `/admin/dashboard`
Get administrative dashboard data (Official+ only).

#### POST `/admin/backup`
Create system backup (Admin only).

#### GET `/admin/reports/activity`
Get system activity reports (Official+ only).

### Statistics (`/land/stats`)

#### GET `/land/stats`
Get land management statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "parcels": {
      "total_parcels": "150",
      "available_parcels": "45",
      "registered_parcels": "90",
      "disputed_parcels": "15",
      "total_area": "1250.75",
      "average_area": "8.34"
    },
    "applications": {
      "total_applications": "200",
      "pending_applications": "25",
      "approved_applications": "160",
      "rejected_applications": "15"
    }
  }
}
```

## Data Models

### User
```json
{
  "user_id": 1,
  "user_uuid": "uuid-string",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "citizen|official|chief|admin",
  "registration_status": "pending|verified|suspended",
  "phone_number": "+237123456789",
  "address": "123 Main St",
  "created_at": "2025-06-12T10:00:00Z",
  "updated_at": "2025-06-12T10:00:00Z"
}
```

### Land Parcel
```json
{
  "land_parcel_id": 1,
  "parcel_uuid": "uuid-string",
  "parcel_number": "LP-2025-001",
  "location": "Block 5, Bonanjo, Douala",
  "area": 2.5,
  "land_type": "residential|commercial|agricultural|industrial",
  "status": "available|registered|disputed|under_review",
  "coordinates": "4.0511,-9.7679",
  "boundaries": "Boundary description",
  "market_value": 50000000,
  "created_at": "2025-06-12T10:00:00Z"
}
```

### Application
```json
{
  "application_id": 1,
  "application_uuid": "uuid-string",
  "user_id": 1,
  "land_parcel_id": 1,
  "application_type": "registration|transfer|subdivision|mutation",
  "status": "pending|under_review|approved|rejected|cancelled",
  "application_fee": 75000,
  "payment_status": "pending|paid|failed|refunded",
  "notes": "Application notes",
  "created_at": "2025-06-12T10:00:00Z"
}
```

## Interactive Documentation

For complete, interactive API documentation with request/response examples and the ability to test endpoints, visit:

- **Development**: http://localhost:8080/api-docs
- **Production**: https://nloms-backend-e20d376292bc.herokuapp.com/api-docs

## SDK and Client Libraries

Currently, the API is designed to be consumed by any HTTP client. Official SDKs are planned for:

- JavaScript/TypeScript
- Python
- PHP
- Mobile (React Native)

## Webhooks

Webhook support is planned for future releases to notify external systems of application status changes and certificate issuance.

## Versioning

The current API version is v1. Future versions will be available at `/api/v2`, etc., with appropriate deprecation notices.

## Support

For API support:
- Email: nebota.ismael@example.com
- GitHub Issues: https://github.com/nebotaismael/nloms-backend/issues
- Documentation: https://github.com/nebotaismael/nloms-backend/wiki
