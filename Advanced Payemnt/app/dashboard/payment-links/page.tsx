'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Link2, QrCode, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { formatCurrency, formatDateShort } from '@/lib/formatting';
interface PaymentLink {
  id: string;
  amount: number;
  description?: string;
  currency: string;
  status: string;
  link: string;
  created_at: string;
  clicks?: number;
  payments?: number;
  revenue?: number;
  conversion_rate?: number;
}
import { merchantsApi, paymentLinksApi } from '@/lib/api';

export default function PaymentLinksPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lanIp, setLanIp] = useState<string | null>(null);

  useEffect(() => {
    // Fetch LAN IP for QR codes when running on localhost
    fetch('/api/local-ip')
      .then(res => res.json())
      .then(data => setLanIp(data.ip))
      .catch(console.error);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await paymentLinksApi.list();
        console.log('Payment links API response:', res);
        if (!cancelled) setLinks(res?.data || []);
        console.log('Payment links set:', res?.data || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load payment links');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteLink = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment link? This action cannot be undone.')) {
      return;
    }

    try {
      await paymentLinksApi.delete(id);
      // Refetch links
      const res = await paymentLinksApi.list();
      setLinks(res?.data || []);
      alert('Payment link deleted successfully');
    } catch (e) {
      alert('Failed to delete payment link: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleCreateLink = async (data: { amount: number; description?: string }) => {
    try {
      const res = await paymentLinksApi.create(data);
      setShowCreateModal(false);
      // Refetch links
      const linksRes = await paymentLinksApi.list();
      setLinks(linksRes?.data || []);
      
      // Show success message with payment link
      if (res?.data?.link) {
        alert(`Payment link created: ${res.data.link}`);
      }
    } catch (e) {
      alert('Failed to create payment link: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const filteredLinks = links.filter(
    (pl) =>
      (pl.description && pl.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      pl.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pl.link.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getScannableLink = (link: string) => {
    if (typeof window !== 'undefined') {
      let currentOrigin = window.location.origin;
      // If we are on localhost, replace it with the dynamic LAN IP so phones can scan it!
      if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && lanIp) {
        currentOrigin = `http://${lanIp}:${window.location.port || '3001'}`;
      }
      return link.replace(/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?/, currentOrigin);
    }
    return link;
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(getScannableLink(link));
    // Show success message
    alert('Payment link copied to clipboard!');
  };

  const handleShowQR = (link: string, linkId: string) => {
    const scannableLink = getScannableLink(link);
    // Generate QR code URL (using a free QR code API)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(scannableLink)}`;
    
    // Create modal to show QR code
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-8 max-w-sm mx-auto shadow-2xl">
        <h3 class="text-xl font-bold mb-4 text-center">Scan to Pay</h3>
        <div class="text-center mb-6">
          <img src="${qrUrl}" alt="QR Code" class="mx-auto border-2 rounded-xl p-4 shadow-sm" />
        </div>
        <p class="text-sm text-gray-600 mb-6 text-center">Scan this QR code with any mobile camera or scanner app to open the checkout page securely.</p>
        <div class="flex gap-3">
          <button onclick="this.closest('.fixed').remove()" class="flex-1 px-4 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            Close
          </button>
          <button onclick="navigator.clipboard.writeText('${scannableLink}'); alert('Network link copied!')" class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Copy Link
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payment Links</h1>
          <p className="text-muted-foreground mt-1">Create and manage shareable payment links</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Payment Link
        </Button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by description or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredLinks.map((pl) => (
          <Card key={pl.id} className="border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{pl.description || 'Payment Link'}</CardTitle>
                    <CardDescription className="text-sm">ID: {pl.id}</CardDescription>
                    <p className="text-lg font-semibold text-foreground mt-1">
                      {formatCurrency(pl.amount, pl.currency)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={pl.status === 'active' ? 'default' : 'secondary'}
                  className="w-fit"
                >
                  {pl.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Clicks</span>
                  <p className="font-medium">{pl.clicks || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payments</span>
                  <p className="font-medium">{pl.payments || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Revenue</span>
                  <p className="font-medium">{formatCurrency(pl.revenue || 0)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Conversion</span>
                  <p className="font-medium">{(pl.conversion_rate || 0).toFixed(1)}%</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  Created {formatDateShort(pl.created_at)}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => handleCopyLink(pl.link)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleShowQR(pl.link, pl.id)}>
                    <QrCode className="w-4 h-4 mr-2" />
                    Show QR
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={getScannableLink(pl.link)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open
                    </a>
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleDeleteLink(pl.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLinks.length === 0 && (
        <Card className="border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            No payment links found. Create your first payment link to get started.
          </CardContent>
        </Card>
      )}
      {/* Create Payment Link Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Payment Link</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  placeholder="100.00"
                  id="amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <input
                  type="text"
                  className="w-full border rounded p-2"
                  placeholder="Payment for services"
                  id="description"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    const amount = Number((document.getElementById('amount') as HTMLInputElement).value);
                    const description = (document.getElementById('description') as HTMLInputElement).value;
                    await handleCreateLink({ amount, description: description || undefined });
                  }}
                >
                  Create Link
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
