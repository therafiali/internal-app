# Database Structure Documentation

This directory contains the database schema, functions, triggers, and other database objects for the Techmile Dashboard application. The database is built using PostgreSQL with Supabase extensions.

## Directory Structure

```
database/
├── functions/
│   ├── functions.sql      # Core functions for user, player, and request management
│   ├── functions_2.sql    # Additional functions for request processing and validation
│   └── functions_3.sql    # Utility functions and cleanup procedures
├── migrations/
│   └── migrations.sql     # Database migrations and additional objects
├── triggers/
│   └── triggers.sql       # All database triggers
├── tables/
│   └── tables.sql         # Table definitions and indexes
└── types/
    └── custom_types.sql   # Custom ENUM types and other type definitions
```

## Database Objects

### Custom Types
- `ent_type`: Enum for entertainment platforms ('orion_stars', 'fire_kirin', 'game_vault')
- `payment_status`: Enum for payment statuses ('pending', 'verified', 'rejected', 'disputed')
- `deposit_status`: Enum for deposit statuses ('pending', 'completed', 'failed', 'cancelled')
- `user_status`: Enum for user statuses ('active', 'inactive', 'suspended')
- `user_role`: Enum for user roles ('admin', 'manager', 'agent', 'viewer')
- `action_status_type`: Enum for action statuses ('idle', 'in_progress')
- `request_processing_state`: Composite type for processing state tracking

### Tables
1. `users`: User management and authentication
2. `players`: Player profiles and game-related information
3. `company_tags`: Company payment tags and balance tracking
4. `recharge_requests`: Player recharge request management
5. `redeem_requests`: Player redemption request management
6. `transactions`: Transaction history and tracking
7. `ct_activity_logs`: Activity logs for company tags

### Functions
The functions are organized into three files based on their purposes:

#### functions.sql
- Core functions for user management
- Player profile management
- Basic request handling

#### functions_2.sql
- Request processing functions
- Processing state management
- Balance management
- Validation functions

#### functions_3.sql
- User management functions
- Player management functions
- Payment processing functions
- Utility functions
- Cleanup functions

### Migrations
The migrations.sql file contains:
- Additional type definitions
- Table alterations and new columns
- Helper functions for request validation
- P2P assignment handling
- Status mapping functions

### Triggers
The triggers.sql file contains all database triggers, including:
- VIP code management
- Transaction management
- Status synchronization
- Activity logging
- Assignment validation

## Key Features

1. **User Management**
   - Role-based access control
   - User metadata synchronization
   - Department and entertainment section management

2. **Player Management**
   - VIP code generation and tracking
   - Referral system
   - Game username management
   - Daily redeem limits

3. **Payment Processing**
   - Recharge and redeem request handling
   - Multiple payment method support
   - Balance tracking and validation
   - Company tag management
   - P2P assignments

4. **Transaction Tracking**
   - Comprehensive transaction history
   - Status tracking and synchronization
   - Deposit status management
   - Request ID validation

5. **Activity Logging**
   - Company tag activity tracking
   - Data change logging
   - Audit trail maintenance

6. **State Management**
   - Processing state tracking
   - Action status monitoring
   - Stale state cleanup
   - Assignment validation

## Database Maintenance

The database includes several cleanup and maintenance functions:
- `rollback_vip_code_column()`
- `rollback_deposit_status_changes()`
- `rollback_vip_code_functions()`
- `remove_all_transaction_triggers()`
- `release_stale_processing_states()`

These functions can be used to safely remove or modify database features when needed.

## Performance Considerations

The database schema includes appropriate indexes for:
- VIP code lookups
- Player identification
- Transaction tracking
- Activity log filtering
- Action status queries

All tables include `created_at` and `updated_at` timestamps for tracking and auditing purposes. 