# Models Documentation

This document provides a comprehensive overview of all models in the Techmile backend application.

## Table of Contents
1. [Activity Log Model](#activity-log-model)
2. [Company Tag Model](#company-tag-model)
3. [Example Model](#example-model)
4. [Feedback Model](#feedback-model)
5. [Pending Player Model](#pending-player-model)
6. [Player Model](#player-model)
7. [Promotion Model](#promotion-model)
8. [Promotion Usage Model](#promotion-usage-model)
9. [Recharge Request Model](#recharge-request-model)
10. [Redeem Request Model](#redeem-request-model)
11. [Redeem Subscriber Model](#redeem-subscriber-model)
12. [Referral Model](#referral-model)
13. [Reset Password Request Model](#reset-password-request-model)
14. [Transaction Model](#transaction-model)
15. [User Model](#user-model)

Let's dive into each model's schema, functionality, and purpose.

---

## Activity Log Model

File: `ActivityLog.js`

This model tracks all system activities and user actions for audit and monitoring purposes.

### Schema Definition

```javascript
const activityLogSchema = new mongoose.Schema({
    // Agent Information
    agentId: { type: ObjectId, ref: 'User', required: true },
    agentName: { type: String, required: true },
    agentDepartment: { type: String, required: true },
    agentRole: { type: String, required: true },

    // Action Details
    actionType: { type: String, required: true, enum: [...] },
    actionDescription: { type: String, required: true },
    targetResource: { type: String, required: true, enum: [...] },
    targetResourceId: { type: ObjectId, required: false },
    status: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },

    // System Information
    ipAddress: { type: String, required: true },
    browser: { type: String, required: false },
    operatingSystem: { type: String, required: false },

    // Additional Data
    additionalDetails: { type: Mixed, default: {} },
    errorDetails: {
        code: String,
        message: String,
        stack: String
    }
}, { timestamps: true })
```

### Action Types
1. User Management:
   - USER_CREATE, USER_UPDATE, USER_DELETE
   - USER_VIEW, USER_BLOCK, USER_UNBLOCK

2. Authentication:
   - LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT
   - PASSWORD_RESET, PASSWORD_CHANGE

3. Redeem Operations:
   - REDEEM_CREATE, REDEEM_UPDATE
   - REDEEM_APPROVE, REDEEM_REJECT
   - REDEEM_CANCEL, REDEEM_PROCESS

4. Recharge Operations:
   - RECHARGE_CREATE, RECHARGE_UPDATE
   - RECHARGE_APPROVE, RECHARGE_REJECT
   - RECHARGE_CANCEL, RECHARGE_PROCESS

5. Financial Operations:
   - FINANCIAL_TRANSACTION_CREATE
   - FINANCIAL_TRANSACTION_UPDATE

6. Verification Operations:
   - VERIFICATION_APPROVE
   - VERIFICATION_REJECT

7. System Operations:
   - SYSTEM_CONFIG_UPDATE
   - REPORT_GENERATE, EXPORT_DATA
   - SYSTEM_BACKUP, SYSTEM_RESTORE
   - MAINTENANCE_MODE_TOGGLE

8. Player Operations:
   - PLAYER_UPDATE
   - PLAYER_SUSPEND, PLAYER_ACTIVATE

9. Cashtag Operations:
   - CASHTAG_CREATE, CASHTAG_UPDATE
   - CASHTAG_DELETE, CASHTAG_VIEW
   - CASHTAG_ASSIGN, CASHTAG_UNASSIGN
   - CASHTAG_PAUSE, CASHTAG_RESUME
   - CT_TRANSFER

### Target Resources
- user
- player
- redeem_request
- system_config
- report
- recharge_request
- financial_transaction
- verification_request
- notification
- audit
- company_tag
- other

### Indexes
Optimized for common queries:
```javascript
activityLogSchema.index({ agentId: 1, createdAt: -1 });
activityLogSchema.index({ actionType: 1, createdAt: -1 });
activityLogSchema.index({ targetResource: 1, targetResourceId: 1 });
activityLogSchema.index({ status: 1 });
activityLogSchema.index({ 'location.coordinates': '2dsphere' });
activityLogSchema.index({ browser: 1, operatingSystem: 1 });
```

### Features
- Complete audit trail
- Agent tracking
- Action categorization
- Resource targeting
- Error tracking
- System information
- Geolocation support
- Timestamp tracking

### Usage
Used for:
- Audit logging
- Activity monitoring
- Security tracking
- Performance monitoring
- Error tracking
- User behavior analysis

---

## Company Tag Model

File: `CompanyTag.js`

This model manages company tags, which are used for financial transactions and account management.

### Schema Definition

```javascript
const companyTagSchema = new mongoose.Schema({
    // Basic Information
    cId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    cashtag: { type: String, required: true, unique: true },
    ctType: { type: String, required: true, enum: ['personal', 'business'] },

    // Personal Information
    fullName: { type: String, required: true },
    last4SS: { type: String, required: true },
    address: { type: String, required: true },

    // Account Details
    email: { type: String, required: true, trim: true, lowercase: true },
    pin: { type: String, required: true },
    verificationStatus: { type: String, enum: ['verified', 'pending', 'rejected'], default: 'pending' },

    // Procurement Details
    procuredBy: { type: ObjectId, ref: 'User', required: true },
    procurementCost: { type: Number, required: true },
    procuredAt: { type: Date, default: Date.now },

    // Financial Details
    balance: { type: Number, default: 0 },
    limit: { type: Number, required: true },
    totalReceived: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 },

    // Withdrawal Details
    linkedCard: { type: String },
    linkedBank: { type: String },
    cashCard: { type: String, enum: ['activated', 'deactivated', 'pending'], default: 'pending' },

    // Status
    status: { type: String, enum: ['active', 'paused', 'disabled'], default: 'paused' },
    lastActive: { type: Date, default: null }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})
```

### Virtual Fields
```javascript
formattedBalance: Returns balance in formatted currency string
```

### Middleware
- Pre-save logging middleware for tracking changes
- Secure logging (hides sensitive information)

### Features
1. Account Management:
   - Unique identification (cId, cashtag)
   - Type classification (personal/business)
   - Verification system
   - Status tracking

2. Financial Tracking:
   - Balance management
   - Transaction limits
   - Transaction counting
   - Received/Withdrawn totals

3. Security:
   - PIN protection
   - Verification status
   - Activity tracking
   - Secure logging

4. Payment Methods:
   - Card linking
   - Bank account linking
   - Cash card management

### Status Types
- active: Tag is operational
- paused: Temporarily suspended
- disabled: Permanently deactivated

### Verification States
- verified: Fully verified account
- pending: Awaiting verification
- rejected: Failed verification

### Cash Card States
- activated: Ready for use
- deactivated: Usage disabled
- pending: Awaiting activation

### Usage
Used for:
- Financial transactions
- Account management
- Payment processing
- Activity tracking
- User verification
- Balance management

### Security Considerations
- PIN storage
- Activity logging
- Status management
- Verification process
- Access control

---

## Example Model

File: `Example.js`

This is a template model that serves as a boilerplate for creating new models in the system.

### Schema Definition

```javascript
const exampleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
})
```

### Fields
1. name:
   - Type: String
   - Required: true
   - Purpose: Primary identifier for the example

2. description:
   - Type: String
   - Required: false
   - Purpose: Additional information about the example

3. createdAt:
   - Type: Date
   - Default: Current timestamp
   - Purpose: Record creation tracking

### Features
- Basic schema structure
- Required field validation
- Timestamp tracking
- Mongoose integration

### Purpose
- Demonstrates model creation
- Shows basic schema setup
- Illustrates field definitions
- Example of timestamps usage

### Usage
Used for:
- Learning purposes
- Template creation
- Schema demonstration
- Basic model structure

---

## Feedback Model

File: `Feedback.js`

This model manages user feedback and ratings in the system.

### Schema Definition

```javascript
const feedbackSchema = new mongoose.Schema({
    // User Identification
    messengerId: { type: String, required: true },
    pageId: String,
    playerName: String,

    // Feedback Content
    category: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true },

    // Integration Data
    manyChatData: { type: Object, required: true }
}, {
    timestamps: true
})
```

### Fields
1. User Identification:
   - messengerId: Unique identifier from messenger
   - pageId: Associated page identifier
   - playerName: Name of the player providing feedback

2. Feedback Content:
   - category: Type/category of feedback
   - rating: Numerical rating (1-5 stars)
   - text: Detailed feedback message

3. Integration:
   - manyChatData: Complete data from ManyChat

### Middleware
```javascript
feedbackSchema.pre('save', function(next) {
    console.log('Saving feedback:', {
        messengerId: this.messengerId,
        category: this.category,
        rating: this.rating
    });
    next();
});
```

### Features
- Rating system (1-5 stars)
- Category classification
- Messenger integration
- Timestamp tracking
- Logging middleware

### Validation
- Required fields:
  - messengerId
  - category
  - rating
  - text
  - manyChatData
- Rating range: 1-5

### Usage
Used for:
- Customer feedback
- Service ratings
- User satisfaction tracking
- Quality monitoring
- Service improvement

### Integration
- ManyChat platform
- Messenger services
- Rating systems
- Feedback analysis

---

## Pending Player Model

File: `PendingPlayer.js`

This model manages player registration requests before they are approved and become full players.

### Schema Definition

```javascript
const pendingPlayerSchema = new mongoose.Schema({
    // ManyChat Integration Data
    manyChatData: {
        key: String,
        id: String,
        page_id: String,
        status: String,
        first_name: String,
        last_name: String,
        name: String,
        gender: String,
        profile_pic: String,
        locale: String,
        language: String,
        timezone: String,
        live_chat_url: String,
        subscribed: Date,
        last_interaction: Date,
        custom_fields: {
            entry_code: String,
            entry_valid: Boolean,
            firekirin_username: String,
            gamevault_username: String,
            juwa_username: String,
            load_amount: Number,
            load_game_platform: String,
            orionstars_username: String,
            team_code: String
        }
    },

    // Referral Information
    referrer_code: { type: String, default: null },

    // Registration Status
    registrationStatus: { 
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },

    // Processing Details
    processedBy: { type: ObjectId, ref: 'User' },
    processedAt: Date,
    remarks: String,
    createdAt: { type: Date, default: Date.now }
})
```

### Middleware

#### Pre-save Logging
```javascript
pendingPlayerSchema.pre('save', function(next) {
    console.log('Saving pending player:', {
        messengerId: this.manyChatData?.id,
        referrer_code: this.referrer_code,
        registrationStatus: this.registrationStatus
    });
    next();
});
```

#### Post-save Socket Updates
```javascript
pendingPlayerSchema.post('save', async function(doc) {
    // Emits real-time updates via WebSocket
    // Updates registration status changes
});
```

### Indexes
```javascript
pendingPlayerSchema.index({ registrationStatus: 1, createdAt: 1 });
```

### Features
1. Player Information:
   - Basic details (name, gender)
   - Profile information
   - Contact details
   - Game platform usernames

2. Registration Management:
   - Status tracking
   - Processing details
   - Approval workflow
   - Rejection handling

3. Integration:
   - ManyChat platform
   - Real-time updates
   - Referral system
   - Custom fields

### Status Types
- pending: Initial registration state
- approved: Registration accepted
- rejected: Registration denied

### Custom Fields
- entry_code: Player's entry code
- entry_valid: Code validation status
- game usernames:
  - firekirin_username
  - gamevault_username
  - juwa_username
  - orionstars_username
- team_code: Team assignment
- load details:
  - load_amount
  - load_game_platform

### Real-time Features
- Socket.io integration
- Status updates
- Registration notifications
- Processing alerts

### Usage
Used for:
- Player registration
- Approval process
- Referral tracking
- Data validation
- Status monitoring

### Security
- Status validation
- Processor tracking
- Timestamp recording
- Audit logging

---

## Player Model

File: `Player.js`

This model manages player accounts and their associated game data, including referrals, limits, and history.

### Constants

```javascript
const GAME_PLATFORMS = [
    'Orion Stars', 'Fire Kirin', 'Game Vault',
    'VBlink', 'Vegas Sweeps', 'Ultra Panda',
    'Yolo', 'Juwa', 'Moolah', 'Panda Master'
];
```

### Sub-Schemas

#### Redeem History Schema
```javascript
const redeemHistorySchema = new mongoose.Schema({
    redeemId: { type: String, default: uuidv4 },
    amount: Number,
    gamePlatform: String,
    status: { 
        type: String,
        enum: ['pending', 'under_processing', 'rejected', 'processed', 
               'verification_failed', 'queued', 'paused', 'under_pending',
               'queued_partially_paid', 'paused_partially_paid', 'completed']
    },
    creditsRedeem: Number,
    requestedAt: { type: Date, default: Date.now },
    processedAt: Date,
    verifiedAt: Date,
    completedAt: Date
});
```

### Main Schema Definition

```javascript
const playerSchema = new mongoose.Schema({
    // Identification
    vipCode: { type: String, required: true, unique: true },
    messengerId: { type: String, required: true, unique: true },
    playerName: { type: String, required: true },

    // Referral System
    referredBy: { type: ObjectId, ref: 'Player' },
    referredByVipCode: String,
    referralCount: { type: Number, default: 0 },
    referralBonusBalance: { type: Number, default: 0 },

    // Profile Information
    profile: {
        firstName: String,
        lastName: String,
        fullName: String,
        email: String,
        phone: String,
        gender: String,
        profilePic: String,
        language: String,
        timezone: String
    },

    // Game Information
    gameUsernames: {
        orionStars: String,
        fireKirin: String,
        gameVault: String,
        // ... other game platforms
    },

    // Financial Information
    paymentMethods: [{
        type: { type: String, enum: ['cashapp', 'venmo', 'chime', 'crypto'] },
        username: String,
        details: {
            accountNumber: String,
            bankName: String,
            ifscCode: String,
            upiId: String,
            cryptoAddress: String
        },
        isDefault: Boolean,
        isVerified: Boolean
    }],

    // Limits and History
    gameLimits: Map,
    dailyRedeemLimit: {
        limit: { type: Number, default: 2000 },
        redeemed: { type: Number, default: 0 },
        remaining: { type: Number, default: 2000 },
        lastUpdated: Date
    },
    redeemHistory: [redeemHistorySchema]
}, {
    timestamps: true
});
```

### Methods

#### updateGameLimits
```javascript
playerSchema.methods.updateGameLimits = async function(gamePlatform, amount, status)
```
Updates game-specific limits:
- Tracks redeemed amounts
- Manages pending amounts
- Updates remaining limits
- Handles status changes

#### checkRedeemLimits
```javascript
playerSchema.methods.checkRedeemLimits = async function(requestedAmount, gamePlatform)
```
Validates redeem requests:
- Checks daily limits
- Validates game-specific limits
- Enforces min/max amounts
- Handles limit resets

### Features
1. Player Management:
   - Unique identification
   - Profile management
   - Status tracking
   - Activity monitoring

2. Game Integration:
   - Multiple platform support
   - Username management
   - Platform-specific limits
   - Redeem history

3. Financial System:
   - Payment methods
   - Transaction limits
   - Daily restrictions
   - Balance tracking

4. Referral System:
   - Referral tracking
   - Bonus management
   - VIP code system
   - Referral counting

### Limits and Restrictions
- Daily redeem limit: $2000
- Min redeem amount: $30
- Max redeem amount: $500
- Platform-specific limits
- Holding percentage

### Status Types
- active: Normal operation
- inactive: Temporarily disabled
- banned: Permanently restricted

### Security Features
- Unique VIP codes
- Payment verification
- Status management
- Limit enforcement
- Activity tracking

---

## Promotion Model

File: `Promotion.js`

This model manages promotional offers and discounts in the system.

### Schema Definition

```javascript
const promotionSchema = new mongoose.Schema({
    // Basic Information
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, required: true },
    
    // Promotion Type and Value
    type: { type: String, enum: ['FIXED', 'PERCENTAGE'], required: true },
    amount: { type: Number, required: for_fixed_type },
    percentage: { type: Number, min: 0, max: 100, required: for_percentage_type },
    maxDiscount: { type: Number, required: for_percentage_type },

    // Usage Limits
    minRechargeAmount: { type: Number, required: true },
    maxRechargeAmount: { type: Number, required: true },
    currentUsage: { type: Number, default: 0 },
    maxUsagePerUser: { type: Number, required: true },
    totalUsageLimit: { type: Number, required: true },

    // Referral Features
    isReferralPromo: { type: Boolean, default: false },
    referralBalance: { type: Number, default: 0, required: for_referral_promos },
    ownerVipCode: { type: String, index: true },

    // Applicability
    applicableGames: [String],
    applicableTeams: [String],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },

    // Usage Tracking
    claimedPlayers: [String],
    assignedPlayers: [{
        vipCode: String,
        playerName: String,
        team: String,
        assignedAt: Date,
        assignedBy: {
            userId: ObjectId,
            name: String,
            email: String,
            role: String,
            team_code: String
        },
        unassignedAt: Date,
        unassignedBy: {
            userId: ObjectId,
            name: String,
            email: String,
            role: String,
            team_code: String
        },
        status: { type: String, enum: ['assigned', 'unassigned'] }
    }]
}, {
    timestamps: true
});
```

### Indexes
```javascript
promotionSchema.index({ code: 1 });
promotionSchema.index({ isActive: 1 });
promotionSchema.index({ applicableTeams: 1 });
promotionSchema.index({ 'assignedPlayers.vipCode': 1 });
promotionSchema.index({ claimedPlayers: 1 });
```

### Features
1. Promotion Types:
   - Fixed amount discounts
   - Percentage-based discounts
   - Referral rewards
   - Team-specific offers

2. Usage Control:
   - Per-user limits
   - Total usage limits
   - Date range validity
   - Team restrictions
   - Game restrictions

3. Assignment System:
   - Player assignments
   - Assignment tracking
   - Unassignment handling
   - Status management

4. Referral System:
   - Referral promotions
   - Balance tracking
   - Owner assignment
   - Usage tracking

### Validation Rules
- Code uniqueness
- Type-specific requirements
- Amount/percentage validation
- Date range validation
- Usage limit validation

### Status Types
- assigned: Currently assigned to player
- unassigned: Removed from player

### Usage Tracking
- Current usage count
- Claimed players list
- Assignment history
- Usage limits
- Date restrictions

### Security Features
- Unique codes
- Usage limitations
- Assignment tracking
- Status validation
- Team restrictions

### Integration
- Player system
- Team system
- Game platforms
- Referral system
- User management

---

## Promotion Usage Model

File: `PromotionUsage.js`

This model tracks the usage of promotions by users, including discount calculations and transaction details.

### Schema Definition

```javascript
const promotionUsageSchema = new mongoose.Schema({
    // References
    promotionId: { type: ObjectId, ref: 'Promotion', required: true },
    userId: { type: ObjectId, ref: 'User', required: true },
    teamId: { type: String, required: true },
    gameId: { type: String, required: true },

    // Financial Details
    amount: { type: Number, required: true },
    discountAmount: { type: Number, required: true },
    finalAmount: { type: Number, required: true }
}, {
    timestamps: true
});
```

### Indexes
```javascript
promotionUsageSchema.index({ promotionId: 1, userId: 1 });
promotionUsageSchema.index({ teamId: 1 });
```

### Features
1. Usage Tracking:
   - Promotion reference
   - User identification
   - Team association
   - Game tracking

2. Financial Tracking:
   - Original amount
   - Discount amount
   - Final amount
   - Transaction timing

3. Relationship Management:
   - User-Promotion linking
   - Team association
   - Game platform tracking

### Fields
1. References:
   - promotionId: Links to promotion
   - userId: Links to user
   - teamId: Team identifier
   - gameId: Game platform identifier

2. Amounts:
   - amount: Original transaction amount
   - discountAmount: Applied discount
   - finalAmount: Post-discount amount

### Purpose
Used for:
- Promotion tracking
- Usage monitoring
- Discount calculation
- Transaction history
- Analytics support

### Integration
- Promotion system
- User management
- Team system
- Game platforms
- Financial tracking

### Querying Support
- User usage history
- Promotion effectiveness
- Team-based analysis
- Financial reporting

### Security
- Reference validation
- Amount validation
- Usage tracking
- Audit support

---

## Recharge Request Model

File: `RechargeRequest.js`

This model manages recharge requests for game platforms, including payment processing and status tracking.

### Schema Definition

```javascript
const rechargeRequestSchema = new mongoose.Schema({
    // Identification
    rechargeId: { type: String, required: true, unique: true },
    messengerId: { type: String, required: true },
    pageId: String,
    playerName: { type: String, required: true },

    // Game Details
    gamePlatform: { type: String, required: true, enum: GAME_PLATFORMS },
    gameUsername: { type: String, required: true },
    teamCode: { type: String, default: 'Default' },

    // Financial Details
    amount: { type: Number, required: true, min: 0 },
    bonusAmount: { type: Number, default: 0 },
    creditsLoaded: { type: Number, default: 0 },
    promotion: String,

    // Status and Processing
    status: {
        type: String,
        enum: ['pending', 'under_processing', 'completed', 'rejected', 
               'cancelled', 'assigned_and_hold', 'screenshot_processed', 
               'promo_claimed', 'screenshot_rejected'],
        default: 'pending'
    },

    // Initiator Information
    initBy: { type: String, enum: ['player', 'agent'], default: 'player' },
    agentName: String,  // Required if initBy is 'agent'
    agentDepartment: String,  // Required if initBy is 'agent'

    // Additional Details
    notes: String,
    screenshotUrl: String,
    manyChatData: Object,
    processedBy: { type: ObjectId, ref: 'User' },
    processedAt: Date,
    remarks: String,

    // Payment Information
    paymentMethod: {
        type: { type: String, enum: ['cashapp', 'venmo', 'chime'] },
        details: String
    },

    // Redeem Association
    redeemId: { type: String, sparse: true },
    assignedRedeem: {
        redeemId: String,
        amount: Number,
        assignedAt: Date,
        assignedBy: { type: ObjectId, ref: 'User' },
        paymentMethods: [{
            type: { type: String, enum: ['cashapp', 'venmo', 'chime'] },
            username: String
        }],
        tagType: { type: String, enum: ['PT', 'CT'] },
        identifier: String,
        playerDetails: {
            username: String,
            totalAmount: Number,
            amountPaid: Number,
            amountHold: Number,
            amountAvailable: Number
        }
    }
}, {
    timestamps: true
});
```

### Indexes
```javascript
rechargeRequestSchema.index({ createdAt: -1 });
rechargeRequestSchema.index({ status: 1, createdAt: -1 });
rechargeRequestSchema.index({ messengerId: 1 });
rechargeRequestSchema.index({ rechargeId: 1 });
```

### Middleware
```javascript
rechargeRequestSchema.pre('save', function(next) {
    // Logging middleware
    // Validation for assignedRedeem.tagType
});
```

### Features
1. Request Management:
   - Unique identification
   - Status tracking
   - Processing workflow
   - Payment handling

2. Game Integration:
   - Platform support
   - Username tracking
   - Credits management
   - Team association

3. Financial Tracking:
   - Amount management
   - Bonus calculation
   - Promotion handling
   - Payment methods

4. Processing Flow:
   - Status progression
   - Agent processing
   - Screenshot verification
   - Completion tracking

### Status Types
- pending: Initial state
- under_processing: Being processed
- completed: Successfully finished
- rejected: Request denied
- cancelled: Request cancelled
- assigned_and_hold: Assigned for holding
- screenshot_processed: Screenshot verified
- promo_claimed: Promotion applied
- screenshot_rejected: Screenshot invalid

### Payment Methods
- cashapp
- venmo
- chime

### Tag Types
- PT: Player Tag
- CT: Company Tag

### Security Features
- Unique IDs
- Status validation
- Process tracking
- Agent tracking
- Payment validation

### Integration
- ManyChat platform
- Game platforms
- Payment systems
- User management
- Team system

---

## Redeem Request Model

File: `RedeemRequest.js`

This model manages redemption requests from players, including verification, processing, and payment tracking.

### Schema Definition

```javascript
const redeemRequestSchema = new mongoose.Schema({
    // Integration Data
    manyChatData: { type: Object, required: true },
    entryCode: { type: String, required: true },

    // Initiator Information
    initBy: { type: String, enum: ['agent', 'player'], default: 'player' },
    agentName: String,  // Required if initBy is 'agent'
    agentDepartment: String,  // Required if initBy is 'agent'

    // Game Information
    username: { type: String, required: true },
    gamePlatform: { type: String, required: true },

    // Financial Details
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    amountHold: { type: Number, default: 0 },
    amountAvailable: { type: Number, default: calculated },
    creditsRedeem: { type: Number },

    // Payment Methods
    paymentMethods: [{
        type: { type: String, enum: ['cashapp', 'venmo', 'chime'] },
        username: String
    }],

    // Assignments
    assignments: [{
        rechargeId: String,
        amount: Number,
        status: { type: String, enum: ['pending', 'completed', 'cancelled'] },
        assignedAt: Date,
        assignedBy: ObjectId,
        screenshotVerified: Boolean,
        verifiedAt: Date,
        verifiedBy: ObjectId,
        completedAt: Date,
        completedBy: ObjectId,
        cancelledAt: Date,
        cancelledBy: ObjectId,
        paymentMethods: [{ type: String, username: String }]
    }],

    // Status and Processing
    status: {
        type: String,
        enum: ['pending', 'initiated', 'under_processing', 'processed',
               'rejected', 'verification_failed', 'queued', 'paused',
               'queued_partially_paid', 'paused_partially_paid',
               'completed', 'unverified'],
        default: 'pending'
    },

    // OTP Verification
    otp: {
        code: String,
        generatedAt: Date,
        verifiedAt: Date,
        attempts: Number,
        maxAttempts: Number
    },

    // Request Details
    redeemId: { type: String, required: true, unique: true },
    requestedAt: { type: Date, default: Date.now },
    remarks: String,
    verificationRemarks: String,
    paymentRemarks: String
}, {
    timestamps: true,
    collection: 'redeemrequests'
});
```

### Middleware

#### Pre-save Hook
```javascript
redeemRequestSchema.pre('save', function(next) {
    // Calculates available amount
    // Logs save operation details
});
```

#### Post-save Hook
```javascript
redeemRequestSchema.post('save', async function(doc) {
    // Emits socket updates
    // Handles verification requests
});
```

### Features
1. Request Management:
   - Unique identification
   - Status tracking
   - Amount management
   - Payment tracking

2. Verification System:
   - OTP verification
   - Attempt tracking
   - Screenshot verification
   - Status updates

3. Payment Processing:
   - Multiple payment methods
   - Amount tracking
   - Partial payments
   - Hold management

4. Assignment System:
   - Recharge linking
   - Status tracking
   - Verification flow
   - Completion handling

### Status Types
- pending: Initial state
- initiated: Process started
- under_processing: Being processed
- processed: Processing complete
- rejected: Request denied
- verification_failed: Verification issues
- queued: In processing queue
- paused: Processing paused
- completed: Successfully finished
- unverified: Pending verification

### Validations
- Amount validations:
  - Paid amount ≤ Total amount
  - Hold amount ≤ Remaining amount
  - Credits ≤ Total amount
- Payment method validations
- Status transitions
- OTP verification

### Real-time Features
- Socket.io integration
- Status updates
- Verification notifications
- Processing alerts

### Security
- OTP system
- Attempt limiting
- Status validation
- Amount validation
- Process tracking

### Integration
- ManyChat platform
- Socket system
- Payment systems
- User management
- Game platforms

---

## Redeem Subscriber Model

File: `RedeemSubscriber.js`

This model manages subscribers who can make redeem requests, tracking their history and limits.

### Schema Definition

```javascript
const redeemSubscriberSchema = new mongoose.Schema({
    // Integration Data
    manyChatData: { type: Object, required: true },
    messengerId: { type: String, required: true, unique: true },
    entryCode: { type: String, sparse: true },
    team_code: { type: String, default: 'Default' },

    // Status Information
    lastActive: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },

    // Redeem History
    redeemHistory: [{
        redeemId: String,
        totalAmount: Number,
        amountPaid: { type: Number, default: 0 },
        amountHold: { type: Number, default: 0 },
        amountAvailable: { type: Number, default: calculated },
        creditsRedeem: { type: Number },
        gamePlatform: String,
        status: {
            type: String,
            enum: ['pending', 'under_processing', 'processed', 'rejected',
                   'verification_failed', 'queued', 'paused',
                   'queued_partially_paid', 'paused_partially_paid',
                   'completed'],
            default: 'pending'
        },
        requestedAt: Date,
        processedAt: Date,
        verifiedAt: Date,
        completedAt: Date
    }]
}, {
    timestamps: true
});
```

### Methods

#### checkRedeemLimits
```javascript
redeemSubscriberSchema.methods.checkRedeemLimits = async function(requestedAmount, gamePlatform)
```
Validates redeem requests against limits:
- Checks daily limits
- Validates platform limits
- Enforces min/max amounts
- Returns:
  - dailyRemaining
  - platformTotals
  - warnings
  - canRedeem status

### Features
1. Subscriber Management:
   - Unique identification
   - Status tracking
   - Activity monitoring
   - Team association

2. Redeem History:
   - Transaction tracking
   - Amount management
   - Status progression
   - Timestamp recording

3. Limit Management:
   - Daily limits ($2000)
   - Platform limits ($500)
   - Minimum amount ($30)
   - Maximum amount ($500)

4. Amount Tracking:
   - Total amounts
   - Paid amounts
   - Hold amounts
   - Available amounts

### Status Types
1. Subscriber Status:
   - active: Can make requests
   - blocked: Cannot make requests

2. Redeem Status:
   - pending: Initial state
   - under_processing: Being processed
   - processed: Processing complete
   - rejected: Request denied
   - verification_failed: Failed verification
   - queued: In processing queue
   - paused: Processing paused
   - completed: Successfully finished

### Validations
- Unique messenger ID
- Amount validations
- Credit validations
- Status transitions
- Limit checks

### Limit Rules
1. Daily Limits:
   - Maximum: $2000 per day
   - Reset at midnight

2. Platform Limits:
   - Maximum: $500 per platform
   - Includes pending amounts

3. Amount Rules:
   - Minimum: $30
   - Maximum: $500
   - Available ≤ Total - Hold

### Integration
- ManyChat platform
- Game platforms
- Team system
- Limit system
- Status tracking

### Security Features
- Status validation
- Amount validation
- Limit enforcement
- History tracking
- Activity monitoring

---

## Referral Model

File: `Referral.js`

This model manages referral relationships between players and tracks referral bonuses.

### Sub-Schemas

#### Referee Schema
```javascript
const refereeSchema = new mongoose.Schema({
    // Identification
    refereeId: { type: ObjectId, ref: 'Player', required: true },
    refereeVipCode: { type: String, required: true },
    
    // Profile Information
    name: String,
    profilePic: String,
    team: String,
    
    // Status and Progress
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    totalDeposits: { type: Number, default: 0 },
    bonusAwarded: { type: Boolean, default: false },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
```

### Main Schema Definition

```javascript
const referralSchema = new mongoose.Schema({
    // Referrer Information
    referrerId: { type: ObjectId, ref: 'Player', required: true },
    referrerVipCode: { type: String, required: true },
    referrerDetails: {
        name: String,
        profilePic: String,
        team: String
    },
    
    // Referees List
    referees: [refereeSchema],
    
    // Statistics
    totalReferrals: { type: Number, default: 0 },
    completedReferrals: { type: Number, default: 0 }
}, {
    timestamps: true
});
```

### Indexes
```javascript
referralSchema.index({ referrerVipCode: 1 });
referralSchema.index({ 'referees.refereeVipCode': 1 });
```

### Features
1. Referrer Management:
   - Unique identification
   - Profile tracking
   - Team association
   - Statistics tracking

2. Referee Tracking:
   - Profile information
   - Status monitoring
   - Deposit tracking
   - Bonus management

3. Statistics:
   - Total referral count
   - Completed referrals
   - Success rate tracking
   - Bonus distribution

### Status Types
- pending: Initial referral state
- completed: Referral requirements met

### Tracking Features
1. Referrer:
   - VIP code
   - Profile details
   - Team affiliation
   - Referral counts

2. Referee:
   - VIP code
   - Profile details
   - Deposit amounts
   - Bonus status

### Relationships
- One-to-Many (Referrer to Referees)
- Player model integration
- Team association
- Bonus system

### Usage
Used for:
- Referral tracking
- Bonus management
- Statistics gathering
- Performance monitoring

### Integration
- Player system
- Team system
- Bonus system
- Profile management

### Security Features
- Unique VIP codes
- Status validation
- Bonus validation
- Relationship tracking

### Performance
- Indexed lookups
- Efficient queries
- Relationship tracking
- Statistics calculation

---

## Reset Password Request Model

File: `ResetPasswordRequest.js`

This model manages password reset requests from players, tracking the request lifecycle and processing details.

### Schema Definition

```javascript
const resetPasswordRequestSchema = new mongoose.Schema({
    // Identification
    requestId: { type: String, required: true, unique: true },
    messengerId: { type: String, required: true },
    pageId: { type: String, required: true },
    
    // Player Information
    playerName: { type: String, required: true },
    gamePlatform: { type: String, required: true },
    gameUsername: { type: String, required: true },
    teamCode: { type: String, required: true },
    
    // Status and Processing
    status: {
        type: String,
        enum: ['pending', 'processed', 'cancelled'],
        default: 'pending'
    },
    
    // Integration Data
    manyChatData: { type: Object, required: true },
    
    // Processing Details
    processedAt: Date,
    processedBy: { type: ObjectId, ref: 'User' },
    cancelledAt: Date,
    cancelledBy: { type: ObjectId, ref: 'User' },
    remarks: String
}, {
    timestamps: true
});
```

### Features
1. Request Management:
   - Unique request identification
   - Status tracking
   - Processing workflow
   - Cancellation handling

2. Player Information:
   - Player identification
   - Game platform details
   - Team association
   - Username tracking

3. Processing Details:
   - Processor tracking
   - Timestamp recording
   - Remarks handling
   - Status updates

### Status Types
- pending: Initial request state
- processed: Password reset completed
- cancelled: Request cancelled

### Middleware
- Pre-save logging for tracking changes
- Secure logging of sensitive information
- Status transition validation

### Integration
- ManyChat platform
- User management system
- Game platforms
- Team system

### Security Features
- Unique request IDs
- Status validation
- Process tracking
- User authentication
- Secure logging

### Usage
Used for:
- Password reset management
- Request tracking
- Process monitoring
- Security compliance
- Audit logging

### Validation
- Required fields validation
- Status transition rules
- User authentication
- Request uniqueness

---

## Transaction Model

File: `Transaction.js`

This model tracks all financial transactions in the system, including recharges, redeems, and their associated statuses and details.

### Schema Definition

```javascript
const transactionSchema = new mongoose.Schema({
    // Reference IDs
    rechargeId: { type: String, index: true },
    redeemId: { type: String, index: true },
    
    // User Identification
    messengerId: { type: String, required: true, index: true },
    pageId: { type: String, index: true },
    
    // Status Information
    previousStatus: {
        type: String,
        enum: ['pending', 'under_processing', 'completed', 'rejected', 'cancelled', 
               'assigned', 'assigned_and_hold', 'screenshot_processed', 'promo_claimed', 
               'screenshot_rejected', 'queued_partially_paid', 'processed']
    },
    currentStatus: {
        type: String,
        required: true,
        enum: ['pending', 'under_processing', 'completed', 'rejected', 'cancelled', 
               'assigned', 'assigned_and_hold', 'screenshot_processed', 'promo_claimed', 
               'screenshot_rejected', 'queued_partially_paid', 'processed']
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'disputed'],
        default: 'pending'
    },
    
    // Financial Details
    amount: { type: Number },
    bonusAmount: { type: Number, default: 0 },
    creditsLoaded: Number,
    
    // Game Information
    gamePlatform: String,
    gameUsername: String,
    teamCode: String,
    promotion: String,
    
    // Payment Information
    screenshotUrl: String,
    paymentMethod: {
        type: { type: String, enum: ['cashapp', 'venmo', 'chime', 'crypto'] },
        details: String
    },
    
    // Company Tag Details
    companyTag: {
        cId: String,
        previousBalance: Number,
        currentBalance: Number,
        amount: Number
    },
    
    // Redeem Request Details
    redeemRequest: {
        redeemId: String,
        totalAmount: Number,
        amountPaid: Number,
        amountHold: Number,
        amountAvailable: Number,
        previousStatus: String,
        currentStatus: String,
        paymentMethods: [{
            type: { type: String, enum: ['cashapp', 'venmo', 'chime'] },
            username: String
        }]
    },
    
    // Assignment Details
    assignedRedeem: {
        redeemId: String,
        amount: Number,
        assignedAt: Date,
        assignedBy: { type: ObjectId, ref: 'User' },
        tagType: { type: String, enum: ['PT', 'CT'] },
        paymentMethods: [{
            type: { type: String, enum: ['cashapp', 'venmo', 'chime'] },
            username: String
        }],
        messengerId: String,
        pageId: String
    },
    
    // Action Tracking
    actionBy: { type: ObjectId, ref: 'User', required: true },
    verifiedBy: { type: ObjectId, ref: 'User' },
    assignedBy: { type: ObjectId, ref: 'User' },
    processedBy: { type: ObjectId, ref: 'User' },
    completedBy: { type: ObjectId, ref: 'User' },
    cancelledBy: { type: ObjectId, ref: 'User' },
    
    // Timestamps
    verifiedAt: Date,
    assignedAt: Date,
    processedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    
    // Additional Information
    remarks: String
}, {
    timestamps: true
});
```

### Features
1. Transaction Tracking:
   - Recharge tracking
   - Redeem tracking
   - Status history
   - Payment verification

2. Financial Management:
   - Amount tracking
   - Bonus calculation
   - Credits management
   - Balance updates

3. Status Management:
   - Previous status
   - Current status
   - Payment status
   - Process tracking

4. User Actions:
   - Action tracking
   - Verification tracking
   - Assignment tracking
   - Process completion

### Status Types
1. Transaction Status:
   - pending: Initial state
   - under_processing: Being processed
   - completed: Successfully finished
   - rejected: Transaction denied
   - cancelled: Transaction cancelled
   - assigned: Assigned for processing
   - assigned_and_hold: Assigned with hold
   - screenshot_processed: Screenshot verified
   - promo_claimed: Promotion applied
   - screenshot_rejected: Screenshot invalid
   - queued_partially_paid: Partial payment queued
   - processed: Processing complete

2. Payment Status:
   - pending: Awaiting verification
   - verified: Payment confirmed
   - rejected: Payment rejected
   - disputed: Under dispute

### Tag Types
- PT: Player Tag
- CT: Company Tag

### Payment Methods
- cashapp
- venmo
- chime
- crypto

### Security Features
- Status validation
- Amount tracking
- User action tracking
- Payment verification
- Process monitoring

### Integration
- User system
- Redeem system
- Recharge system
- Company tag system
- Payment platforms

### Usage
Used for:
- Financial tracking
- Transaction history
- Payment processing
- Status monitoring
- Audit logging

### Performance
- Indexed lookups
- Status tracking
- Balance monitoring
- Action tracking

---

## User Model

File: `User.js`

This model manages user accounts for system administrators, agents, and staff members, including their roles, permissions, and authentication.

### Constants

```javascript
const departments = ['Operations', 'Support', 'Verification', 'Finance', 'Admin'];
const roles = {
    Operations: ['Agent', 'Team Lead', 'Manager'],
    Support: ['Agent', 'Team Lead', 'Manager'],
    Verification: ['Agent', 'Team Lead', 'Manager'],
    Finance: ['Agent', 'Team Lead', 'Manager'],
    Admin: ['Admin', 'Executive']
};
```

### Schema Definition

```javascript
const userSchema = new mongoose.Schema({
    // Basic Information
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    
    // Role Information
    department: {
        type: String,
        required: true,
        enum: departments
    },
    role: {
        type: String,
        required: true
    },
    
    // Status
    status: {
        type: String,
        enum: ['active', 'disabled'],
        default: 'active'
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    }
});
```

### Middleware

#### Role Validation
```javascript
userSchema.pre('save', function(next) {
    if (!roles[this.department].includes(this.role)) {
        next(new Error(`Invalid role ${this.role} for department ${this.department}`));
    }
    next();
});
```

#### Password Hashing
```javascript
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});
```

### Methods

#### comparePassword
```javascript
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};
```

### Features
1. User Management:
   - Account creation
   - Role assignment
   - Department organization
   - Status tracking

2. Authentication:
   - Secure password storage
   - Password comparison
   - Email validation
   - Status checks

3. Role System:
   - Department-based roles
   - Role validation
   - Permission levels
   - Hierarchical structure

### Departments
1. Operations:
   - Agent
   - Team Lead
   - Manager

2. Support:
   - Agent
   - Team Lead
   - Manager

3. Verification:
   - Agent
   - Team Lead
   - Manager

4. Finance:
   - Agent
   - Team Lead
   - Manager

5. Admin:
   - Admin
   - Executive

### Status Types
- active: User can access system
- disabled: User access revoked

### Security Features
1. Password Security:
   - Bcrypt hashing
   - Salt rounds: 10
   - Password comparison
   - Modified tracking

2. Access Control:
   - Role validation
   - Department restrictions
   - Status checks
   - Email uniqueness

### Validation
- Required fields:
  - email
  - password
  - name
  - department
  - role
- Email format
- Role-department match
- Status values

### Usage
Used for:
- User authentication
- Access control
- Role management
- Department organization
- System security

### Integration
- Authentication system
- Permission system
- Activity logging
- Department management
- Role hierarchy

--- 