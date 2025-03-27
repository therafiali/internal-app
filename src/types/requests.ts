export interface PaymentMethod {
  type: string;
  username: string;
}

export interface ManyChatProfile {
  gender: string;
  fullName: string;
  language: string;
  lastName: string;
  timezone: string;
  firstName: string;
  profilePic: string;
}

export interface ManyChatPlatforms {
  firekirin_username: string | null;
  orionstars_username: string | null;
}

export interface ManyChatData {
  _id: string;
  team: string;
  status: string;
  profile: ManyChatProfile;
  vipCode: string;
  platforms: ManyChatPlatforms;
  playerName: string;
}

export type ModalType = 'process_modal' | 'reject_modal' | 'approve_modal' | 'verify_modal' | 'payment_modal' | 'none';
export type ProcessingStatus = 'idle' | 'in_progress';

export interface ProcessingState {
  status: ProcessingStatus;
  processed_by: string | null;
  modal_type: ModalType;
}

export interface RedeemRequest {
  id: string;
  redeem_id: string;
  init_by: string;
  vip_code: string;
  player_name: string;
  messenger_id: string | null;
  team_code: string;
  game_platform: string;
  game_username: string;
  total_amount: number;
  game_limit?: number;
  status: string;
  payment_methods: PaymentMethod[];
  notes: string | null;
  manychat_data: ManyChatData;
  agent_name: string;
  agent_department: string;
  processed_by: string | null;
  processed_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verification_remarks: string | null;
  credits_loaded?: number | null;
  created_at: string;
  updated_at: string;
  processing_state: ProcessingState;
  player_data?: {
    profile: {
      profilePic: string;
    };
  };
} 