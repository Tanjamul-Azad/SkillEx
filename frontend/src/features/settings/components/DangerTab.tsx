import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { UserService } from '@/services/userService';
import type { User } from '@/types';

interface DangerTabProps {
  user: User | null;
  logout: () => Promise<void> | void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toast: (options: any) => void;
}

export default function DangerTab({ user, logout, toast }: DangerTabProps) {
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');

  return (
    <div className="overflow-hidden rounded-[2rem] border border-destructive/30 bg-destructive/5 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] relative">
      <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent pointer-events-none" />
      <div className="p-6 border-b border-destructive/20 bg-destructive/10 relative z-10">
        <h3 className="text-xl font-extrabold font-headline text-destructive flex items-center gap-2 drop-shadow-[0_0_8px_var(--destructive)]">
          <Trash2 className="h-5 w-5" /> Danger Zone
        </h3>
        <p className="text-[10px] uppercase font-bold tracking-widest text-destructive/80 mt-1">These actions are irreversible. Proceed with caution.</p>
      </div>
      <div className="p-6 space-y-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5 shadow-[inset_0_1px_0_0_hsla(24,100%,50%,0.1)]">
          <div>
            <p className="font-extrabold text-orange-500 font-headline text-lg drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">Log out of all devices</p>
            <p className="text-[10px] uppercase font-bold tracking-widest text-orange-500/70 mt-1">Sign out everywhere and revoke all active sessions.</p>
          </div>
          <Button variant="outline" className="border-orange-500/30 text-orange-500 hover:bg-orange-500/20 hover:text-orange-400 font-bold rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.15)]" onClick={() => setConfirmLogoutAll(true)}>
            Log Out Everywhere
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-destructive/40 bg-destructive/20 p-5 shadow-[inset_0_1px_0_0_hsla(0,100%,50%,0.2)]">
          <div>
            <p className="font-extrabold text-destructive font-headline text-lg drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">Delete Account</p>
            <p className="text-[10px] uppercase font-bold tracking-widest text-destructive/80 mt-1">Permanently remove your account and all data.</p>
          </div>
          <Button
            variant="destructive"
            className="rounded-xl font-bold shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] bg-destructive text-destructive-foreground"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete Account
          </Button>
        </div>
      </div>

      {/* ── Log out all devices confirm ── */}
      <ConfirmDialog
        open={confirmLogoutAll}
        onOpenChange={setConfirmLogoutAll}
        title="Log out of all devices?"
        description="You'll be signed out everywhere. You'll need to sign in again on every device."
        confirmLabel="Log out everywhere"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={logout}
      />

      {/* ── Delete account dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={(o) => { setDeleteDialogOpen(o); if (!o) setDeleteConfirmEmail(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" /> Delete Account
            </DialogTitle>
            <DialogDescription>
              This action is <strong>permanent and irreversible</strong>. All your matches, sessions, and data will be erased.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              You are about to permanently delete <strong>{user?.email}</strong> and all associated data.
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-delete-email" className="text-sm font-medium">
                Type your email address to confirm
              </Label>
              <Input
                id="confirm-delete-email"
                type="email"
                placeholder={user?.email ?? 'your@email.com'}
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmEmail(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmEmail !== user?.email}
              onClick={async () => {
                try {
                  await UserService.deleteAccount();
                  setDeleteDialogOpen(false);
                  setDeleteConfirmEmail('');
                  logout();
                } catch {
                  toast({ title: 'Failed to delete account', description: 'Please try again or contact support.', variant: 'destructive' });
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
