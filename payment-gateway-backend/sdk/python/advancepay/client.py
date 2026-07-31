"""
AdvancePay Python SDK Client
"""

import requests
import json
from typing import Dict, List, Optional, Any
from .models import Payment, Transaction, Subscription
from .exceptions import AdvancePayError, AuthenticationError, PaymentError


class AdvancePayClient:
    """
    Main client for interacting with AdvancePay Payment Gateway API
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.advancepay.com",
        timeout: int = 30,
        sandbox: bool = False
    ):
        """
        Initialize the AdvancePay client
        
        Args:
            api_key: Your AdvancePay API key
            base_url: Base URL for the API (default: https://api.advancepay.com)
            timeout: Request timeout in seconds (default: 30)
            sandbox: Whether to use sandbox environment (default: False)
        """
        self.api_key = api_key
        self.base_url = base_url if not sandbox else "https://sandbox.advancepay.com"
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": f"AdvancePay-Python-SDK/1.0.0"
        })

    def create_payment(
        self,
        amount: float,
        currency: str,
        order_id: str,
        payment_method: str,
        customer_email: str,
        customer_phone: Optional[str] = None,
        customer_name: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Payment:
        """
        Create a new payment
        
        Args:
            amount: Payment amount
            currency: Currency code (e.g., "INR", "USD")
            order_id: Unique order identifier
            payment_method: Payment method (card, upi, netbanking, wallet, bnpl)
            customer_email: Customer email address
            customer_phone: Customer phone number (optional)
            customer_name: Customer name (optional)
            description: Payment description (optional)
            metadata: Additional metadata (optional)
            
        Returns:
            Payment object
            
        Raises:
            PaymentError: If payment creation fails
            AuthenticationError: If authentication fails
        """
        payload = {
            "order_id": order_id,
            "amount": amount,
            "currency": currency,
            "payment_method": payment_method,
            "customer_email": customer_email,
        }
        
        if customer_phone:
            payload["customer_phone"] = customer_phone
        if customer_name:
            payload["customer_name"] = customer_name
        if description:
            payload["description"] = description
        if metadata:
            payload["metadata"] = metadata
            
        response = self._make_request("POST", "/api/v1/payments", payload)
        return Payment.from_dict(response["data"])

    def get_payment(self, payment_id: str) -> Payment:
        """
        Get payment details by ID
        
        Args:
            payment_id: Payment ID
            
        Returns:
            Payment object
            
        Raises:
            AdvancePayError: If payment not found
        """
        response = self._make_request("GET", f"/api/v1/payments/{payment_id}")
        return Payment.from_dict(response["data"])

    def capture_payment(self, transaction_id: str) -> Transaction:
        """
        Capture a payment
        
        Args:
            transaction_id: Transaction ID
            
        Returns:
            Transaction object
        """
        response = self._make_request("POST", f"/api/v1/transactions/{transaction_id}/capture")
        return Transaction.from_dict(response["data"])

    def refund_payment(
        self,
        transaction_id: str,
        amount: float,
        reason: str,
        idempotency_key: Optional[str] = None
    ) -> Transaction:
        """
        Refund a payment
        
        Args:
            transaction_id: Transaction ID
            amount: Refund amount
            reason: Refund reason
            idempotency_key: Idempotency key for preventing duplicate refunds
            
        Returns:
            Transaction object
        """
        payload = {
            "transaction_id": transaction_id,
            "amount": amount,
            "reason": reason,
        }
        if idempotency_key:
            payload["idempotency_key"] = idempotency_key
            
        response = self._make_request("POST", "/api/v1/refunds", payload)
        return Transaction.from_dict(response["data"])

    def create_checkout_session(
        self,
        order_id: str,
        amount: float,
        currency: str,
        customer_email: str,
        customer_phone: Optional[str] = None,
        customer_name: Optional[str] = None,
        description: Optional[str] = None,
        payment_methods: Optional[List[str]] = None,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
        expiry_minutes: int = 30,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a checkout session
        
        Args:
            order_id: Order ID
            amount: Payment amount
            currency: Currency code
            customer_email: Customer email
            customer_phone: Customer phone (optional)
            customer_name: Customer name (optional)
            description: Description (optional)
            payment_methods: Allowed payment methods (optional)
            success_url: Redirect URL on success (optional)
            cancel_url: Redirect URL on cancel (optional)
            expiry_minutes: Session expiry in minutes (default: 30)
            metadata: Additional metadata (optional)
            
        Returns:
            Checkout session data
        """
        payload = {
            "order_id": order_id,
            "amount": amount,
            "currency": currency,
            "customer_email": customer_email,
            "expiry_minutes": expiry_minutes,
        }
        
        if customer_phone:
            payload["customer_phone"] = customer_phone
        if customer_name:
            payload["customer_name"] = customer_name
        if description:
            payload["description"] = description
        if payment_methods:
            payload["payment_methods"] = payment_methods
        if success_url:
            payload["success_url"] = success_url
        if cancel_url:
            payload["cancel_url"] = cancel_url
        if metadata:
            payload["metadata"] = metadata
            
        response = self._make_request("POST", "/api/v1/checkout/sessions", payload)
        return response["data"]

    def create_subscription(
        self,
        customer_id: str,
        plan_id: str,
        amount: float,
        currency: str,
        interval: str,
        interval_count: int = 1,
        trial_period_days: int = 0,
        payment_method_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Subscription:
        """
        Create a subscription
        
        Args:
            customer_id: Customer ID
            plan_id: Plan ID
            amount: Subscription amount
            currency: Currency code
            interval: Billing interval (daily, weekly, monthly, yearly)
            interval_count: Number of intervals (default: 1)
            trial_period_days: Trial period in days (default: 0)
            payment_method_id: Payment method ID (optional)
            metadata: Additional metadata (optional)
            
        Returns:
            Subscription object
        """
        payload = {
            "customer_id": customer_id,
            "plan_id": plan_id,
            "amount": amount,
            "currency": currency,
            "interval": interval,
            "interval_count": interval_count,
            "trial_period_days": trial_period_days,
        }
        
        if payment_method_id:
            payload["payment_method_id"] = payment_method_id
        if metadata:
            payload["metadata"] = metadata
            
        response = self._make_request("POST", "/api/v1/subscriptions", payload)
        return Subscription.from_dict(response["data"])

    def get_subscription(self, subscription_id: str) -> Subscription:
        """
        Get subscription details
        
        Args:
            subscription_id: Subscription ID
            
        Returns:
            Subscription object
        """
        response = self._make_request("GET", f"/api/v1/subscriptions/{subscription_id}")
        return Subscription.from_dict(response["data"])

    def cancel_subscription(self, subscription_id: str, cancel_at_period_end: bool = False) -> Subscription:
        """
        Cancel a subscription
        
        Args:
            subscription_id: Subscription ID
            cancel_at_period_end: Cancel at period end (default: False)
            
        Returns:
            Subscription object
        """
        payload = {"cancel_at_period_end": cancel_at_period_end}
        response = self._make_request("POST", f"/api/v1/subscriptions/{subscription_id}/cancel", payload)
        return Subscription.from_dict(response["data"])

    def list_webhooks(self) -> List[Dict[str, Any]]:
        """
        List all webhooks for the merchant
        
        Returns:
            List of webhook configurations
        """
        response = self._make_request("GET", "/api/v1/webhooks")
        return response["data"]

    def create_webhook(
        self,
        url: str,
        events: List[str],
        secret: Optional[str] = None,
        retry_policy: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a webhook
        
        Args:
            url: Webhook URL
            events: List of events to subscribe to
            secret: Webhook secret (optional, auto-generated if not provided)
            retry_policy: Retry policy configuration (optional)
            
        Returns:
            Webhook configuration
        """
        payload = {
            "url": url,
            "events": events,
        }
        
        if secret:
            payload["secret"] = secret
        if retry_policy:
            payload["retry_policy"] = retry_policy
            
        response = self._make_request("POST", "/api/v1/webhooks", payload)
        return response["data"]

    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Make an HTTP request to the API
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint
            data: Request data (for POST/PUT)
            
        Returns:
            Response data
            
        Raises:
            AuthenticationError: If authentication fails
            PaymentError: If payment operation fails
            AdvancePayError: For other errors
        """
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method == "GET":
                response = self.session.get(url, timeout=self.timeout)
            elif method == "POST":
                response = self.session.post(url, json=data, timeout=self.timeout)
            elif method == "PUT":
                response = self.session.put(url, json=data, timeout=self.timeout)
            elif method == "DELETE":
                response = self.session.delete(url, timeout=self.timeout)
            else:
                raise AdvancePayError(f"Unsupported HTTP method: {method}")
                
            response.raise_for_status()
            
            result = response.json()
            
            if "error" in result:
                if response.status_code == 401:
                    raise AuthenticationError(result["error"])
                elif "payment" in endpoint.lower():
                    raise PaymentError(result["error"])
                else:
                    raise AdvancePayError(result["error"])
                    
            return result
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                raise AuthenticationError("Authentication failed")
            elif e.response.status_code == 404:
                raise AdvancePayError("Resource not found")
            else:
                raise AdvancePayError(f"HTTP error: {e}")
        except requests.exceptions.RequestException as e:
            raise AdvancePayError(f"Request failed: {e}")
        except json.JSONDecodeError as e:
            raise AdvancePayError(f"Invalid JSON response: {e}")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.session.close()
