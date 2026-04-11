// Payment Gateway Types

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'merchant' | 'customer';
  createdAt: string;
}

export interface Merchant {
  id: string;
  name: string;
  email: string;
  website?: string;
  description?: string;
  logo?: string;
  status: 'pending' | 'approved' | 'suspended';
  balance: number;
  monthlyVolume: number;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'upi' | 'netbanking' | 'wallet' | 'bnpl';
  last4?: string;
  cardBrand?: 'visa' | 'mastercard' | 'amex' | 'rupay';
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: PaymentMethod;
  customerId?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  refundedAmount?: number;
  failureReason?: string;
}

export interface Settlement {
  id: string;
  merchantId: string;
  amount: number;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  scheduledDate: string;
  completedDate?: string;
  bankAccount: {
    accountNumber: string;
    ifsc: string;
    accountHolder: string;
  };
}

export interface Dispute {
  id: string;
  transactionId: string;
  merchantId: string;
  reason: string;
  status: 'open' | 'under_review' | 'won' | 'lost';
  amount: number;
  evidence?: string[];
  createdAt: string;
  dueDate: string;
}

export interface Invoice {
  id: string;
  merchantId: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  createdAt: string;
}

export interface PaymentLink {
  id: string;
  merchantId: string;
  amount: number;
  description?: string;
  currency: string;
  status: 'active' | 'expired' | 'used';
  expiresAt: string;
  link: string;
  qrCode: string;
  clicks: number;
  payments: number;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  merchantId: string;
  key: string;
  secret?: string;
  mode: 'live' | 'test';
  status: 'active' | 'inactive';
  lastUsed?: string;
  createdAt: string;
}

export interface Webhook {
  id: string;
  merchantId: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
  createdAt: string;
}

export interface AnalyticsData {
  totalRevenue: number;
  successRate: number;
  transactionCount: number;
  averageOrderValue: number;
  paymentMethodBreakdown: Record<string, number>;
  revenueByDay: Array<{
    date: string;
    amount: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
