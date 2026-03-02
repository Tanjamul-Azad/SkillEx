'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle2, ArrowLeftRight, BookOpen, Zap } from 'lucide-react';
import type { User, Skill } from '@/types';
import { exchangeService } from '@/services/exchangeService';

const schema = z.object({
  offeredSkillId: z.string().min(1, 'Choose a skill you want to offer.'),
  wantedSkillId: z.string().optional(),
  message: z.string().max(400, 'Max 400 characters.').optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  targetUser: User;
}

export function RequestExchangeDialog({ open, onClose, targetUser }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { offeredSkillId: '', message: '' },
  });

  const mySkills: Skill[] = user?.skillsOffered ?? [];
  const charCount = form.watch('message')?.length ?? 0;

  const handleSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const offeredSkill = mySkills.find((s) => s.id === data.offeredSkillId);
      const wantedSkill  = targetUser.skillsOffered?.find((s) => s.id === data.wantedSkillId)
                        ?? targetUser.skillsOffered?.[0];
      await exchangeService.create({
        receiverId:   targetUser.id,
        offeredSkill: offeredSkill,
        wantedSkill:  wantedSkill,
        message:      data.message,
      });
      setStep('success');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to send request',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    form.reset();
    onClose();
  };

  const levelColor: Record<string, string> = {
    beginner: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    intermediate: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    advanced: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
    expert: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl border-border/60 shadow-2xl">
        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader>
                <DialogTitle className="font-headline text-xl font-extrabold flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                  Request Skill Exchange
                </DialogTitle>
                <DialogDescription>
                  Send an exchange request to <strong>{targetUser.name}</strong>.
                </DialogDescription>
              </DialogHeader>

              {/* Target user + their offerings */}
              <div className="mt-4 rounded-xl bg-muted/50 border border-border/40 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={targetUser.avatar} alt={targetUser.name} />
                    <AvatarFallback className="font-bold">{targetUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{targetUser.name}</p>
                    <p className="text-xs text-muted-foreground">{targetUser.university}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> They can teach
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {targetUser.skillsOffered?.slice(0, 4).map((s) => (
                      <Badge key={s.id} variant="secondary" className="text-xs capitalize">
                        {s.icon} {s.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-4 space-y-4">
                  {/* Your skill selection */}
                  <FormField control={form.control} name="offeredSkillId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-accent" /> What skill will you offer?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="grid gap-2"
                        >
                          {mySkills.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              You have no skills listed. Add some skills to your profile first.
                            </p>
                          ) : mySkills.map((s) => (
                            <label
                              key={s.id}
                              htmlFor={`skill-${s.id}`}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                                field.value === s.id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border/40 hover:border-primary/40 hover:bg-muted/50'
                              }`}
                            >
                              <RadioGroupItem value={s.id} id={`skill-${s.id}`} className="shrink-0" />
                              <span className="text-lg">{s.icon}</span>
                              <div className="flex-1">
                                <p className="text-sm font-semibold">{s.name}</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-xs capitalize ${levelColor[s.level] ?? ''}`}
                              >
                                {s.level}
                              </Badge>
                            </label>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Message */}
                  <FormField control={form.control} name="message" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Introduce yourself and explain why you'd like to exchange..."
                          className="resize-none h-20"
                        />
                      </FormControl>
                      <div className="flex justify-between">
                        <FormMessage />
                        <span className={`text-xs ${charCount > 360 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {charCount}/400
                        </span>
                      </div>
                    </FormItem>
                  )} />

                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || mySkills.length === 0}
                      className="flex-1 rounded-xl font-bold gradient-bg text-primary-foreground"
                    >
                      {submitting ? 'Sending...' : 'Send Request'}
                    </Button>
                  </div>
                </form>
              </Form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="flex flex-col items-center gap-4 py-6 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-headline text-xl font-extrabold">Request Sent!</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  We notified <strong>{targetUser.name}</strong>. You'll get a notification when they respond.
                </p>
              </div>
              <Button className="rounded-xl font-bold gradient-bg text-primary-foreground" onClick={handleClose}>
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
