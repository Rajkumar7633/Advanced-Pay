/**
 * Payment Gateway API - Full Master Plan Integration
 * All endpoints for payments, merchants, webhooks, analytics
 */

import api from '../api-client';

// Types
export interface CreatePaymentRequest {
  amount: number;
  currency?: string;
  order_id: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method: 'card' | 'upi' | 'netbanking' | 'wallet';
  return_url?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  amount: number;
  currency?: string;
  base_amount?: number;
  exchange_rate?: number;
  status: string;
  payment_method: string;
  fraud_score?: number;
  routing_decision?: {
    fraud_factors?: string[];
    [key: string]: any;
  };
  created_at: string;
  order_id?: string;
  customer_email?: string;
  customer_phone?: string;
  failureReason?: string;
}

// Auth APIs
export const authApi = {
  login: (credentials: any) => api.post('/auth/login', credentials),
  register: (data: any) => api.post('/auth/register', data),
  logoutAll: () => api.post('/auth/logout-all'),
  generate2FA: () => api.post('/auth/2fa/generate'),
  verify2FA: (code: string) => api.post('/auth/2fa/verify', { code }),
  disable2FA: () => api.post('/auth/2fa/disable'),
  login2FA: (merchant_id: string, code: string) => api.post('/auth/login/2fa', { merchant_id, code }),
};

// Payment APIs
export const paymentsApi = {
  create: (data: CreatePaymentRequest) =>
    api.post<{ data: PaymentResponse }>('/payments', data),
  get: (id: string) => api.get<{ data: PaymentResponse }>(`/payments/${id}`),
  capture: (id: string) => api.post(`/payments/${id}/capture`),
  refund: (id: string, amount?: number, reason?: string) =>
    api.post(`/payments/${id}/refund`, { amount, reason }),
  getStatus: (id: string) => api.get(`/payments/${id}/status`),
};

// Merchant APIs
export const merchantsApi = {
  getProfile: () => api.get('/merchants/me'),
  updateProfile: (body: any) => api.put('/merchants/me', body),
  updatePassword: (body: any) => api.put('/merchants/me/password', body),
  getStats: () => api.get('/merchants/stats'),
  getCustomers: () => api.get('/customers'),
  getTeamMembers: () => api.get('/merchants/me/team'),
  inviteTeamMember: (body: any) => api.post('/merchants/me/team', body),
  removeTeamMember: (id: string) => api.delete(`/merchants/me/team/${id}`),
  getDashboard: (params?: { period?: string }) => api.get('/dashboard/overview', { params }),
  getTransactions: (params?: { page?: number; limit?: number; offset?: number; status?: string }) =>
    api.get('/transactions', { params }),
  getAnalytics: (params?: { period?: string }) =>
    api.get('/analytics', { params }),
  getSettlements: () => api.get('/settlements'),
  generateSettlement: (date?: string) => api.post('/settlements/generate', {}, { params: date ? { date } : {} }),
  captureTransaction: (id: string) => api.post(`/payments/${id}/capture`),
  refundTransaction: (id: string, body: { amount?: number; reason: string }) =>
    api.post(`/payments/${id}/refund`, body),
  createPayment: (body: { order_id: string; amount: number; currency: string; payment_method: string; customer_email: string; customer_phone: string }) =>
    api.post('/payments', body),
  getPaymentLink: (id: string) => api.get(`/v1/payment-links/${id}`),
  // Banking APIs
  getBalance: () => api.get('/balance'),
  getBankAccounts: () => api.get('/bank-accounts'),
  addBankAccount: (body: { bankName: string; accountNumber: string; accountHolder: string; ifsc: string; accountType: string }) =>
    api.post('/bank-accounts', body),
  requestWithdrawal: (body: { amount: number; bankAccountId: string }) =>
    api.post('/withdrawals', body),
  getWithdrawals: () => api.get('/withdrawals'),
  // API Keys APIs
  getApiKeys: () => api.get('/api-keys'),
  createApiKey: (body: { name: string; permissions: string[] }) =>
    api.post('/api-keys', body),
  regenerateApiKey: (id: string) =>
    api.put(`/api-keys/${id}`, { name: `Regenerated Key ${new Date().toLocaleDateString()}` }),
  revokeApiKey: (id: string) =>
    api.delete(`/api-keys/${id}`),
};

// Webhook APIs
export const webhooksApi = {
  list: () => api.get('/webhooks'),
  create: (url: string, events: string[]) =>
    api.post('/webhooks', { url, events }),
  delete: (id: string) => api.delete(`/webhooks/${id}`),
  test: (id: string) => api.post(`/webhooks/${id}/test`),
};

// Payment Links APIs
export const paymentLinksApi = {
  list: () => api.get('/payment-links'),
  create: (data: { amount: number; currency?: string; description?: string }) =>
    api.post('/payment-links', data),
  get: (id: string) => api.get(`/payment-links/${id}`),
  delete: (id: string) => api.delete(`/payment-links/${id}`),
};

// Fraud & Routing (AI features)
export const fraudApi = {
  getScore: (transactionId: string) =>
    api.get(`/fraud/score/${transactionId}`),
  getFactors: (transactionId: string) =>
    api.get(`/fraud/factors/${transactionId}`),
};

export const routingApi = {
  getDecision: (params: { amount: number; method: string }) =>
    api.get('/routing/decision', { params }),
};

// Disputes & Chargebacks APIs
export const disputesApi = {
  list: () => api.get('/disputes'),
  stats: () => api.get('/disputes/stats'),
  get: (id: string) => api.get(`/disputes/${id}`),
  create: (data: {
    transaction_id: string;
    amount: number;
    currency?: string;
    reason: string;
    description?: string;
  }) => api.post('/disputes', data),
  submitEvidence: (id: string, evidence: string) =>
    api.post(`/disputes/${id}/evidence`, { evidence }),
};

