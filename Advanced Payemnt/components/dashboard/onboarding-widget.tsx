'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, ChevronRight, Rocket, Link as LinkIcon, Building2, Key } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/lib/store/auth';
import { useRouter } from 'next/navigation';

export function OnboardingWidget() {
  const { user } = useAuthStore();
  const router = useRouter();

  // In a real app, these would be fetched from the backend or user profile flags.
  // We'll simulate them based on user state for demonstration of the premium UX.
  const [tasks, setTasks] = React.useState([
    {
      id: 'kyc',
      title: 'Complete Business Profile & KYC',
      description: 'Provide your business details and upload verification documents.',
      isCompleted: false,
      icon: <Building2 className="w-5 h-5 text-blue-500" />,
      action: () => router.push('/dashboard/settings/account'),
    },
    {
      id: 'bank',
      title: 'Add a Settlement Bank Account',
      description: 'Link your primary bank account to receive automated payouts.',
      isCompleted: false,
      icon: <Building2 className="w-5 h-5 text-emerald-500" />,
      action: () => router.push('/dashboard/banking'),
    },
    {
      id: 'api',
      title: 'Generate API Keys',
      description: 'Create your first pair of test and live API keys to integrate.',
      isCompleted: false,
      icon: <Key className="w-5 h-5 text-orange-500" />,
      action: () => router.push('/dashboard/developers'),
    },
    {
      id: 'link',
      title: 'Create a Payment Link',
      description: 'Generate your first no-code payment link to accept money instantly.',
      isCompleted: false,
      icon: <LinkIcon className="w-5 h-5 text-purple-500" />,
      action: () => router.push('/dashboard/payment-links'),
    }
  ]);

  React.useEffect(() => {
    // Simulate updating tasks based on user profile
    if (user?.kyc_status === 'verified') {
      setTasks(prev => prev.map(t => t.id === 'kyc' ? { ...t, isCompleted: true } : t));
    }
  }, [user]);

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const progress = (completedCount / tasks.length) * 100;
  
  // If all completed, optionally hide the widget entirely or collapse it.
  if (completedCount === tasks.length) {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <Card className="border-indigo-500/20 shadow-lg bg-gradient-to-br from-card to-indigo-900/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Rocket className="w-32 h-32 text-indigo-500" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                Welcome to Advanced Pay! Let's get you set up.
              </h2>
              <p className="text-sm text-muted-foreground">
                Complete these quick steps to start accepting payments and growing your business.
              </p>
            </div>
            <div className="flex items-center gap-4 min-w-[200px]">
              <div className="flex-1">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-muted-foreground">Setup Progress</span>
                  <span className="text-indigo-500">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tasks.map((task) => (
              <motion.div 
                key={task.id}
                whileHover={{ scale: 1.02 }}
                className={`p-4 rounded-xl border transition-colors cursor-pointer flex flex-col ${
                  task.isCompleted 
                    ? 'bg-muted/50 border-border/40 opacity-70' 
                    : 'bg-background border-border hover:border-indigo-500/50 hover:shadow-md'
                }`}
                onClick={task.action}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${task.isCompleted ? 'bg-muted' : 'bg-muted/50'}`}>
                    {task.icon}
                  </div>
                  {task.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/30" />
                  )}
                </div>
                <h3 className={`font-semibold text-sm mb-1 ${task.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.title}
                </h3>
                <p className="text-xs text-muted-foreground flex-1">
                  {task.description}
                </p>
                {!task.isCompleted && (
                  <div className="mt-4 flex items-center text-xs font-medium text-indigo-500">
                    Get started <ChevronRight className="w-3 h-3 ml-1" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
