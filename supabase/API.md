# Supabase Edge Functions API Documentation

## Base URL
```
https://qgixcznoxktrxdcytyxo.supabase.co/functions/v1
```

## Authentication
All endpoints require authentication using the Supabase API key in the headers:
```
Authorization: Bearer [YOUR_SUPABASE_ANON_KEY]
```

## Available Endpoints

### 1. Update Recharge Request Status
Updates the status of a recharge request in the system.

**Endpoint:** `/update-recharge-status`
**Method:** POST
**Content-Type:** application/json

#### Request Body
```json
{
  "request_id": "string",
  "status": "string",
  "remarks": "string (optional)"
}
```

#### Status Values
The following status values are supported:
- `sc_processed` - Processed by support center
- `assigned` - Request assigned to agent
- `pending` - Request is pending
- `completed` - Request has been completed
- `rejected` - Request was rejected
- `cancel` - Request was cancelled
- `approved` - Request was approved
- `sc_submitted` - Submitted to support center

#### Business Rules
1. Cannot change status to `cancel` if current status is `completed`
2. All status transitions require a valid `request_id`
3. `remarks` field is optional but recommended for status changes

#### Success Response
```json
{
  "data": {
    "id": "string",
    "status": "string",
    "remarks": "string",
    "updated_at": "timestamp",
    // ... other fields
  }
}
```

#### Error Response
```json
{
  "error": "Error message description"
}
```

#### Possible Error Messages
- "Missing required fields: request_id or status"
- "Invalid status value. Must be one of: [status list]"
- "Recharge request not found"
- "Cannot cancel a completed request"

#### Example cURL Request
```bash
curl -X POST 'https://qgixcznoxktrxdcytyxo.supabase.co/functions/v1/update-recharge-status' \
-H 'Authorization: Bearer your-anon-key' \
-H 'Content-Type: application/json' \
-d '{
  "request_id": "123",
  "status": "approved",
  "remarks": "Payment verified"
}'
```

### 2. Validate Promotion
Validates a promotion code for a specific VIP code by checking the promotion_assignments table.

**Endpoint:** `/validate-promotion`
**Method:** POST
**Content-Type:** application/json

#### Request Body
```json
{
  "vip_code": "string",
  "promotion_id": "string"
}
```

#### Success Response
```json
{
  "data": {
    "is_valid": boolean,
    "promotion_details": {
      // Full promotion assignment details if found, null if not found
    },
    "message": "string"
  }
}
```

#### Error Response
```json
{
  "error": "Error message description",
  "is_valid": false
}
```

#### Possible Error Messages
- "Missing required fields: vip_code or promotion_id"
- Database-related errors

#### Example cURL Request
```bash
curl -X POST 'https://qgixcznoxktrxdcytyxo.supabase.co/functions/v1/validate-promotion' \
-H 'Authorization: Bearer your-anon-key' \
-H 'Content-Type: application/json' \
-d '{
  "vip_code": "VIP123",
  "promotion_id": "PROMO456"
}'
```

#### Response Examples

Success (Valid Promotion):
```json
{
  "data": {
    "is_valid": true,
    "promotion_details": {
      "id": "123",
      "vip_code": "VIP123",
      "promotion_id": "PROMO456",
      // ... other fields from promotion_assignments table
    },
    "message": "Promotion code is valid"
  }
}
```

Success (Invalid Promotion):
```json
{
  "data": {
    "is_valid": false,
    "promotion_details": null,
    "message": "Invalid promotion code or VIP code combination"
  }
}
```

### 3. Submit Feedback
Submits user feedback to the system and stores it in the feedback table.

**Endpoint:** `/submit-feedback`
**Method:** POST
**Content-Type:** application/json

#### Request Body
```json
{
  "messenger_id": "string",
  "page_id": "string",
  "player_name": "string",
  "category": "string",
  "rating": "number (1-5)",
  "text": "string",
  "manychat_data": "object (optional)"
}
```

#### Business Rules
1. All fields except `manychat_data` are required
2. Rating must be a number between 1 and 5
3. `manychat_data` is optional and can contain any JSON object

