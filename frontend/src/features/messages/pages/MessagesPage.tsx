import React, { useState, useEffect, useRef } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Search,
  MoreVertical,
  Phone,
  Video,
  ArrowLeft,
  Smile,
  Check,
  CheckCheck,
  MessageSquarePlus,
  Image as ImageIcon,
  Pin,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { useWebSocket } from '@/hooks/useWebSocket';
import { TokenStore } from '@/services/http/ApiClient';
import { MessageService } from '@/services/messageService';
import type { MessageDto, ConversationDto } from '@/services/messageService';
import { UserService } from '@/services/userService';

/* ── Types ──────────────────────────────────────────────────────────── */
interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  read: boolean;
  type: 'text' | 'image';
  imageUrl?: string;
}

interface Conversation {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    online: boolean;
    lastSeen?: string;
  };
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  pinned?: boolean;
  messages: Message[];
}

function parseDtoDate(value: unknown): Date {
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (Array.isArray(value) && value.length >= 5) {
    const [year, month, day, hour, minute, second = 0, nano = 0] = value;
    if (
      typeof year === 'number' &&
      typeof month === 'number' &&
      typeof day === 'number' &&
      typeof hour === 'number' &&
      typeof minute === 'number'
    ) {
      const millis = typeof nano === 'number' ? Math.floor(nano / 1_000_000) : 0;
      return new Date(year, month - 1, day, hour, minute, typeof second === 'number' ? second : 0, millis);
    }
  }

  return new Date();
}

function messagePreview(dto: MessageDto): string {
  return dto.type?.toUpperCase() === 'IMAGE' ? '📷 Image' : (dto.content ?? '');
}

/* ── Mappers ─────────────────────────────────────────────────────────── */
function mapMessageDto(dto: MessageDto, currentUserId: string): Message {
  return {
    id: dto.id,
    senderId: dto.senderId === currentUserId ? 'me' : dto.senderId,
    content: dto.content,
    timestamp: parseDtoDate(dto.createdAt),
    read: dto.isRead,
    type: (dto.type?.toLowerCase() ?? 'text') as 'text' | 'image',
    imageUrl: dto.imageUrl ?? undefined,
  };
}

function mapConversationDto(dto: ConversationDto): Conversation {
  return {
    id: dto.peerId,
    user: {
      id: dto.peerId,
      name: dto.peerName,
      avatar: dto.peerAvatar ?? undefined,
      online: dto.peerIsOnline,
      lastSeen: undefined,
    },
    lastMessage: dto.lastMessage ?? '',
    lastMessageTime: dto.lastMessageTime ? new Date(dto.lastMessageTime) : new Date(0),
    unreadCount: dto.unreadCount,
    pinned: false,
    messages: [],
  };
}

function messageTime(msg: Message): number {
  return msg.timestamp.getTime();
}

function conversationTime(conv: Conversation): number {
  return conv.lastMessageTime?.getTime() ?? 0;
}

function dedupeMessages(messages: Message[]): Message[] {
  const byId = new Map<string, Message>();
  messages.forEach((m) => byId.set(m.id, m));
  return Array.from(byId.values()).sort((a, b) => messageTime(a) - messageTime(b));
}

function mergeConversations(a: Conversation, b: Conversation): Conversation {
  const newer = conversationTime(a) >= conversationTime(b) ? a : b;
  const older = newer === a ? b : a;

  return {
    ...older,
    ...newer,
    user: {
      id: newer.user.id || older.user.id,
      name: newer.user.name || older.user.name,
      avatar: newer.user.avatar ?? older.user.avatar,
      online: newer.user.online || older.user.online,
      lastSeen: newer.user.lastSeen ?? older.user.lastSeen,
    },
    lastMessage: newer.lastMessage || older.lastMessage,
    lastMessageTime: conversationTime(newer) >= conversationTime(older)
      ? newer.lastMessageTime
      : older.lastMessageTime,
    unreadCount: Math.max(newer.unreadCount, older.unreadCount),
    pinned: Boolean(newer.pinned || older.pinned),
    messages: dedupeMessages([...older.messages, ...newer.messages]),
  };
}

