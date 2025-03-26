# Routes Documentation

This document provides a comprehensive overview of all routes in the Techmile backend application.

## Table of Contents
1. [Activity Logs Routes](#activity-logs-routes)
2. [Authentication Routes](#authentication-routes)
3. [Company Tag Routes](#company-tag-routes)
4. [Feedback Routes](#feedback-routes)
5. [Player Routes](#player-routes)
6. [Promotion Routes](#promotion-routes)
7. [Recharge Routes](#recharge-routes)
8. [Referral Routes](#referral-routes)
9. [Reset Password Routes](#reset-password-routes)
10. [Index Routes](#index-routes)

Let's dive into each route's functionality and purpose.

## Activity Logs Routes

File: `activityLogs.js`

This router handles all activity logging related endpoints, including retrieving logs, summaries, trends, and reports.

### Base URL
```
/api/activity
```

### Middleware
- `apiLimiter`: Rate limiting for all routes
- `auth`: Authentication middleware for protected routes

### Routes

#### 1. Add Activity Log
```javascript
POST /add
```
- **Purpose**: Creates a new activity log entry
- **Auth**: Required
- **Controller**: `addActivityLog`
- **Usage**: Records system activities and user actions

#### 2. Get Activity Logs
```javascript
GET /logs
```
- **Purpose**: Retrieves activity logs with pagination and filtering
- **Auth**: Required
- **Controller**: `getActivityLogs`
- **Features**:
  - Pagination support
  - Filtering options
  - Sorting capabilities

#### 3. Get Agent Logs
```javascript
GET /agent/:agentId
```
- **Purpose**: Retrieves logs for a specific agent
- **Auth**: Required
- **Controller**: `getAgentLogs`
- **Parameters**:
  - `agentId`: ID of the agent to get logs for

#### 4. Get Activity Summary
```javascript
GET /summary
```
- **Purpose**: Retrieves activity summary for dashboard
- **Auth**: Required
- **Controller**: `getActivitySummary`
- **Usage**: Dashboard statistics and overview

#### 5. Get Activity Trends
```javascript
GET /trends
```
- **Purpose**: Retrieves activity trends over time
- **Auth**: Required
- **Controller**: `getActivityTrends`
- **Usage**: Analytics and trend analysis

#### 6. Export Logs
```javascript
GET /export
```
- **Purpose**: Exports activity logs to CSV format
- **Auth**: Required
- **Controller**: `exportLogs`
- **Usage**: Data export and reporting

#### 7. Get Security Report
```javascript
GET /security-report
```
- **Purpose**: Retrieves security-related activity report
- **Auth**: Required
- **Controller**: `getSecurityReport`
- **Usage**: Security monitoring and analysis

#### 8. Get Resource Usage Report
```javascript
GET /resource-report
```
- **Purpose**: Retrieves system resource usage report
- **Auth**: Required
- **Controller**: `getResourceUsageReport`
- **Usage**: System performance monitoring

### Features
1. Activity Tracking:
   - User actions
   - System events
   - Security events
   - Resource usage

2. Reporting:
   - Activity summaries
   - Trend analysis
   - Security reports
   - Resource monitoring

3. Data Export:
   - CSV format
   - Filtered data
   - Custom date ranges
   - Detailed logs

### Security
- Rate limiting
- Authentication required
- Role-based access
- Secure data handling

### Integration
- Authentication system
- User management
- System monitoring
- Analytics platform

## Authentication Routes

File: `auth.js`

This router handles all authentication-related endpoints, including user registration, login, and password management.

### Base URL
```
/api/auth
```

### Middleware
- `auth`: Authentication middleware for protected routes

### Routes

#### 1. User Signup
```javascript
POST /signup
```
- **Purpose**: Creates a new user account
- **Auth**: Not Required
- **Controller**: `signup`
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string",
    "name": "string",
    "department": "string",
    "role": "string"
  }
  ```
- **Usage**: Register new system users

#### 2. User Signin
```javascript
POST /signin
```
- **Purpose**: Authenticates user and provides access token
- **Auth**: Not Required
- **Controller**: `signin`
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Usage**: User authentication and token generation

#### 3. Get All Users
```javascript
GET /users
```
- **Purpose**: Retrieves list of all users
- **Auth**: Required
- **Controller**: `getAllUsers`
- **Features**:
  - Pagination support
  - Role filtering
  - Department filtering

#### 4. Reset Password
```javascript
POST /reset-password
```
- **Purpose**: Resets user's password with current password verification
- **Auth**: Required
- **Controller**: `resetPassword`
- **Request Body**:
  ```json
  {
    "currentPassword": "string",
    "newPassword": "string"
  }
  ```
- **Usage**: Authenticated password reset

#### 5. Reset Password with Email
```javascript
POST /reset-password-email
```
- **Purpose**: Resets user's password using email verification
- **Auth**: Required
- **Controller**: `resetPasswordWithEmail`
- **Request Body**:
  ```json
  {
    "email": "string",
    "newPassword": "string"
  }
  ```
- **Usage**: Email-based password reset

#### 6. Update User
```javascript
PUT /users/:userId
```
- **Purpose**: Updates user information
- **Auth**: Required
- **Controller**: `updateUser`
- **Parameters**:
  - `userId`: ID of the user to update
- **Request Body**:
  ```json
  {
    "name": "string",
    "department": "string",
    "role": "string",
    "status": "string"
  }
  ```
- **Usage**: User profile management

### Features
1. User Management:
   - Account creation
   - Profile updates
   - Status management
   - Role assignment

2. Authentication:
   - Secure login
   - Token generation
   - Session management
   - Password security

3. Password Management:
   - Secure reset
   - Email verification
   - Current password verification
   - Password validation

### Security
- Password hashing
- Token-based auth
- Role validation
- Session management
- Access control

### Integration
- User model
- Email system
- Role system
- Department system
- Security system

## Company Tag Routes

File: `companyTagRoutes.js`

This router handles all company tag related endpoints, including creation, management, and balance transfers.

### Base URL
```
/api/company-tags
```

### Middleware
- `auth`: Authentication middleware for protected routes
- `authorize`: Authorization middleware for role-based access

### Routes

#### 1. Create Company Tag
```javascript
POST /create-company-tag
```
- **Purpose**: Creates a new company tag
- **Auth**: Required
- **Controller**: `createCompanyTag`
- **Request Body**:
  ```json
  {
    "name": "string",
    "cashtag": "string",
    "ctType": "string",
    "fullName": "string",
    "last4SS": "string",
    "address": "string",
    "email": "string",
    "pin": "string",
    "procurementCost": "number",
    "limit": "number"
  }
  ```
- **Usage**: Register new company tags in the system

#### 2. Get All Company Tags
```javascript
GET /get-all-company-tags
```
- **Purpose**: Retrieves list of all company tags
- **Auth**: Required
- **Controller**: `getAllCompanyTags`
- **Features**:
  - Pagination support
  - Status filtering
  - Type filtering
  - Balance filtering

#### 3. Get Company Tag by ID
```javascript
GET /get-company-tag/:cId
```
- **Purpose**: Retrieves specific company tag details
- **Auth**: Required
- **Controller**: `getCompanyTagById`
- **Parameters**:
  - `cId`: Company tag ID
- **Usage**: Detailed company tag information

#### 4. Update Company Tag
```javascript
PUT /update-company-tag/:cId
```
- **Purpose**: Updates company tag information
- **Auth**: Required
- **Controller**: `updateCompanyTag`
- **Parameters**:
  - `cId`: Company tag ID
- **Request Body**:
  ```json
  {
    "cashtag": "string",
    "email": "string",
    "pin": "string",
    "status": "string",
    "limit": "number"
  }
  ```
- **Usage**: Company tag management

#### 5. Delete Company Tag
```javascript
DELETE /delete-company-tag/:cId
```
- **Purpose**: Deletes a company tag
- **Auth**: Required
- **Controller**: `deleteCompanyTag`
- **Parameters**:
  - `cId`: Company tag ID
- **Usage**: Remove inactive or invalid tags

#### 6. Transfer Balance
```javascript
POST /transfer
```
- **Purpose**: Transfers balance between company tags
- **Auth**: Required
- **Controller**: `transferBalance`
- **Request Body**:
  ```json
  {
    "fromCId": "string",
    "toCId": "string",
    "amount": "number"
  }
  ```
- **Usage**: Balance management between tags

### Features
1. Tag Management:
   - Creation
   - Updates
   - Deletion
   - Status tracking

2. Financial Operations:
   - Balance transfers
   - Limit management
   - Transaction tracking
   - Balance monitoring

3. Security:
   - PIN protection
   - Status validation
   - Transfer validation
   - Access control

### Status Types
- active: Tag is operational
- paused: Temporarily suspended
- disabled: Permanently deactivated

### Tag Types
- personal: Individual tags
- business: Business entity tags

### Security
- Authentication required
- Role-based access
- PIN verification
- Transfer validation
- Balance checks

### Integration
- User system
- Transaction system
- Financial system
- Security system
- Audit logging

## Feedback Routes

File: `feedbackRoutes.js`

This router handles feedback submission and retrieval endpoints, integrating with ManyChat for messaging.

### Base URL
```
/api/feedback
```

### Middleware
- `auth`: Authentication middleware for protected routes
- `checkDepartment`: Department-based access control

### Routes

#### 1. Submit Feedback
```javascript
POST /submit-feedback
```
- **Purpose**: Submits new feedback from users
- **Auth**: Not Required (Public Route)
- **Controller**: `submitFeedback`
- **Request Body**:
  ```json
  {
    "messengerId": "string",
    "feedback_category": "string",
    "feedback_rating": "number",
    "feedback_text": "string",
    "manyChatData": "object"
  }
  ```
- **Features**:
  - ManyChat integration
  - Rating system
  - Category classification
  - Detailed feedback text
- **Usage**: Collect user feedback and ratings

#### 2. Get All Feedback
```javascript
GET /get-all-feedback
```
- **Purpose**: Retrieves all feedback entries
- **Auth**: Required
- **Controller**: `getAllFeedback`
- **Features**:
  - Pagination support
  - Category filtering
  - Rating filtering
  - Date range filtering
- **Usage**: Review and analyze user feedback

### Features
1. Feedback Collection:
   - Rating system
   - Category system
   - Text feedback
   - User identification

2. Integration:
   - ManyChat platform
   - User system
   - Analytics system
   - Notification system

3. Management:
   - Feedback retrieval
   - Data filtering
   - Analysis tools
   - Response tracking

### Categories
- Service Quality
- Platform Features
- Support Experience
- Game Performance
- Payment Process
- General Feedback

### Rating System
- 1-5 star rating scale
- Category-specific ratings
- Overall satisfaction
- Service quality metrics

### Security
- Public submission
- Protected retrieval
- Data validation
- Access control

### Integration
- ManyChat API
- User system
- Analytics platform
- Notification system
- Reporting tools

## Player Routes

File: `players.js`

This router handles all player-related endpoints, including registration, redeem requests, referrals, and player management.

### Base URL
```
/api/players
```

### Middleware
- `auth`: Authentication middleware for protected routes
- `checkRole`: Role-based access control for specific departments

### Routes

#### Registration Management

##### 1. Create Pending Registration
```javascript
POST /register
```
- **Purpose**: Creates a new pending player registration
- **Auth**: Not Required (ManyChat Integration)
- **Controller**: `createPendingRegistration`
- **Usage**: Process new player registrations

##### 2. Get Pending Registrations
```javascript
GET /pending
```
- **Purpose**: Retrieves pending registration requests
- **Auth**: Required (Support Department)
- **Controller**: `getPendingRegistrations`
- **Access**: Support Agents only

##### 3. Process Pending Registration
```javascript
PATCH /pending/:id
```
- **Purpose**: Approves/Rejects pending registration
- **Auth**: Required (Support Department)
- **Controller**: `processPendingRegistration`
- **Access**: Support Agents only

#### Player Management

##### 4. Get Players
```javascript
GET /getPlayers
```
- **Purpose**: Retrieves list of all players
- **Auth**: Required (Support Department)
- **Controller**: `getPlayers`
- **Features**: Pagination, filtering

##### 5. Get Basic Player Info
```javascript
GET /basic
```
- **Purpose**: Retrieves basic player information
- **Auth**: Required
- **Controller**: `getAllPlayersBasic`
- **Returns**: VIP code, name, team, profile

##### 6. Get Complete Player Info
```javascript
GET /complete/:vipCode
```
- **Purpose**: Retrieves detailed player information
- **Auth**: Required
- **Controller**: `getPlayerCompleteInfo`
- **Returns**: Full player details including history

#### Redeem Management

##### 7. Initialize Redeem Subscriber
```javascript
POST /init-redeem
```
- **Purpose**: Initializes redeem functionality for player
- **Auth**: Not Required (ManyChat Integration)
- **Controller**: `initRedeemSubscriber`

##### 8. Check Redeem Limit
```javascript
POST /check-redeem-limit
```
- **Purpose**: Validates redeem amount against limits
- **Auth**: Not Required (ManyChat Integration)
- **Controller**: `checkRedeemLimit`

##### 9. Submit Redeem Request
```javascript
POST /submit-redeem
```
- **Purpose**: Creates new redeem request
- **Auth**: Not Required (ManyChat Integration)
- **Controller**: `submitRedeem`

##### 10. Get Redeem Requests
```javascript
GET /redeem-requests
```
- **Purpose**: Retrieves all redeem requests
- **Auth**: Required (Operations Department)
- **Controller**: `getRedeemRequests`

##### 11. Process Redeem Verification
```javascript
PATCH /redeem-requests/verification/:redeemId
```
- **Purpose**: Updates verification status
- **Auth**: Required (Verification Department)
- **Controller**: `updateRedeemVerificationStatus`

#### Referral System

##### 12. Get Referral Code
```javascript
POST /referral-code
```
- **Purpose**: Generates/retrieves referral code
- **Auth**: Not Required (ManyChat Integration)
- **Controller**: `getReferralCode`

##### 13. Validate Referral
```javascript
POST /validate-referral
```
- **Purpose**: Validates referral code
- **Auth**: Not Required (ManyChat Integration)
- **Controller**: `validateReferralCode`

##### 14. Get Referral Details
```javascript
GET /referrals/:vipCode
```
- **Purpose**: Retrieves referral information
- **Auth**: Required
- **Controller**: `getReferralDetails`

#### Payment Processing

##### 15. Add Hold Amount
```javascript
POST /redeem-requests/add-hold/:redeemId
```
- **Purpose**: Places hold on redeem amount
- **Auth**: Required
- **Controller**: `addHoldAmount`

##### 16. Process Payment
```javascript
POST /redeem-requests/process-payment/:redeemId
```
- **Purpose**: Processes payment for redeem request
- **Auth**: Required
- **Controller**: `processPaymentFromCompanyTag`

### Features
1. Registration System:
   - Pending registrations
   - Approval process
   - Verification system
   - Team assignment

2. Redeem Management:
   - Limit checking
   - Request processing
   - Verification workflow
   - Payment processing

3. Referral System:
   - Code generation
   - Validation
   - Tracking
   - Rewards

4. Security:
   - Role-based access
   - Department restrictions
   - Authentication
   - Verification steps

### Department Access
1. Support:
   - Registration management
   - Player management
   - Status updates

2. Operations:
   - Redeem request management
   - Verification management
   - Process management

3. Verification:
   - Request verification
   - Status updates
   - Document verification

4. Finance:
   - Payment processing
   - Balance management
   - Transaction tracking

### Integration
- ManyChat system
- Payment platforms
- Verification system
- Notification system
- Analytics platform

## Promotion Routes

File: `promotionRoutes.js`

This router handles all promotion-related endpoints, including creation, management, validation, and usage tracking.

### Base URL
```
/api/promotions
```

### Middleware
- `auth`: Authentication middleware for protected routes
- `isAdmin`: Admin-only access control

### Routes

#### Promotion Management

##### 1. Get All Promotions
```javascript
GET /get-all-promotions
```
- **Purpose**: Retrieves all promotions with pagination
- **Auth**: Required
- **Controller**: `getAllPromotions`
- **Access**: Admin only
- **Features**: Pagination, filtering

##### 2. Create Promotion
```javascript
POST /
```
- **Purpose**: Creates a new promotion
- **Auth**: Required (Admin)
- **Controller**: `createPromotion`
- **Request Body**:
  ```json
  {
    "code": "string",
    "description": "string",
    "type": "FIXED | PERCENTAGE",
    "amount": "number",
    "percentage": "number",
    "minRechargeAmount": "number",
    "maxRechargeAmount": "number",
    "maxUsagePerUser": "number",
    "totalUsageLimit": "number",
    "applicableGames": "string[]",
    "applicableTeams": "string[]",
    "startDate": "date",
    "endDate": "date"
  }
  ```

##### 3. Get Promotion by Code
```javascript
GET /:code
```
- **Purpose**: Retrieves promotion details
- **Auth**: Not Required
- **Controller**: `getPromotionByCode`
- **Parameters**: Promotion code

##### 4. Update Promotion
```javascript
PATCH /:code
```
- **Purpose**: Updates promotion details
- **Auth**: Required (Admin)
- **Controller**: `updatePromotion`
- **Parameters**: Promotion code

#### Status Management

##### 5. Update Promotion Status
```javascript
PATCH /:code/status
```
- **Purpose**: Activates/Deactivates promotion
- **Auth**: Required (Admin)
- **Controller**: `updatePromotionStatus`
- **Parameters**: Promotion code

#### Team Promotions

##### 6. Get Team Promotions
```javascript
GET /team/:teamId
```
- **Purpose**: Retrieves active team promotions
- **Auth**: Required
- **Controller**: `getTeamPromotions`
- **Parameters**: Team ID

##### 7. Get Team Promo Codes
```javascript
POST /team/codes
```
- **Purpose**: Retrieves team promo codes
- **Auth**: Not Required
- **Controller**: `getTeamPromoCodes`
- **Integration**: ManyChat format

#### Promotion Usage

##### 8. Validate Promotion
```javascript
POST /validate
```
- **Purpose**: Validates promotion code
- **Auth**: Not Required
- **Controller**: `validatePromotion`
- **Features**: Eligibility checking

##### 9. Apply Promotion
```javascript
POST /apply
```
- **Purpose**: Applies promotion to transaction
- **Auth**: Required
- **Controller**: `applyPromotion`
- **Features**: Discount calculation

##### 10. Get Promotion Usage
```javascript
GET /:code/usage
```
- **Purpose**: Retrieves usage statistics
- **Auth**: Required (Admin)
- **Controller**: `getPromotionUsage`
- **Parameters**: Promotion code

#### Player Assignment

##### 11. Assign Promotion
```javascript
POST /assign
```
- **Purpose**: Assigns promotion to player
- **Auth**: Required
- **Controller**: `assignPromotionToPlayer`

##### 12. Unassign Promotion
```javascript
POST /unassign
```
- **Purpose**: Removes promotion from player
- **Auth**: Required
- **Controller**: `unassignPromotionFromPlayer`

##### 13. Get Unassigned Players
```javascript
GET /unassigned/:promotionCode
```
- **Purpose**: Lists players without promotion
- **Auth**: Required
- **Controller**: `getUnassignedPlayers`

##### 14. Get Assigned Players
```javascript
GET /assigned/:promotionCode
```
- **Purpose**: Lists players with promotion
- **Auth**: Required
- **Controller**: `getAssignedPlayers`

### Features
1. Promotion Management:
   - Creation
   - Updates
   - Status control
   - Usage tracking

2. Team Integration:
   - Team-specific promotions
   - Code management
   - Access control
   - Usage limits

3. Player Assignment:
   - Direct assignment
   - Bulk assignment
   - Assignment tracking
   - Usage monitoring

4. Validation System:
   - Code validation
   - Eligibility checking
   - Usage limits
   - Date restrictions

### Security
- Admin-only access
- Authentication required
- Role validation
- Usage validation

### Integration
- ManyChat system
- Team system
- Player system
- Transaction system
- Analytics platform

## Recharge Routes

File: `rechargeRoutes.js`

This router handles all recharge-related endpoints, including request submission, processing, and transaction management.

### Base URL
```
/api/recharge
```

### Middleware
- `auth`: Authentication middleware for protected routes
- `checkDepartment`: Department-based access control
- `verifyToken`: Token verification middleware

### Routes

#### Player Endpoints (No Auth Required)

##### 1. Submit Recharge
```javascript
POST /submit-recharge
```
- **Purpose**: Creates new recharge request
- **Auth**: Not Required
- **Controller**: `submitRecharge`
- **Usage**: Player recharge requests

##### 2. Submit Recharge Screenshot
```javascript
POST /submit-recharge-screenshot
```
- **Purpose**: Submits payment proof
- **Auth**: Not Required
- **Controller**: `submitRechargeScreenshot`
- **Usage**: Payment verification

##### 3. Cancel Recharge
```javascript
POST /cancel-recharge
```
- **Purpose**: Cancels pending recharge
- **Auth**: Not Required
- **Controller**: `cancelRechargeRequest`
- **Usage**: Request cancellation

#### Finance Department Endpoints

##### 4. Get All Recharge Requests
```javascript
GET /get-all-recharge-requests
```
- **Purpose**: Retrieves all recharge requests
- **Auth**: Required
- **Controller**: `getAllRechargeRequests`
- **Features**: Pagination, filtering

##### 5. Get Assigned Recharges
```javascript
GET /get-assigned-recharges
```
- **Purpose**: Lists assigned recharge requests
- **Auth**: Required
- **Controller**: `getAllAssignedRecharges`
- **Access**: Finance department

##### 6. Get Verified Recharges
```javascript
GET /get-verified-recharges
```
- **Purpose**: Lists verified recharge requests
- **Auth**: Required
- **Controller**: `getScreenshotVerifiedRecharges`
- **Access**: Finance department

#### Assignment Management

##### 7. Get Available Tags
```javascript
GET /available-tags/:rechargeId
```
- **Purpose**: Lists available tags for assignment
- **Auth**: Required
- **Controller**: `getAvailableTagsForAssignment`
- **Parameters**: Recharge ID

##### 8. Assign Recharge
```javascript
POST /assign/:rechargeId
```
- **Purpose**: Assigns recharge to redeem request
- **Auth**: Required
- **Controller**: `assignRechargeToRedeem`
- **Parameters**: Recharge ID

##### 9. Complete Assignment
```javascript
POST /complete-recharge-assignment/:rechargeId
```
- **Purpose**: Completes recharge assignment
- **Auth**: Required
- **Controller**: `completeRechargeAssignment`
- **Parameters**: Recharge ID

#### Verification Process

##### 10. Verify Screenshot
```javascript
POST /verify-screenshot
```
- **Purpose**: Verifies payment screenshot
- **Auth**: Required
- **Controller**: `handleScreenshotVerification`
- **Access**: Finance department

##### 11. Get Processed Screenshots
```javascript
GET /screenshot-processed
```
- **Purpose**: Lists processed screenshots
- **Auth**: Required
- **Controller**: `getScreenshotProcessedRecharges`
- **Access**: Finance department

#### Credits Management

##### 12. Update Credits
```javascript
POST /update-credits-loaded/:rechargeId
```
- **Purpose**: Updates loaded credits
- **Auth**: Required
- **Controller**: `updateCreditsLoaded`
- **Parameters**: Recharge ID

##### 13. Submit Promo Recharge
```javascript
POST /submit-promo-recharge-request
```
- **Purpose**: Submits promotional recharge
- **Auth**: Not Required
- **Controller**: `submitPromoRechargeRequest`
- **Usage**: Promotional recharges

#### Transaction Management

##### 14. Update Payment Status
```javascript
PATCH /transaction/:transactionId/payment-status
```
- **Purpose**: Updates transaction status
- **Auth**: Required
- **Controller**: `updateTransactionPaymentStatus`
- **Parameters**: Transaction ID

##### 15. Get Pending Transactions
```javascript
GET /ct-pending-transactions
```
- **Purpose**: Lists pending CT transactions
- **Auth**: Required
- **Controller**: `getPendingCTTransactions`
- **Access**: Finance department

##### 16. Get All Transactions
```javascript
GET /transactions
```
- **Purpose**: Lists all transactions
- **Auth**: Required
- **Controller**: `getAllTransactions`
- **Features**: Basic information

##### 17. Get Detailed Transactions
```javascript
GET /transactions/detailed
```
- **Purpose**: Lists detailed transactions
- **Auth**: Required
- **Controller**: `getDetailedTransactions`
- **Features**: Complete information

##### 18. Get Transaction Details
```javascript
GET /transactions/detailed/:transactionId
```
- **Purpose**: Retrieves specific transaction
- **Auth**: Required
- **Controller**: `getTransactionDetails`
- **Parameters**: Transaction ID

### Features
1. Request Management:
   - Submission
   - Cancellation
   - Assignment
   - Completion

2. Verification Process:
   - Screenshot submission
   - Verification workflow
   - Status tracking
   - Credits management

3. Transaction Tracking:
   - Status updates
   - Payment verification
   - Detailed records
   - History tracking

4. Assignment System:
   - Tag management
   - Request assignment
   - Process completion
   - Status tracking

### Security
- Authentication required
- Department restrictions
- Token verification
- Status validation
- Access control

### Integration
- Payment system
- Screenshot storage
- Transaction system
- Notification system
- Analytics platform

## Referral Routes

File: `referralRoutes.js`

This router handles referral-related endpoints, including referral link generation and bonus management.

### Base URL
```
/api/referrals
```

### Middleware
- `auth`: Authentication middleware for protected routes

### Routes

#### 1. Get Referral Link
```javascript
GET /:vipCode/referral-link
```
- **Purpose**: Generates referral link for player
- **Auth**: Required
- **Controller**: `getReferralLink`
- **Parameters**:
  - `vipCode`: Player's VIP code
- **Usage**: Generate shareable referral links

#### 2. Award Referral Bonus
```javascript
POST /award-bonus
```
- **Purpose**: Awards bonus for successful referral
- **Auth**: Required
- **Controller**: `awardReferralBonus`
- **Request Body**:
  ```json
  {
    "referrerId": "string",
    "refereeId": "string",
    "amount": "number"
  }
  ```
- **Usage**: Process referral rewards

### Features
1. Link Management:
   - Link generation
   - VIP code integration
   - Link tracking
   - Usage monitoring

2. Bonus System:
   - Bonus calculation
   - Reward distribution
   - Tracking system
   - Validation rules

3. Referral Tracking:
   - Referrer tracking
   - Referee tracking
   - Status monitoring
   - Performance metrics

### Bonus Rules
- Threshold: $20 minimum deposit
- Reward: 100% match up to $20
- One-time award
- Validation required

### Security
- Authentication required
- VIP code validation
- Bonus validation
- Duplicate prevention

### Integration
- Player system
- Bonus system
- Tracking system
- Analytics platform
- Notification system

## Reset Password Routes

File: `resetPasswordRoutes.js`

This router handles password reset functionality, including request submission and processing.

### Base URL
```
/api/reset-password
```

### Middleware
- `auth`: Authentication middleware for protected routes

### Routes

#### 1. Submit Reset Request
```javascript
POST /reset-password
```
- **Purpose**: Submits password reset request
- **Auth**: Not Required (Public Route)
- **Controller**: `submitResetRequest`
- **Request Body**:
  ```json
  {
    "messengerId": "string",
    "pageId": "string",
    "playerName": "string",
    "gamePlatform": "string",
    "gameUsername": "string",
    "teamCode": "string",
    "manyChatData": "object"
  }
  ```
- **Usage**: Player password reset requests
- **Integration**: ManyChat platform

#### 2. Get All Reset Requests
```javascript
GET /get-all-requests-password
```
- **Purpose**: Retrieves all reset requests
- **Auth**: Required (Admin)
- **Controller**: `getAllResetRequests`
- **Features**:
  - Pagination support
  - Status filtering
  - Date filtering
- **Usage**: Admin request management

#### 3. Process Reset Request
```javascript
POST /:requestId/process
```
- **Purpose**: Processes reset request
- **Auth**: Required (Admin)
- **Controller**: `processResetRequest`
- **Parameters**:
  - `requestId`: Reset request ID
- **Request Body**:
  ```json
  {
    "status": "string",
    "remarks": "string"
  }
  ```
- **Usage**: Request approval/rejection

### Features
1. Request Management:
   - Submission handling
   - Status tracking
   - Process workflow
   - Admin controls

2. Security:
   - Request validation
   - Status verification
   - Access control
   - Process tracking

3. Integration:
   - ManyChat platform
   - Game platforms
   - Team system
   - Notification system

### Status Types
- pending: Initial request state
- processed: Reset completed
- cancelled: Request cancelled

### Security
- Public submission
- Protected processing
- Admin-only access
- Request validation

### Integration
- ManyChat system
- Player system
- Game platforms
- Team system
- Notification system

## Index Routes

File: `index.js`

This router handles base API endpoints and includes global middleware for CORS configuration.

### Base URL
```
/api
```

### Global Middleware

#### CORS Configuration
```javascript
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
```
- **Purpose**: Enables Cross-Origin Resource Sharing
- **Access**: All routes
- **Headers**:
  - Allow Origin: All domains
  - Allow Methods: GET, POST, PUT, DELETE, OPTIONS
  - Allow Headers: Content-Type, Authorization

### Routes

#### 1. Root Endpoint
```javascript
GET /
```
- **Purpose**: Base API welcome endpoint
- **Auth**: Not Required
- **Response**:
  ```json
  {
    "message": "Welcome to the API"
  }
  ```
- **Usage**: API availability check

#### 2. Health Check
```javascript
GET /health
```
- **Purpose**: System health monitoring
- **Auth**: Not Required
- **Response**:
  ```json
  {
    "status": "OK",
    "timestamp": "ISO-8601 timestamp"
  }
  ```
- **Usage**: System monitoring and uptime checks

#### 3. Test Endpoint
```javascript
GET /test
```
- **Purpose**: API functionality testing
- **Auth**: Not Required
- **Response**:
  ```json
  {
    "message": "API test endpoint is working!"
  }
  ```
- **Usage**: Basic API testing

### Features
1. CORS Support:
   - Cross-origin access
   - Method allowance
   - Header configuration
   - Preflight handling

2. System Monitoring:
   - Health checks
   - Status reporting
   - Timestamp tracking
   - Availability monitoring

3. Testing Support:
   - Basic endpoints
   - Response validation
   - Connection testing
   - API verification

### Security
- CORS configuration
- Method restrictions
- Header validation
- Access control

### Integration
- Monitoring systems
- Health checks
- Status reporting
- System metrics

---

This completes the documentation for all routes in the Techmile backend application. The routes are organized into the following sections:

1. Activity Logs Routes (`activityLogs.js`)
2. Authentication Routes (`auth.js`)
3. Company Tag Routes (`companyTagRoutes.js`)
4. Feedback Routes (`feedbackRoutes.js`)
5. Player Routes (`players.js`)
6. Promotion Routes (`promotionRoutes.js`)
7. Recharge Routes (`rechargeRoutes.js`)
8. Referral Routes (`referralRoutes.js`)
9. Reset Password Routes (`resetPasswordRoutes.js`)
10. Index Routes (`index.js`)

Each route module is documented with:
- Base URL
- Available endpoints
- Authentication requirements
- Request/Response formats
- Features and functionality
- Security considerations
- Integration points

The documentation provides a comprehensive overview of the API's capabilities and requirements for integration and usage. 