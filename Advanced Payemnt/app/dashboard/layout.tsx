'use client';

import DashboardNav from '@/components/dashboard/nav';
import { useAuthStore } from '@/lib/store/auth';
import { KYCWall } from '@/components/dashboard/kyc-wall';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AiCopilot } from '@/components/ai-copilot';
import { CommandPalette } from '@/components/dashboard/command-palette';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, fetchUser } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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
      <main className="flex-1 overflow-y-auto relative flex flex-col">
        {/* Global Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-end h-14 px-6 border-b border-border/40 bg-background/80 backdrop-blur-md gap-4 shrink-0">
           <CommandPalette />
           <NotificationBell />
        </header>
        
        {/* Animated Page Transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-1 flex flex-col h-full"
          >
             {children}
          </motion.div>
        </AnimatePresence>

        <AiCopilot />
      </main>
    </div>
  );
}
