'use client';
// lib/pdf-invoice.ts
// PDF invoice generation using jsPDF

import jsPDF from 'jspdf';

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  merchantName: string;
  merchantEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  currencySymbol: string;
  notes?: string;
}

export function generateInvoicePDF(data: InvoiceData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // ── Header Background ──
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 45, 'F');

  // ── Logo / Brand ──
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('ADVANCED PAY', margin, 20);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Secure Payment Infrastructure', margin, 27);

  // ── Invoice Title ──
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', pageWidth - margin, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`#${data.invoiceNumber}`, pageWidth - margin, 28, { align: 'right' });
  doc.text(`Date: ${data.date}`, pageWidth - margin, 34, { align: 'right' });

  // ── Bill To Section ──
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO', margin, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(data.merchantName, margin, 67);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(data.merchantEmail, margin, 73);

  // ── Divider ──
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, 80, pageWidth - margin, 80);

  // ── Table Header ──
  let y = 88;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y - 5, pageWidth - margin * 2, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('DESCRIPTION', margin + 2, y);
  doc.text('QTY', pageWidth - 90, y);
  doc.text('RATE', pageWidth - 65, y);
  doc.text('AMOUNT', pageWidth - margin, y, { align: 'right' });

  // ── Table Rows ──
  y += 10;
  data.items.forEach((item, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 5, pageWidth - margin * 2, 9, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(item.description, margin + 2, y);
    doc.text(String(item.quantity), pageWidth - 90, y);
    doc.text(`${data.currencySymbol}${item.rate.toFixed(2)}`, pageWidth - 65, y);
    doc.text(`${data.currencySymbol}${item.amount.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 10;
  });

  // ── Divider ──
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Totals ──
  const totalsX = pageWidth - 80;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal', totalsX, y);
  doc.text(`${data.currencySymbol}${data.subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
  y += 7;
  doc.text('Tax (18% GST)', totalsX, y);
  doc.text(`${data.currencySymbol}${data.tax.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
  y += 7;

  // ── Total Box ──
  doc.setFillColor(15, 23, 42);
  doc.rect(totalsX - 5, y - 5, pageWidth - totalsX - margin + 5, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', totalsX, y + 2);
  doc.text(`${data.currencySymbol}${data.total.toFixed(2)}`, pageWidth - margin, y + 2, { align: 'right' });

  // ── Notes ──
  if (data.notes) {
    y += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('NOTES', margin, y);
    doc.setFont('helvetica', 'normal');
    y += 5;
    doc.text(data.notes, margin, y, { maxWidth: pageWidth - margin * 2 });
  }

  // ── Footer ──
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(241, 245, 249);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Advanced Pay — Secure Payment Infrastructure | support@advancedpay.in', pageWidth / 2, pageHeight - 12, { align: 'center' });
  doc.text('This is a system-generated invoice and does not require a signature.', pageWidth / 2, pageHeight - 7, { align: 'center' });

  // ── Save ──
  doc.save(`invoice-${data.invoiceNumber}.pdf`);
}

export function generateSettlementInvoice(settlement: any, merchantName: string, merchantEmail: string): void {
  const amount = parseFloat(settlement.total_amount || settlement.amount || '0');
  const fees = parseFloat(settlement.fees || '0');
  const net = amount - fees;
  const tax = fees * 0.18;

  generateInvoicePDF({
    invoiceNumber: `STL-${settlement.id?.substring(0, 8).toUpperCase()}`,
    date: new Date(settlement.settlement_date || settlement.created_at || Date.now()).toLocaleDateString('en-IN'),
    merchantName,
    merchantEmail,
    currencySymbol: '₹',
    currency: 'INR',
    items: [
      {
        description: `Settlement Payout — ${settlement.total_transactions || 1} transaction(s)`,
        quantity: settlement.total_transactions || 1,
        rate: amount / (settlement.total_transactions || 1),
        amount,
      },
      {
        description: 'Platform Processing Fee',
        quantity: 1,
        rate: fees,
        amount: fees,
      },
    ],
    subtotal: amount,
    tax,
    total: net - tax,
    notes: `Settlement ID: ${settlement.id}\nAll amounts in Indian Rupees (INR). GST @ 18% applicable on platform fees.`,
  });
}

export function generateTransactionReceipt(txn: any, merchantName: string, merchantEmail: string): void {
  const amount = parseFloat(txn.amount || '0');
  const fee = amount * 0.02; // 2% platform fee

  generateInvoicePDF({
    invoiceNumber: `TXN-${txn.id?.substring(0, 8).toUpperCase()}`,
    date: new Date(txn.created_at || Date.now()).toLocaleDateString('en-IN'),
    merchantName,
    merchantEmail,
    currencySymbol: '₹',
    currency: 'INR',
    items: [
      {
        description: `Payment Received — ${txn.description || txn.payment_method || 'Standard Transaction'}`,
        quantity: 1,
        rate: amount,
        amount,
      },
      {
        description: 'Platform Fee (2%)',
        quantity: 1,
        rate: fee,
        amount: fee,
      },
    ],
    subtotal: amount,
    tax: fee * 0.18,
    total: amount - fee - fee * 0.18,
    notes: `Transaction ID: ${txn.id}\nPayment Method: ${txn.payment_method || 'N/A'}\nStatus: ${txn.status}`,
  });
}
