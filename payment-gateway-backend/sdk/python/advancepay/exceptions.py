"""
AdvancePay Python SDK Exceptions
"""


class AdvancePayError(Exception):
    """Base exception for AdvancePay SDK errors"""
    pass


class AuthenticationError(AdvancePayError):
    """Raised when authentication fails"""
    pass


class PaymentError(AdvancePayError):
    """Raised when payment operations fail"""
    pass


class ValidationError(AdvancePayError):
    """Raised when request validation fails"""
    pass


class RateLimitError(AdvancePayError):
    """Raised when rate limit is exceeded"""
    pass


class ServerError(AdvancePayError):
    """Raised when server errors occur"""
    pass


class NetworkError(AdvancePayError):
    """Raised when network errors occur"""
    pass
