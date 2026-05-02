'use client';

import * as React from 'react';
import { Bell, CreditCard, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/lib/store/auth';

type AppNotification = {
  id: string;
  type: 'payment' | 'dispute' | 'system';
  title: string;
  description: string;
  time: string;
  read: boolean;
};

export function NotificationBell() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = React.useState<AppNotification[]>([
    {
      id: 'sys-1',
      type: 'system',
      title: 'Welcome to Advanced Pay',
      description: 'Your merchant account is active.',
      time: 'Just now',
      read: false,
    }
  ]);
  const [unreadCount, setUnreadCount] = React.useState(1);

  React.useEffect(() => {
    if (!user) return;

    // Connect to WebSocket pulse for live notifications
    let ws: WebSocket;
    try {
      ws = new WebSocket('ws://localhost:8081/api/v1/ws/pulse');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'pulse') {
            const isSuccess = data.status === 'success' || data.amount > 0;
            const newNotif: AppNotification = {
              id: `live-${Date.now()}`,
              type: 'payment',
              title: isSuccess ? 'Payment Received' : 'Payment Failed',
              description: `₹${(data.amount || 0).toLocaleString()} via ${data.method || 'Card'}`,
              time: 'Just now',
              read: false,
            };
            
            setNotifications(prev => [newNotif, ...prev].slice(0, 5)); // Keep last 5
            setUnreadCount(prev => prev + 1);
          }
        } catch (e) {
          // ignore parsing errors
        }
      };
    } catch (e) {
      console.warn('Notification websocket failed', e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [user]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment': return <CreditCard className="w-4 h-4 text-emerald-500" />;
      case 'dispute': return <ShieldAlert className="w-4 h-4 text-orange-500" />;
      default: return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <DropdownMenu onOpenChange={(open) => { if (!open) markAllRead(); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse border-2 border-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              You're all caught up!
            </div>
          ) : (
            notifications.map(n => (
              <DropdownMenuItem key={n.id} className="flex items-start gap-3 p-3 cursor-default focus:bg-muted/50">
                <div className={`mt-0.5 p-1.5 rounded-full bg-background border shadow-sm ${!n.read ? 'ring-1 ring-primary/20' : ''}`}>
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <p className={`text-sm leading-none ${!n.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {n.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80">
                    {n.time}
                  </p>
                </div>
                {!n.read && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-center justify-center text-xs text-primary font-medium" onClick={markAllRead}>
          Mark all as read
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
