import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { skillCheckService } from '@/services/skillCheckService';

export interface RequestSkillCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  skillId: string;
  skillName: string;
  mentorName: string;
  onSuccess?: () => void;
}

type Step = 'intro' | 'message' | 'confirm' | 'loading' | 'success';

export function RequestSkillCheckDialog({
  open,
  onOpenChange,
  targetUserId,
  skillId,
  skillName,
  mentorName,
  onSuccess,
}: RequestSkillCheckDialogProps) {
  const [step, setStep] = useState<Step>('intro');
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleReset = () => {
    setStep('intro');
    setMessage('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleReset();
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    setStep('loading');
    try {
      await skillCheckService.create({
        targetUserId,
        skillId,
        message: message.trim() || `I'd like a short skill check for ${skillName}.`,
      });

      setStep('success');
      toast({
        title: 'Request sent!',
        description: `${mentorName} will review your request shortly.`,
        variant: 'default',
      });

      setTimeout(() => {
        onSuccess?.();
        handleOpenChange(false);
      }, 2000);
    } catch (error) {
      setStep('message');
      toast({
        title: 'Failed to send request',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        {step === 'intro' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Request a skill check
              </DialogTitle>
              <DialogDescription>
                A 15-minute vetting call where {mentorName} demonstrates their{' '}
                <span className="font-semibold text-foreground">{skillName}</span> skills.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Live demo</p>
                    <p className="text-xs text-muted-foreground">
                      See them teach / code / design live for 5–10 min
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Clock className="h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Goal alignment</p>
                    <p className="text-xs text-muted-foreground">
                      Confirm what you want to learn & their teaching style
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Schedule fit</p>
                    <p className="text-xs text-muted-foreground">
                      Decide on a good time for both of you to meet
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setStep('message')}>
                Continue
              </Button>
            </DialogFooter>
          </motion.div>
        )}

        {step === 'message' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <DialogHeader>
              <DialogTitle>Add a personal message (optional)</DialogTitle>
              <DialogDescription>
                Help {mentorName} understand what you want to learn or any special needs
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className="space-y-2">
                <Label htmlFor="message">Your message</Label>
                <Textarea
                  id="message"
                  placeholder={`e.g., I'm trying to build a React component library and want to see your React patterns in action.`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-24 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {message.length}/500 characters
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('intro')}
              >
                Back
              </Button>
              <Button onClick={() => setStep('confirm')}>
                Review request
              </Button>
            </DialogFooter>
          </motion.div>
        )}

        {step === 'confirm' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <DialogHeader>
              <DialogTitle>Confirm your request</DialogTitle>
              <DialogDescription>
                Review before sending
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className="space-y-3 rounded-lg border border-border/60 bg-card/50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Mentor
                  </p>
                  <p className="font-semibold text-foreground">{mentorName}</p>
                </div>

                <div className="border-t border-border/30 pt-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Skill
                  </p>
                  <p className="font-semibold text-foreground">{skillName}</p>
                </div>

                {message && (
                  <div className="border-t border-border/30 pt-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Your message
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{message}</p>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {mentorName} will be notified and can accept, suggest a time, or decline.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('message')}
              >
                Back
              </Button>
              <Button onClick={handleSubmit}>
                Send request
              </Button>
            </DialogFooter>
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <FileText className="h-8 w-8 text-primary" />
            </motion.div>
            <p className="mt-4 text-sm font-semibold text-foreground">
              Sending request…
            </p>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <CheckCircle className="h-12 w-12 text-green-600" />
            </motion.div>
            <p className="mt-4 font-semibold text-foreground">
              Request sent!
            </p>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {mentorName} will review & get back to you soon.
            </p>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
