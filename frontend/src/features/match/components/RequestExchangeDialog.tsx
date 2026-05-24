'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { CheckCircle2, ArrowLeftRight, BookOpen, Zap, Sparkles, Coins, ShieldCheck } from 'lucide-react';
import type { User, Skill } from '@/types';
import { exchangeService } from '@/services/exchangeService';
import { matchExplanationService, type MatchExplanation } from '@/services/matchExplanationService';
import { creditService, type CreditWallet } from '@/services/creditService';
import { skillCheckService } from '@/services/skillCheckService';

const schema = z.object({
  offeredSkillId: z.string().optional(),
  wantedSkillId: z.string().optional(),
  message: z.string().max(400, 'Max 400 characters.').optional(),
});

type FormData = z.infer<typeof schema>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isPersistedSkillId = (skillId?: string): boolean => Boolean(skillId && UUID_PATTERN.test(skillId));

type ExchangeMode = 'DIRECT_SWAP' | 'CREDIT_PAYMENT' | 'TEST_MEETING';

interface Props {
  open: boolean;
  onClose: () => void;
  targetUser: User;
  onSuccess?: () => void;
}

export function RequestExchangeDialog({ open, onClose, targetUser, onSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [explanation, setExplanation] = useState<MatchExplanation | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [mode, setMode] = useState<ExchangeMode>('DIRECT_SWAP');

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { offeredSkillId: '', message: '' },
  });

  const mySkills: Skill[] = useMemo(() => user?.skillsOffered ?? [], [user?.skillsOffered]);
  const charCount = form.watch('message')?.length ?? 0;
  const creditCost = explanation?.creditCost && explanation.creditCost > 0 ? explanation.creditCost : 10;
  const canPayWithCredits = !wallet || wallet.balance >= creditCost;

  useEffect(() => {
    if (!open) return;

    const currentOffered = form.getValues('offeredSkillId');
    if (!currentOffered && mySkills.length > 0) {
      form.setValue('offeredSkillId', mySkills[0].id, { shouldValidate: true });
    }

    const currentWanted = form.getValues('wantedSkillId');
    const firstTargetSkillId = targetUser.skillsOffered?.[0]?.id;
    if (!currentWanted && isPersistedSkillId(firstTargetSkillId)) {
      form.setValue('wantedSkillId', firstTargetSkillId);
    }
  }, [form, mySkills, open, targetUser.skillsOffered]);

  useEffect(() => {
    if (!open || !targetUser.id) return;

    setLoadingExplanation(true);
    matchExplanationService.explain(targetUser.id)
      .then((result) => {
        setExplanation(result);
        if (['DIRECT_SWAP', 'CREDIT_PAYMENT', 'TEST_MEETING'].includes(result.recommendedMode)) {
          setMode(result.recommendedMode as ExchangeMode);
        }
        if (!form.getValues('message') && result.suggestedOpeningMessage) {
          form.setValue('message', result.suggestedOpeningMessage.slice(0, 400), { shouldValidate: true });
        }
      })
      .catch(() => setExplanation(null))
      .finally(() => setLoadingExplanation(false));
    creditService.wallet().then(setWallet).catch(() => setWallet(null));
  }, [form, open, targetUser.id]);

  const handleSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const offeredSkill = mySkills.find((s) => s.id === data.offeredSkillId);
      const wantedSkill = targetUser.skillsOffered?.find((s) => s.id === data.wantedSkillId)
        ?? targetUser.skillsOffered?.[0];
      const wantedSkillId = isPersistedSkillId(wantedSkill?.id) ? wantedSkill?.id : undefined;
      if (!wantedSkillId) {
        throw new Error('Choose a skill you want to learn first.');
      }
      if (mode === 'DIRECT_SWAP' && !offeredSkill?.id) {
        throw new Error('Choose a skill to offer for a direct swap.');
      }
      if (mode === 'CREDIT_PAYMENT' && wallet && wallet.balance < (explanation?.creditCost ?? 10)) {
        throw new Error('You need more SkillEX credits for this request.');
      }
      if (mode === 'TEST_MEETING') {
        await skillCheckService.create({
          targetUserId: targetUser.id,
          skillId: wantedSkillId,
          message: data.message,
        });
      } else {
        await exchangeService.create({
          receiverId: targetUser.id,
          offeredSkillId: mode === 'DIRECT_SWAP' ? offeredSkill?.id : undefined,
          wantedSkillId,
          message: data.message,
          mode,
        });
      }
      setStep('success');
      if (onSuccess) onSuccess();
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
    form.reset({
      offeredSkillId: mySkills[0]?.id ?? '',
      wantedSkillId: isPersistedSkillId(targetUser.skillsOffered?.[0]?.id)
        ? targetUser.skillsOffered?.[0]?.id
        : undefined,
      message: '',
    });
    setMode('DIRECT_SWAP');
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

              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold">AI match explanation</p>
                      {explanation && (
                        <Badge variant="outline" className="rounded-full text-[10px]">
                          {Math.round(explanation.finalScore)}% fit
                        </Badge>
                      )}
                    </div>
                    {loadingExplanation ? (
                      <p className="mt-1 text-xs text-muted-foreground">Checking skill fit, reliability, balance, and safety signals...</p>
                    ) : explanation ? (
                      <>
                        <p className="mt-2 text-xs text-foreground/80">{explanation.whyLearnFromThisUser}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground sm:grid-cols-4">
                          <span>Skill {Math.round(explanation.directSkillFit)}</span>
                          <span>Intent {Math.round(explanation.intentFit)}</span>
                          <span>Trust {Math.round(explanation.skillTrustScore)}</span>
                          <span>Safety {Math.round(explanation.safetyFit)}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="rounded-full text-[10px]">
                            {explanation.recommendedMode.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className="rounded-full text-[10px]">
                            Capability {Math.round(explanation.teacherCapabilityScore)}%
                          </Badge>
                          {explanation.testMeetingRecommended && (
                            <Badge variant="outline" className="rounded-full border-amber-500/40 text-[10px] text-amber-600">
                              Test meeting suggested
                            </Badge>
                          )}
                        </div>
                        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                          {explanation.reasons.slice(0, 3).map((signal) => (
                            <li key={signal}>+ {signal}</li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">AI explanation is unavailable, but you can still send a request.</p>
                    )}
                  </div>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Request path</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[
                        { id: 'DIRECT_SWAP' as const, label: 'Direct swap', icon: ArrowLeftRight, note: 'Trade skills both ways' },
                        { id: 'CREDIT_PAYMENT' as const, label: 'Spend credits', icon: Coins, note: `${creditCost} credits` },
                        { id: 'TEST_MEETING' as const, label: 'Skill check', icon: ShieldCheck, note: 'Short fit check' },
                      ].map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setMode(option.id)}
                          className={cn(
                            'rounded-xl border p-3 text-left transition-colors',
                            mode === option.id
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border/50 bg-background hover:border-primary/40'
                          )}
                        >
                          <span className="flex items-center gap-2 text-xs font-bold">
                            <option.icon className="h-4 w-4 text-primary" />
                            {option.label}
                          </span>
                          <span className="mt-1 block text-[10px] text-muted-foreground">{option.note}</span>
                        </button>
                      ))}
                    </div>
                    {mode === 'CREDIT_PAYMENT' && (
                      <p className={cn('text-xs', canPayWithCredits ? 'text-muted-foreground' : 'text-destructive')}>
                        Credit balance: {wallet?.balance ?? '--'} / cost: {creditCost}.
                      </p>
                    )}
                  </div>

                  {/* Your skill selection */}
                  {mode === 'DIRECT_SWAP' && <FormField control={form.control} name="offeredSkillId" render={({ field }) => (
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
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${field.value === s.id
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
                  )} />}

                  {/* Message */}
                  <FormField control={form.control} name="message" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      {explanation?.suggestedOpeningMessage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mb-2 h-8 rounded-lg px-2 text-xs"
                          onClick={() => form.setValue('message', explanation.suggestedOpeningMessage.slice(0, 400), { shouldValidate: true })}
                        >
                          Use AI draft
                        </Button>
                      )}
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
                      variant="gradient"
                      disabled={submitting || (mode === 'DIRECT_SWAP' && mySkills.length === 0) || (mode === 'CREDIT_PAYMENT' && !canPayWithCredits)}
                      className="flex-1"
                    >
                      {submitting ? 'Sending...' : mode === 'TEST_MEETING' ? 'Request Check' : 'Send Request'}
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
              <Button variant="gradient" className="rounded-xl" onClick={handleClose}>
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
