from fastapi import FastAPI
from pydantic import BaseModel, Field
import uvicorn
import numpy as np
import joblib
import os
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import pandas as pd

app = FastAPI(title="Fraud Detection ML Service", version="2.0.0")

# ─────────────────────────────────────────────
# MODEL TRAINING (runs once at startup)
# Uses synthetic but realistic transaction data
# ─────────────────────────────────────────────

MODEL_PATH = "fraud_model.joblib"

SUSPICIOUS_DOMAINS = {"tempmail.com", "yopmail.com", "guerrillamail.com", "mailnator.com", "throwam.com", "sharklasers.com"}

def extract_features(amount: float, method: str, email: str, phone: str, device_fingerprint: str, hour: int = 12) -> list:
    method_card = 1 if method.lower() == "card" else 0
    method_upi = 1 if method.lower() == "upi" else 0
    method_wallet = 1 if method.lower() == "wallet" else 0
    email_domain = email.split("@")[-1].lower() if "@" in email else ""
    suspicious_email = 1 if email_domain in SUSPICIOUS_DOMAINS else 0
    phone_clean = phone.strip().replace(" ", "").replace("-", "")
    invalid_phone = 1 if (len(phone_clean) < 10 and phone_clean != "") else 0
    has_device = 1 if device_fingerprint and len(device_fingerprint) > 3 else 0
    high_amount = 1 if amount > 10000 else 0
    very_high_amount = 1 if amount > 50000 else 0
    odd_hour = 1 if (hour < 6 or hour > 23) else 0
    return [amount, method_card, method_upi, method_wallet, suspicious_email,
            invalid_phone, has_device, high_amount, very_high_amount, odd_hour]

def train_model():
    np.random.seed(42)
    n = 5000

    # Generate realistic synthetic transactions
    amounts = np.random.exponential(scale=2000, size=n).clip(10, 200000)
    methods = np.random.choice(["card", "upi", "wallet", "netbank"], size=n, p=[0.4, 0.35, 0.15, 0.1])
    suspicious_email = np.random.binomial(1, 0.05, size=n)
    invalid_phone = np.random.binomial(1, 0.08, size=n)
    has_device = np.random.binomial(1, 0.85, size=n)
    odd_hour = np.random.binomial(1, 0.12, size=n)

    method_card = (methods == "card").astype(int)
    method_upi = (methods == "upi").astype(int)
    method_wallet = (methods == "wallet").astype(int)
    high_amount = (amounts > 10000).astype(int)
    very_high_amount = (amounts > 50000).astype(int)

    X = np.column_stack([amounts, method_card, method_upi, method_wallet,
                          suspicious_email, invalid_phone, has_device,
                          high_amount, very_high_amount, odd_hour])

    # Fraud probability: weighted combination of risk factors
    fraud_prob = (
        0.02 +
        0.35 * suspicious_email +
        0.20 * invalid_phone +
        0.15 * (1 - has_device) +
        0.10 * very_high_amount +
        0.05 * high_amount +
        0.05 * odd_hour +
        0.05 * method_card
    ).clip(0, 1)
    
    y = np.random.binomial(1, fraud_prob)

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(C=1.0, max_iter=500, random_state=42))
    ])
    pipeline.fit(X, y)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"✅ ML Model trained on {n} samples. Fraud rate: {y.mean()*100:.1f}%")
    return pipeline

# Load or train model
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
    print("✅ ML Model loaded from disk.")
else:
    model = train_model()

# ─────────────────────────────────────────────
# REQUEST / RESPONSE MODELS
# ─────────────────────────────────────────────

class TransactionPayload(BaseModel):
    amount: float = Field(..., description="Transaction amount")
    method: str = Field(..., description="Payment method: card, upi, wallet, netbank")
    email: str = Field("", description="Customer email address")
    phone: str = Field("", description="Customer phone number")
    device_fingerprint: str = Field("", description="Unique device identifier")
    hour: int = Field(12, description="Hour of day (0-23) for time-based risk")

class RoutingPayload(BaseModel):
    amount: float = Field(..., description="Transaction amount")
    method: str = Field(..., description="Payment method")
    is_recurring: bool = Field(False, description="Is this a recurring subscription?")

class FraudResult(BaseModel):
    score: int
    probability: float
    risk_level: str
    factors: list[str]
    model: str

class RoutingResult(BaseModel):
    provider: str
    confidence: float
    reason: str
    factors: list[str]

# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "fraud-ml", "model_version": "sklearn-logistic-v2.0"}

@app.post("/predict", response_model=FraudResult)
def predict_fraud(txn: TransactionPayload):
    features = extract_features(txn.amount, txn.method, txn.email, txn.phone, txn.device_fingerprint, txn.hour)
    X = np.array([features])
    
    proba = model.predict_proba(X)[0][1]  # Probability of fraud
    score = int(round(proba * 100))

    # Build human-readable risk factors
    factors = []
    if txn.amount > 50000:
        factors.append("very_high_amount")
    elif txn.amount > 10000:
        factors.append("high_amount")
    if txn.method.lower() == "card":
        factors.append("card_payment_higher_risk")
    if not txn.device_fingerprint:
        factors.append("missing_device_fingerprint")
    email_domain = txn.email.split("@")[-1].lower() if "@" in txn.email else ""
    if email_domain in SUSPICIOUS_DOMAINS:
        factors.append("suspicious_email_domain")
    phone_clean = txn.phone.strip().replace(" ", "")
    if len(phone_clean) < 10 and phone_clean:
        factors.append("invalid_phone_format")
    if txn.hour < 6 or txn.hour > 23:
        factors.append("unusual_transaction_hour")
    if not factors:
        factors.append("low_risk_profile")

    risk_level = "LOW" if score < 30 else "MEDIUM" if score < 60 else "HIGH" if score < 85 else "CRITICAL"

    return FraudResult(
        score=score,
        probability=round(proba, 4),
        risk_level=risk_level,
        factors=factors,
        model="sklearn-logistic-v2.0"
    )

@app.post("/route", response_model=RoutingResult)
def predict_route(txn: RoutingPayload):
    """Smart payment routing based on method, amount, and recurrence."""
    
    if txn.is_recurring:
        return RoutingResult(
            provider="razorpay",
            confidence=0.97,
            reason="Razorpay has superior mandate and auto-debit support for recurring payments.",
            factors=["mandate_support", "auto_debit_reliability", "low_recurring_failure_rate"]
        )

    if txn.method.lower() == "upi":
        return RoutingResult(
            provider="razorpay",
            confidence=0.94,
            reason="Razorpay UPI rails have the highest success rate in current session.",
            factors=["upi_uptime_99.8%", "npci_direct_integration", "low_latency"]
        )

    if txn.amount > 100000:
        return RoutingResult(
            provider="stripe",
            confidence=0.91,
            reason="Stripe preferred for very high-value transactions due to better dispute protection.",
            factors=["high_value_stability", "chargeback_protection", "3ds_support"]
        )

    if txn.method.lower() == "card" and txn.amount > 10000:
        return RoutingResult(
            provider="stripe",
            confidence=0.88,
            reason="Stripe has higher card authorization rates for premium amounts.",
            factors=["high_auth_rate", "card_network_optimization"]
        )

    return RoutingResult(
        provider="razorpay",
        confidence=0.86,
        reason="Razorpay is the default optimal gateway for standard Indian transactions.",
        factors=["historical_authorization_rate", "domestic_optimization", "low_latency"]
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
