'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAdminMerchantDetail, useAdminMutateMerchantStatus } from '@/hooks/useAdmin';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import { Building2, Loader2, Mail, MapPin, Phone, Shield } from 'lucide-react';
import { toast } from 'sonner';

function statusBadgeClass(status: string) {
  switch (status) {
    case 'active':
    case 'approved':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300';
    case 'pending':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200';
    case 'suspended':
      return 'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-300';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

type MerchantDetailSheetProps = {
  merchantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusApplied?: () => void;
};

export function MerchantDetailSheet({ merchantId, open, onOpenChange, onStatusApplied }: MerchantDetailSheetProps) {
  const { data: m, isLoading, isError, refetch } = useAdminMerchantDetail(merchantId, open);
  const merchantMutation = useAdminMutateMerchantStatus();

  const applyStatus = async (status: string, label: string) => {
    if (!merchantId) return;
    try {
      await merchantMutation.mutateAsync({ merchantId, status });
      toast.success(label);
      await refetch();
      onStatusApplied?.();
    } catch {
      toast.error('Could not update merchant status');
    }
  };

  const addrLine = m
    ? [m.address_street, m.address_city, m.address_state, m.address_postal_code, m.address_country].filter(Boolean).join(', ')
    : '';

  let kycDocs: any = null;
  try {
    kycDocs = typeof m?.kyc_documents === 'string' 
      ? JSON.parse(m.kyc_documents) 
      : (m?.kyc_documents || null);
  } catch (e) {
    kycDocs = null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="space-y-1 border-b border-border pb-4 text-left">
          <SheetTitle className="flex flex-wrap items-center gap-2 pr-8">
            {isLoading ? (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </span>
            ) : (
              <>
                <span className="truncate">{m?.business_name ?? 'Merchant'}</span>
                {m?.status && (
                  <Badge variant="outline" className={cn('font-medium capitalize', statusBadgeClass(m.status))}>
                    {m.status}
                  </Badge>
                )}
                {m?.kyc_status && (
                  <Badge variant="outline" className="font-normal capitalize text-muted-foreground">
                    KYC: {m.kyc_status}
                  </Badge>
                )}
              </>
            )}
          </SheetTitle>
          <SheetDescription className="font-mono text-xs">{merchantId}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 py-6">
          {isError && (
            <p className="text-sm text-destructive">Could not load merchant. Close and try again.</p>
          )}

          {!isLoading && m && (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border/80 bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Successful volume</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {formatCurrency(parseFloat(m.successful_volume || '0'))}
                  </p>
                </div>
                <div className="rounded-lg border border-border/80 bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Transactions</p>
                  <p className="mt-1 font-semibold tabular-nums">{m.total_transactions}</p>
                </div>
                <div className="rounded-lg border border-border/80 bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Open disputes</p>
                  <p className="mt-1 font-semibold tabular-nums">{m.open_disputes}</p>
                </div>
                <div className="rounded-lg border border-border/80 bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Active subscriptions</p>
                  <p className="mt-1 font-semibold tabular-nums">{m.active_subscriptions}</p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  Contact
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2">
                    <span className="text-muted-foreground">Email</span>
                    <a href={`mailto:${m.email}`} className="font-medium text-primary underline-offset-4 hover:underline">
                      {m.email}
                    </a>
                  </p>
                  {m.phone ? (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{m.phone}</span>
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">Joined {formatDate(m.created_at)}</p>
                  <p className="text-xs text-muted-foreground">
                    2FA: <strong className="text-foreground">{m.two_factor_enabled ? 'On' : 'Off'}</strong>
                  </p>
                </div>
              </div>

              {(m.website || m.industry || m.gst_number || m.tax_id) && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    Business profile
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {m.website ? (
                      <li>
                        <span className="text-muted-foreground">Website: </span>
                        <a href={m.website.startsWith('http') ? m.website : `https://${m.website}`} className="text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                          {m.website}
                        </a>
                      </li>
                    ) : null}
                    {m.industry ? (
                      <li>
                        <span className="text-muted-foreground">Industry: </span>
                        {m.industry}
                      </li>
                    ) : null}
                    {m.gst_number ? (
                      <li>
                        <span className="text-muted-foreground">GST: </span>
                        <span className="font-mono">{m.gst_number}</span>
                      </li>
                    ) : null}
                    {m.tax_id ? (
                      <li>
                        <span className="text-muted-foreground">Tax ID: </span>
                        <span className="font-mono">{m.tax_id}</span>
                      </li>
                    ) : null}
                  </ul>
                </div>
              )}

              {m.description ? (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</h3>
                  <p className="text-sm leading-relaxed text-foreground/90">{m.description}</p>
                </div>
              ) : null}

              {addrLine ? (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    Address
                  </h3>
                  <p className="text-sm leading-relaxed">{addrLine}</p>
                </div>
              ) : null}

              {kycDocs && Object.keys(kycDocs).length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-500">
                    <Shield className="h-4 w-4" />
                    Identity & Compliance Vault
                  </h3>
                  <div className="grid gap-3">
                    {kycDocs.aadhaar_number && (
                      <div className="rounded border bg-indigo-50/50 p-3 dark:bg-indigo-950/20">
                        <p className="text-xs font-medium text-muted-foreground">Aadhaar (UIDAI)</p>
                        <p className="mt-1 font-mono text-sm">{kycDocs.aadhaar_number}</p>
                      </div>
                    )}
                    {kycDocs.passport_photo && (
                      <div className="rounded border bg-indigo-50/50 p-3 dark:bg-indigo-950/20">
                        <p className="text-xs font-medium text-muted-foreground">Identity Photo Profile</p>
                        <img src={kycDocs.passport_photo} alt="Passport Photo" className="mt-2 h-24 w-24 rounded-md object-cover ring-2 ring-indigo-500/20" />
                      </div>
                    )}
                    {kycDocs.fingerprint_signature && (
                      <div className="rounded border bg-indigo-50/50 p-3 dark:bg-indigo-950/20">
                        <p className="text-xs font-medium text-muted-foreground">Biometric Hardware Signature</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
                          <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">Verified: {kycDocs.fingerprint_signature}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  Admin actions
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Suspend blocks dashboard and API keys. Approve / active restores access (after any mandate checks on your side).
                </p>
                <div className="flex flex-wrap gap-2">
                  {(m.status === 'pending' || m.kyc_status === 'under_review') && (
                    <>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void applyStatus('approved', 'Merchant approved & KYC Verified')}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="border-destructive/50 text-destructive" onClick={() => void applyStatus('suspended', 'Merchant on hold')}>
                        Hold (suspend)
                      </Button>
                    </>
                  )}
                  {(m.status === 'active' || m.status === 'approved') && (
                    <Button size="sm" variant="outline" className="border-destructive/50 text-destructive" onClick={() => void applyStatus('suspended', 'Merchant suspended')}>
                      Suspend
                    </Button>
                  )}
                  {m.status === 'suspended' && (
                    <Button size="sm" onClick={() => void applyStatus('active', 'Merchant reactivated')}>
                      Reactivate
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
