import { PendingWithdrawal as BasePendingWithdrawal } from "@/hooks/useFinanceRecharge";

export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

export interface AssignmentTag {
  cId: string;
  type: string;
  cashtag: string;
}

export interface ProcessedBy {
  name: string;
  email: string;
}

export interface PaymentMethod {
  type: string;
  details: string;
}

export interface AssignedCT {
  c_id: string;
  type: string;
  amount: number;
  cashtag: string;
  assigned_at: string;
  assigned_by: string;
  company_tag: string;
}

export interface ExtendedPendingDeposit {
  rechargeId: string;
  recharge_id: string;
  init_id: string;
  assignedRedeem?: {
    tagType: string;
    id?: string;
    amount?: number;
    team_code?: string;
    vipcode?: string;
    redeem_id?: string;
    type?: string;
    redeem_player?: {
      image?: string;
      name?: string;
    };
  };
  assignedTo?: string;
  profile_pic?: string;
  manychat_data?: any;
  player_details: any;
  processed_at: string | null;
  processed_by: ProcessedBy | null;
  payment_method: PaymentMethod | null;
  promotion: string | null;
  screenshot_url: string;
  player_name: string;
  game_platform: string;
  game_username: string;
  amount: number;
  bonus_amount: number;
  vip_code: string;
  messenger_id: string;
  status: string;
  teamCode: string;
  created_at: string;
  updated_at: string;
  credits_loaded?: number;
  promo_code?: string;
  promo_type?: string;
  notes?: string;
  reject_reason?: string;
  reject_notes?: string;
  rejected_at?: string;
  rejected_by?: string;
  agent_name?: string;
  agent_department?: string;
  platform_usernames?: string[];
  processing_state?: {
    status: "idle" | "in_progress";
    processed_by?: string;
    modal_type?: string;
  };
  assigned_ct?: AssignedCT;
}

export interface CompanyTag {
  id: string;
  c_id: string;
  address: string;
  balance: number;
  cash_card: string;
  cashtag: string;
  created_at: string;
  ct_type: string;
  email: string;
  full_name: string;
  last4_ss: string;
  last_active: string;
  limit: number;
  linked_bank: string;
  linked_card: string;
  name: string;
  pin: string;
  procured_at: string;
  procured_by: string;
  procurement_cost: number;
  status: string;
  total_received: number;
  total_withdrawn: number;
  transaction_count: number;
  updated_at: string;
  verification_status: string;
  payment_method?: string;
}

export interface ExtendedCompanyTag extends CompanyTag {
  cId: string;
  ctType: string;
}

export interface ExtendedPendingWithdrawal extends Omit<BasePendingWithdrawal, 'redeemId'> {
  redeemId: string;
  redeem_id: string;
  totalAmount: number;
  requestedAt: string;
  amount: number;
  createdAt: string;
  cashapp: string;
  venmo: string;
  status: string;
  name: string;
  amountHold: number;
    amountAvailable: number;
    paymentMethods: { type: string; username: string }[];
  player_data?: {
    profile?: {
      profilePic?: string;
    };
  };
}

export interface AvailableTags {
  companyTags: ExtendedCompanyTag[];
  rechargeAmount: number;
} 