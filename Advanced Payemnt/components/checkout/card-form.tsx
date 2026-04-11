'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Lock } from 'lucide-react';

interface CardFormProps {
  onSubmit: (data: any) => Promise<void>;
  isProcessing: boolean;
}

export default function CardForm({ onSubmit, isProcessing }: CardFormProps) {
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Format card number with spaces
    if (name === 'cardNumber') {
      formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    }

    setCardData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!cardData.cardNumber || cardData.cardNumber.replace(/\s/g, '').length < 13) {
      newErrors.cardNumber = 'Invalid card number';
    }
    if (!cardData.cardHolder.trim()) {
      newErrors.cardHolder = 'Cardholder name is required';
    }
    if (!cardData.expiryMonth || parseInt(cardData.expiryMonth) > 12) {
      newErrors.expiryMonth = 'Invalid month';
    }
    if (!cardData.expiryYear || cardData.expiryYear.length < 2) {
      newErrors.expiryYear = 'Invalid year';
    }
    if (!cardData.cvv || cardData.cvv.length < 3) {
      newErrors.cvv = 'Invalid CVV';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      await onSubmit(cardData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Card Number</label>
        <div className="relative">
          <Input
            name="cardNumber"
            value={cardData.cardNumber}
            onChange={handleInputChange}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
            disabled={isProcessing}
          />
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        </div>
        {errors.cardNumber && (
          <p className="text-xs text-red-400">{errors.cardNumber}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Cardholder Name</label>
        <Input
          name="cardHolder"
          value={cardData.cardHolder}
          onChange={handleInputChange}
          placeholder="John Doe"
          className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
          disabled={isProcessing}
        />
        {errors.cardHolder && (
          <p className="text-xs text-red-400">{errors.cardHolder}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Expiry</label>
          <div className="flex gap-2">
            <Input
              name="expiryMonth"
              value={cardData.expiryMonth}
              onChange={handleInputChange}
              placeholder="MM"
              maxLength={2}
              type="number"
              min="1"
              max="12"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
              disabled={isProcessing}
            />
            <Input
              name="expiryYear"
              value={cardData.expiryYear}
              onChange={handleInputChange}
              placeholder="YY"
              maxLength={2}
              type="number"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
              disabled={isProcessing}
            />
          </div>
          {(errors.expiryMonth || errors.expiryYear) && (
            <p className="text-xs text-red-400">{errors.expiryMonth || errors.expiryYear}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">CVV</label>
          <div className="relative">
            <Input
              name="cvv"
              value={cardData.cvv}
              onChange={handleInputChange}
              placeholder="123"
              maxLength={4}
              type="password"
              className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
              disabled={isProcessing}
            />
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          </div>
          {errors.cvv && (
            <p className="text-xs text-red-400">{errors.cvv}</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={isProcessing}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2"
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </Button>
    </form>
  );
}
