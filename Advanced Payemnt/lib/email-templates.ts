// lib/email-templates.ts
// HTML email templates for transactional notifications

export function paymentSuccessTemplate(data: {
  merchantName: string;
  amount: string;
  currency: string;
  transactionId: string;
  paymentMethod: string;
  customerEmail: string;
  date: string;
}): string {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:20px}
.container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
.header{background:#0f172a;padding:30px;text-align:center}
.header h1{color:#fff;margin:0;font-size:22px;font-weight:700}
.header p{color:#94a3b8;margin:5px 0 0}
.badge{background:#22c55e;color:#fff;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;display:inline-block;margin-top:10px}
.body{padding:30px}
.amount{font-size:42px;font-weight:800;color:#0f172a;text-align:center;margin:20px 0}
.info-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9}
.info-label{color:#64748b;font-size:13px}
.info-value{color:#0f172a;font-size:13px;font-weight:600}
.footer{background:#f8fafc;padding:20px;text-align:center;color:#94a3b8;font-size:12px}
</style></head><body>
<div class="container">
  <div class="header">
    <h1>Advanced Pay</h1>
    <p>Secure Payment Infrastructure</p>
    <span class="badge">✓ Payment Successful</span>
  </div>
  <div class="body">
    <div class="amount">${data.currency}${data.amount}</div>
    <div class="info-row"><span class="info-label">Merchant</span><span class="info-value">${data.merchantName}</span></div>
    <div class="info-row"><span class="info-label">Transaction ID</span><span class="info-value">${data.transactionId}</span></div>
    <div class="info-row"><span class="info-label">Payment Method</span><span class="info-value">${data.paymentMethod}</span></div>
    <div class="info-row"><span class="info-label">Customer</span><span class="info-value">${data.customerEmail}</span></div>
    <div class="info-row"><span class="info-label">Date</span><span class="info-value">${data.date}</span></div>
  </div>
  <div class="footer">Advanced Pay · Secure Payment Infrastructure · support@advancedpay.in<br>This is an automated notification. Do not reply to this email.</div>
</div>
</body></html>`;
}

export function disputeOpenedTemplate(data: {
  merchantName: string;
  disputeId: string;
  amount: string;
  reason: string;
  deadline: string;
}): string {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:20px}
.container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
.header{background:#dc2626;padding:30px;text-align:center}
.header h1{color:#fff;margin:0;font-size:22px}.header p{color:#fca5a5;margin:5px 0 0}
.body{padding:30px}.alert{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:15px;margin-bottom:20px}
.alert p{color:#991b1b;margin:0;font-size:14px}
.info-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9}
.info-label{color:#64748b;font-size:13px}.info-value{color:#0f172a;font-size:13px;font-weight:600}
.cta{background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:20px;font-weight:700}
.footer{background:#f8fafc;padding:20px;text-align:center;color:#94a3b8;font-size:12px}
</style></head><body>
<div class="container">
  <div class="header"><h1>⚠️ Dispute Opened</h1><p>Action required — respond before deadline</p></div>
  <div class="body">
    <div class="alert"><p><strong>A chargeback dispute has been raised against your account.</strong> Please log in to respond with evidence before the deadline to protect your revenue.</p></div>
    <div class="info-row"><span class="info-label">Merchant</span><span class="info-value">${data.merchantName}</span></div>
    <div class="info-row"><span class="info-label">Dispute ID</span><span class="info-value">${data.disputeId}</span></div>
    <div class="info-row"><span class="info-label">Amount at Risk</span><span class="info-value">₹${data.amount}</span></div>
    <div class="info-row"><span class="info-label">Reason</span><span class="info-value">${data.reason}</span></div>
    <div class="info-row"><span class="info-label">Response Deadline</span><span class="info-value">${data.deadline}</span></div>
    <a href="http://localhost:3001/dashboard/disputes" class="cta">→ Respond to Dispute</a>
  </div>
  <div class="footer">Advanced Pay · support@advancedpay.in</div>
</div></body></html>`;
}

export function settlementReleasedTemplate(data: {
  merchantName: string;
  settlementId: string;
  amount: string;
  bankAccount: string;
  date: string;
}): string {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:20px}
.container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden}
.header{background:#059669;padding:30px;text-align:center}
.header h1{color:#fff;margin:0;font-size:22px}.header p{color:#a7f3d0;margin:5px 0 0}
.body{padding:30px}.amount{font-size:40px;font-weight:800;color:#059669;text-align:center;margin:20px 0}
.info-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9}
.info-label{color:#64748b;font-size:13px}.info-value{color:#0f172a;font-size:13px;font-weight:600}
.footer{background:#f8fafc;padding:20px;text-align:center;color:#94a3b8;font-size:12px}
</style></head><body>
<div class="container">
  <div class="header"><h1>💰 Settlement Released</h1><p>Funds are on their way to your account</p></div>
  <div class="body">
    <div class="amount">₹${data.amount}</div>
    <div class="info-row"><span class="info-label">Merchant</span><span class="info-value">${data.merchantName}</span></div>
    <div class="info-row"><span class="info-label">Settlement ID</span><span class="info-value">${data.settlementId}</span></div>
    <div class="info-row"><span class="info-label">Bank Account</span><span class="info-value">${data.bankAccount}</span></div>
    <div class="info-row"><span class="info-label">Settlement Date</span><span class="info-value">${data.date}</span></div>
  </div>
  <div class="footer">Advanced Pay · support@advancedpay.in<br>Allow 1-3 business days for the funds to reflect in your account.</div>
</div></body></html>`;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
