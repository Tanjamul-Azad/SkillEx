import React, { useEffect, useMemo, useState } from 'react';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ConnectionTab>('accepted');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});

  const fetchConnections = async (tab: ConnectionTab) => {
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
  };

  useEffect(() => {
    fetchConnections(activeTab);
  }, [activeTab]);

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
              <div className="space-y-3">
                {connections.map((connection) => {
                  const partner = getPartner(connection);
                  return (
                    <div key={connection.id} className="rounded-xl border border-border/60 bg-background p-3 sm:p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-border">
                            <AvatarImage src={partner.avatar ?? undefined} alt={partner.name} />
                            <AvatarFallback>{partner.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold leading-tight">{partner.name}</p>
                            <p className="text-xs text-muted-foreground">@{partner.username ?? 'user'}</p>
                          </div>
                        </div>

                        <div className="sm:ml-auto flex flex-wrap items-center gap-2">
                          {activeTab === 'accepted' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => navigate(`/profile/${partner.id}`)}>View Profile</Button>
                              <Button size="sm" onClick={() => navigate(`/messages/${partner.id}`)}>
                                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                                Message
                              </Button>
                            </>
                          )}

                          {activeTab === 'sent' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/30 text-destructive hover:bg-destructive/10"
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
                                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                onClick={() => updateConnectionStatus(connection.id, 'declined')}
                                disabled={actionBusy[connection.id]}
                              >
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateConnectionStatus(connection.id, 'accepted')}
                                disabled={actionBusy[connection.id]}
                              >
                                {actionBusy[connection.id] ? 'Accepting...' : 'Accept'}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {connection.message && (
                        <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                          "{connection.message}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
