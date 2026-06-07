import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { UserService } from '@/services/userService';
import { api } from '@/services/api';
import type { User } from '@/types';

const passwordSchema = z.object({
  current: z.string().min(1, 'Current password is required.'),
  next: z.string().min(8, 'New password must be at least 8 characters.'),
  confirm: z.string(),
}).refine((d) => d.next === d.confirm, { message: "Passwords don't match.", path: ['confirm'] });

type PasswordFormData = z.infer<typeof passwordSchema>;

interface SecurityTabProps {
  user: User | null;
  refreshUser: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toast: (options: any) => void;
}

export default function SecurityTab({ user: _user, refreshUser, toast }: SecurityTabProps) {
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);

  // Connect Email state
  const [connectEmail, setConnectEmail] = useState('');
  const [connectOtp, setConnectOtp] = useState('');
  const [connectStep, setConnectStep] = useState<'input' | 'otp'>('input');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: '', next: '', confirm: '' },
  });

  const handleRequestOtp = async () => {
    if (!connectEmail || !connectEmail.includes('@')) {
      toast({ title: 'Invalid Email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    setIsRequestingOtp(true);
    try {
      await UserService.requestEmailConnectOtp(connectEmail);
      toast({ title: 'OTP Sent', description: 'Please check your email for the OTP.', variant: 'success' });
      setConnectStep('otp');
    } catch (err) {
      const message = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : err instanceof Error
          ? err.message
          : undefined;
      toast({ title: 'Failed to send OTP', description: message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!connectOtp || connectOtp.length !== 6) {
      toast({ title: 'Invalid OTP', description: 'Please enter the 6-digit OTP.', variant: 'destructive' });
      return;
    }
    setIsVerifyingOtp(true);
    try {
      await UserService.verifyEmailConnectOtp(connectEmail, connectOtp);
      toast({ title: 'Email Connected', description: 'Your email has been successfully updated.', variant: 'success' });
      await refreshUser();
      setConnectStep('input');
      setConnectEmail('');
      setConnectOtp('');
    } catch (err) {
      const message = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : err instanceof Error
          ? err.message
          : undefined;
      toast({ title: 'Verification Failed', description: message || 'Please check your OTP and try again.', variant: 'destructive' });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handlePasswordSave = async (data: PasswordFormData) => {
    setSavingPassword(true);
    try {
      await api.post('/users/me/change-password', {
        currentPassword: data.current,
        newPassword: data.next,
      });
      passwordForm.reset();
      toast({ title: 'Password changed', description: 'Your password has been updated.', variant: 'success' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Password change failed',
        description: err instanceof Error ? err.message : 'Could not update password.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* CONNECT EMAIL BLOCK */}
      <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
        <div className="p-6 border-b border-white/5 bg-white/5">
          <h3 className="text-xl font-extrabold font-headline text-white flex items-center gap-2">
            <Lock className="h-5 w-5 text-accent" /> Connect Google Account
          </h3>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Verify a Gmail address to log in with Google next time.</p>
        </div>
        <div className="p-6">
          {connectStep === 'input' ? (
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">New Email Address</Label>
                <Input
                  type="email"
                  placeholder="your.google.account@gmail.com"
                  value={connectEmail}
                  onChange={(e) => setConnectEmail(e.target.value)}
                  className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-accent/50 focus:border-accent/50 rounded-xl"
                />
              </div>
              <Button 
                onClick={handleRequestOtp} 
                disabled={isRequestingOtp || !connectEmail}
                className="min-w-[160px] bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl font-bold shadow-[0_0_20px_hsl(var(--accent)/0.2)] hover:shadow-[0_0_30px_hsl(var(--accent)/0.4)] transition-all"
              >
                {isRequestingOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : 'Send OTP'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Enter 6-digit OTP</Label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={connectOtp}
                  onChange={(e) => setConnectOtp(e.target.value)}
                  className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-accent/50 focus:border-accent/50 rounded-xl tracking-widest font-mono text-lg"
                />
                <p className="text-xs text-muted-foreground">OTP sent to: <strong>{connectEmail}</strong></p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleVerifyOtp} 
                  disabled={isVerifyingOtp || connectOtp.length !== 6}
                  className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl font-bold shadow-[0_0_20px_hsl(var(--accent)/0.2)] hover:shadow-[0_0_30px_hsl(var(--accent)/0.4)] transition-all"
                >
                  {isVerifyingOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : 'Verify & Connect'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setConnectStep('input')}
                  className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CHANGE PASSWORD BLOCK */}
      <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
        <div className="p-6 border-b border-white/5 bg-white/5">
          <h3 className="text-xl font-extrabold font-headline text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Change Password
          </h3>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Use a strong password that you don't use elsewhere.</p>
        </div>
        <div className="p-6">
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSave)} className="space-y-6 max-w-md">
              <FormField control={passwordForm.control} name="current" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Current Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input {...field} type={showCurrent ? 'text' : 'password'} placeholder="Your current password" className="pr-10 appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 rounded-xl" />
                    </FormControl>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={passwordForm.control} name="next" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">New Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input {...field} type={showNext ? 'text' : 'password'} placeholder="Min. 8 characters" className="pr-10 appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 rounded-xl" />
                    </FormControl>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => setShowNext((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg"
                    >
                      {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={passwordForm.control} name="confirm" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Confirm New Password</FormLabel>
                  <FormControl><Input {...field} type="password" placeholder="Repeat new password" className="appearance-none bg-black/20 border-white/10 text-white placeholder-white/30 focus:ring-primary/50 focus:border-primary/50 rounded-xl" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={savingPassword} className="min-w-[160px] bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-all">
                {savingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
