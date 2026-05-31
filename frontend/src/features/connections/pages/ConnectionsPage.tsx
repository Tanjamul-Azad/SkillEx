import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, Users, Send, Inbox, MessageSquare, UserCheck, Clock, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { connectionService, type Connection } from '@/services/connectionService';
import { exchangeService, type Exchange, type ExchangeSkillRef } from '@/services/exchangeService';
import { SessionService } from '@/services/sessionService';
import { onRealtimeNotification } from '@/lib/realtime';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ConnectionTab = 'accepted' | 'sent' | 'received';

const TAB_CONFIG: Record<ConnectionTab, { status?: string; direction: 'all' | 'sent' | 'received' }> = {
  accepted: { status: 'ACCEPTED', direction: 'all' },
  sent: { status: 'PENDING', direction: 'sent' },
  received: { status: 'PENDING', direction: 'received' },
};

export default function ConnectionsPage() {
  useDocumentTitle('Connections');
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ConnectionTab>('accepted');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingPartner, setMeetingPartner] = useState<Connection['requester'] | null>(null);
  const [meetingExchange, setMeetingExchange] = useState<Exchange | null>(null);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingBusy, setMeetingBusy] = useState(false);
  const [meetingConfirmed, setMeetingConfirmed] = useState(false);
  const autoArrangeHandled = React.useRef(false);

  const fetchConnections = useCallback(async (tab: ConnectionTab) => {
    if (!user?.id) {
      return;
    }

    const cfg = TAB_CONFIG[tab];
    setLoading(true);
    try {
      const result = await connectionService.list(cfg.status, cfg.direction, 0, 40);
      setConnections(result.content ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load connections.';
      toast({ title: 'Could not load connections', description: message, variant: 'destructive' });
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'accepted' || tab === 'sent' || tab === 'received') {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    void fetchConnections(activeTab);
  }, [activeTab, fetchConnections, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    return onRealtimeNotification((notification) => {
      const type = String(notification.type ?? '').toUpperCase();
      if (type.includes('CONNECTION')) {
        void fetchConnections(activeTab);
      }
    });
  }, [activeTab, fetchConnections, user?.id]);

  const getPartner = useCallback((connection: Connection) => {
    if (!user) return connection.requester;
    return connection.requester.id === user.id ? connection.receiver : connection.requester;
  }, [user]);

  const emptyMeta = useMemo(() => {
    if (activeTab === 'accepted') {
      return {
        title: 'No accepted connections yet',
        description: 'Start from a match or accept an incoming request to build your skill network.',
      };
    }
    if (activeTab === 'sent') {
      return {
        title: 'No outgoing pending requests',
        description: 'Requests you send to skill partners will appear here.',
      };
    }
    return {
      title: 'No incoming requests',
      description: 'When someone wants to connect with you, their request will appear here.',
    };
  }, [activeTab]);

  const updateConnectionStatus = async (connectionId: string, status: 'accepted' | 'declined' | 'cancelled') => {
    setActionBusy((prev) => ({ ...prev, [connectionId]: true }));
    try {
      await connectionService.updateStatus(connectionId, status);
      await fetchConnections(activeTab);
      toast({
        title: status === 'accepted' ? 'Connection accepted' : 'Request updated',
        description: status === 'accepted'
          ? 'You are now connected.'
          : status === 'declined'
            ? 'Request declined.'
            : 'Request cancelled.',
        variant: status === 'accepted' ? 'success' : 'default',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update request.';
      toast({ title: 'Update failed', description: message, variant: 'destructive' });
    } finally {
      setActionBusy((prev) => ({ ...prev, [connectionId]: false }));
    }
  };

  const resetMeetingForm = useCallback(() => {
    setMeetingDate('');
    setMeetingTime('');
    setMeetingNotes('');
    setMeetingConfirmed(false);
    setMeetingBusy(false);
  }, []);

  const getSchedulableSkill = useCallback((exchange: Exchange): {
    skill: ExchangeSkillRef;
    teacherId: string;
    learnerId: string;
  } | null => {
    if (!user?.id) return null;

    const isRequester = exchange.requester.id === user.id;
    const partner = isRequester ? exchange.receiver : exchange.requester;
    const mySkill = isRequester ? exchange.offeredSkill : exchange.wantedSkill;
    const theirSkill = isRequester ? exchange.wantedSkill : exchange.offeredSkill;
    const skill = mySkill ?? theirSkill;

    if (!skill?.id) return null;

    const teachingMySkill = Boolean(mySkill?.id);
    return {
      skill,
      teacherId: teachingMySkill ? user.id : partner.id,
      learnerId: teachingMySkill ? partner.id : user.id,
    };
  }, [user?.id]);

  const openMeetingDialog = useCallback((partner: Connection['requester'], exchange: Exchange) => {
    setMeetingPartner(partner);
    setMeetingExchange(exchange);
    resetMeetingForm();
    setMeetingOpen(true);
  }, [resetMeetingForm]);

  const findAcceptedExchangeForPartner = useCallback(async (partnerId: string): Promise<Exchange | null> => {
    try {
      const relationship = await exchangeService.getRelationship(partnerId);
      if (relationship.status === 'ACCEPTED' && relationship.exchangeId) {
        const exchange = await exchangeService.getById(relationship.exchangeId);
        if (exchange.status?.toUpperCase() === 'ACCEPTED') {
          return exchange;
        }
      }
    } catch {
      // Fall back to the accepted exchange list below.
    }

    const acceptedExchanges = await exchangeService.list('ACCEPTED', 0, 100);
    return (acceptedExchanges.content ?? []).find((exchange) => {
      const requesterId = exchange.requester.id;
      const receiverId = exchange.receiver.id;
      return exchange.status?.toUpperCase() === 'ACCEPTED'
        && ((requesterId === user?.id && receiverId === partnerId)
          || (requesterId === partnerId && receiverId === user?.id));
    }) ?? null;
  }, [user?.id]);

  const openMeetingRequest = async (connection: Connection) => {
    const partner = getPartner(connection);
    setActionBusy((prev) => ({ ...prev, [`meeting:${connection.id}`]: true }));

    try {
      const exchange = await findAcceptedExchangeForPartner(partner.id);

      if (!exchange) {
        toast({
          title: 'Exchange required first',
          description: `Create or accept a skill exchange with ${partner.name.split(' ')[0]} before proposing a meeting.`,
          variant: 'default',
        });
        navigate(`/profile/${partner.id}`);
        return;
      }

      if (!getSchedulableSkill(exchange)) {
        toast({
          title: 'No skill to schedule',
          description: 'This exchange needs at least one selected skill before a meeting can be proposed.',
          variant: 'destructive',
        });
        navigate('/dashboard#active-exchanges');
        return;
      }

      openMeetingDialog(partner, exchange);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not check exchange status.';
      toast({ title: 'Meeting setup failed', description: message, variant: 'destructive' });
    } finally {
      setActionBusy((prev) => ({ ...prev, [`meeting:${connection.id}`]: false }));
    }
  };

  const openFirstAvailableMeeting = useCallback(async () => {
    const acceptedConnections = connections.filter((connection) => connection.status?.toUpperCase() === 'ACCEPTED');
    if (acceptedConnections.length === 0) {
      toast({
        title: 'No accepted connection selected',
        description: 'Accept a connection before proposing a meeting.',
      });
      return;
    }

    setActionBusy((prev) => ({ ...prev, 'meeting:first': true }));
    try {
      for (const connection of acceptedConnections) {
        const partner = getPartner(connection);
        const exchange = await findAcceptedExchangeForPartner(partner.id);
        if (exchange && getSchedulableSkill(exchange)) {
          openMeetingDialog(partner, exchange);
          return;
        }
      }

      toast({
        title: 'No accepted exchange found',
        description: 'Connections are ready for chat, but meetings need an accepted skill exchange first.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not check exchange status.';
      toast({ title: 'Meeting setup failed', description: message, variant: 'destructive' });
    } finally {
      setActionBusy((prev) => ({ ...prev, 'meeting:first': false }));
    }
  }, [connections, findAcceptedExchangeForPartner, getPartner, getSchedulableSkill, openMeetingDialog, toast]);

  const submitMeetingRequest = async () => {
    if (!meetingExchange || !meetingPartner) {
      toast({ title: 'No exchange selected', variant: 'destructive' });
      return;
    }

    const schedule = new Date(`${meetingDate}T${meetingTime}:00`);
    if (!Number.isFinite(schedule.getTime()) || schedule.getTime() <= Date.now()) {
      toast({
        title: 'Choose a future time',
        description: 'Meeting requests need a date and time that has not passed.',
        variant: 'destructive',
      });
      return;
    }

    const scheduleDetails = getSchedulableSkill(meetingExchange);
    if (!scheduleDetails) {
      toast({
        title: 'No skill to schedule',
        description: 'This exchange needs at least one selected skill before a meeting can be proposed.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setMeetingBusy(true);
      await SessionService.create({
        exchangeId: meetingExchange.id,
        teacherId: scheduleDetails.teacherId,
        learnerId: scheduleDetails.learnerId,
        skillId: scheduleDetails.skill.id,
        scheduledAt: `${meetingDate}T${meetingTime}:00`,
        durationMins: 60,
        notes: meetingNotes.trim() || undefined,
        sessionType: 'VIDEO',
      });
      setMeetingConfirmed(true);
      toast({
        title: 'Meeting request sent',
        description: `${meetingPartner.name.split(' ')[0]} can now accept the proposed time from their dashboard.`,
        variant: 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Choose another time and try again.';
      toast({ title: 'Could not request meeting', description: message, variant: 'destructive' });
    } finally {
      setMeetingBusy(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('arrange') !== '1' || activeTab !== 'accepted' || loading || autoArrangeHandled.current) {
      return;
    }

    autoArrangeHandled.current = true;
    navigate('/connections?tab=accepted', { replace: true });
    void openFirstAvailableMeeting();
  }, [activeTab, connections, loading, location.search, navigate, openFirstAvailableMeeting]);

  const meetingScheduleDetails = meetingExchange ? getSchedulableSkill(meetingExchange) : null;

  return (
    <DashboardLayout>
      <div className="product-page space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="product-header"
        >
          <div>
            <h1 className="product-title">Connections</h1>
            <p className="product-subtitle">Manage people you can message, exchange with, or invite into future skill sessions.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="product-kpi px-4 py-3">
              <p className="font-headline text-2xl font-extrabold">{connections.length}</p>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Showing</p>
            </div>
            <div className="product-kpi px-4 py-3">
              <p className="font-headline text-2xl font-extrabold text-primary">{activeTab === 'accepted' ? connections.length : 0}</p>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Ready</p>
            </div>
            <div className="product-kpi px-4 py-3">
              <p className="font-headline text-2xl font-extrabold text-warning">{activeTab !== 'accepted' ? connections.length : 0}</p>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Pending</p>
            </div>
          </div>
        </motion.div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const nextTab = value as ConnectionTab;
            setActiveTab(nextTab);
            navigate(`/connections?tab=${nextTab}`, { replace: true });
          }}
          className="space-y-4"
        >
          <div className="product-toolbar">
            <TabsList className="h-10 rounded-none border-0 bg-transparent p-0">
              <TabsTrigger value="accepted" className="product-tab gap-2 rounded-none bg-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none">
                <Users className="h-3.5 w-3.5" />
                Accepted
              </TabsTrigger>
              <TabsTrigger value="sent" className="product-tab gap-2 rounded-none bg-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none">
                <Send className="h-3.5 w-3.5" />
                Sent
              </TabsTrigger>
              <TabsTrigger value="received" className="product-tab gap-2 rounded-none bg-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none">
                <Inbox className="h-3.5 w-3.5" />
                Received
              </TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl gap-2 text-xs font-bold"
                onClick={() => void fetchConnections(activeTab)}
                disabled={loading}
              >
                <RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                Refresh
              </Button>
              <Button size="sm" className="h-9 rounded-xl text-xs font-bold" onClick={() => navigate('/match')}>
                Find partners
              </Button>
            </div>
          </div>
        </Tabs>

        <section className="product-panel">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                {activeTab === 'accepted' ? <UserCheck className="h-4 w-4 text-primary" /> : <Clock className="h-4 w-4 text-primary" />}
              </div>
              <div>
                <h2 className="font-headline text-base font-extrabold">
                  {activeTab === 'accepted' ? 'Accepted connections' : activeTab === 'sent' ? 'Sent requests' : 'Received requests'}
                </h2>
                <p className="text-xs text-muted-foreground">{activeTab === 'accepted' ? 'People ready for chat and meetings.' : 'Pending relationship requests that need a next action.'}</p>
              </div>
            </div>
            <Badge className="rounded-full border border-border/70 bg-muted px-3 py-1 font-bold text-foreground dark:border-white/10">
              {connections.length}
            </Badge>
          </div>

          {loading ? (
            <div className="space-y-0">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="product-row flex items-center gap-3 px-4 py-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-9 w-28 rounded-xl" />
                </div>
              ))}
            </div>
          ) : connections.length === 0 ? (
            <div className="p-4">
              <div className="product-empty text-left">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-headline text-xl font-extrabold text-foreground">{emptyMeta.title}</p>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{emptyMeta.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => navigate('/match')} className="rounded-xl">
                      Find matches
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate('/community')} className="rounded-xl">
                      Browse community
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="product-table">
                <thead>
                  <tr>
                    <th className="product-th">Person</th>
                    <th className="product-th">Status</th>
                    <th className="product-th">Request context</th>
                    <th className="product-th">Created</th>
                    <th className="product-th text-right">Actions</th>
                  </tr>
                </thead>
                <motion.tbody
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.035 } } }}
                >
                  {connections.map((connection) => {
                    const partner = getPartner(connection);
                    const createdAt = new Date(connection.createdAt);
                    const statusTone = activeTab === 'accepted'
                      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500'
                      : activeTab === 'received'
                        ? 'border-warning/25 bg-warning/10 text-warning'
                        : 'border-primary/25 bg-primary/10 text-primary';

                    return (
                      <motion.tr
                        key={connection.id}
                        variants={{
                          hidden: { opacity: 0, y: 8 },
                          visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
                        }}
                        className="product-row"
                      >
                        <td className="product-td">
                          <div className="flex min-w-[230px] items-center gap-3">
                            <div className="relative shrink-0">
                              <Avatar className="h-10 w-10 border border-border/70 dark:border-white/10">
                                <AvatarImage src={partner.avatar ?? undefined} alt={partner.name} className="object-cover" />
                                <AvatarFallback className="bg-muted text-sm font-bold">{partner.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              {partner.isOnline && (
                                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                className="truncate text-left font-headline text-sm font-extrabold text-foreground hover:text-primary"
                                onClick={() => navigate(`/profile/${partner.id}`)}
                              >
                                {partner.name}
                              </button>
                              <p className="truncate text-xs text-muted-foreground">@{partner.username ?? 'user'} · {partner.university ?? 'SkillEX member'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="product-td">
                          <Badge variant="outline" className={cn('rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest', statusTone)}>
                            {activeTab === 'accepted' ? 'Connected' : activeTab === 'received' ? 'Needs reply' : 'Waiting'}
                          </Badge>
                        </td>
                        <td className="product-td">
                          <p className="max-w-[360px] truncate text-xs text-muted-foreground">
                            {connection.message || (activeTab === 'accepted' ? 'Ready to plan a learning session.' : 'No message included.')}
                          </p>
                        </td>
                        <td className="product-td">
                          <p className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                            {Number.isNaN(createdAt.getTime()) ? 'Recently' : createdAt.toLocaleDateString()}
                          </p>
                        </td>
                        <td className="product-td">
                          <div className="flex justify-end gap-2">
                            {activeTab === 'accepted' && (
                              <>
                                <Button size="sm" variant="outline" className="h-8 rounded-lg px-3 text-xs font-bold" onClick={() => navigate(`/profile/${partner.id}`)}>
                                  Profile
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-lg px-3 text-xs font-bold"
                                  onClick={() => void openMeetingRequest(connection)}
                                  disabled={actionBusy[`meeting:${connection.id}`]}
                                >
                                  <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                                  {actionBusy[`meeting:${connection.id}`] ? 'Checking' : 'Meeting'}
                                </Button>
                                <Button size="sm" className="h-8 rounded-lg px-3 text-xs font-bold" onClick={() => navigate(`/messages/${partner.id}`)}>
                                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                                  Message
                                </Button>
                              </>
                            )}
                            {activeTab === 'sent' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-lg border-destructive/30 px-3 text-xs font-bold text-destructive hover:bg-destructive/10"
                                onClick={() => updateConnectionStatus(connection.id, 'cancelled')}
                                disabled={actionBusy[connection.id]}
                              >
                                {actionBusy[connection.id] ? 'Cancelling' : 'Cancel'}
                              </Button>
                            )}
                            {activeTab === 'received' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-lg border-destructive/35 px-3 text-xs font-bold text-destructive hover:bg-destructive/10"
                                  onClick={() => updateConnectionStatus(connection.id, 'declined')}
                                  disabled={actionBusy[connection.id]}
                                >
                                  Decline
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8 rounded-lg px-3 text-xs font-bold"
                                  onClick={() => updateConnectionStatus(connection.id, 'accepted')}
                                  disabled={actionBusy[connection.id]}
                                >
                                  {actionBusy[connection.id] ? 'Accepting' : 'Accept'}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          )}
        </section>

        <Dialog
          open={meetingOpen}
          onOpenChange={(open) => {
            setMeetingOpen(open);
            if (!open) {
              resetMeetingForm();
              setMeetingPartner(null);
              setMeetingExchange(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-headline">
                <CalendarDays className="h-5 w-5 text-primary" />
                {meetingConfirmed ? 'Meeting request sent' : 'Propose a meeting'}
              </DialogTitle>
              <DialogDescription>
                {meetingConfirmed
                  ? `${meetingPartner?.name?.split(' ')[0] ?? 'Your partner'} will see this proposal on their dashboard.`
                  : `Choose a time for ${meetingPartner?.name?.split(' ')[0] ?? 'your partner'} to review.`}
              </DialogDescription>
            </DialogHeader>

            {meetingConfirmed ? (
              <div className="space-y-4 py-3">
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                  <p className="text-sm font-bold text-foreground">
                    {meetingDate} at {meetingTime}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The room opens after the other person accepts the proposed time.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setMeetingOpen(false)}>
                    Done
                  </Button>
                  <Button className="rounded-xl" onClick={() => navigate('/dashboard#active-exchanges')}>
                    Dashboard
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="meeting-date">Date</Label>
                      <Input
                        id="meeting-date"
                        type="date"
                        value={meetingDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(event) => setMeetingDate(event.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="meeting-time">Time</Label>
                      <Input
                        id="meeting-time"
                        type="time"
                        value={meetingTime}
                        onChange={(event) => setMeetingTime(event.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="meeting-notes">
                      Notes <span className="text-xs text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id="meeting-notes"
                      rows={3}
                      value={meetingNotes}
                      onChange={(event) => setMeetingNotes(event.target.value)}
                      placeholder="Share what you want to cover in this meeting"
                      className="resize-none rounded-xl text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={meetingPartner?.avatar ?? undefined} />
                      <AvatarFallback className="text-xs font-semibold">
                        {meetingPartner?.name?.charAt(0) ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{meetingPartner?.name ?? 'Exchange partner'}</p>
                      <p className="text-xs text-muted-foreground">
                        {meetingScheduleDetails?.skill.name ?? 'Skill exchange'} - 60 minute video request
                      </p>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setMeetingOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!meetingDate || !meetingTime || meetingBusy}
                    onClick={() => void submitMeetingRequest()}
                  >
                    {meetingBusy ? 'Sending...' : 'Send request'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
