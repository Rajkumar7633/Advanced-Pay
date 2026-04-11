'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Transaction } from '@/lib/api';
import { Copy, ExternalLink, Download, X, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatNumber } from '@/lib/formatting';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionDetailModal({ transaction, isOpen, onClose }: TransactionDetailModalProps) {
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);

  const formatDateTime = (dateString: string) => {
    try {
      // Handle different date formats
      let date: Date;
      
      // Try parsing as ISO string first
      if (dateString.includes('T')) {
        date = new Date(dateString);
      } else {
        // Try parsing as regular date string
        date = new Date(dateString + 'Z'); // Add Z to treat as UTC
      }
      
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Invalid Date';
      }
      
      // Format using local time
      return format(date, 'MMM dd, yyyy HH:mm');
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString);
      return 'Invalid Date';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      let date: Date;
      
      if (dateString.includes('T')) {
        date = new Date(dateString);
      } else {
        date = new Date(dateString + 'Z');
      }
      
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Invalid Date';
      }
      
      return format(date, 'MMMM dd, yyyy');
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString);
      return 'Invalid Date';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      let date: Date;
      
      if (dateString.includes('T')) {
        date = new Date(dateString);
      } else {
        date = new Date(dateString + 'Z');
      }
      
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Invalid Time';
      }
      
      return format(date, 'hh:mm:ss a');
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString);
      return 'Invalid Time';
    }
  };

  const handleDownloadReceipt = async () => {
    if (!transaction) return;
    
    setIsGeneratingReceipt(true);
    try {
      // Create a temporary container for the receipt
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      document.body.appendChild(tempDiv);
      
      // Render the receipt component
      const receiptElement = document.createElement('div');
      receiptElement.innerHTML = `
        <div id="temp-receipt">
          <div style="background: white; padding: 40px; max-width: 500px; margin: 0 auto; font-family: 'Arial', sans-serif; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1f2937; padding-bottom: 20px;">
              <div style="margin-bottom: 20px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #2563eb, #9333ea); border-radius: 12px; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <span style="color: white; font-weight: bold; font-size: 24px;">PG</span>
                </div>
                <h1 style="font-size: 28px; font-weight: bold; color: #1f2937; margin: 0 0 8px 0;">Payment Gateway</h1>
                <p style="font-size: 16px; color: #6b7280; margin: 0;">Professional Payment Solutions</p>
              </div>
              <div style="font-size: 14px; color: #6b7280; line-height: 1.5;">
                <p style="margin: 6px 0;">123 Business Avenue, Tech Park</p>
                <p style="margin: 6px 0;">Bangalore, Karnataka 560001</p>
                <p style="margin: 6px 0;">India</p>
                <p style="margin: 6px 0;">+91 98765 43210</p>
                <p style="margin: 6px 0;">support@paymentgateway.com</p>
              </div>
            </div>
            
            <!-- Receipt Title -->
            <div style="text-align: center; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px;">
              <h2 style="font-size: 22px; font-weight: bold; color: #1f2937; margin: 0 0 8px 0;">PAYMENT RECEIPT</h2>
              <p style="font-size: 14px; color: #6b7280; margin: 0;">Receipt #${transaction.id}</p>
            </div>
            
            <!-- Transaction Details -->
            <div style="margin-bottom: 30px;">
              <h3 style="font-size: 16px; font-weight: bold; color: #1f2937; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb;">Transaction Details</h3>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                  <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0; font-weight: 600;">Date</p>
                  <p style="font-weight: 600; color: #1f2937; margin: 0; font-size: 15px;">${formatDate(transaction.created_at)}</p>
                </div>
                <div>
                  <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0; font-weight: 600;">Time</p>
                  <p style="font-weight: 600; color: #1f2937; margin: 0; font-size: 15px;">${formatTime(transaction.created_at)}</p>
                </div>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                  <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0; font-weight: 600;">Transaction ID</p>
                  <p style="font-weight: 600; color: #1f2937; margin: 0; font-size: 13px; word-break: break-all;">${transaction.id}</p>
                </div>
                <div>
                  <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0; font-weight: 600;">Status</p>
                  <p style="font-weight: 600; margin: 0;">
                    <span style="display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #dcfce7; color: #166534; text-transform: uppercase;">
                      ${transaction.status?.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                  <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0; font-weight: 600;">Payment Method</p>
                  <p style="font-weight: 600; color: #1f2937; margin: 0; font-size: 15px; text-transform: capitalize;">${transaction.payment_method}</p>
                </div>
                <div>
                  <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0; font-weight: 600;">Order ID</p>
                  <p style="font-weight: 600; color: #1f2937; margin: 0; font-size: 15px;">${transaction.order_id || 'N/A'}</p>
                </div>
              </div>
            </div>
            
            <!-- Customer Information -->
            ${transaction.customer_email ? `
            <div style="margin-bottom: 30px;">
              <h3 style="font-size: 16px; font-weight: bold; color: #1f2937; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb;">Customer Information</h3>
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div>
                    <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0; font-weight: 600;">Email</p>
                    <p style="font-weight: 600; color: #1f2937; margin: 0; font-size: 15px;">${transaction.customer_email}</p>
                  </div>
                  ${transaction.customer_phone ? `
                  <div>
                    <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0; font-weight: 600;">Phone</p>
                    <p style="font-weight: 600; color: #1f2937; margin: 0; font-size: 15px;">${transaction.customer_phone}</p>
                  </div>
                  ` : '<div></div>'}
                </div>
              </div>
            </div>
            ` : ''}
            
            <!-- Amount Details -->
            <div style="margin-bottom: 30px;">
              <h3 style="font-size: 16px; font-weight: bold; color: #1f2937; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb;">Payment Details</h3>
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
                <div style="border-bottom: 1px solid #d1d5db; padding-bottom: 15px; margin-bottom: 15px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="color: #6b7280; font-size: 14px;">Subtotal</span>
                    <span style="font-weight: 600; color: #1f2937; font-size: 16px;">₹${transaction.amount}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="color: #6b7280; font-size: 14px;">Processing Fee</span>
                    <span style="font-weight: 600; color: #1f2937; font-size: 16px;">₹0.00</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #6b7280; font-size: 14px;">GST (18%)</span>
                    <span style="font-weight: 600; color: #1f2937; font-size: 16px;">₹0.00</span>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 2px solid #1f2937;">
                  <span style="font-size: 18px; font-weight: bold; color: #1f2937;">Total Amount</span>
                  <span style="font-size: 24px; font-weight: bold; color: #1f2937;">₹${transaction.amount}</span>
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #d1d5db;">
              <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px; font-weight: 600;">Thank you for your business!</p>
              <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.4;">This is a computer-generated receipt and does not require a signature.</p>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #9ca3af; margin: 4px 0; font-weight: 600;">Payment Gateway Pvt. Ltd.</p>
                <p style="font-size: 11px; color: #9ca3af; margin: 2px 0;">CIN: U72900KA2023PTC123456</p>
                <p style="font-size: 11px; color: #9ca3af; margin: 2px 0;">GSTIN: 29AAKCP1234C1ZV</p>
              </div>
            </div>
          </div>
        </div>
      `;
      tempDiv.appendChild(receiptElement);
      
      // Wait for the content to render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Find the receipt element
      const receiptDiv = receiptElement.querySelector('#temp-receipt > div');
      if (!receiptDiv) {
        throw new Error('Receipt element not found');
      }
      
      // Capture the receipt as an image
      const canvas = await html2canvas(receiptDiv as HTMLElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Download the PDF
      pdf.save(`receipt-${transaction.id}.pdf`);
      
      // Clean up
      document.body.removeChild(tempDiv);
      
    } catch (error) {
      console.error('Error generating receipt:', error);
      alert('Failed to generate receipt. Please try again.');
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  if (!transaction) return null;

  const statusConfig = {
    success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    initiated: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  };

  const config = statusConfig[transaction.status as keyof typeof statusConfig] || 
                 statusConfig.initiated;
  const StatusIcon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-semibold">Transaction Details</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div className={`flex items-center gap-3 p-4 rounded-lg ${config.bg} ${config.border} border`}>
            <StatusIcon className={`w-5 h-5 ${config.color}`} />
            <div>
              <p className="font-medium capitalize">{transaction.status}</p>
              <p className="text-sm text-muted-foreground">
                {transaction.status === 'success' || transaction.status === 'completed' 
                  ? 'Payment completed successfully' 
                  : transaction.status === 'failed' 
                  ? 'Payment failed' 
                  : 'Payment is being processed'}
              </p>
            </div>
          </div>

          {/* Amount */}
          <div className="text-center py-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Amount</p>
            <p className="text-3xl font-bold">₹{transaction.amount}</p>
            
            {/* Core FX Representation */}
            {transaction.exchange_rate && Number(transaction.exchange_rate) !== 1 && transaction.base_amount && (
               <div className="flex flex-col items-center justify-center p-2 mt-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800 mx-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Forex Converted (INR Settlement)</span>
                  <span className="text-sm font-mono text-muted-foreground mt-1">
                    ₹{formatNumber(transaction.base_amount)} <span className="opacity-70">(Rate: {transaction.exchange_rate})</span>
                  </span>
               </div>
            )}
          </div>

          {/* Transaction Info */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Transaction ID</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{transaction.id}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => navigator.clipboard.writeText(transaction.id)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Payment Method</span>
              <span className="text-sm font-medium capitalize">{transaction.payment_method}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date & Time</span>
              <span className="text-sm font-medium">
                {formatDateTime(transaction.created_at)}
              </span>
            </div>

            {transaction.order_id && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Order ID</span>
                <span className="text-sm font-medium">{transaction.order_id}</span>
              </div>
            )}

            {transaction.customer_email && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Customer Email</span>
                <span className="text-sm font-medium">{transaction.customer_email}</span>
              </div>
            )}

            {transaction.customer_phone && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Customer Phone</span>
                <span className="text-sm font-medium">{transaction.customer_phone}</span>
              </div>
            )}
          </div>

          {/* Fraud Score */}
          {transaction.fraud_score !== undefined && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <p className="text-sm font-medium text-orange-500">Fraud Risk Assessment</p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-medium">Predictive ML Risk</span>
                <Badge variant={transaction.fraud_score >= 85 ? 'destructive' : 
                              transaction.fraud_score >= 40 ? 'secondary' : 'default'}
                      className={transaction.fraud_score < 40 ? "bg-green-500 hover:bg-green-600" : ""}>
                  {transaction.fraud_score}/100
                </Badge>
              </div>
              
              {/* Intelligent Signals visualization */}
              {transaction.routing_decision?.fraud_factors && Array.isArray(transaction.routing_decision.fraud_factors) && (
                <div className="mt-4 border-t border-orange-500/20 pt-3">
                   <span className="text-xs font-semibold text-orange-600 mb-2 block uppercase tracking-wider">AI Insight Signals</span>
                   <ul className="space-y-1.5 flex flex-wrap gap-2">
                      {transaction.routing_decision.fraud_factors.map((factor: string, i: number) => (
                         <li key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-md border border-orange-200">
                           {factor.replace(/_/g, ' ')}
                         </li>
                      ))}
                   </ul>
                </div>
              )}
            </div>
          )}

          {/* Failure Reason */}
          {transaction.failureReason && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-xs text-red-400 font-medium mb-1">Failure Reason</p>
              <p className="text-sm text-red-300">{transaction.failureReason}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button 
              className="flex-1 bg-accent hover:bg-accent/90"
              onClick={handleDownloadReceipt}
              disabled={isGeneratingReceipt}
            >
              <Download className="w-4 h-4 mr-2" />
              {isGeneratingReceipt ? 'Generating...' : 'Download Receipt'}
            </Button>
            <Button variant="outline" className="flex-1">
              View in Dashboard
            </Button>
            {transaction.status === 'completed' && (
              <Button variant="outline" className="flex-1">
                Issue Refund
              </Button>
            )}
          </div>

          <Button variant="ghost" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