function dedupeConversations(conversations: Conversation[]): Conversation[] {
  const byId = new Map<string, Conversation>();

  conversations.forEach((conv) => {
    const existing = byId.get(conv.id);
    byId.set(conv.id, existing ? mergeConversations(existing, conv) : conv);
  });

  return Array.from(byId.values()).sort((a, b) => conversationTime(b) - conversationTime(a));
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function formatMessageTime(d: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimestamp(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ── Sub-components ─────────────────────────────────────────────────── */
function ConversationItem({
  conv,
  active,
  onClick,
}: {
  conv: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-[1.5rem] text-left transition-all duration-300',
        active
          ? 'bg-black/40 border border-white/10 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05),0_0_20px_hsl(var(--primary)/0.1)]'
          : 'bg-black/10 border border-white/5 hover:bg-black/20 hover:border-white/10 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]'
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12 border-2 border-white/5 shadow-sm">
          <AvatarImage src={conv.user.avatar} alt={conv.user.name} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-sm font-bold text-primary">
            {getInitials(conv.user.name)}
          </AvatarFallback>
        </Avatar>
        {conv.user.online && (
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={cn('font-headline font-bold text-sm truncate', active ? 'text-primary drop-shadow-[0_0_8px_var(--primary)]' : 'text-foreground')}>
            {conv.user.name}
          </span>
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground shrink-0">
            {formatMessageTime(conv.lastMessageTime)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={cn('text-xs truncate font-medium', active ? 'text-foreground/90' : 'text-muted-foreground')}>
            {conv.lastMessage}
          </p>
          {conv.unreadCount > 0 && (
            <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold shrink-0 bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.3)]">
              {conv.unreadCount}
            </Badge>
          )}
        </div>
      </div>
      {conv.pinned && <Pin className="h-3.5 w-3.5 text-primary/50 shrink-0" />}
    </motion.button>
  );
}

function MessageBubble({
  msg,
  isMe,
  showAvatar,
  peerName,
}: {
  msg: Message;
  isMe: boolean;
  showAvatar: boolean;
  peerName: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={cn('flex items-end gap-3', isMe ? 'flex-row-reverse' : 'flex-row')}
    >
      {!isMe && (
        <div className="w-8 shrink-0">
          {showAvatar && (
            <Avatar className="h-8 w-8 border border-white/10 shadow-sm">
              <AvatarFallback className="text-[10px] bg-secondary/20 text-secondary font-bold">
                {getInitials(peerName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
      <div className={cn('max-w-[75%] flex flex-col gap-1.5', isMe ? 'items-end' : 'items-start')}>
        {msg.type === 'image' && msg.imageUrl ? (
          <div className="rounded-[1.5rem] overflow-hidden max-w-[280px] border border-white/10 shadow-md">
            <img src={msg.imageUrl} alt="attachment" className="w-full object-cover" />
          </div>
        ) : (
          <div
            className={cn(
              'px-5 py-3 text-[13px] leading-relaxed backdrop-blur-md shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] border border-white/5',
              isMe
                ? 'bg-primary/20 text-foreground rounded-[1.5rem] rounded-br-sm border-primary/20'
                : 'bg-black/40 text-foreground rounded-[1.5rem] rounded-bl-sm'
            )}
          >
            {msg.content}
          </div>
        )}
        <div className={cn('flex items-center gap-1.5 px-1', isMe ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/70">{formatTimestamp(msg.timestamp)}</span>
          {isMe && (
            msg.read
              ? <CheckCheck className="h-3.5 w-3.5 text-primary drop-shadow-[0_0_5px_var(--primary)]" />
              : <Check className="h-3.5 w-3.5 text-muted-foreground/50" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────── */
export default function MessagesPage() {
  useDocumentTitle('Messages');
  const { userId: paramUserId } = useParams<{ userId?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track active conv ID inside WS callback without causing re-subscriptions
  const activeConvIdRef = useRef<string | null>(null);

  const token = TokenStore.get();
  const { connected, subscribe, send } = useWebSocket(user ? token : null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(!!paramUserId);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // Keep ref in sync for WebSocket callback
  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);

  // ── Load conversations on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    MessageService.getConversations()
      .then((dtos) => {
        const convs = dedupeConversations(dtos.map(mapConversationDto));
        setConversations(convs);
        if (paramUserId) {
          const found = convs.find(c => c.user.id === paramUserId);
          if (found) {
            setActiveConvId(found.id);
          } else {
            // paramUserId not in conversations yet — fetch profile and create stub entry
            UserService.getById(paramUserId)
              .then((peer) => {
                const stub: Conversation = {
                  id: peer.id,
                  user: { id: peer.id, name: peer.name, avatar: peer.avatar ?? undefined, online: false },
                  lastMessage: '',
                  lastMessageTime: new Date(0),
                  unreadCount: 0,
                  pinned: false,
                  messages: [],
                };
                setConversations(prev => dedupeConversations([stub, ...prev]));
                setActiveConvId(peer.id);
              })
              .catch(() => setActiveConvId(convs[0]?.id ?? null));
          }
        } else {
          setActiveConvId(convs[0]?.id ?? null);
        }
      })
      .catch(() => toast({ title: 'Could not load conversations', variant: 'destructive' }))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Load message history when active conversation changes ───────────────
  useEffect(() => {
    if (!activeConvId || !user) return;
    setHistoryLoading(true);
    MessageService.getHistory(activeConvId)
      .then(({ content }) => {
        const msgs = content.map(dto => mapMessageDto(dto, user.id));
        setConversations(prev =>
          dedupeConversations(
            prev.map(c => c.id === activeConvId ? { ...c, messages: msgs, unreadCount: 0 } : c)
          )
        );
      })
      .catch(() => toast({ title: 'Could not load messages', variant: 'destructive' }))
      .finally(() => setHistoryLoading(false));
    MessageService.markRead(activeConvId).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId, user?.id]);

  // ── WebSocket: receive real-time messages ───────────────────────────────
  useEffect(() => {
    if (!connected || !user) return;
    const unsub = subscribe('/user/queue/messages', (stompMsg) => {
      let incoming: MessageDto;
      try {
        incoming = JSON.parse(stompMsg.body) as MessageDto;
      } catch {
        return;
      }

      const isFromMe = incoming.senderId === user.id;
      const peerId = isFromMe ? incoming.receiverId : incoming.senderId;
      if (!peerId) return;

      const isActive = activeConvIdRef.current === peerId;
      const incomingCreatedAt = parseDtoDate(incoming.createdAt);

      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === peerId);
        const newMsg = mapMessageDto(incoming, user.id);

        if (idx < 0) {
          // New conversation appears instantly without requiring reload.
          const stubConversation: Conversation = {
            id: peerId,
            user: {
              id: peerId,
              name: 'New conversation',
              avatar: undefined,
              online: false,
            },
            lastMessage: messagePreview(incoming),
            lastMessageTime: incomingCreatedAt,
            unreadCount: !isFromMe && !isActive ? 1 : 0,
            pinned: false,
            messages: [newMsg],
          };

          UserService.getById(peerId)
            .then((peer) => {
              setConversations((current) =>
                dedupeConversations(
                  current.map((conversation) =>
                    conversation.id !== peerId
                      ? conversation
                      : {
                          ...conversation,
                          user: {
                            ...conversation.user,
                            id: peer.id,
                            name: peer.name,
                            avatar: peer.avatar ?? undefined,
                          },
                        }
                  )
                )
              );
            })
            .catch(() => {});

          return dedupeConversations([stubConversation, ...prev]);
        }

        const updated = prev.map(c => {
          if (c.id !== peerId) return c;

          const hasIncomingAlready = c.messages.some(m => m.id === incoming.id);
          const tempReconciledMessages = hasIncomingAlready
            ? c.messages
            : c.messages.filter((m) => {
                if (!m.id.startsWith('temp-') || m.senderId !== 'me' || !isFromMe) {
                  return true;
                }
                return !(
                  m.content === (incoming.content ?? '') &&
                  Math.abs(m.timestamp.getTime() - incomingCreatedAt.getTime()) < 120000
                );
              });

          const mergedMessages = hasIncomingAlready
            ? c.messages
            : dedupeMessages([...tempReconciledMessages, newMsg]);

          const unreadCount = !isFromMe
            ? (isActive ? 0 : c.unreadCount + 1)
            : (isActive ? 0 : c.unreadCount);

          return {
            ...c,
            messages: mergedMessages,
            lastMessage: messagePreview(incoming),
            lastMessageTime: incomingCreatedAt,
            unreadCount,
          };
        });
        return dedupeConversations(updated);
      });

      if (!isFromMe && isActive) {
        MessageService.markRead(peerId).catch(() => {});
      }
    });
    return () => unsub?.();
  }, [connected, user, subscribe]);

  // ── Auto-scroll to bottom on new messages ───────────────────────────────
  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages.length]);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() || !activeConvId || !user) return;
    if (!connected) {
      toast({ title: 'Not connected', description: 'Waiting for connection…', variant: 'destructive' });
      return;
    }
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistic add — replaced by real data on next history load
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      senderId: 'me',
      content: text,
      timestamp: new Date(),
      read: false,
      type: 'text',
    };
    setConversations(prev =>
      dedupeConversations(
        prev.map(c =>
          c.id === activeConvId
            ? { ...c, messages: [...c.messages, tempMsg], lastMessage: text, lastMessageTime: new Date() }
            : c
        )
      )
    );

    send('/app/chat.send', { toUserId: activeConvId, content: text, type: 'TEXT' });
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Image upload to be implemented with file storage
    toast({ title: 'Image sharing', description: 'Image upload coming soon.' });
    e.target.value = '';
  };

  const openConversation = (id: string) => {
    setActiveConvId(id);
    setMobileShowChat(true);
  };

  const filteredConvs = conversations.filter(c =>
    c.user.name.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  // Group messages by date for date separators
  const groupedMessages = activeConv?.messages.reduce<{ date: string; messages: Message[] }[]>(
    (groups, msg) => {
      const dateStr = msg.timestamp.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      const last = groups[groups.length - 1];
      if (last && last.date === dateStr) {
        last.messages.push(msg);
      } else {
        groups.push({ date: dateStr, messages: [msg] });
      }
      return groups;
    },
    []
  ) ?? [];

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col p-4 sm:p-6 lg:p-8">
        <div className="flex-1 flex overflow-hidden rounded-[2rem] border border-white/5 bg-black/20 backdrop-blur-md shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05),0_8px_32px_rgba(0,0,0,0.4)]">

          {/* ── Sidebar ── */}
          <div className={cn(
            'w-full md:w-80 xl:w-96 flex-col border-r border-white/5 bg-black/20 backdrop-blur-md',
            mobileShowChat ? 'hidden md:flex' : 'flex'
          )}>
            {/* Header */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between mb-5">
                <h1 className="text-2xl font-extrabold font-headline text-foreground drop-shadow-sm">Messages</h1>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-full border border-white/5 bg-white/5 hover:bg-primary/20 hover:border-primary/50 text-foreground hover:text-primary transition-all shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]"
                  onClick={() => toast({ title: 'New conversation', description: 'Select a user from their profile to start messaging.' })}
                >
                  <MessageSquarePlus className="h-5 w-5" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-11 rounded-full h-11 text-[13px] bg-black/40 border-white/10 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {loading ? (
                <div className="space-y-3 p-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-black/10 border border-white/5">
                      <Skeleton className="h-12 w-12 rounded-full shrink-0 bg-white/5" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-32 bg-white/5" />
                        <Skeleton className="h-3 w-48 bg-white/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <AnimatePresence>
                  {filteredConvs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
                      <div className="w-20 h-20 rounded-full bg-black/40 border border-white/5 flex items-center justify-center mb-6">
                        <MessageSquarePlus className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-bold text-foreground/80 mb-2">No conversations yet</p>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 text-balance">Exchange matches will appear here</p>
                    </div>
                  ) : (
                    filteredConvs.map(conv => (
                      <ConversationItem
                        key={conv.id}
                        conv={conv}
                        active={conv.id === activeConvId}
                        onClick={() => openConversation(conv.id)}
                      />
                    ))
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* ── Chat Panel ── */}
          <AnimatePresence mode="wait">
            {activeConv ? (
              <motion.div
                key={activeConv.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'flex-1 flex flex-col min-w-0 bg-black/10',
                  !mobileShowChat && 'hidden md:flex'
                )}
              >
                {/* Chat header */}
                <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="md:hidden h-10 w-10 border border-white/5 bg-white/5"
                    onClick={() => setMobileShowChat(false)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="relative">
                    <Avatar className="h-10 w-10 border border-white/10 shadow-sm">
                      <AvatarImage src={activeConv.user.avatar} alt={activeConv.user.name} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-xs font-bold text-primary">
                        {getInitials(activeConv.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    {activeConv.user.online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <p className="font-headline font-bold text-base truncate">{activeConv.user.name}</p>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                      {activeConv.user.online ? <span className="text-emerald-500">Online</span> : `Last seen ${activeConv.user.lastSeen ?? 'recently'}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]"
                      onClick={() => toast({ title: 'Voice call', description: 'Voice calls coming soon.' })}
                    >
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]"
                      onClick={() => toast({ title: 'Video call', description: 'Video calls coming soon.' })}
                    >
                      <Video className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                        <DropdownMenuItem className="focus:bg-white/10 focus:text-foreground text-[11px] uppercase tracking-widest font-bold cursor-pointer" onClick={() => navigate(`/profile/${activeConv.user.id}`)}>View Profile</DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-white/10 focus:text-foreground text-[11px] uppercase tracking-widest font-bold cursor-pointer" onClick={() => navigate('/match')}>Request Exchange</DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive/20 focus:text-destructive text-[11px] uppercase tracking-widest font-bold cursor-pointer"
                          onClick={() => {
                            setConversations(prev => prev.filter(c => c.id !== activeConvId));
                            setActiveConvId(conversations.filter(c => c.id !== activeConvId)[0]?.id ?? null);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Conversation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar relative">
                  {/* Subtle background pattern */}
                  <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none mix-blend-overlay" />
                  
                  {historyLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : groupedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
                      <div className="p-5 rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_30px_hsl(var(--primary)/0.2)]">
                        <MessageSquarePlus className="h-10 w-10 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-headline font-bold text-foreground">Start the conversation</p>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Send a message to {activeConv.user.name}</p>
                      </div>
                    </div>
                  ) : (
                    groupedMessages.map((group) => (
                      <div key={group.date} className="relative z-10">
                        <div className="flex justify-center mb-6 mt-4">
                          <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-muted-foreground/60 bg-black/40 px-4 py-1.5 rounded-full border border-white/5 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] backdrop-blur-md">
                            {group.date}
                          </span>
                        </div>
                        <div className="space-y-6">
                          {group.messages.map((msg, idx) => {
                            const isMe = msg.senderId === 'me';
                            const nextMsg = group.messages[idx + 1];
                            const showAvatar = !nextMsg || nextMsg.senderId !== msg.senderId;
                            return (
                              <MessageBubble
                                key={msg.id}
                                msg={msg}
                                isMe={isMe}
                                showAvatar={showAvatar}
                                peerName={activeConv.user.name}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-md z-20 shadow-[0_-4px_30px_rgba(0,0,0,0.1)] relative">
                  {!connected && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-warning flex items-center gap-2 bg-warning/10 px-4 py-1.5 rounded-full border border-warning/20 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Connecting to chat server...
                      </span>
                    </div>
                  )}
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex items-end gap-3 bg-black/40 border border-white/10 rounded-[1.5rem] p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] transition-all"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleAttachImage}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11 shrink-0 rounded-full hover:bg-white/10 hover:text-foreground text-muted-foreground transition-all border border-transparent shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0)] active:scale-95"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 relative flex items-end">
                      <Textarea
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message..."
                        className="min-h-[44px] max-h-32 flex-1 resize-none bg-transparent border-0 focus-visible:ring-0 pl-3 pr-12 py-3 text-[14px] custom-scrollbar placeholder:text-muted-foreground/50 text-foreground"
                        rows={1}
                      />
                      <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                        <PopoverTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0 rounded-full hover:bg-white/10 hover:text-foreground text-muted-foreground transition-all border border-transparent shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0)] active:scale-95 absolute right-1.5 bottom-1">
                            <Smile className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="end" className="w-[320px] p-0 bg-black/90 backdrop-blur-xl border border-white/10 rounded-[1.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.5)] mb-2">
                        <div className="p-4 space-y-4">
                            {([
                              { label: 'Smileys', emojis: ['😀','😂','😍','🥺','😎','🤔','😅','🙌','👍','❤️','🔥','✨','🎉','💯','🚀'] },
                              { label: 'People', emojis: ['👋','🤝','🙏','💪','👀','🫡','🤗','😤','😭','🥹','😏','😬','🫠','🤩','🫶'] },
                              { label: 'Objects', emojis: ['📚','💻','🎯','🏆','⚡','🌟','💡','📝','🎓','🛠️','📱','🎮','🌈','☕','🍀'] },
                            ] as { label: string; emojis: string[] }[]).map(({ label, emojis }) => (
                              <div key={label}>
                                <p className="text-[9px] font-extrabold tracking-widest text-muted-foreground uppercase mb-2">{label}</p>
                                <div className="flex flex-wrap gap-1">
                                  {emojis.map(e => (
                                    <button
                                      key={e}
                                      type="button"
                                      className="text-xl p-1.5 rounded-lg hover:bg-white/10 transition-colors leading-none"
                                      onClick={() => { setNewMessage(prev => prev + e); setEmojiOpen(false); }}
                                    >
                                      {e}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!newMessage.trim() || sending || !connected}
                      className="h-11 w-11 shrink-0 rounded-full bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 hover:border-primary/50 disabled:opacity-50 transition-all shadow-[0_0_15px_hsl(var(--primary)/0.2)] active:scale-95"
                      onClick={(e) => { e.preventDefault(); handleSend(); }}
                    >
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                    </Button>
                  </form>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-8 bg-black/10 relative overflow-hidden"
              >
                <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none mix-blend-overlay" />
                <div className="p-6 rounded-full bg-black/40 border border-white/5 shadow-[0_0_40px_rgba(0,0,0,0.3),inset_0_1px_0_0_hsla(0,0%,100%,0.05)] text-primary backdrop-blur-md relative z-10 mb-8 group transition-transform duration-500 hover:scale-105 hover:shadow-[0_0_60px_hsl(var(--primary)/0.15)]">
                  <MessageSquarePlus className="h-16 w-16 text-primary drop-shadow-[0_0_15px_var(--primary)] transition-transform duration-500 group-hover:scale-110" />
                </div>
                <h2 className="text-3xl font-extrabold font-headline text-foreground relative z-10 mb-3 drop-shadow-md">SkillEx Messages</h2>
                <p className="text-[12px] uppercase tracking-widest font-bold text-muted-foreground max-w-sm relative z-10 text-balance leading-relaxed">
                  Select a conversation from the sidebar or start a new chat from a user's profile to discuss your next skill exchange!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}

