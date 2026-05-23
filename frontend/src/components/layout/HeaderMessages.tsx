import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, MessageCircle, MessageSquare, Send, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { cn } from '@/lib/utils';
import { MessageService, type ConversationDto, type MessageDto } from '@/services/messageService';
import { TokenStore } from '@/services/http/ApiClient';
import { UserService } from '@/services/userService';

const MESSAGE_PREVIEW_LIMIT = 8;

type ChatHead = {
  peerId: string;
  name: string;
  avatar?: string | null;
  content: string;
  createdAt: string;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function previewMessage(message: MessageDto): string {
  return message.type?.toUpperCase() === 'IMAGE' ? 'Image' : message.content;
}

function messageDate(value?: string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortConversations(items: ConversationDto[]) {
  return [...items].sort((a, b) => messageDate(b.lastMessageTime) - messageDate(a.lastMessageTime));
}

export default function HeaderMessages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const token = TokenStore.get();
  const { connected, subscribe } = useWebSocket(user ? token : null);

  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [chatHead, setChatHead] = useState<ChatHead | null>(null);
  const [chatHeadOpen, setChatHeadOpen] = useState(false);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  const unreadTotal = useMemo(
    () => conversations.reduce((total, conversation) => total + Number(conversation.unreadCount || 0), 0),
    [conversations],
  );

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const next = await MessageService.getConversations();
      setConversations(sortConversations(next));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setChatHead(null);
      return;
    }

    void fetchConversations();
  }, [fetchConversations, user]);

  const openMessages = useCallback((peerId?: string) => {
    if (peerId) {
      MessageService.markRead(peerId).catch(() => {});
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.peerId === peerId ? { ...conversation, unreadCount: 0 } : conversation,
        ),
      );
      setChatHead((current) => (current?.peerId === peerId ? null : current));
      setChatHeadOpen(false);
      navigate(`/messages/${peerId}`);
      return;
    }

    navigate('/messages');
  }, [navigate]);

  const upsertConversation = useCallback(async (message: MessageDto) => {
    if (!user) return;

    const isFromMe = message.senderId === user.id;
    const peerId = isFromMe ? message.receiverId : message.senderId;
    const currentRouteIsThread = location.pathname === `/messages/${peerId}` || location.pathname === '/messages';
    const shouldCountUnread = !isFromMe && !currentRouteIsThread;

    let existing: ConversationDto | undefined;

    setConversations((prev) => {
      existing = prev.find((conversation) => conversation.peerId === peerId);
      const nextConversation: ConversationDto = {
        peerId,
        peerName: existing?.peerName ?? 'New message',
        peerAvatar: existing?.peerAvatar ?? null,
        peerUniversity: existing?.peerUniversity ?? null,
        peerIsOnline: existing?.peerIsOnline ?? false,
        lastMessage: previewMessage(message),
        lastMessageType: message.type ?? 'TEXT',
        lastMessageTime: message.createdAt,
        unreadCount: shouldCountUnread ? (existing?.unreadCount ?? 0) + 1 : (existing?.unreadCount ?? 0),
      };

      return sortConversations([
        nextConversation,
        ...prev.filter((conversation) => conversation.peerId !== peerId),
      ]);
    });

    if (!existing) {
      try {
        const peer = await UserService.getById(peerId);
        setConversations((prev) =>
          sortConversations(
            prev.map((conversation) =>
              conversation.peerId === peerId
                ? {
                    ...conversation,
                    peerName: peer.name,
                    peerAvatar: peer.avatar ?? null,
                    peerUniversity: peer.university ?? null,
                  }
                : conversation,
            ),
          ),
        );

        if (!isFromMe && !currentRouteIsThread) {
          setChatHead({
            peerId,
            name: peer.name,
            avatar: peer.avatar ?? null,
            content: previewMessage(message),
            createdAt: message.createdAt,
          });
          setChatHeadOpen(false);
        }
      } catch {
        // Keep the lightweight conversation stub if profile lookup fails.
      }
    } else if (!isFromMe && !currentRouteIsThread) {
      setChatHead({
        peerId,
        name: existing.peerName,
        avatar: existing.peerAvatar,
        content: previewMessage(message),
        createdAt: message.createdAt,
      });
      setChatHeadOpen(false);
    }
  }, [location.pathname, user]);

  useEffect(() => {
    if (!connected || !user) return;

    const unsubscribe = subscribe('/user/queue/messages', (stompMessage) => {
      try {
        const incoming = JSON.parse(stompMessage.body) as MessageDto;
        if (!incoming.id || seenMessageIdsRef.current.has(incoming.id)) return;
        seenMessageIdsRef.current.add(incoming.id);
        void upsertConversation(incoming);
      } catch {
        // Ignore malformed message frames.
      }
    });

    return () => unsubscribe?.();
  }, [connected, subscribe, upsertConversation, user]);

  const sendQuickReply = async () => {
    if (!chatHead || !replyText.trim()) return;

    const text = replyText.trim();
    setSendingReply(true);
    try {
      await MessageService.sendMessage(chatHead.peerId, { content: text, type: 'TEXT' });
      setReplyText('');
      setChatHead(null);
      setChatHeadOpen(false);
      void fetchConversations();
    } finally {
      setSendingReply(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <DropdownMenu onOpenChange={(open) => {
        if (open) void fetchConversations();
      }}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-xl hover:bg-primary/10 hover:text-foreground border border-transparent hover:border-primary/20 transition-all duration-200"
            aria-label="Messages"
          >
            <MessageSquare className="h-[1.1rem] w-[1.1rem]" />
            <AnimatePresence>
              {unreadTotal > 0 && (
                <motion.span
                  key="message-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground"
                >
                  {unreadTotal > 9 ? '9+' : unreadTotal}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-[21rem] rounded-2xl border-border/50 bg-background/90 backdrop-blur-2xl shadow-xl" align="end" forceMount>
          <div className="flex items-center justify-between px-3 py-2.5">
            <p className="font-headline font-bold text-sm">Messages</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-2 text-xs text-primary hover:bg-primary/5 hover:text-primary"
              onClick={() => openMessages()}
            >
              Open inbox
            </Button>
          </div>
          <DropdownMenuSeparator />
          <ScrollArea className="max-h-80">
            {loading && conversations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Loading messages...</p>
            ) : conversations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No conversations yet</p>
            ) : (
              conversations.slice(0, MESSAGE_PREVIEW_LIMIT).map((conversation) => (
                <button
                  key={conversation.peerId}
                  type="button"
                  className="flex w-full items-center gap-3 border-b border-border/40 px-3 py-3 text-left transition-colors last:border-0 hover:bg-muted/50"
                  onClick={() => openMessages(conversation.peerId)}
                >
                  <Avatar className="h-10 w-10 border border-border/60">
                    <AvatarImage src={conversation.peerAvatar ?? undefined} alt={conversation.peerName} />
                    <AvatarFallback className="text-xs font-bold">{getInitials(conversation.peerName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-foreground">{conversation.peerName}</p>
                      {conversation.unreadCount > 0 && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      'truncate text-xs',
                      conversation.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}>
                      {conversation.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      <AnimatePresence>
        {chatHead && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.9 }}
            className="fixed bottom-5 right-5 z-[80] flex items-end gap-3"
          >
            <AnimatePresence>
              {chatHeadOpen && (
                <motion.div
                  initial={{ opacity: 0, x: 24, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, scale: 0.96 }}
                  className="mb-1 w-[320px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                    <Avatar className="h-10 w-10 border border-primary/40">
                      <AvatarImage src={chatHead.avatar ?? undefined} alt={chatHead.name} />
                      <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">{getInitials(chatHead.name)}</AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => openMessages(chatHead.peerId)}
                    >
                      <p className="truncate text-sm font-bold">{chatHead.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary">New message</p>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
                      onClick={() => setChatHeadOpen(false)}
                      aria-label="Collapse chat bubble"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <button
                    type="button"
                    className="flex w-full gap-3 px-4 py-4 text-left hover:bg-white/[0.03]"
                    onClick={() => openMessages(chatHead.peerId)}
                  >
                    <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="line-clamp-2 text-sm leading-relaxed text-slate-100">{chatHead.content}</p>
                  </button>
                  <div className="flex items-center gap-2 border-t border-white/10 p-3">
                    <input
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void sendQuickReply();
                        }
                      }}
                      placeholder="Reply..."
                      className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-primary/50"
                    />
                    <Button
                      type="button"
                      size="icon"
                      disabled={!replyText.trim() || sendingReply}
                      className="h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/85"
                      onClick={() => void sendQuickReply()}
                      aria-label="Send quick reply"
                    >
                      {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              {!chatHeadOpen && (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="absolute bottom-2 right-[4.75rem] max-w-[220px] rounded-2xl border border-white/10 bg-slate-950/95 px-3 py-2 text-sm text-slate-100 shadow-xl backdrop-blur-xl"
                >
                  <p className="truncate text-xs font-bold text-primary">{chatHead.name}</p>
                  <p className="truncate text-xs text-slate-200">{chatHead.content}</p>
                </motion.div>
              )}

              <button
                type="button"
                className="group relative h-16 w-16 rounded-full border-2 border-primary/70 bg-slate-950 shadow-[0_0_0_6px_rgba(0,245,212,0.08),0_18px_40px_rgba(0,0,0,0.45)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/60"
                onClick={() => setChatHeadOpen((open) => !open)}
                onDoubleClick={() => openMessages(chatHead.peerId)}
                aria-label={`Open chat with ${chatHead.name}`}
              >
                <Avatar className="h-full w-full">
                  <AvatarImage src={chatHead.avatar ?? undefined} alt={chatHead.name} />
                  <AvatarFallback className="bg-primary/15 text-base font-extrabold text-primary">{getInitials(chatHead.name)}</AvatarFallback>
                </Avatar>
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-[10px] font-extrabold text-white shadow-lg">
                  1
                </span>
                <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-slate-950 bg-emerald-400" />
              </button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute -left-2 -top-2 h-7 w-7 rounded-full border border-white/10 bg-slate-950 text-slate-300 shadow-lg hover:bg-white/10 hover:text-white"
                onClick={() => {
                  setChatHead(null);
                  setChatHeadOpen(false);
                }}
                aria-label="Close chat bubble"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
