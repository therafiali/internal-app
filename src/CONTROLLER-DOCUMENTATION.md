# Controllers Documentation

This document provides a comprehensive overview of all controllers in the Techmile backend application.

## Table of Contents
1. [Activity Log Controller](#activity-log-controller)
2. [Auth Controller](#auth-controller)
3. [Company Tag Controller](#company-tag-controller)
4. [Example Controller](#example-controller)
5. [Feedback Controller](#feedback-controller)
6. [Player Controller](#player-controller)
7. [Promotion Controller](#promotion-controller)
8. [Recharge Controller](#recharge-controller)
9. [Referral Controller](#referral-controller)
10. [Reset Password Controller](#reset-password-controller)

Let's dive into each controller's functionality and purpose.

---

## Activity Log Controller

File: `activityLogController.js`

This controller manages the system's activity logging functionality, tracking user actions and system events.

### Dependencies
- `ActivityLog` model
- `ua-parser-js`: For parsing user agent information
- `json2csv`: For CSV export functionality
- `express-rate-limit`: For rate limiting requests

### Main Functions

#### 1. logActivity
```javascript
exports.logActivity = async (req, user, action)
```
Creates a new activity log entry with enhanced details including:
- Agent information (ID, name, department, role)
- Action details (type, description, target resource)
- System information (browser, OS, IP address)
- Status and error details

#### 2. getActivityLogs
```javascript
exports.getActivityLogs = async (req, res)
```
Retrieves activity logs with advanced filtering capabilities:
- Pagination support
- Multiple filter options:
  - Basic filters (agentId, actionType, targetResource, status)
  - Date range filtering
  - Department and role filtering
  - Browser and OS filtering
  - Location-based filtering
  - Search functionality in descriptions and agent names

#### 3. getActivitySummary
```javascript
exports.getActivitySummary = async (req, res)
```
Generates detailed activity summaries including:
- Action type statistics
- Department activity summary
- Browser usage statistics
- Top active agents with success rates
- Customizable timeframe analysis

#### 4. getActivityTrends
```javascript
exports.getActivityTrends = async (req, res)
```
Analyzes and returns activity trends over specified timeframes.

### Helper Functions

#### getStartDate
- Calculates the start date based on the specified timeframe
- Supports various time ranges (24h, 7d, 30d, etc.)

#### getTimeInterval
- Determines the appropriate time interval for trend analysis
- Adjusts grouping based on the selected timeframe

---

## Auth Controller

File: `authController.js`

This controller handles user authentication, authorization, and user management functionality.

### Dependencies
- `User` model (with departments and roles)
- `jsonwebtoken`: For JWT token generation and verification

### Main Functions

#### 1. signup
```javascript
exports.signup = async (req, res)
```
Handles user registration with the following features:
- Validates email uniqueness
- Validates department and role combinations
- Creates new user account
- Generates JWT token
- Returns user data and token

#### 2. signin
```javascript
exports.signin = async (req, res)
```
Manages user authentication:
- Validates email and password
- Checks account status (disabled/active)
- Generates JWT token
- Returns user data and token

#### 3. getAllUsers
```javascript
exports.getAllUsers = async (req, res)
```
Retrieves user list with:
- Pagination support
- Department and role filtering
- Password field exclusion
- Sorted by creation date
- Formatted user data response

#### 4. resetPassword
```javascript
exports.resetPassword = async (req, res)
```
Handles password reset for authenticated users:
- Requires current password verification
- Updates password with new hash
- Includes security validations

#### 5. resetPasswordWithEmail
```javascript
exports.resetPasswordWithEmail = async (req, res)
```
Provides email-based password reset:
- Finds user by email
- Updates password directly
- Includes error handling and validation

### Security Features
- Password hashing (handled by User model)
- JWT token expiration (24 hours)
- Input validation
- Account status checking
- Secure password reset flow

---

## Company Tag Controller

File: `companyTagController.js`

This controller manages company tags, which are unique identifiers for companies in the system.

### Dependencies
- `CompanyTag` model
- `Transaction` model

### Helper Functions

#### generateCompanyTagId
```javascript
const generateCompanyTagId = async ()
```
Generates a unique company tag ID:
- Format: 'CT' followed by 4 random digits
- Ensures uniqueness by checking against existing IDs
- Returns: String (e.g., 'CT1234')

### Main Functions

#### 1. createCompanyTag
```javascript
exports.createCompanyTag = async (req, res)
```
Creates a new company tag with:
- Unique ID generation
- Validation for unique cashtag and email
- Default status set to 'paused'
- Required fields:
  - name, fullName, cashtag, type, pin
  - email, address, last4SS
  - procurementCost, balance, limit
  - linkedCard, linkedBank, cashCard
  - verificationStatus

#### 2. getAllCompanyTags
```javascript
exports.getAllCompanyTags = async (req, res)
```
Retrieves company tags with:
- Pagination support
- Status and type filtering
- Populated procurer details
- Sorted by creation date
- Includes total count and pagination info

#### 3. updateCompanyTag
```javascript
exports.updateCompanyTag = async (req, res)
```
Updates company tag information:
- Validates unique constraints for email and cashtag
- Handles status changes and lastActive timestamp
- Supports partial updates
- Maintains data integrity
- Fields that can be updated:
  - cashtag, type, pin
  - email, address
  - procurementCost
  - linkedCard, linkedBank
  - cashCard, verificationStatus
  - status

### Status Management
- Tracks active/paused/disabled states
- Manages lastActive timestamp
- Handles verification status
- Supports cash card activation/deactivation

### Security Features
- Unique ID generation
- Email uniqueness validation
- Cashtag uniqueness validation
- Status transition tracking
- Procurement tracking

---

## Example Controller

File: `exampleController.js`

This is a template controller that serves as an example for creating new controllers in the system.

### Dependencies
- `Example` model

### Main Functions

#### 1. getAllExamples
```javascript
exports.getAllExamples = async (req, res)
```
Retrieves all examples from the database:
- Simple find operation
- Returns all examples
- Basic error handling

#### 2. createExample
```javascript
exports.createExample = async (req, res)
```
Creates a new example:
- Required fields:
  - name
  - description
- Returns newly created example
- Includes validation error handling

### Purpose
This controller serves as a boilerplate for creating new controllers, demonstrating:
- Basic CRUD operations
- Error handling patterns
- Response formatting
- Async/await usage

---

## Feedback Controller

File: `feedbackController.js`

This controller manages user feedback submission and retrieval, with integration to ManyChat for messaging.

### Dependencies
- `Feedback` model
- ManyChat API integration

### Main Functions

#### 1. submitFeedback
```javascript
exports.submitFeedback = async (req, res)
```
Handles feedback submission:
- Required fields:
  - messengerId
  - feedback_category
  - feedback_rating
  - feedback_text
- Features:
  - Stores feedback in database
  - Sends confirmation via ManyChat
  - Handles ManyChat API integration
  - Stores complete ManyChat data
- Response Format:
  - ManyChat v2 compatible responses
  - Includes success/error messages
  - Emoji-enhanced feedback display

#### 2. getAllFeedback
```javascript
exports.getAllFeedback = async (req, res)
```
Retrieves feedback entries with:
- Pagination support
- Category and rating filters
- Sorted by creation date
- Response includes:
  - Feedback data
  - Pagination details
  - Total count

### Integration Features
- ManyChat API integration
- Message tag support
- Custom field updates
- Error handling for API calls

### Data Management
- Feedback categorization
- Rating system
- Timestamp tracking
- Player identification
- Page tracking

### Security & Validation
- Required field validation
- Error handling
- API authentication
- Data sanitization

---

## Player Controller

File: `playerController.js`

This controller manages player-related operations including registration, verification, and game management.

### Dependencies
- Models:
  - `Player` (with GAME_PLATFORMS)
  - `PendingPlayer`
  - `RedeemRequest`
  - `RedeemSubscriber`
  - `Referral`
  - `Promotion`
  - `RechargeRequest`
  - `CompanyTag`
  - `Transaction`
- Socket Events:
  - `pendingRegistrationEvents`
  - `verificationRequestEvents`

### Helper Functions

#### generateOTP
```javascript
const generateOTP = () => {...}
```
Generates a 6-digit OTP for verification purposes

#### generateEntryCode
```javascript
const generateEntryCode = async () => {...}
```
Generates unique entry codes for players

#### generateRedeemId
```javascript
const generateRedeemId = () => {...}
```
Generates unique redeem request IDs

#### createReferral
```javascript
const createReferral = async (referrer, referee, session) => {...}
```
Creates referral relationships between players

### Main Functions

#### 1. createPendingRegistration
```javascript
exports.createPendingRegistration = async (req, res)
```
Creates a pending player registration:
- Stores ManyChat data
- Handles referral codes
- Returns ManyChat v2 compatible response

#### 2. getPendingRegistrations
```javascript
exports.getPendingRegistrations = async (req, res)
```
Retrieves pending registrations with:
- Pagination support
- Status filtering
- Referrer details population
- Socket event updates

#### 3. getPlayers
```javascript
exports.getPlayers = async (req, res)
```
Retrieves registered players with:
- Pagination
- Referral information
- Game limits
- Profile details

#### 4. processPendingRegistration
```javascript
exports.processPendingRegistration = async (req, res)
```
Processes registration requests:
- Approval/Rejection handling
- VIP code generation
- Referral processing
- ManyChat notifications
- Socket updates

#### 5. checkRedeemLimit
```javascript
exports.checkRedeemLimit = async (req, res)
```
Validates redeem requests against player limits

### Integration Features
- ManyChat API integration
- Real-time socket updates
- Referral system
- Game platform integration

### Data Management
- Player profiles
- Game limits
- Referral tracking
- Transaction history
- Verification status

### Security Features
- OTP verification
- Unique code generation
- Status validation
- Process tracking
- Error handling

---

## Promotion Controller

File: `promotionController.js`

This controller manages promotional codes and offers in the system.

### Dependencies
- Models:
  - `Promotion`
  - `PromotionUsage`
  - `Player`
- Utils:
  - `validationUtils`

### Main Functions

#### 1. createPromotion
```javascript
exports.createPromotion = async (req, res)
```
Creates new promotional offers:
- Assigns creator information
- Validates promotion data
- Returns created promotion

#### 2. getPromotionByCode
```javascript
exports.getPromotionByCode = async (req, res)
```
Retrieves promotion details:
- Case-insensitive code lookup
- Validates promotion existence
- Returns promotion data

#### 3. updatePromotionStatus
```javascript
exports.updatePromotionStatus = async (req, res)
```
Updates promotion status:
- Toggles active state
- Tracks who updated
- Returns updated promotion

#### 4. getTeamPromotions
```javascript
exports.getTeamPromotions = async (req, res)
```
Retrieves team-specific promotions:
- Filters by team ID
- Checks active status
- Validates expiration dates

#### 5. getTeamPromoCodes
```javascript
exports.getTeamPromoCodes = async (req, res)
```
Handles promotion code retrieval:
- Supports ManyChat integration
- Frontend/API response formatting
- Features:
  - General promotions listing
  - Personal promotions
  - Days remaining calculation
  - ManyChat notifications

#### 6. validatePromotion
```javascript
exports.validatePromotion = async (req, res)
```
Validates promotion codes:
- Checks eligibility
- Verifies usage limits
- Validates expiration

### Promotion Types
- General promotions
- Personal promotions
- Team-specific promotions
- Referral promotions

### Features
- Fixed amount discounts
- Percentage-based discounts
- Expiration tracking
- Usage tracking
- Team-specific offers
- Personal/Assigned offers

### Integration
- ManyChat API integration
- Frontend compatibility
- Team system integration
- Player system integration

### Security
- Status validation
- Usage limits
- Team restrictions
- Expiration enforcement
- Update tracking

---

## Recharge Controller

File: `rechargeController.js`

This controller manages recharge requests, transactions, and related promotional activities.

### Dependencies
- Models:
  - `RechargeRequest`
  - `RedeemRequest`
  - `CompanyTag`
  - `Player`
  - `Promotion`
  - `Referral`
  - `Transaction`
- Controllers:
  - `referralController`
- Utils:
  - `socketUtils`
- Config:
  - `systemUser`

### Helper Functions

#### logTransaction
```javascript
const logTransaction = async (rechargeRequest, newStatus, actionBy, session, remarks)
```
Manages transaction logging:
- Tracks status changes
- Records user actions
- Handles ManyChat data
- Manages payment statuses
- Updates timestamps

#### generateRandomPromoCode
```javascript
const generateRandomPromoCode = async ()
```
Generates unique promotion codes:
- 5-character random string
- Ensures uniqueness
- Uses uppercase letters

#### generateReferralPromoCode
```javascript
const generateReferralPromoCode = async (playerId, vipCode)
```
Manages referral promotions:
- Creates/updates player promotions
- Handles reward amounts
- Sets validity periods
- Manages team assignments

#### generateRechargeId
```javascript
const generateRechargeId = async ()
```
Creates unique recharge identifiers:
- Alphanumeric codes
- Ensures uniqueness
- System-wide identifier

### Transaction Management
- Status tracking
- User action logging
- Timestamp management
- Payment verification
- ManyChat integration

### Promotion Features
- Referral rewards
- Team-based promotions
- Validity periods
- Usage limits
- Amount management

### Integration
- ManyChat data handling
- Socket updates
- System user integration
- Team system integration

### Security Features
- Transaction logging
- Status validation
- User tracking
- Session management
- Error handling

### Status Workflow
- Pending → Verified
- Verified → Assigned
- Assigned → Processed
- Processed → Completed
- Cancellation handling

---

## Referral Controller

File: `referralController.js`

This controller manages the referral system, including referral links, bonuses, and promotional codes.

### Dependencies
- Models:
  - `Player`
  - `Referral`
  - `Promotion`

### Main Functions

#### 1. getReferralLink
```javascript
exports.getReferralLink = async (req, res)
```
Generates referral links:
- Uses player's VIP code
- Configurable base URL
- Returns shareable link

#### 2. processReferral
```javascript
exports.processReferral = async (referralCode, newPlayerId)
```
Handles referral processing:
- Validates referral codes
- Prevents self-referrals
- Updates referrer records
- Links referee to referrer

#### 3. awardReferralBonus
```javascript
exports.awardReferralBonus = async (req, res)
```
Manages referral bonuses:
- Tracks deposit amounts
- Calculates bonus eligibility
- Updates bonus balances
- Generates promo codes
- Features:
  - Threshold checking ($20)
  - One-time bonus award
  - Progress tracking
  - Balance updates

### Helper Functions

#### generateReferralPromoCode
```javascript
const generateReferralPromoCode = async (referrerId, referrerVipCode)
```
Manages referral promotions:
- Creates/updates promo codes
- Sets reward amounts
- Manages validity periods
- Tracks referral balances

### Bonus System
- Deposit threshold: $20
- 100% match up to $20
- One-time award
- Balance tracking
- Progress monitoring

### Promotion Features
- Referral-specific codes
- Fixed amount rewards
- Annual validity
- Usage limits
- Balance management

### Security
- Self-referral prevention
- Duplicate bonus prevention
- Balance validation
- Error handling

### Integration
- Frontend URL configuration
- Player system integration
- Promotion system integration
- Balance system integration

---

## Reset Password Controller

File: `resetPasswordController.js`

This controller manages password reset requests and processing.

### Dependencies
- Models:
  - `ResetPasswordRequest`
- External:
  - `mongoose`

### Helper Functions

#### generateRequestId
```javascript
const generateRequestId = async ()
```
Generates unique request identifiers:
- Format: 'PR-' + 5 random characters
- Ensures uniqueness
- Uses alphanumeric characters

### Main Functions

#### 1. submitResetRequest
```javascript
exports.submitResetRequest = async (req, res)
```
Handles password reset submissions:
- Validates request data
- Checks for existing requests
- Creates reset request record
- Features:
  - ManyChat integration
  - Game platform support
  - Team code tracking
  - Duplicate prevention

#### 2. getAllResetRequests
```javascript
exports.getAllResetRequests = async (req, res)
```
Retrieves reset requests:
- Pagination support
- Status filtering
- Processor details
- Sorted by creation date

### Request Processing
- Status tracking:
  - Pending
  - Completed
  - Rejected
  - Cancelled
- Processor tracking
- Timestamp management
- Remarks handling

### ManyChat Integration
- Status notifications
- Request confirmations
- Password updates
- Error handling

### Data Management
- Player information
- Game platform details
- Team associations
- Request tracking

### Security Features
- Unique request IDs
- Duplicate request prevention
- Status validation
- Process tracking
- Error handling

### User Communication
- Request confirmation
- Status updates
- Password delivery
- Error notifications

--- 