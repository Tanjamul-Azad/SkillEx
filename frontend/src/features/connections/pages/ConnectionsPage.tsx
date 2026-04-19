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
        description: 'Accept requests from your network to build your connection list.',
      };
    }
    if (activeTab === 'sent') {
      return {
        title: 'No outgoing pending requests',
        description: 'When you send connection requests, they will appear here.',
      };
    }
    return {
      title: 'No incoming requests',
      description: 'New incoming connection requests will appear here.',
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
      <div className="container mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-2 mb-8"
        >
          <h1 className="font-headline text-3xl font-extrabold md:text-5xl leading-none">My Connections</h1>
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Manage accepted, sent, and received connection requests.</p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ConnectionTab)} className="space-y-6">
          <TabsList className="bg-black/20 backdrop-blur-md border border-white/5 rounded-full p-1 inline-flex h-12 w-full md:w-auto shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
            <TabsTrigger value="accepted" className="rounded-full px-6 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all flex-1 md:flex-none">
              <Users className="mr-2 h-3.5 w-3.5" />
              Accepted
            </TabsTrigger>
            <TabsTrigger value="sent" className="rounded-full px-6 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[0_0_20px_hsl(var(--card)/0.3)] transition-all flex-1 md:flex-none">
              <Send className="mr-2 h-3.5 w-3.5" />
              Sent
            </TabsTrigger>
            <TabsTrigger value="received" className="rounded-full px-6 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[0_0_20px_hsl(var(--card)/0.3)] transition-all flex-1 md:flex-none">
              <Inbox className="mr-2 h-3.5 w-3.5" />
              Received
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="rounded-[2rem] border border-white/5 bg-black/20 p-2 backdrop-blur-md shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-headline font-bold uppercase tracking-wider">
              {activeTab === 'accepted' ? <div className="p-2 bg-primary/20 rounded-full border border-primary/20 shadow-[0_0_10px_hsl(var(--primary)/0.3)]"><UserCheck className="h-5 w-5 text-primary" /></div> : <div className="p-2 bg-primary/20 rounded-full border border-primary/20 shadow-[0_0_10px_hsl(var(--primary)/0.3)]"><Clock className="h-5 w-5 text-primary" /></div>}
              {activeTab === 'accepted' ? 'Accepted Connections' : activeTab === 'sent' ? 'Sent Requests' : 'Received Requests'}
              <Badge className="ml-auto bg-white/10 text-foreground border border-white/10 px-3 py-1 font-bold">{connections.length}</Badge>
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
              <div className="rounded-[2rem] border border-white/5 bg-black/20 backdrop-blur-md px-4 py-20 text-center shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                <div className="p-4 bg-white/5 rounded-full inline-flex mb-4">
                   <Users className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <p className="text-xl font-headline font-extrabold">{emptyMeta.title}</p>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto font-bold uppercase tracking-wider">{emptyMeta.description}</p>
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
                      className="group relative overflow-hidden rounded-3xl border border-white/5 bg-card shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] transition-all duration-300 hover:border-primary/40 hover:shadow-[0_8px_30px_hsl(var(--primary)/0.2)] flex flex-col"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-overlay" />
                      
                      <div className="relative z-10 flex flex-col p-5 flex-1">
                        <div className="flex items-start gap-4">
                          <div className="relative shrink-0">
                            <Avatar className="h-16 w-16 ring-4 ring-primary/10 transition-all duration-500 group-hover:ring-primary/40 group-hover:scale-105 shadow-lg bg-card">
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
                            <div className="flex w-full gap-2 mt-2 border-t border-white/5 pt-4">
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
