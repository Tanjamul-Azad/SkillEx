import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNavigate } from 'react-router-dom';
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
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ConnectionTab>('accepted');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});

  const fetchConnections = useCallback(async (tab: ConnectionTab) => {
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
  }, [toast]);

  useEffect(() => {
    fetchConnections(activeTab);
  }, [activeTab, fetchConnections]);

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
          className="flex flex-col gap-2"
        >
          <h1 className="font-headline text-3xl font-bold tracking-tight">My Connections</h1>
          <p className="text-sm text-muted-foreground">Manage accepted, sent, and received connection requests.</p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ConnectionTab)}>
          <TabsList className="grid w-full grid-cols-3 sm:w-[520px]">
            <TabsTrigger value="accepted" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5" />
              Accepted
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-1.5 text-xs sm:text-sm">
              <Send className="h-3.5 w-3.5" />
              Sent
            </TabsTrigger>
            <TabsTrigger value="received" className="gap-1.5 text-xs sm:text-sm">
              <Inbox className="h-3.5 w-3.5" />
              Received
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="border-2 border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {activeTab === 'accepted' ? <UserCheck className="h-4 w-4 text-primary" /> : <Clock className="h-4 w-4 text-primary" />}
              {activeTab === 'accepted' ? 'Accepted Connections' : activeTab === 'sent' ? 'Sent Requests' : 'Received Requests'}
              <Badge variant="secondary" className="ml-auto">{connections.length}</Badge>
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
              <div className="rounded-xl border-2 border-dashed border-border/70 px-4 py-10 text-center">
                <p className="text-sm font-semibold">{emptyMeta.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{emptyMeta.description}</p>
              </div>
            ) : (
              <motion.div 
                className="grid gap-4"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.1 } },
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
                      className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-4 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(255,255,255,0.02)]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      
                      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar className="h-14 w-14 ring-2 ring-primary/10 transition-all duration-500 group-hover:ring-primary/40 group-hover:scale-105 shadow-sm">
                              <AvatarImage src={partner.avatar ?? undefined} alt={partner.name} className="object-cover" />
                              <AvatarFallback className="bg-muted text-lg font-bold">{partner.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {/* Online indicator dot for accepted connections (mocked representation) */}
                            {activeTab === 'accepted' && (
                              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-secondary shadow-sm" />
                            )}
                          </div>
                          
                          <div className="flex flex-col flex-1 min-w-0">
                            <span 
                              className="text-base font-headline font-bold leading-tight cursor-pointer hover:text-primary transition-colors truncate"
                              onClick={() => navigate(`/profile/${partner.id}`)}
                            >
                              {partner.name}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              @{partner.username ?? 'user'}
                            </span>
                            {connection.message && activeTab !== 'accepted' && (
                              <p className="mt-2 text-[13px] text-foreground/80 italic border-l-2 border-primary/20 pl-2 py-0.5 w-full sm:max-w-md line-clamp-2">
                                "{connection.message}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="sm:ml-auto flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                          {activeTab === 'accepted' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="rounded-xl border-dashed hover:border-solid hover:bg-primary/5 transition-all text-xs"
                                onClick={() => navigate(`/profile/${partner.id}`)}
                              >
                                View Profile
                              </Button>
                              <Button 
                                size="sm" 
                                variant="gradient"
                                className="rounded-xl text-xs hover:shadow-glow-sm transition-all"
                                onClick={() => navigate(`/messages/${partner.id}`)}
                              >
                                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                                Message
                              </Button>
                            </>
                          )}

                          {activeTab === 'sent' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors text-xs"
                              onClick={() => updateConnectionStatus(connection.id, 'cancelled')}
                              disabled={actionBusy[connection.id]}
                            >
                              {actionBusy[connection.id] ? 'Cancelling...' : 'Cancel Request'}
                            </Button>
                          )}

                          {activeTab === 'received' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors text-xs"
                                onClick={() => updateConnectionStatus(connection.id, 'declined')}
                                disabled={actionBusy[connection.id]}
                              >
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                variant="gradient"
                                className="rounded-xl shadow-glow-sm hover:shadow-glow transition-all text-xs border border-primary/20"
                                onClick={() => updateConnectionStatus(connection.id, 'accepted')}
                                disabled={actionBusy[connection.id]}
                              >
                                {actionBusy[connection.id] ? 'Accepting...' : 'Accept Request'}
                              </Button>
                            </>
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
