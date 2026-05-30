# Proofsy API Contract

This document defines the strict API contract for Phase 2 backend development. The frontend (Next.js) relies entirely on these exact routes, request bodies, and response structures.

**Base URL**: `/api`
**Content-Type**: `application/json` (except for file uploads)

---

## 1. Events

### Create Event
Creates a new event to which certificates will be linked.

**Endpoint**: `POST /events`

**Request Body**:
```json
{
  "name": "string",
  "date": "string (ISO 8601)",
  "organizerName": "string"
}
```

**Success Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "string (uuid)",
    "name": "string",
    "date": "string",
    "organizerName": "string",
    "createdAt": "string"
  }
}
```

---

## 2. Certificates

### Generate Certificates (Bulk Upload)
Accepts an Event ID and a CSV file, and triggers the background generation of certificates.

**Endpoint**: `POST /certificates/generate`
**Content-Type**: `multipart/form-data`

**Request Form Data**:
- `eventId`: "string (uuid)"
- `file`: CSV file (columns: `name`, `email`)

**Success Response (202 Accepted)**:
```json
{
  "success": true,
  "message": "Certificate generation job queued successfully.",
  "data": {
    "jobId": "string",
    "totalRowsProcessed": "number"
  }
}
```

---

## 3. Users

### Get User Certificates
Retrieves all certificates across all events for a specific user (identified by email).

**Endpoint**: `GET /users/:email/certificates`

**Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "name": "string",
      "email": "string"
    },
    "totalEventsAttended": "number",
    "certificates": [
      {
        "id": "string (uuid)",
        "eventId": "string",
        "eventName": "string",
        "eventDate": "string",
        "verificationCode": "string",
        "pdfUrl": "string",
        "issuedAt": "string"
      }
    ]
  }
}
```

---

## 4. Verification

### Verify Certificate
Public endpoint to verify if a given code corresponds to a valid certificate.

**Endpoint**: `GET /verify/:code`

**Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "certificate": {
      "recipientName": "string",
      "eventName": "string",
      "eventDate": "string",
      "issuedAt": "string",
      "pdfUrl": "string"
    }
  }
}
```

**Error Response (404 Not Found - Invalid Code)**:
```json
{
  "success": false,
  "error": "Invalid verification code or certificate not found."
}
```
