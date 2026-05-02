'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { DialogProps } from '@radix-ui/react-dialog';
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Activity,
  Link as LinkIcon,
  Search,
  Building2,
  Trophy
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useAuthStore } from '@/lib/store/auth';

export function CommandPalette() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground border border-border/60 rounded-full hover:bg-muted transition-colors w-64 justify-between group"
      >
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span>Search dashboard...</span>
        </div>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border/80 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/payment-links'))}>
              <LinkIcon className="mr-2 h-4 w-4" />
              <span>Create Payment Link</span>
              <CommandShortcut>⌘L</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/payments'))}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>New Charge (Virtual Terminal)</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/settlements'))}>
              <Building2 className="mr-2 h-4 w-4" />
              <span>Request Payout</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/analytics'))}>
              <Activity className="mr-2 h-4 w-4" />
              <span>Analytics</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/customers'))}>
              <User className="mr-2 h-4 w-4" />
              <span>Customers</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/disputes'))}>
              <Trophy className="mr-2 h-4 w-4" />
              <span>Disputes & Radar</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/developers'))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Developer Studio</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/settings'))}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile ({user?.email})</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
