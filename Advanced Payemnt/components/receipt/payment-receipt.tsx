'use client';

import { Transaction } from '@/lib/api';
import { format } from 'date-fns';

interface PaymentReceiptProps {
  transaction: Transaction;
}

export default function PaymentReceipt({ transaction }: PaymentReceiptProps) {
  const receiptDate = format(new Date(transaction.created_at), 'MMMM dd, yyyy');
  const receiptTime = format(new Date(transaction.created_at), 'hh:mm:ss a');
  
  return (
    <div id="receipt-content" className="bg-white p-8 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
        <div className="mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <span className="text-white font-bold text-xl">PG</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Payment Gateway</h1>
          <p className="text-sm text-gray-600">Professional Payment Solutions</p>
        </div>
        <div className="text-sm text-gray-600">
          <p>123 Business Avenue, Tech Park</p>
          <p>Bangalore, Karnataka 560001</p>
          <p>India</p>
          <p>+91 98765 43210</p>
          <p>support@paymentgateway.com</p>
        </div>
      </div>

      {/* Receipt Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">PAYMENT RECEIPT</h2>
        <p className="text-sm text-gray-600">Receipt #{transaction.id}</p>
      </div>

      {/* Transaction Details */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Date</p>
            <p className="font-semibold text-gray-800">{receiptDate}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Time</p>
            <p className="font-semibold text-gray-800">{receiptTime}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Transaction ID</p>
            <p className="font-semibold text-gray-800 text-sm">{transaction.id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Status</p>
            <p className="font-semibold">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                transaction.status === 'success' || transaction.status === 'completed' 
                  ? 'bg-green-100 text-green-800' 
                  : transaction.status === 'failed' 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {transaction.status?.toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Payment Method</p>
            <p className="font-semibold text-gray-800 capitalize">{transaction.payment_method}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Order ID</p>
            <p className="font-semibold text-gray-800">{transaction.order_id}</p>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      {transaction.customer_email && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Customer Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide">Email</p>
              <p className="font-semibold text-gray-800 text-sm">{transaction.customer_email}</p>
            </div>
            {transaction.customer_phone && (
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">Phone</p>
                <p className="font-semibold text-gray-800 text-sm">{transaction.customer_phone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Amount Details */}
      <div className="mb-6">
        <div className="border-t border-b border-gray-300 py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold text-gray-800">₹{transaction.amount}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Processing Fee</span>
            <span className="font-semibold text-gray-800">₹0.00</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">GST (18%)</span>
            <span className="font-semibold text-gray-800">₹0.00</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-4">
          <span className="text-lg font-bold text-gray-800">Total Amount</span>
          <span className="text-2xl font-bold text-gray-800">₹{transaction.amount}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-gray-300">
        <p className="text-xs text-gray-600 mb-2">Thank you for your business!</p>
        <p className="text-xs text-gray-500">This is a computer-generated receipt and does not require a signature.</p>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">Payment Gateway Pvt. Ltd.</p>
          <p className="text-xs text-gray-500">CIN: U72900KA2023PTC123456</p>
          <p className="text-xs text-gray-500">GSTIN: 29AAKCP1234C1ZV</p>
        </div>
      </div>
    </div>
  );
}
