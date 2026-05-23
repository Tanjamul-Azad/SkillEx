import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Send, Inbox, MessageSquare, UserCheck, Clock } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { connectionService, type Connection } from '@/services/connectionService';
import { onRealtimeNotification } from '@/lib/realtime';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { appVisuals } from '@/lib/appVisuals';

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

  const getPartner = (connection: Connection) => {
    if (!user) return connection.requester;
    return connection.requester.id === user.id ? connection.receiver : connection.requester;
  };

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

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-5xl px-4 py-5 md:px-8 md:py-7 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-2"
        >
          <h1 className="font-headline text-3xl font-extrabold md:text-4xl leading-tight">Connections</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">Manage people you can message, exchange with, or invite into future skill sessions.</p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ConnectionTab)} className="space-y-6">
          <TabsList className="inline-flex h-11 w-full rounded-2xl border border-border/70 bg-card p-1 shadow-sm md:w-auto dark:border-white/10">
            <TabsTrigger value="accepted" className="rounded-xl px-5 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex-1 md:flex-none">
              <Users className="mr-2 h-3.5 w-3.5" />
              Accepted
            </TabsTrigger>
            <TabsTrigger value="sent" className="rounded-xl px-5 text-xs font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all flex-1 md:flex-none">
              <Send className="mr-2 h-3.5 w-3.5" />
              Sent
            </TabsTrigger>
            <TabsTrigger value="received" className="rounded-xl px-5 text-xs font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all flex-1 md:flex-none">
              <Inbox className="mr-2 h-3.5 w-3.5" />
              Received
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="app-shell p-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-base font-headline font-bold">
              {activeTab === 'accepted' ? <div className="rounded-xl border border-primary/20 bg-primary/10 p-2"><UserCheck className="h-4 w-4 text-primary" /></div> : <div className="rounded-xl border border-primary/20 bg-primary/10 p-2"><Clock className="h-4 w-4 text-primary" /></div>}
              {activeTab === 'accepted' ? 'Accepted Connections' : activeTab === 'sent' ? 'Sent Requests' : 'Received Requests'}
              <Badge className="ml-auto border border-border/70 bg-muted text-foreground px-3 py-1 font-bold dark:border-white/10">{connections.length}</Badge>
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="rounded-xl border border-border/50 p-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-52" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : connections.length === 0 ? (
              <div className="grid gap-6 rounded-2xl border border-dashed border-border/80 bg-background/70 p-5 md:grid-cols-[minmax(0,1fr)_320px] md:p-6 dark:border-white/10 dark:bg-black/20">
                <div className="flex flex-col justify-center text-left">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-2xl font-headline font-extrabold">{emptyMeta.title}</p>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{emptyMeta.description}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button size="sm" onClick={() => navigate('/match')} className="rounded-xl">
                      Find matches
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate('/community')} className="rounded-xl">
                      Browse community
                    </Button>
                  </div>
                </div>
                <div className="app-media aspect-[16/10]">
                  <img src={appVisuals.connectionsNetwork} alt="People connecting through a skill exchange" className="h-full w-full object-cover" loading="lazy" />
                </div>
              </div>
            ) : (
              <motion.div 
                className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 auto-rows-min"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.05 } },
                }}
              >
                {connections.map((connection, _i) => {
                  const partner = getPartner(connection);
                  return (
                    <motion.div
                      key={connection.id}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
                      }}
                      className="app-card app-card-hover group relative overflow-hidden flex flex-col"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-overlay" />
                      
                      <div className="relative z-10 flex flex-col p-5 flex-1">
                        <div className="flex items-start gap-4">
                          <div className="relative shrink-0">
                            <Avatar className="h-14 w-14 ring-2 ring-primary/10 transition-all duration-300 group-hover:ring-primary/30 group-hover:scale-105 bg-card">
                              <AvatarImage src={partner.avatar ?? undefined} alt={partner.name} className="object-cover" />
                              <AvatarFallback className="bg-muted text-xl font-bold">{partner.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {/* Online indicator dot for accepted connections (mocked representation) */}
                            {activeTab === 'accepted' && (
                              <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-[3px] border-card bg-emerald-500 shadow-[0_0_10px_var(--emerald-500)]" />
                            )}
                          </div>
                          
                          <div className="flex flex-col flex-1 min-w-0 pt-1">
                            <span 
                              className="text-lg font-headline font-extrabold leading-tight cursor-pointer hover:text-primary transition-colors truncate drop-shadow-sm"
                              onClick={() => navigate(`/profile/${partner.id}`)}
                            >
                              {partner.name}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                              @{partner.username ?? 'user'}
                            </span>
                            {connection.message && activeTab !== 'accepted' && (
                              <p className="mt-3 text-[11px] font-semibold text-muted-foreground italic border-l-2 border-primary/40 pl-3 py-1 w-full bg-white/5 rounded-r-lg line-clamp-3">
                                "{connection.message}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-end gap-2 mt-auto pt-5">
                          {activeTab === 'accepted' && (
                            <div className="flex w-full gap-2 mt-2 border-t border-border/70 pt-4 dark:border-white/10">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1 rounded-2xl border-white/10 glass-subtle hover:bg-white/10 transition-all text-[10px] font-bold uppercase tracking-wider py-4 h-auto"
                                onClick={() => navigate(`/profile/${partner.id}`)}
                              >
                                Profile
                              </Button>
                              <Button 
                                size="sm" 
                                variant="gradient"
                                className="flex-1 rounded-2xl shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.5)] transition-all text-[10px] font-bold uppercase tracking-wider py-4 h-auto"
                                onClick={() => navigate(`/messages/${partner.id}`)}
                              >
                                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                                Message
                              </Button>
                            </div>
                          )}

                          {activeTab === 'sent' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-4 rounded-2xl border-destructive/30 text-destructive text-[10px] font-bold uppercase tracking-wider hover:bg-destructive/10 transition-colors py-4 h-auto glass-subtle"
                              onClick={() => updateConnectionStatus(connection.id, 'cancelled')}
                              disabled={actionBusy[connection.id]}
                            >
                              {actionBusy[connection.id] ? 'Cancelling...' : 'Cancel Request'}
                            </Button>
                          )}

                          {activeTab === 'received' && (
                            <div className="flex w-full gap-2 mt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 rounded-2xl border-destructive/40 text-destructive text-[10px] font-bold uppercase tracking-wider hover:bg-destructive/10 transition-colors h-auto py-4 glass-subtle"
                                onClick={() => updateConnectionStatus(connection.id, 'declined')}
                                disabled={actionBusy[connection.id]}
                              >
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                variant="gradient"
                                className="flex-1 rounded-2xl shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.5)] transition-all text-[10px] font-bold uppercase tracking-wider border-none h-auto py-4"
                                onClick={() => updateConnectionStatus(connection.id, 'accepted')}
                                disabled={actionBusy[connection.id]}
                              >
                                {actionBusy[connection.id] ? 'Accepting...' : 'Accept'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
