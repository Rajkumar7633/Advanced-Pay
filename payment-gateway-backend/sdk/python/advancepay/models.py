"""
AdvancePay Python SDK Models
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any
from datetime import datetime


@dataclass
class Payment:
    """Payment model"""
    id: str
    order_id: str
    amount: float
    currency: str
    status: str
    payment_method: str
    customer_email: str
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Payment":
        return cls(
            id=data.get("id"),
            order_id=data.get("order_id"),
            amount=data.get("amount"),
            currency=data.get("currency"),
            status=data.get("status"),
            payment_method=data.get("payment_method"),
            customer_email=data.get("customer_email"),
            customer_phone=data.get("customer_phone"),
            customer_name=data.get("customer_name"),
            description=data.get("description"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            metadata=data.get("metadata"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "order_id": self.order_id,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status,
            "payment_method": self.payment_method,
            "customer_email": self.customer_email,
            "customer_phone": self.customer_phone,
            "customer_name": self.customer_name,
            "description": self.description,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "metadata": self.metadata,
        }


@dataclass
class Transaction:
    """Transaction model"""
    id: str
    payment_id: str
    amount: float
    currency: str
    status: str
    payment_method: str
    provider: str
    provider_transaction_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    fraud_score: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Transaction":
        return cls(
            id=data.get("id"),
            payment_id=data.get("payment_id"),
            amount=data.get("amount"),
            currency=data.get("currency"),
            status=data.get("status"),
            payment_method=data.get("payment_method"),
            provider=data.get("provider"),
            provider_transaction_id=data.get("provider_transaction_id"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            fraud_score=data.get("fraud_score"),
            metadata=data.get("metadata"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "payment_id": self.payment_id,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status,
            "payment_method": self.payment_method,
            "provider": self.provider,
            "provider_transaction_id": self.provider_transaction_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "fraud_score": self.fraud_score,
            "metadata": self.metadata,
        }


@dataclass
class Subscription:
    """Subscription model"""
    id: str
    customer_id: str
    merchant_id: str
    plan_id: str
    amount: float
    currency: str
    interval: str
    interval_count: int
    status: str
    trial_ends_at: Optional[str] = None
    current_period_start: Optional[str] = None
    current_period_end: Optional[str] = None
    cancel_at_period_end: bool = False
    payment_method_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Subscription":
        return cls(
            id=data.get("id"),
            customer_id=data.get("customer_id"),
            merchant_id=data.get("merchant_id"),
            plan_id=data.get("plan_id"),
            amount=data.get("amount"),
            currency=data.get("currency"),
            interval=data.get("interval"),
            interval_count=data.get("interval_count", 1),
            status=data.get("status"),
            trial_ends_at=data.get("trial_ends_at"),
            current_period_start=data.get("current_period_start"),
            current_period_end=data.get("current_period_end"),
            cancel_at_period_end=data.get("cancel_at_period_end", False),
            payment_method_id=data.get("payment_method_id"),
            metadata=data.get("metadata"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "merchant_id": self.merchant_id,
            "plan_id": self.plan_id,
            "amount": self.amount,
            "currency": self.currency,
            "interval": self.interval,
            "interval_count": self.interval_count,
            "status": self.status,
            "trial_ends_at": self.trial_ends_at,
            "current_period_start": self.current_period_start,
            "current_period_end": self.current_period_end,
            "cancel_at_period_end": self.cancel_at_period_end,
            "payment_method_id": self.payment_method_id,
            "metadata": self.metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


@dataclass
class Webhook:
    """Webhook model"""
    id: str
    merchant_id: str
    url: str
    events: list
    secret: Optional[str] = None
    active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Webhook":
        return cls(
            id=data.get("id"),
            merchant_id=data.get("merchant_id"),
            url=data.get("url"),
            events=data.get("events", []),
            secret=data.get("secret"),
            active=data.get("active", True),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "merchant_id": self.merchant_id,
            "url": self.url,
            "events": self.events,
            "secret": self.secret,
            "active": self.active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
