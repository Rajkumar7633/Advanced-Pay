import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = '/api/v1';

// Use the admin_token from sessionStorage (set after admin login)
const getAdminHeaders = () => {
  if (typeof window === 'undefined') return {};
  const token = sessionStorage.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// --- TYPES ---
export interface AdminSystemMetrics {
  total_volume: string;
  active_merchants: number;
  pending_items: number;
  system_uptime: number;
  transactions_data: { time: string; transactions: number; success: number }[];
}

export interface AdminMerchant {
  id: string;
  name: string;
  volume: string;
  status: 'pending' | 'approved' | 'suspended' | 'active';
  date: string;
}

export interface AdminDispute {
  id: string;
  merchant: string;
  merchant_id: string;
  amount: string;
  reason: string;
  status: 'open' | 'under_review' | 'won' | 'lost' | 'closed';
  description?: string;
  created_at: string;
}

export interface AdminTransaction {
  id: string;
  merchant: string;
  amount: string;
  currency: string;
  status: string;
  method: string;
  created_at: string;
}

export interface AdminActivity {
  type: 'info' | 'success' | 'warning' | 'critical';
  message: string;
  time: string;
}

export interface AdminSettings {
  card_fee: string;
  upi_fee: string;
  netbanking_fee: string;
  auto_approve_merchants: boolean;
  fraud_blocking: boolean;
  international_payments: boolean;
  maintenance_mode: boolean;
}

export interface AdminHealthStats {
  live_tps: string;
  blocks_last_minute: string;
  status: string;
}

export interface AdminWebhookStats {
  total_events: number;
  pending: number;
  completed: number;
  failed: number;
}

// --- HOOKS ---

export const useAdminSettings = () =>
  useQuery({
    queryKey: ['admin-settings'],
    queryFn: async (): Promise<AdminSettings> => {
      const r = await axios.get(`${API_URL}/admin/settings`, { headers: getAdminHeaders() });
      return r.data.data;
    },
    refetchInterval: false,
  });

export const useAdminMutateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<AdminSettings>) => {
      const r = await axios.put(`${API_URL}/admin/settings`, settings, { headers: getAdminHeaders() });
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });
};

export const useAdminMetrics = () =>
  useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async (): Promise<AdminSystemMetrics> => {
      const r = await axios.get(`${API_URL}/admin/metrics`, { headers: getAdminHeaders() });
      return r.data;
    },
    refetchInterval: false,
  });

export const useAdminMerchants = () =>
  useQuery({
    queryKey: ['admin-merchants'],
    queryFn: async (): Promise<AdminMerchant[]> => {
      const r = await axios.get(`${API_URL}/admin/merchants`, { headers: getAdminHeaders() });
      return r.data.data || [];
    },
    refetchInterval: false,
  });

export const useAdminDisputes = () =>
  useQuery({
    queryKey: ['admin-disputes'],
    queryFn: async (): Promise<AdminDispute[]> => {
      const r = await axios.get(`${API_URL}/admin/disputes`, { headers: getAdminHeaders() });
      return r.data.data || [];
    },
    refetchInterval: false,
  });

export const useAdminTransactions = () =>
  useQuery({
    queryKey: ['admin-transactions'],
    queryFn: async (): Promise<AdminTransaction[]> => {
      const r = await axios.get(`${API_URL}/admin/transactions`, { headers: getAdminHeaders() });
      return r.data.data || [];
    },
    refetchInterval: false,
  });

export const useAdminActivity = () =>
  useQuery({
    queryKey: ['admin-activity'],
    queryFn: async (): Promise<AdminActivity[]> => {
      const r = await axios.get(`${API_URL}/admin/activity`, { headers: getAdminHeaders() });
      return r.data.data || [];
    },
    refetchInterval: false,
  });

export const useAdminMutateMerchantStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ merchantId, status }: { merchantId: string; status: string }) => {
      const r = await axios.put(
        `${API_URL}/admin/merchants/${merchantId}/status`,
        { status },
        { headers: getAdminHeaders() }
      );
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
      queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
    },
  });
};

export const useAdminResolveDispute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ disputeId, status }: { disputeId: string; status: string }) => {
      const r = await axios.put(
        `${API_URL}/admin/disputes/${disputeId}/resolve`,
        { status },
        { headers: getAdminHeaders() }
      );
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] });
      queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
    },
  });
};

export const useAdminHealth = () =>
  useQuery({
    queryKey: ['admin-health'],
    queryFn: async (): Promise<AdminHealthStats> => {
      const r = await axios.get(`${API_URL}/admin/health`, { headers: getAdminHeaders() });
      return r.data.data;
    },
    refetchInterval: 5000, // refresh health every 5s
  });

export const useAdminWebhookStats = () =>
  useQuery({
    queryKey: ['admin-webhook-stats'],
    queryFn: async (): Promise<AdminWebhookStats> => {
      const r = await axios.get(`${API_URL}/admin/webhooks/stats`, { headers: getAdminHeaders() });
      return r.data.data;
    },
    refetchInterval: 15000,
  });

export const useAdminRiskTransactions = () =>
  useQuery({
    queryKey: ['admin-risk-transactions'],
    queryFn: async (): Promise<AdminTransaction[]> => {
      const r = await axios.get(`${API_URL}/admin/risk-transactions`, { headers: getAdminHeaders() });
      return r.data.data;
    },
    refetchInterval: false,
  });

export const useAdminRefundTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (txId: string) => {
      const r = await axios.post(`${API_URL}/admin/transactions/${txId}/refund`, {}, { headers: getAdminHeaders() });
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-risk-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] });
    },
  });
};

export const useAdminSettlements = () =>
  useQuery({
    queryKey: ['admin-settlements'],
    queryFn: async (): Promise<any[]> => {
      const r = await axios.get(`${API_URL}/admin/settlements`, { headers: getAdminHeaders() });
      return r.data.data;
    },
    refetchInterval: false,
  });

export const useAdminApproveSettlement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await axios.post(`${API_URL}/admin/settlements/${id}/approve`, {}, { headers: getAdminHeaders() });
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settlements'] });
    },
  });
};

export const useAdminRoutingStats = () =>
  useQuery({
    queryKey: ['admin-routing-stats'],
    queryFn: async (): Promise<any> => {
      const r = await axios.get(`${API_URL}/admin/routing/stats`, { headers: getAdminHeaders() });
      return r.data.data;
    },
    refetchInterval: 10000,
  });
