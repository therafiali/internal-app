export interface PaymentMethod {
  type: string;
  details: string;
}

export interface AssignedRedeem {
  redeemId?: string;
  amount: number;
  tagType: string;
  assignedAt: string;
  paymentMethods: {
    type: string;
    username: string;
    _id: string;
  }[];
  playerDetails?: {
    username: string;
    totalAmount: number;
    amountPaid: number;
    amountHold: number;
    amountAvailable: number;
    profile_pic?: string;
  };
}

export interface ProcessedBy {
  name: string;
  email: string;
}

export interface RechargeRequest {
  rechargeId: string;
  recharge_id: string;
  playerName: string;
  manyChatName: string;
  messengerId: string;
  vipCode: string | null;
  initBy: string;
  gamePlatform: string;
  gameUsername: string;
  amount: number;
  bonusAmount: number;
  status: string;
  screenshotUrl?: string;
  teamCode: string;
  promotion: string | null;
  createdAt: string;
  profile_pic?: string;
  processedBy: ProcessedBy | null;
  processedAt?: string;
  paymentMethod?: PaymentMethod;
  assignedRedeem: AssignedRedeem | null;
} 