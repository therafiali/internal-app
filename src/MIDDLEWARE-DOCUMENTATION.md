# Middleware Documentation

This document provides a comprehensive overview of all middleware functions in the Techmile backend application.

## Table of Contents
1. [Authentication Middleware](#authentication-middleware)
2. [Role Check Middleware](#role-check-middleware)
3. [Logger Middleware](#logger-middleware)

Let's dive into each middleware's functionality and purpose.

## Authentication Middleware

File: `auth.js`

This middleware provides authentication and authorization functionality using JSON Web Tokens (JWT) and role-based access control.

### Dependencies
```javascript
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
```

### Middleware Functions

#### 1. Authentication Middleware
```javascript
exports.auth = async (req, res, next) => { ... }
```
- **Purpose**: Validates JWT token and loads user information
- **Process**:
  1. Extracts token from Authorization header
  2. Verifies token using JWT_SECRET
  3. Retrieves user from database
  4. Checks account status
  5. Attaches user to request object
- **Error Handling**:
  - No token: 401 Unauthorized
  - Invalid token: 401 Unauthorized
  - User not found: 401 Unauthorized
  - Disabled account: 403 Forbidden
- **Usage**: Protects routes requiring authentication

#### 2. Admin Check Middleware
```javascript
exports.isAdmin = async (req, res, next) => { ... }
```
- **Purpose**: Validates admin privileges
- **Requirements**:
  - User must be authenticated
  - Department must be 'Admin'
  - Role must be 'Admin' or 'Executive'
- **Error Handling**:
  - Not authenticated: 401 Unauthorized
  - Not admin: 403 Forbidden
  - Server error: 500 Internal Server Error
- **Usage**: Protects admin-only routes

#### 3. Role Authorization Middleware
```javascript
exports.authorize = (...roles) => { ... }
```
- **Purpose**: Role-based access control
- **Parameters**: Array of allowed roles
- **Process**:
  1. Checks if user's role is in allowed roles
  2. Allows/denies access accordingly
- **Error Handling**:
  - Invalid role: 403 Forbidden
- **Usage**: Restricts routes to specific roles
- **Example**:
  ```javascript
  router.get('/admin-route', auth, authorize('Admin', 'Executive'), handler);
  ```

#### 4. Department Check Middleware
```javascript
exports.checkDepartment = (...departments) => { ... }
```
- **Purpose**: Department-based access control
- **Parameters**: Array of allowed departments
- **Process**:
  1. Allows Admin department by default
  2. Checks if user's department is allowed
  3. Allows/denies access accordingly
- **Error Handling**:
  - Invalid department: 403 Forbidden
- **Usage**: Restricts routes to specific departments
- **Example**:
  ```javascript
  router.get('/finance-route', auth, checkDepartment('Finance'), handler);
  ```

### Features
1. Token Management:
   - JWT validation
   - Token extraction
   - Secure verification
   - Error handling

2. User Validation:
   - Database lookup
   - Status checking
   - Account validation
   - User attachment

3. Access Control:
   - Role-based access
   - Department-based access
   - Admin privileges
   - Granular permissions

### Security Measures
- Token verification
- Account status check
- Role validation
- Department validation
- Error handling

### Integration
- JWT system
- User model
- Role system
- Department system
- Error handling

### Usage Examples
```javascript
// Basic authentication
router.get('/protected', auth, handler);

// Admin-only route
router.get('/admin', auth, isAdmin, handler);

// Role-specific route
router.get('/manager', auth, authorize('Manager'), handler);

// Department-specific route
router.get('/finance', auth, checkDepartment('Finance'), handler);

// Combined middleware
router.get('/secure', auth, isAdmin, checkDepartment('Finance'), handler);
```

--- 

## Role Check Middleware

File: `checkRole.js`

This middleware provides a combined role and department-based access control system for routes.

### Function Signature
```javascript
const checkRole = (allowedRoles, allowedDepartments) => { ... }
```

### Parameters
- **allowedRoles**: Array of roles that can access the route
- **allowedDepartments**: Array of departments that can access the route

### Process Flow
1. **Authentication Check**:
   - Verifies user object exists in request
   - Returns 401 if not authenticated

2. **Admin Override**:
   - Users from Admin department bypass all checks
   - Provides administrative access control

3. **Department Validation**:
   - Checks if user's department is in allowed list
   - Returns 403 if department not allowed
   - Includes helpful error message with allowed departments

4. **Role Validation**:
   - Checks if user's role is in allowed list
   - Returns 403 if role not allowed
   - Includes helpful error message with allowed roles

### Error Handling
- **401 Unauthorized**:
  - When user is not authenticated
  - Message: "Authentication required"

- **403 Forbidden**:
  - When department access is denied
  - Message includes allowed departments
  - When role access is denied
  - Message includes allowed roles

- **500 Internal Server Error**:
  - For unexpected errors
  - Includes error message in response

### Features
1. **Combined Access Control**:
   - Single middleware for both role and department checks
   - Hierarchical checking (department before role)
   - Admin department override

2. **Flexible Configuration**:
   - Arrays for multiple allowed roles
   - Arrays for multiple allowed departments
   - Easy to extend for new roles/departments

3. **User-Friendly Errors**:
   - Clear error messages
   - Includes allowed values in messages
   - Proper HTTP status codes

### Usage Examples
```javascript
// Single role and department
router.get('/finance-manager', 
  checkRole(['Manager'], ['Finance']));

// Multiple roles and departments
router.get('/report-access', 
  checkRole(['Analyst', 'Manager'], ['Finance', 'Accounting']));

// Admin-only route
router.get('/admin-route', 
  checkRole(['Admin'], ['Admin']));

// Combined with auth middleware
router.get('/protected', 
  auth, 
  checkRole(['Manager'], ['Finance']), 
  handler);
```

### Integration Points
- Works with authentication middleware
- Requires user object with role and department
- Compatible with Express.js routing
- Supports existing role/department system

### Best Practices
1. Always use with authentication middleware
2. Define role/department arrays as constants
3. Keep role and department lists synchronized
4. Use descriptive error messages
5. Handle errors appropriately

--- 

## Logger Middleware

File: `logger.js`

This middleware provides basic request logging functionality for the application.

### Function Signature
```javascript
const logger = (req, res, next) => { ... }
```

### Functionality
- Logs each incoming HTTP request
- Records timestamp in ISO format
- Captures HTTP method
- Records requested URL path
- Uses console.log for output

### Log Format
```
YYYY-MM-DDTHH:mm:ss.sssZ - METHOD /path/to/resource
```

Example:
```
2024-03-14T10:30:45.123Z - GET /api/users
2024-03-14T10:31:12.456Z - POST /api/auth/login
```

### Features
1. **Request Tracking**:
   - Timestamps for request timing
   - HTTP method identification
   - URL path tracking
   - Chronological request history

2. **Debugging Support**:
   - Real-time request monitoring
   - Request pattern analysis
   - Performance tracking
   - Issue identification

3. **Simple Implementation**:
   - Lightweight design
   - No external dependencies
   - Minimal overhead
   - Easy to extend

### Usage
```javascript
const express = require('express');
const logger = require('./middleware/logger');

const app = express();

// Apply globally to all routes
app.use(logger);

// Or apply to specific routes
app.use('/api', logger);
```

### Best Practices
1. Use in development environment
2. Consider adding request body logging
3. Add error handling if needed
4. Consider log rotation
5. Add request ID for tracking

### Potential Enhancements
1. Log request body data
2. Add response status codes
3. Include response time
4. Add error logging
5. Support different log levels
6. Add log file output
7. Include user information
8. Add request correlation IDs

--- 