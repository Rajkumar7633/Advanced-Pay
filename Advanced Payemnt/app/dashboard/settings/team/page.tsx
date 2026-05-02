'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';
import { ArrowLeft, MoreHorizontal, User } from 'lucide-react';
import { merchantsApi } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export default function TeamSettingsPage() {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInjecting, setIsInjecting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Invite Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('developer');

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    setIsLoading(true);
    try {
      const res: any = await merchantsApi.getTeamMembers();
      // Ensure we map what we receive securely 
      const collection = res.data || res || [];
      setMembers(Array.isArray(collection) ? collection : []);
    } catch (error) {
      console.error('Failed to load team', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!name || !email) {
      toast({ title: 'Validation Error', description: 'Name and email are required', variant: 'destructive' });
      return;
    }
    setIsInjecting(true);
    try {
      await merchantsApi.inviteTeamMember({ name, email, role });
      setIsOpen(false);
      setName('');
      setEmail('');
      setRole('developer');
      toast({ title: 'Success', description: 'Team member invited successfully' });
      await loadTeam();
    } catch (error) {
      console.error('Failed to invite member', error);
      toast({
         title: 'Failed to invite',
         description: (error as any).response?.data?.error || 'Unknown error occurred',
         variant: 'destructive',
      });
    } finally {
      setIsInjecting(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    try {
      await merchantsApi.removeTeamMember(id);
      setMembers(members.filter(m => m.id !== id));
      toast({ title: 'Success', description: 'Team member removed' });
    } catch (error) {
       console.error('Failed to remove member', error);
       toast({ title: 'Error', description: 'Failed to remove team member.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mt-20"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </Link>
      <h1 className="text-3xl font-bold text-foreground mb-2">Team</h1>
      <p className="text-muted-foreground mb-6">Manage team members and permissions</p>

      <Alert className="mb-8 border-primary/20 bg-primary/5">
        <Shield className="h-4 w-4" />
        <AlertTitle>Role-Based Access Control (RBAC) Active</AlertTitle>
        <AlertDescription className="text-sm mt-2 flex flex-col gap-2">
          <p>Your team members are restricted by their assigned roles:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong>Owner/Admin:</strong> Full system access.</li>
            <li><strong>Developer:</strong> Can manage API keys and Webhooks. Cannot remove admins.</li>
            <li><strong>Viewer:</strong> Read-only access to transactions and refunds.</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card className="border-border">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Team Members</h2>
            <p className="text-sm text-muted-foreground">People with access to your account</p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>+ Invite Member</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to grant access to your Merchant Dashboard.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button disabled={isInjecting} onClick={handleInvite}>
                  {isInjecting ? 'Inviting...' : 'Send Invite'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No extra team members currently.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {members.map((member) => (
                <div key={member.id} className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {member.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{member.name}</p>
                        <Badge variant={member.role === 'owner' || member.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] h-5">
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => handleRemove(member.id)}>
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
