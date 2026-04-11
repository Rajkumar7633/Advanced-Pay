'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, Smartphone, AlertCircle, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';

import api from '@/lib/api-client';
import { useParams } from 'next/navigation';

export default function PaymentLinkPage() {
  const params = useParams();
  const paymentLinkId = params?.id as string;

  const [isLoadingLink, setIsLoadingLink] = useState(true);
  const [paymentLinkData, setPaymentLinkData] = useState<any>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    upiId: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!paymentLinkId) {
      setPaymentStatus('error');
      setErrors({ general: 'Payment link ID not provided' });
      setIsLoadingLink(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res: any = await api.get(`/public/payment-links/${paymentLinkId}`);
        if (!cancelled) setPaymentLinkData(res.data);
      } catch (e) {
        if (!cancelled) {
          setPaymentStatus('error');
          setErrors({ general: 'Invalid payment link or it has expired.' });
        }
      } finally {
        if (!cancelled) setIsLoadingLink(false);
      }
    })();
    return () => { cancelled = true; };
  }, [paymentLinkId]);

  const amount = paymentLinkData?.amount || 0;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.name) newErrors.name = 'Name is required';

    if (paymentMethod === 'card') {
      if (!formData.cardNumber) newErrors.cardNumber = 'Card number is required';
      else if (formData.cardNumber.replace(/\s/g, '').length < 16) newErrors.cardNumber = 'Invalid card number';
      
      if (!formData.expiry) newErrors.expiry = 'Expiry date is required';
      else if (!/^\d{2}\/\d{2}$/.test(formData.expiry)) newErrors.expiry = 'Format: MM/YY';
      
      if (!formData.cvv) newErrors.cvv = 'CVV is required';
      else if (formData.cvv.length < 3) newErrors.cvv = 'Invalid CVV';
    } else {
      if (!formData.upiId) newErrors.upiId = 'UPI ID is required';
      else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(formData.upiId)) newErrors.upiId = 'Invalid UPI ID';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s/g, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    return v;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsProcessing(true);
    setPaymentStatus('processing');

    // Real payment processing network hook
    try {
      const payload = {
        order_id: `link_${paymentLinkId.substring(0, 8)}_${Date.now()}`,
        amount: amount,
        currency: paymentLinkData?.currency || 'INR',
        payment_method: paymentMethod,
        customer_email: formData.email,
        customer_phone: formData.upiId || '0000000000',
        metadata: {
          name: formData.name
        }
      };

      await api.post(`/public/payment-links/${paymentLinkId}/pay`, payload);
      setPaymentStatus('success');
      setTimeout(() => {
        downloadReceipt();
      }, 500);
    } catch (e: any) {
      console.error(e);
      setPaymentStatus('error');
      setErrors({ general: e.response?.data?.error || 'Payment failed securely.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadReceipt = () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Header Background
      pdf.setFillColor(37, 99, 235); // Blue-600
      pdf.rect(0, 0, 210, 45, 'F');
      
      // Header Text
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(26);
      pdf.setFont("helvetica", "bold");
      pdf.text("PAYMENT RECEIPT", 105, 28, { align: "center" });

      const startY = 65;
      const leftMargin = 20;

      // Merchant & Metadata
      pdf.setTextColor(40, 40, 40);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      
      pdf.text(`Receipt ID : ${paymentLinkId.slice(0, 8).toUpperCase()}`, leftMargin, startY);
      pdf.text(`Date : ${new Date().toLocaleString()}`, leftMargin, startY + 10);
      pdf.text(`Merchant : ${paymentLinkData?.description || 'Advanced Pay Merchant'}`, leftMargin, startY + 20);
      
      // Divider
      pdf.setDrawColor(220, 220, 220);
      pdf.line(leftMargin, startY + 30, 190, startY + 30);
      
      // Customer Block
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Billed To", leftMargin, startY + 45);
      
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Name    : ${formData.name}`, leftMargin, startY + 55);
      pdf.text(`Email   : ${formData.email}`, leftMargin, startY + 65);
      pdf.text(`Method  : ${paymentMethod.toUpperCase()}`, leftMargin, startY + 75);

      if (paymentMethod === 'card') {
        const masked = formData.cardNumber.slice(-4);
        pdf.text(`Card    : **** **** **** ${masked}`, leftMargin, startY + 85);
      } else {
        pdf.text(`UPI ID  : ${formData.upiId}`, leftMargin, startY + 85);
      }

      // Divider
      pdf.line(leftMargin, startY + 100, 190, startY + 100);
      
      // Amount Block
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("Total Paid :", leftMargin, startY + 125);
      
      const formattedAmount = `${paymentLinkData?.currency === 'USD' ? 'USD $' : 'INR Rs.'} ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      pdf.text(formattedAmount, 190, startY + 125, { align: "right" });
      
      // Success Badge
      pdf.setFillColor(34, 197, 94); // Green-500
      pdf.roundedRect(155, startY + 135, 35, 10, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.text("SUCCESSFUL", 172.5, startY + 142, { align: "center" });

      // Footer
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "italic");
      pdf.text("Thank you for your business! This is a secure computer generated receipt.", 105, 280, { align: "center" });

      // Download
      pdf.save(`Receipt_${paymentLinkId.substring(0,8).toUpperCase()}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    }
  };

  if (isLoadingLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading payment securely...</p>
      </div>
    );
  }

  if (!paymentLinkData && !isLoadingLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errors.general || "Invalid payment link. Please check the URL and try again."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-10 pb-8 px-8 text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">Payment Successful!</h2>
              <p className="text-gray-500">Thank you for your payment.</p>
            </div>

            <div className="py-6 border-y border-gray-100 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Amount Paid</span>
                <span className="font-semibold text-gray-900">
                  {paymentLinkData?.currency === 'USD' ? '$' : '₹'}{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-gray-900">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Receipt No</span>
                <span className="font-mono text-gray-900 uppercase">{paymentLinkId.slice(0, 8)}</span>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                onClick={downloadReceipt} 
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white"
              >
                Download Receipt
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-12"
                onClick={() => window.location.reload()}
              >
                Make Another Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-12 w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Secure Payment</CardTitle>
            <p className="text-sm text-gray-600">Complete your payment safely and securely</p>
          </CardHeader>
        </Card>

        {/* Payment Details Card */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Payment Link Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Payment Link</span>
                  <Badge variant="outline" className="text-xs">
                    {paymentLinkId.slice(-8)}
                  </Badge>
                </div>
                {paymentLinkData?.description && (
                  <p className="text-sm text-gray-700 mb-2">{paymentLinkData.description}</p>
                )}
                {amount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Amount</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {paymentLinkData?.currency === 'USD' ? '$' : '₹'}{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Payment Method Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={paymentMethod === 'card' ? 'default' : 'outline'}
                    className="h-12"
                    onClick={() => setPaymentMethod('card')}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Card
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === 'upi' ? 'default' : 'outline'}
                    className="h-12"
                    onClick={() => setPaymentMethod('upi')}
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    UPI
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Payment Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                  </div>
                </div>

                {paymentMethod === 'card' ? (
                  // Card Payment Fields
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={formData.cardNumber}
                        onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                        maxLength={19}
                        className={errors.cardNumber ? 'border-red-500' : ''}
                      />
                      {errors.cardNumber && <p className="text-xs text-red-500">{errors.cardNumber}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry</Label>
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          value={formData.expiry}
                          onChange={(e) => handleInputChange('expiry', formatExpiry(e.target.value))}
                          maxLength={5}
                          className={errors.expiry ? 'border-red-500' : ''}
                        />
                        {errors.expiry && <p className="text-xs text-red-500">{errors.expiry}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          value={formData.cvv}
                          onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, ''))}
                          maxLength={4}
                          className={errors.cvv ? 'border-red-500' : ''}
                        />
                        {errors.cvv && <p className="text-xs text-red-500">{errors.cvv}</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  // UPI Payment Fields
                  <div className="space-y-2">
                    <Label htmlFor="upiId">UPI ID</Label>
                    <Input
                      id="upiId"
                      placeholder="username@upi"
                      value={formData.upiId}
                      onChange={(e) => handleInputChange('upiId', e.target.value)}
                      className={errors.upiId ? 'border-red-500' : ''}
                    />
                    {errors.upiId && <p className="text-xs text-red-500">{errors.upiId}</p>}
                  </div>
                )}

                {errors.general && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.general}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    `Pay ${paymentLinkData?.currency === 'USD' ? '$' : '₹'}${amount ? amount.toLocaleString('en-IN') : '0'}`
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <AlertCircle className="h-4 w-4" />
              <span>🔒 Secured by 256-bit SSL encryption. Your payment information is safe.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
