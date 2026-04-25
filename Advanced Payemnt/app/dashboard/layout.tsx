'use client';

import DashboardNav from '@/components/dashboard/nav';
import { useAuthStore } from '@/lib/store/auth';
import { KYCWall } from '@/components/dashboard/kyc-wall';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();

  if (user?.status === 'pending' || user?.kyc_status === 'pending' || user?.kyc_status === 'under_review') {
    return <KYCWall />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-blue-500/30">
      <DashboardNav />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
