export type ActivityType = 
  // User Management
  | 'USER_CREATE' | 'USER_UPDATE' | 'USER_DELETE' | 'USER_VIEW' | 'USER_BLOCK' | 'USER_UNBLOCK'
  // Authentication
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'PASSWORD_RESET' | 'PASSWORD_CHANGE'
  // Redeem Operations
  | 'REDEEM_CREATE' | 'REDEEM_UPDATE' | 'REDEEM_APPROVE' | 'REDEEM_REJECT' | 'REDEEM_CANCEL' | 'REDEEM_PROCESS'
  // Recharge Operations
  | 'RECHARGE_CREATE' | 'RECHARGE_UPDATE' | 'RECHARGE_APPROVE' | 'RECHARGE_REJECT' | 'RECHARGE_CANCEL' | 'RECHARGE_PROCESS'
  // Financial Operations
  | 'FINANCIAL_TRANSACTION_CREATE' | 'FINANCIAL_TRANSACTION_UPDATE'
  // Verification Operations
  | 'VERIFICATION_APPROVE' | 'VERIFICATION_REJECT'
  // Report Operations
  | 'REPORT_GENERATE' | 'REPORT_EXPORT' | 'REPORT_VIEW'
  // System Operations
  | 'SYSTEM_CONFIG_UPDATE' | 'EXPORT_DATA' | 'SYSTEM_BACKUP' | 'SYSTEM_RESTORE' | 'MAINTENANCE_MODE_TOGGLE'
  // Player Operations
  | 'PLAYER_UPDATE' | 'PLAYER_SUSPEND' | 'PLAYER_ACTIVATE'
  // Notification Operations
  | 'NOTIFICATION_SEND'
  // Audit Operations
  | 'AUDIT_EXPORT' | 'AUDIT_VIEW' | 'AUDIT_REPORT_GENERATE'
  // Cash App Operations
  | 'CASHTAG_CREATE' | 'CASHTAG_UPDATE' | 'CASHTAG_DELETE' | 'CASHTAG_VIEW' | 'CASHTAG_ASSIGN' | 'CASHTAG_UNASSIGN' | 'CASHTAG_PAUSE' | 'CASHTAG_RESUME' | 'CT_TRANSFER'
  // Other
  | 'OTHER';

export type TargetResource = 
  | 'user'
  | 'player'
  | 'redeem_request'
  | 'system_config'
  | 'report'
  | 'recharge_request'
  | 'financial_transaction'
  | 'verification_request'
  | 'notification'
  | 'audit'
  | 'company_tag'
  | 'other';

export interface ActivityLogPayload {
  actionType: ActivityType;
  actionDescription: string;
  targetResource: TargetResource;
  targetResourceId?: string;
  status?: 'success' | 'failed' | 'pending';
  additionalDetails?: Record<string, any>;
}
