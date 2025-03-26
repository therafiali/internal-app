export interface SocketState {
  connected: boolean;
  error: Error | null;
  loading: boolean;
}

export interface RedeemRequest {
  redeemId: string;
  entryCode: string;
  username: string;
  gamePlatform: string;
  totalAmount: number;
  status: string;
  requestedAt: string;
  processedAt?: string;
  verifiedAt?: string;
  processedBy?: ProcessedBy;
  verifiedBy?: {
    name: string;
    email: string;
    role: string;
  };
  paymentMethods: PaymentMethod[];
  remarks?: string;
  verificationRemarks?: string;
  messengerId?: string;
}

// Add other related types... 