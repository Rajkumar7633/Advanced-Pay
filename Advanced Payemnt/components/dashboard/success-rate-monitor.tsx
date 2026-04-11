'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const successRateData = [
  { time: '00:00', card: 97.2, upi: 98.5, wallet: 96.1 },
  { time: '04:00', card: 96.8, upi: 98.2, wallet: 95.8 },
  { time: '08:00', card: 98.1, upi: 99.0, wallet: 97.2 },
  { time: '12:00', card: 97.8, upi: 98.7, wallet: 96.9 },
  { time: '16:00', card: 98.2, upi: 98.9, wallet: 97.1 },
  { time: '20:00', card: 97.9, upi: 98.6, wallet: 96.5 },
];

export function SuccessRateMonitor() {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">Real-Time Success Rate</CardTitle>
        <CardDescription>Live success % by payment method • Public transparency</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded bg-blue-500/10">
            <p className="text-2xl font-bold text-blue-600">98.1%</p>
            <p className="text-xs text-muted-foreground">Cards</p>
          </div>
          <div className="text-center p-2 rounded bg-green-500/10">
            <p className="text-2xl font-bold text-green-600">98.7%</p>
            <p className="text-xs text-muted-foreground">UPI</p>
          </div>
          <div className="text-center p-2 rounded bg-amber-500/10">
            <p className="text-2xl font-bold text-amber-600">96.9%</p>
            <p className="text-xs text-muted-foreground">Wallets</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={successRateData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="time" className="text-xs" />
            <YAxis domain={[94, 100]} className="text-xs" />
            <Tooltip />
            <Line type="monotone" dataKey="card" stroke="#0066ff" strokeWidth={2} name="Card" />
            <Line type="monotone" dataKey="upi" stroke="#00b894" strokeWidth={2} name="UPI" />
            <Line type="monotone" dataKey="wallet" stroke="#fdcb6e" strokeWidth={2} name="Wallet" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
