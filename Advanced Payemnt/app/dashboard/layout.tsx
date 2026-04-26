'use client';

import DashboardNav from '@/components/dashboard/nav';
import { useAuthStore } from '@/lib/store/auth';
import { KYCWall } from '@/components/dashboard/kyc-wall';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AiCopilot } from '@/components/ai-copilot';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, fetchUser } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    if (!user) {
      fetchUser().then(() => {
        setIsHydrated(true);
      });
    } else {
      setIsHydrated(true);
    }
  }, [user, fetchUser, router]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
         <div className="animate-pulse space-y-4 flex flex-col items-center">
            <div className="h-12 w-12 rounded-full border-t-2 border-primary animate-spin" />
            <p className="text-muted-foreground text-sm tracking-wider font-mono">RESTORING SECURE SESSION</p>
         </div>
      </div>
    );
  }

  if (user?.status === 'pending' || user?.kyc_status === 'pending' || user?.kyc_status === 'under_review') {
    return <KYCWall />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-blue-500/30">
      <DashboardNav />
      <main className="flex-1 overflow-y-auto relative">
         {children}
         <AiCopilot />
      </main>
    </div>
  );
}