#### Success Response
```json
{
  "message": "Feedback submitted successfully",
  "data": {
    "id": "string",
    "messenger_id": "string",
    "page_id": "string",
    "player_name": "string",
    "category": "string",
    "rating": "number",
    "text": "string",
    "manychat_data": "object",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

#### Error Response
```json
{
  "error": "Error message description"
}
```

#### Possible Error Messages
- "Missing required field: [field_name]"
- "Rating must be a number between 1 and 5"
- "Failed to submit feedback"
- "Method not allowed"
- "Internal server error"

#### Example cURL Request
```bash
curl -X POST 'https://qgixcznoxktrxdcytyxo.supabase.co/functions/v1/submit-feedback' \
-H 'Authorization: Bearer your-anon-key' \
-H 'Content-Type: application/json' \
-d '{
  "messenger_id": "12345",
  "page_id": "page123",
  "player_name": "John Doe",
  "category": "gameplay",
  "rating": 5,
  "text": "Great game!",
  "manychat_data": {
    "custom_field": "value"
  }
}'
```

#### Response Examples

Success:
```json
{
  "message": "Feedback submitted successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "messenger_id": "12345",
    "page_id": "page123",
    "player_name": "John Doe",
    "category": "gameplay",
    "rating": 5,
    "text": "Great game!",
    "manychat_data": {
      "custom_field": "value"
    },
    "created_at": "2024-02-27T12:00:00Z",
    "updated_at": "2024-02-27T12:00:00Z"
  }
}
```

Error (Missing Field):
```json
{
  "error": "Missing required field: rating"
}
```

Error (Invalid Rating):
```json
{
  "error": "Rating must be a number between 1 and 5"
}
```

### 4. Reset Password Request
Submits a password reset request for a player and stores it in the reset_password_requests table.

**Endpoint:** `/reset-password-request`
**Method:** POST
**Content-Type:** application/json

#### Request Body
The endpoint accepts ManyChat webhook data format. The following fields are extracted:

```json
{
  "name": "string",
  "id": "string",
  "custom_fields": {
    "entry_code": "string",
    "team_code": "string",
    "pw_reset_game": "string",
    "load_username": "string (optional)"
  }
}
```

#### Business Rules
1. Required fields:
   - `vip_code` (from custom_fields.entry_code)
   - `player_name` (from name)
   - `messenger_id` (from id)
   - `team_code` (from custom_fields.team_code)
   - `game_platform` (from custom_fields.pw_reset_game)
2. Optional fields:
   - `suggested_username` (from custom_fields.load_username)
3. Default values:
   - `status`: "pending"
   - `init_by`: "player"
   - `processed_by`: null
   - `processed_at`: null

#### Success Response
```json
{
  "message": "Reset password request submitted successfully",
  "data": {
    "id": "string",
    "vip_code": "string",
    "player_name": "string",
    "messenger_id": "string",
    "team_code": "string",
    "game_platform": "string",
    "suggested_username": "string",
    "status": "pending",
    "init_by": "player",
    "processed_by": null,
    "processed_at": null,
    "manychat_data": "object",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

#### Error Response
```json
{
  "error": "Error message description",
  "details": "Detailed error message",
  "code": "Error code"
}
```

#### Possible Error Messages
- "Missing required field: [field_name]"
- "Method not allowed"
- "Failed to submit reset password request"
- "Internal server error"

#### Example cURL Request
```bash
curl -X POST 'https://qgixcznoxktrxdcytyxo.supabase.co/functions/v1/reset-password-request' \
-H 'Authorization: Bearer your-anon-key' \
-H 'Content-Type: application/json' \
-d '{
  "name": "John Doe",
  "id": "12345",
  "custom_fields": {
    "entry_code": "VIP123",
    "team_code": "ENT-1",
    "pw_reset_game": "orion",
    "load_username": "johndoe123"
  }
}'
```

#### Response Examples

Success:
```json
{
  "message": "Reset password request submitted successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "vip_code": "VIP123",
    "player_name": "John Doe",
    "messenger_id": "12345",
    "team_code": "ENT-1",
    "game_platform": "orion",
    "suggested_username": "johndoe123",
    "status": "pending",
    "init_by": "player",
    "processed_by": null,
    "processed_at": null,
    "manychat_data": {
      // Full ManyChat webhook data
    },
    "created_at": "2024-02-27T12:00:00Z",
    "updated_at": "2024-02-27T12:00:00Z"
  }
}
```

Error (Missing Field):
```json
{
  "error": "Missing required field: vip_code",
  "details": "null value in column \"vip_code\" of relation \"reset_password_requests\" violates not-null constraint",
  "code": "23502"
}
```

Error (Method Not Allowed):
```json
{
  "error": "Method not allowed"
}
```

### 5. Submit Recharge Request
Submits a recharge request for a player and stores it in the recharge_requests table.

**Endpoint:** `/submit-recharge-request`
**Method:** POST
**Content-Type:** application/json

#### Request Body
The endpoint accepts ManyChat webhook data format. The following fields are extracted:

```json
{
  "name": "string",
  "id": "string",
  "custom_fields": {
    "entry_code": "string",
    "team_code": "string",
    "load_game_platform": "string",
    "load_username": "string",
    "load_amount": "string",
    "load_promo_code": "string (optional)",
    "load_promo_freeplay": "string (optional)",
    "load_screenshot": "string (optional)"
  }
}
```

#### Business Rules
1. Required fields:
   - `vip_code` (from custom_fields.entry_code)
   - `player_name` (from name)
   - `messenger_id` (from id)
   - `team_code` (from custom_fields.team_code)
   - `game_platform` (from custom_fields.load_game_platform)
   - `game_username` (from custom_fields.load_username)
   - `amount` (from custom_fields.load_amount)
2. Optional fields:
   - `promo_code` (from custom_fields.load_promo_code)
   - `promo_type` (from custom_fields.load_promo_freeplay)
   - `payment_method`
   - `screenshot_url`
3. Default values:
   - `status`: "pending"
   - `init_by`: "player"
4. Validation rules:
   - Amount must be a positive number
   - All required fields must be non-empty

#### Success Response
```json
{
  "message": "Recharge request submitted successfully",
  "data": {
    "id": "string",
    "vip_code": "string",
    "player_name": "string",
    "messenger_id": "string",
    "team_code": "string",
    "game_platform": "string",
    "game_username": "string",
    "amount": "number",
    "status": "pending",
    "promo_code": "string",
    "promo_type": "string",
    "payment_method": "string",
    "screenshot_url": "string",
    "manychat_data": "object",
    "init_by": "player",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

#### Error Response
```json
{
  "error": "Error message description",
  "details": "Detailed error message",
  "code": "Error code"
}
```

#### Possible Error Messages
- "Missing required field: [field_name]"
- "Invalid amount"
- "Failed to submit recharge request"
- "Method not allowed"
- "Internal server error"

#### Example cURL Request
```bash
curl -X POST 'https://qgixcznoxktrxdcytyxo.supabase.co/functions/v1/submit-recharge-request' \
-H 'Authorization: Bearer your-anon-key' \
-H 'Content-Type: application/json' \
-d '{
  "name": "John Doe",
  "id": "12345",
  "custom_fields": {
    "entry_code": "VIP123",
    "team_code": "ENT-1",
    "load_game_platform": "orion",
    "load_username": "johndoe123",
    "load_amount": "100",
    "load_promo_code": "BONUS50",
    "load_promo_freeplay": "freeplay",
    "load_screenshot": "https://example.com/screenshot.jpg"
  }
}'
```

#### Response Examples

Success:
```json
{
  "message": "Recharge request submitted successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "vip_code": "VIP123",
    "player_name": "John Doe",
    "messenger_id": "12345",
    "team_code": "ENT-1",
    "game_platform": "orion",
    "game_username": "johndoe123",
    "amount": 100,
    "status": "pending",
    "promo_code": "BONUS50",
    "promo_type": "freeplay",
    "payment_method": null,
    "screenshot_url": "https://example.com/screenshot.jpg",
    "manychat_data": {
      // Full ManyChat webhook data
    },
    "init_by": "player",
    "created_at": "2024-02-27T12:00:00Z",
    "updated_at": "2024-02-27T12:00:00Z"
  }
}
```

Error (Missing Field):
```json
{
  "error": "Missing required field: amount",
  "details": "The field amount is required but was not provided or was empty",
  "code": "MISSING_FIELD"
}
```

Error (Invalid Amount):
```json
{
  "error": "Invalid amount",
  "details": "Amount must be a positive number",
  "code": "INVALID_AMOUNT"
}
```

### 6. Submit Recharge Screenshot
Updates the screenshot URL for an existing recharge request.

**Endpoint:** `/submit-recharge-screenshot`
**Method:** POST
**Content-Type:** application/json

#### Request Body
```json
{
  "recharge_id": "string",
  "screenshot_url": "string"
}
```

#### Business Rules
1. Required fields:
   - `recharge_id` - ID of the existing recharge request
   - `screenshot_url` - URL of the screenshot to be attached
2. Validation rules:
   - Recharge request must exist
   - Both fields must be non-empty

#### Success Response
```json
{
  "message": "Screenshot URL updated successfully",
  "data": {
    "id": "string",
    "vip_code": "string",
    "player_name": "string",
    "messenger_id": "string",
    "team_code": "string",
    "game_platform": "string",
    "game_username": "string",
    "amount": "number",
    "status": "string",
    "promo_code": "string",
    "promo_type": "string",
    "payment_method": "string",
    "screenshot_url": "string",
    "manychat_data": "object",
    "init_by": "string",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

#### Error Response
```json
{
  "error": "Error message description",
  "details": "Detailed error message",
  "code": "Error code"
}
```

#### Possible Error Messages
- "Missing required field: recharge_id"
- "Missing required field: screenshot_url"
- "Recharge request not found"
- "Failed to update screenshot URL"
- "Method not allowed"
- "Internal server error"

#### Example cURL Request
```bash
curl -X POST 'https://qgixcznoxktrxdcytyxo.supabase.co/functions/v1/submit-recharge-screenshot' \
-H 'Authorization: Bearer your-anon-key' \
-H 'Content-Type: application/json' \
-d '{
  "recharge_id": "550e8400-e29b-41d4-a716-446655440000",
  "screenshot_url": "https://example.com/screenshot.jpg"
}'
```

#### Response Examples

Success:
```json
{
  "message": "Screenshot URL updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "vip_code": "VIP123",
    "player_name": "John Doe",
    "messenger_id": "12345",
    "team_code": "ENT-1",
    "game_platform": "orion",
    "game_username": "johndoe123",
    "amount": 100,
    "status": "pending",
    "promo_code": "BONUS50",
    "promo_type": "freeplay",
    "payment_method": null,
    "screenshot_url": "https://example.com/screenshot.jpg",
    "manychat_data": {
      // Full recharge request data
    },
    "init_by": "player",
    "created_at": "2024-02-27T12:00:00Z",
    "updated_at": "2024-02-27T12:00:00Z"
  }
}
```

Error (Missing Field):
```json
{
  "error": "Missing required field: recharge_id",
  "details": "The recharge_id field is required but was not provided",
  "code": "MISSING_FIELD"
}
```

Error (Not Found):
```json
{
  "error": "Recharge request not found",
  "details": "No recharge request found with the provided ID",
  "code": "NOT_FOUND"
}
```

### 7. Check Daily Redeem Limit
Checks a player's daily redeem limit for different games.

**Endpoint:** `/checkDailyRedeemLimit`
**Method:** POST
**Content-Type:** application/json

#### Request Body
```json
{
  "vip_code": "string"
}
```

#### Business Rules
1. Required fields:
   - `vip_code` - The VIP code of the player
2. Default daily limit of 500 points for all games if not specified
3. Game limits are calculated based on the current day only
4. Game limits are stored in the `game_limits` JSON array in the players table

#### Success Response
```json
{
  "total_redeemed": number,
  "game_limits": {
    "game_name": {
      "used": number,
      "remaining": number,
      "total": number
    }
  },
  "default_limit": number,
  "message": "Daily redeem limits retrieved successfully"
}
```

#### Error Response
```json
{
  "error": "Error message description",
  "code": "ERROR"
}
```

#### Possible Error Messages
- "Missing required field: vip_code"
- "Player not found"
- "Failed to fetch player data: [database error]"

#### Example cURL Request
```bash
curl -X POST 'https://qgixcznoxktrxdcytyxo.supabase.co/functions/v1/checkDailyRedeemLimit' \
-H 'Authorization: Bearer your-anon-key' \
-H 'Content-Type: application/json' \
-d '{
  "vip_code": "VIP123"
}'
```

#### Response Examples

Success:
```json
{
  "total_redeemed": 1500,
  "game_limits": {
    "Orion Stars": {
      "used": 200,
      "remaining": 300,
      "total": 500
    }
  },
  "default_limit": 500,
  "message": "Daily redeem limits retrieved successfully"
}
```

Error (Missing VIP Code):
```json
{
  "error": "Missing required field: vip_code",
  "code": "ERROR"
}
```

Error (Player Not Found):
```json
{
  "error": "Player not found",
  "code": "ERROR"
}
```

### 8. Check Redeem Status
Retrieves the status of all redeem requests for a specific VIP code.

**Endpoint:** `/check-redeem-status`
**Method:** POST
**Content-Type:** application/json

#### Request Body
```json
{
  "vip_code": "string"
}
```

#### Business Rules
1. Required fields:
   - `vip_code` - The VIP code of the player
2. Results are ordered by creation date (newest first)
3. Provides summary statistics including:
   - Total number of requests
   - Total amount requested
   - Total amount paid
   - Breakdown of requests by status

#### Success Response
```json
{
  "message": "Redeem requests retrieved successfully",
  "summary": {
    "total_requests": number,
    "total_amount_requested": number,
    "total_amount_paid": number,
    "status_breakdown": {
      "status_name": number
      // Example: "pending": 2, "completed": 3
    }
  },
  "requests": [
    {
      "vip_code": "string",
      "player_name": "string",
      "messenger_id": "string",
      "team_code": "string",
      "game_platform": "string",
      "game_username": "string",
      "total_amount": number,
      "amount_paid": number,
      "status": "string",
      "created_at": "timestamp"
    }
  ]
}
```

#### Error Response
```json
{
  "error": "Error message description",
  "code": "ERROR"
}
```

#### Possible Error Messages
- "Missing required field: vip_code"
- "Failed to fetch redeem requests: [database error]"

#### Example cURL Request
```bash
curl -X POST 'https://qgixcznoxktrxdcytyxo.supabase.co/functions/v1/check-redeem-status' \
-H 'Authorization: Bearer your-anon-key' \
-H 'Content-Type: application/json' \
-d '{
  "vip_code": "VIP123"
}'
```

#### Response Examples

Success (With Requests):
```json
{
  "message": "Redeem requests retrieved successfully",
  "summary": {
    "total_requests": 3,
    "total_amount_requested": 1500,
    "total_amount_paid": 1000,
    "status_breakdown": {
      "pending": 1,
      "completed": 2
    }
  },
  "requests": [
    {
      "vip_code": "VIP123",
      "player_name": "John Doe",
      "messenger_id": "12345",
      "team_code": "TEAM1",
      "game_platform": "orion",
      "game_username": "johndoe",
      "total_amount": 500,
      "amount_paid": 500,
      "status": "completed",
      "created_at": "2024-02-28T10:00:00Z"
    }
    // ... more requests
  ]
}
```

Success (No Requests):
```json
{
  "message": "No redeem requests found for this VIP code",
  "requests": []
}
```

Error (Missing VIP Code):
```json
{
  "error": "Missing required field: vip_code",
  "code": "ERROR"
}
```

### 9. Submit Redeem Request
Submits a new redeem request using ManyChat webhook data.

**Endpoint:** `/submit-redeem-request`
**Method:** POST
**Content-Type:** application/json

#### Request Body
The endpoint accepts ManyChat webhook data format. Required fields:

```json
{
  "id": "string",
  "name": "string",
  "custom_fields": {
    "entry_code": "string",
    "team_code": "string",
    "redeem_game_platform": "string",
    "redeem_username": "string",
    "redeem_amount": "number",
    "pm_cashapp": "string (optional)",
    "pm_chime": "string (optional)",
    "pm_venmo": "string (optional)"
  }
}
```

#### Business Rules
1. Required fields from ManyChat data:
   - `id` - Messenger ID
   - `name` - Player name
   - `custom_fields.entry_code` - VIP code
   - `custom_fields.team_code` - Team code
   - `custom_fields.redeem_game_platform` - Game platform
   - `custom_fields.redeem_username` - Game username
   - `custom_fields.redeem_amount` - Redeem amount
2. Optional payment method fields:
   - `custom_fields.pm_cashapp` - CashApp payment details
   - `custom_fields.pm_chime` - Chime payment details
   - `custom_fields.pm_venmo` - Venmo payment details
3. Default values:
   - `status`: "pending"
4. Validation rules:
   - Redeem amount must be a positive number
   - All required fields must be non-empty
   - Full ManyChat data is stored in both manychat_data and player_data fields

#### Success Response
```json
{
  "message": "Redeem request submitted successfully",
  "data": {
    "vip_code": "string",
    "player_name": "string",
    "messenger_id": "string",
    "team_code": "string",
    "game_platform": "string",
    "game_username": "string",
    "total_amount": "number",
    "status": "pending",
    "payment_methods": {
      "pm_cashapp": "string",
      "pm_chime": "string",
      "pm_venmo": "string"
    },
    "manychat_data": "object",
    "player_data": "object",
    "created_at": "timestamp"
  }
}
```

#### Error Response
```json
{
  "error": "Error message description",
  "code": "ERROR"
}
```

#### Possible Error Messages
- "Missing required ManyChat data"
- "Missing required custom fields"
- "Invalid redeem amount"
- "Failed to create redeem request: [database error]"

#### Example cURL Request
```bash
curl -X POST 'https://qgixcznoxktrxdcytyxo.supabase.co/functions/v1/submit-redeem-request' \
-H 'Authorization: Bearer your-anon-key' \
-H 'Content-Type: application/json' \
-d '{
  "id": "940537913",
  "name": "Muhammad Saad",
  "custom_fields": {
    "entry_code": "VIP1",
    "team_code": "ENT-1",
    "redeem_game_platform": "Yolo",
    "redeem_username": "Yosaad1",
    "redeem_amount": 400,
    "pm_cashapp": "$siddiqui",
    "pm_chime": "$saaad",
    "pm_venmo": "@siddiquiii"
  }
}'
```

#### Response Examples

Success:
```json
{
  "message": "Redeem request submitted successfully",
  "data": {
    "vip_code": "VIP1",
    "player_name": "Muhammad Saad",
    "messenger_id": "940537913",
    "team_code": "ENT-1",
    "game_platform": "Yolo",
    "game_username": "Yosaad1",
    "total_amount": 400,
    "status": "pending",
    "payment_methods": {
      "pm_cashapp": "$siddiqui",
      "pm_chime": "$saaad",
      "pm_venmo": "@siddiquiii"
    },
    "manychat_data": {
      // Full ManyChat webhook data
    },
    "player_data": {
      // Full ManyChat webhook data
    },
    "created_at": "2024-02-28T10:00:00Z"
  }
}
```

Error (Missing Fields):
```json
{
  "error": "Missing required custom fields",
  "code": "ERROR"
}
```

Error (Invalid Amount):
```json
{
  "error": "Invalid redeem amount",
  "code": "ERROR"
}
```

## Adding New Edge Functions

To add a new edge function to this project:

1. Create a new function directory:
```bash
supabase/functions/your-function-name/index.ts
```

2. Basic function template:
```typescript
// @ts-nocheck is required for Deno imports
// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Your function logic here

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
```

3. Deploy the function:
```bash
supabase functions deploy your-function-name
```

4. Add documentation for the new function to this file following the same format as above.

## Development Guidelines

1. **Error Handling**
   - Always return proper error messages
   - Use appropriate HTTP status codes
   - Include CORS headers in all responses

2. **Security**
   - Always validate input data
   - Use proper authentication
   - Don't expose sensitive information in responses

3. **Documentation**
   - Update this API.md file when adding new functions
   - Include all possible status codes and error messages
   - Provide example requests and responses

4. **Testing**
   - Test all edge cases before deployment
   - Verify CORS functionality
   - Check authentication requirements 