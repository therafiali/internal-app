export interface User {
  id: string;
  email: string;
  name: string;
  department: string;
  role: string;
  employee_code?: string;
  status: 'active' | 'disabled';
}

export interface PaymentMethod {
  type: string;
  username: string;
  _id: string;
}

export interface RedeemRequest {
  redeemId: string;
  entryCode: string;
  username: string;
  gamePlatform: string;
  totalAmount: number;
  amountPaid?: number;
  amountAvailable?: number;
  amountHold?: number;
  status: string;
  requestedAt: string;
  processedAt?: string;
  verifiedAt?: string;
  processedBy?: {
    name: string;
    email: string;
    role: string;
  };
  verifiedBy?: {
    name: string;
    email: string;
    role: string;
  };
  paymentMethods: PaymentMethod[];
  remarks?: string;
  verificationRemarks?: string;
} 