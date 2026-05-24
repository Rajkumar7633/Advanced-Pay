'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, CheckCircle, X, Loader2, Shield } from 'lucide-react';
import { merchantsApi } from '@/lib/api';

interface KYCDocument {
  type: string;
  label: string;
  description: string;
  file?: File;
  status: 'idle' | 'uploading' | 'done' | 'error';
}

const KYC_DOCS: Omit<KYCDocument, 'file' | 'status'>[] = [
  { type: 'pan_card', label: 'PAN Card', description: 'Business or proprietor PAN card (PDF/JPG, max 5MB)' },
  { type: 'gst_certificate', label: 'GST Certificate', description: 'GST registration certificate (PDF, max 5MB)' },
  { type: 'bank_statement', label: 'Bank Statement', description: 'Last 3 months bank statement (PDF, max 5MB)' },
  { type: 'business_proof', label: 'Business Proof', description: 'Incorporation certificate or trade license (PDF, max 5MB)' },
];

export function KYCUploadSection({ kycStatus }: { kycStatus?: string }) {
  const [docs, setDocs] = useState<KYCDocument[]>(
    KYC_DOCS.map(d => ({ ...d, status: 'idle' as const }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFileChange = useCallback((index: number, file: File | null) => {
    setDocs(prev => prev.map((d, i) => i === index ? { ...d, file: file ?? undefined, status: 'idle' } : d));
  }, []);

  const handleDrop = useCallback((index: number, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(index, file);
  }, [handleFileChange]);

  const handleSubmit = async () => {
    const hasFile = docs.some(d => d.file);
    if (!hasFile) { alert('Please upload at least one document.'); return; }

    setSubmitting(true);
    try {
      // Convert files to base64 and submit as JSON
      const documents: Record<string, string> = {};
      for (const doc of docs) {
        if (doc.file) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(doc.file!);
          });
          documents[doc.type] = base64;
        }
      }

      await merchantsApi.submitKYC({ documents, submitted_at: new Date().toISOString() });
      setSubmitted(true);
      setDocs(prev => prev.map(d => ({ ...d, status: d.file ? 'done' : d.status })));
    } catch (e) {
      alert('KYC submission failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const isVerified = kycStatus === 'verified';
  const isUnderReview = kycStatus === 'under_review';

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          KYC Verification
          {kycStatus && (
            <Badge className={
              isVerified ? 'bg-green-500/20 text-green-600' :
              isUnderReview ? 'bg-yellow-500/20 text-yellow-600' :
              'bg-red-500/20 text-red-600'
            }>
              {kycStatus.replace(/_/g, ' ')}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Upload your business verification documents. All documents are encrypted and securely stored.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isVerified ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">KYC Verified</p>
              <p className="text-sm opacity-80">Your account is fully verified. You have access to all platform features.</p>
            </div>
          </div>
        ) : submitted || isUnderReview ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-700">
            <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
            <div>
              <p className="font-semibold">Documents Under Review</p>
              <p className="text-sm opacity-80">Our team is reviewing your documents. This usually takes 1-2 business days.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {docs.map((doc, index) => (
                <div
                  key={doc.type}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDrop(index, e)}
                  className={`relative border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer ${
                    doc.file ? 'border-green-500/50 bg-green-500/5' : 'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={e => handleFileChange(index, e.target.files?.[0] ?? null)}
                  />
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${doc.file ? 'bg-green-500/20' : 'bg-muted'}`}>
                      {doc.file ? <CheckCircle className="w-4 h-4 text-green-600" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{doc.label}</p>
                      {doc.file ? (
                        <p className="text-xs text-green-600 truncate">{doc.file.name}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{doc.description}</p>
                      )}
                    </div>
                    {doc.file && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleFileChange(index, null); }}
                        className="text-muted-foreground hover:text-destructive transition-colors z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {!doc.file && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Drop file here or click to browse
                    </p>
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !docs.some(d => d.file)}
              className="w-full"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Documents...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Submit KYC Documents</>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              🔒 Documents are AES-256 encrypted and only reviewed by our compliance team.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
