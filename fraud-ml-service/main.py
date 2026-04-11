from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import uvicorn
import re

app = FastAPI(title="Fraud Detection ML Service", version="1.0.0")

class TransactionPayload(BaseModel):
    amount: float = Field(..., description="Transaction amount")
    method: str = Field(..., description="Payment method: card, upi, etc.")
    email: str = Field("", description="Customer email address")
    phone: str = Field("", description="Customer phone number")
    device_fingerprint: str = Field("", description="Unique device identifier")

class RoutingPayload(BaseModel):
    amount: float = Field(..., description="Transaction amount")
    method: str = Field(..., description="Payment method")
    is_recurring: bool = Field(False, description="Is this a recurring subscription?")

class FraudResult(BaseModel):
    score: int
    factors: list[str]
    model: str

class RoutingResult(BaseModel):
    provider: str
    confidence: float
    factors: list[str]

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "fraud-ml"}

@app.post("/predict", response_model=FraudResult)
def predict_fraud(txn: TransactionPayload):
    score = 10
    factors = []

    # ML behavior mock (Logistic Regression weighting)
    # Amount heuristics
    if txn.amount > 10000:
        score += 25
        factors.append("high_amount")
    
    # Method heuristics
    if txn.method.lower() == "card":
        score += 10
        factors.append("card_payment")

    # Device fingerprint clustering analysis simulation
    if not txn.device_fingerprint:
        score += 15
        factors.append("missing_device_fingerprint")

    # Email anomaly detection simulation
    email_clean = txn.email.strip().lower()
    if email_clean.endswith("@tempmail.com") or email_clean.endswith("@yopmail.com"):
        score += 35
        factors.append("suspicious_email_domain")

    # Phone number length heuristic
    phone_clean = txn.phone.strip()
    if len(phone_clean) < 10 and phone_clean != "":
        score += 10
        factors.append("invalid_phone_formatting")

    # Boundaries
    score = max(0, min(100, score))

    if not factors:
        factors.append("low_risk_profile")

    return FraudResult(
        score=score,
        factors=factors,
        model="python-logistic-v1.0"
    )

@app.post("/route", response_model=RoutingResult)
def predict_route(txn: RoutingPayload):
    provider = "razorpay"
    confidence = 0.85
    factors = ["historical_authorization_rate"]
    
    if txn.method.lower() == "upi":
        provider = "stripe"
        confidence = 0.92
        factors = ["optimal_upi_uptime_today"]
        
    if txn.amount > 50000:
        provider = "stripe"
        confidence = 0.88
        factors += ["high_value_transaction_stability"]
        
    if txn.is_recurring:
        provider = "razorpay"
        confidence = 0.95
        factors = ["recurring_mandate_support"]

    return RoutingResult(
        provider=provider,
        confidence=confidence,
        factors=factors
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
