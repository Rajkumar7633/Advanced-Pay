/**
 * AdvancePay Node.js SDK
 * Official Node.js SDK for AdvancePay Payment Gateway
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class AdvancePayError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AdvancePayError';
  }
}

class AuthenticationError extends AdvancePayError {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class PaymentError extends AdvancePayError {
  constructor(message) {
    super(message);
    this.name = 'PaymentError';
  }
}

class AdvancePayClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseURL = options.baseURL || 'https://api.advancepay.com';
    this.timeout = options.timeout || 30000;
    this.sandbox = options.sandbox || false;
    
    if (this.sandbox) {
      this.baseURL = 'https://sandbox.advancepay.com';
    }
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': `AdvancePay-NodeJS-SDK/1.0.0`
      }
    });
  }

  async createPayment(params) {
    const payload = {
      order_id: params.orderId,
      amount: params.amount,
      currency: params.currency,
      payment_method: params.paymentMethod,
      customer_email: params.customerEmail
    };

    if (params.customerPhone) payload.customer_phone = params.customerPhone;
    if (params.customerName) payload.customer_name = params.customerName;
    if (params.description) payload.description = params.description;
    if (params.metadata) payload.metadata = params.metadata;

    const response = await this._makeRequest('POST', '/api/v1/payments', payload);
    return response.data;
  }

  async getPayment(paymentId) {
    const response = await this._makeRequest('GET', `/api/v1/payments/${paymentId}`);
    return response.data;
  }

  async capturePayment(transactionId) {
    const response = await this._makeRequest('POST', `/api/v1/transactions/${transactionId}/capture`);
    return response.data;
  }

  async refundPayment(params) {
    const payload = {
      transaction_id: params.transactionId,
      amount: params.amount,
      reason: params.reason
    };

    if (params.idempotencyKey) payload.idempotency_key = params.idempotencyKey;

    const response = await this._makeRequest('POST', '/api/v1/refunds', payload);
    return response.data;
  }

  async createCheckoutSession(params) {
    const payload = {
      order_id: params.orderId,
      amount: params.amount,
      currency: params.currency,
      customer_email: params.customerEmail,
      expiry_minutes: params.expiryMinutes || 30
    };

    if (params.customerPhone) payload.customer_phone = params.customerPhone;
    if (params.customerName) payload.customer_name = params.customerName;
    if (params.description) payload.description = params.description;
    if (params.paymentMethods) payload.payment_methods = params.paymentMethods;
    if (params.successUrl) payload.success_url = params.successUrl;
    if (params.cancelUrl) payload.cancel_url = params.cancelUrl;
    if (params.metadata) payload.metadata = params.metadata;

    const response = await this._makeRequest('POST', '/api/v1/checkout/sessions', payload);
    return response.data;
  }

  async createSubscription(params) {
    const payload = {
      customer_id: params.customerId,
      plan_id: params.planId,
      amount: params.amount,
      currency: params.currency,
      interval: params.interval,
      interval_count: params.intervalCount || 1,
      trial_period_days: params.trialPeriodDays || 0
    };

    if (params.paymentMethodId) payload.payment_method_id = params.paymentMethodId;
    if (params.metadata) payload.metadata = params.metadata;

    const response = await this._makeRequest('POST', '/api/v1/subscriptions', payload);
    return response.data;
  }

  async getSubscription(subscriptionId) {
    const response = await this._makeRequest('GET', `/api/v1/subscriptions/${subscriptionId}`);
    return response.data;
  }

  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = false) {
    const payload = { cancel_at_period_end: cancelAtPeriodEnd };
    const response = await this._makeRequest('POST', `/api/v1/subscriptions/${subscriptionId}/cancel`, payload);
    return response.data;
  }

  async listWebhooks() {
    const response = await this._makeRequest('GET', '/api/v1/webhooks');
    return response.data;
  }

  async createWebhook(params) {
    const payload = {
      url: params.url,
      events: params.events
    };

    if (params.secret) payload.secret = params.secret;
    if (params.retryPolicy) payload.retry_policy = params.retryPolicy;

    const response = await this._makeRequest('POST', '/api/v1/webhooks', payload);
    return response.data;
  }

  async _makeRequest(method, endpoint, data = null) {
    try {
      let response;
      if (method === 'GET') {
        response = await this.client.get(endpoint);
      } else if (method === 'POST') {
        response = await this.client.post(endpoint, data);
      } else if (method === 'PUT') {
        response = await this.client.put(endpoint, data);
      } else if (method === 'DELETE') {
        response = await this.client.delete(endpoint);
      } else {
        throw new AdvancePayError(`Unsupported HTTP method: ${method}`);
      }

      if (response.data.error) {
        if (response.status === 401) {
          throw new AuthenticationError(response.data.error);
        } else if (endpoint.includes('payment') || endpoint.includes('refund')) {
          throw new PaymentError(response.data.error);
        } else {
          throw new AdvancePayError(response.data.error);
        }
      }

      return response;
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          throw new AuthenticationError('Authentication failed');
        } else if (error.response.status === 404) {
          throw new AdvancePayError('Resource not found');
        } else {
          throw new AdvancePayError(`HTTP error: ${error.response.status}`);
        }
      } else if (error.request) {
        throw new AdvancePayError('Network error: No response received');
      } else {
        throw new AdvancePayError(`Request failed: ${error.message}`);
      }
    }
  }
}

module.exports = {
  AdvancePayClient,
  AdvancePayError,
  AuthenticationError,
  PaymentError
};
