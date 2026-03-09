import React, { useState, useEffect, useRef } from 'react';
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
  Paperclip,
  Check,
  CheckCheck,
  Circle,
  MessageSquarePlus,
  Image as ImageIcon,
  X,
  Pin,
  Trash2,
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

/* ── Mock data ──────────────────────────────────────────────────────── */
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    user: { id: 'u1', name: 'Aryan Sharma', avatar: undefined, online: true },
    lastMessage: "See you at the session tomorrow!",
    lastMessageTime: new Date(Date.now() - 2 * 60 * 1000),
    unreadCount: 2,
    pinned: true,
    messages: [
      { id: 'm1', senderId: 'u1', content: "Hey! I just accepted your exchange request.", timestamp: new Date(Date.now() - 60 * 60 * 1000), read: true, type: 'text' },
      { id: 'm2', senderId: 'me', content: "Great! I'm really excited to learn React from you.", timestamp: new Date(Date.now() - 55 * 60 * 1000), read: true, type: 'text' },
      { id: 'm3', senderId: 'u1', content: "Same! Your Python skills look impressive from your profile.", timestamp: new Date(Date.now() - 50 * 60 * 1000), read: true, type: 'text' },
      { id: 'm4', senderId: 'me', content: "Thanks! When works best for you? I'm free most evenings.", timestamp: new Date(Date.now() - 30 * 60 * 1000), read: true, type: 'text' },
      { id: 'm5', senderId: 'u1', content: "Tomorrow evening at 7PM?", timestamp: new Date(Date.now() - 10 * 60 * 1000), read: false, type: 'text' },
      { id: 'm6', senderId: 'u1', content: "See you at the session tomorrow!", timestamp: new Date(Date.now() - 2 * 60 * 1000), read: false, type: 'text' },
    ],
  },
  {
    id: 'conv-2',
    user: { id: 'u2', name: 'Priya Kapoor', avatar: undefined, online: false, lastSeen: '2h ago' },
    lastMessage: "The Figma file is in the drive.",
    lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    unreadCount: 0,
    messages: [
      { id: 'm7', senderId: 'u2', content: "Hi! Thanks for accepting my design exchange.", timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), read: true, type: 'text' },
      { id: 'm8', senderId: 'me', content: "Of course! Your portfolio looks stunning.", timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000), read: true, type: 'text' },
      { id: 'm9', senderId: 'u2', content: "The Figma file is in the drive.", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), read: true, type: 'text' },
    ],
  },
  {
    id: 'conv-3',
    user: { id: 'u3', name: 'Rahul Dev', avatar: undefined, online: true },
    lastMessage: "Let's connect on video call?",
    lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
    unreadCount: 0,
    messages: [
      { id: 'm10', senderId: 'u3', content: "Hey, I saw you teach JavaScript. I'm learning it!", timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000), read: true, type: 'text' },
      { id: 'm11', senderId: 'me', content: "Happy to help! What topic specifically?", timestamp: new Date(Date.now() - 24.5 * 60 * 60 * 1000), read: true, type: 'text' },
      { id: 'm12', senderId: 'u3', content: "Let's connect on video call?", timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), read: true, type: 'text' },
    ],
  },
  {
    id: 'conv-4',
    user: { id: 'u4', name: 'Sneha Iyer', avatar: undefined, online: false, lastSeen: '3d ago' },
    lastMessage: "Thanks, that was really helpful!",
    lastMessageTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    unreadCount: 0,
    messages: [
      { id: 'm13', senderId: 'u4', content: "Thanks, that was really helpful!", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), read: true, type: 'text' },
    ],
  },
];

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
        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150',
        active
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-muted/60 border border-transparent'
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-sm font-bold">
            {getInitials(conv.user.name)}
          </AvatarFallback>
        </Avatar>
        {conv.user.online && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('font-semibold text-sm truncate', active && 'text-primary')}>
            {conv.user.name}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatMessageTime(conv.lastMessageTime)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
          {conv.unreadCount > 0 && (
            <Badge className="h-4 min-w-[16px] px-1 text-[10px] shrink-0 bg-primary">
              {conv.unreadCount}
            </Badge>
          )}
        </div>
      </div>
      {conv.pinned && <Pin className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
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
      className={cn('flex items-end gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}
    >
      {!isMe && (
        <div className="w-7 shrink-0">
          {showAvatar && (
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[10px] bg-primary/20 font-bold">
                {getInitials(peerName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
      <div className={cn('max-w-[70%] flex flex-col gap-1', isMe ? 'items-end' : 'items-start')}>
        {msg.type === 'image' && msg.imageUrl ? (
          <div className="rounded-2xl overflow-hidden max-w-[260px]">
            <img src={msg.imageUrl} alt="attachment" className="w-full object-cover" />
          </div>
        ) : (
          <div
            className={cn(
              'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
              isMe
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted text-foreground rounded-bl-md'
            )}
          >
            {msg.content}
          </div>
        )}
        <div className={cn('flex items-center gap-1 px-1', isMe ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] text-muted-foreground">{formatTimestamp(msg.timestamp)}</span>
          {isMe && (
            msg.read
              ? <CheckCheck className="h-3 w-3 text-primary" />
              : <Check className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────── */
export default function MessagesPage() {
  const { userId: paramUserId } = useParams<{ userId?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string | null>(
    paramUserId
      ? (MOCK_CONVERSATIONS.find(c => c.user.id === paramUserId)?.id ?? MOCK_CONVERSATIONS[0].id)
      : MOCK_CONVERSATIONS[0].id
  );
  const [search, setSearch] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(!!paramUserId);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;
  const filteredConvs = conversations.filter(c =>
    c.user.name.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (!activeConvId) return;
    setConversations(prev =>
      prev.map(c =>
        c.id === activeConvId
          ? { ...c, unreadCount: 0, messages: c.messages.map(m => ({ ...m, read: true })) }
          : c
      )
    );
  }, [activeConvId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages.length]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConvId) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');

    const msg: Message = {
      id: `m-${Date.now()}`,
      senderId: 'me',
      content: text,
      timestamp: new Date(),
      read: false,
      type: 'text',
    };

    setConversations(prev =>
      prev.map(c =>
        c.id === activeConvId
          ? { ...c, messages: [...c.messages, msg], lastMessage: text, lastMessageTime: new Date() }
          : c
      )
    );
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;
    const url = URL.createObjectURL(file);
    const msg: Message = {
      id: `m-${Date.now()}`,
      senderId: 'me',
      content: '',
      imageUrl: url,
      timestamp: new Date(),
      read: false,
      type: 'image',
    };
    setConversations(prev =>
      prev.map(c =>
        c.id === activeConvId
          ? { ...c, messages: [...c.messages, msg], lastMessage: '📷 Image', lastMessageTime: new Date() }
          : c
      )
    );
    e.target.value = '';
  };

  const openConversation = (id: string) => {
    setActiveConvId(id);
    setMobileShowChat(true);
  };

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
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex-1 flex overflow-hidden rounded-2xl border border-border/60 glass-subtle shadow-lg">

          {/* ── Sidebar ── */}
          <div className={cn(
            'w-full md:w-80 xl:w-96 flex-col border-r border-border/60 bg-background/60 backdrop-blur-sm',
            mobileShowChat ? 'hidden md:flex' : 'flex'
          )}>
            {/* Header */}
            <div className="p-4 border-b border-border/60">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-xl font-bold font-headline">Messages</h1>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-xl"
                  onClick={() => toast({ title: 'New conversation', description: 'Select a user from their profile to start messaging.' })}
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 rounded-xl h-9 text-sm"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <AnimatePresence>
                {filteredConvs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquarePlus className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No conversations found</p>
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
                  'flex-1 flex flex-col min-w-0',
                  !mobileShowChat && 'hidden md:flex'
                )}
              >
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-background/60 backdrop-blur-sm">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="md:hidden h-8 w-8"
                    onClick={() => setMobileShowChat(false)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-xs font-bold">
                        {getInitials(activeConv.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    {activeConv.user.online && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{activeConv.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {activeConv.user.online ? 'Online' : `Last seen ${activeConv.user.lastSeen ?? 'recently'}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-xl"
                      onClick={() => toast({ title: 'Voice call', description: 'Voice calls coming soon.' })}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-xl"
                      onClick={() => toast({ title: 'Video call', description: 'Video calls coming soon.' })}
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/profile/${activeConv.user.id}`)}>View profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/match')}>Request exchange</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setConversations(prev => prev.filter(c => c.id !== activeConvId));
                            setActiveConvId(conversations.filter(c => c.id !== activeConvId)[0]?.id ?? null);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete conversation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {groupedMessages.map((group) => (
                    <div key={group.date} className="space-y-2">
                      <div className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-px bg-border/50" />
                        <span className="text-[10px] text-muted-foreground px-2">{group.date}</span>
                        <div className="flex-1 h-px bg-border/50" />
                      </div>
                      <div className="space-y-1.5">
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
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="px-4 py-3 border-t border-border/60 bg-background/60 backdrop-blur-sm">
                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAttachImage}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 shrink-0 rounded-xl"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 relative">
                      <Textarea
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        className="resize-none rounded-2xl pr-12 min-h-[40px] max-h-[120px] py-2.5 text-sm border-border/60 focus:border-primary/50"
                      />
                      <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute right-2 bottom-1.5 h-7 w-7 rounded-xl"
                          >
                            <Smile className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="end" className="w-72 p-3">
                          <div className="space-y-2">
                            {([
                              { label: 'Smileys', emojis: ['😀','😂','😍','🥺','😎','🤔','😅','🙌','👍','❤️','🔥','✨','🎉','💯','🚀'] },
                              { label: 'People', emojis: ['👋','🤝','🙏','💪','👀','🫡','🤗','😤','😭','🥹','😏','😬','🫠','🤩','🫶'] },
                              { label: 'Objects', emojis: ['📚','💻','🎯','🏆','⚡','🌟','💡','📝','🎓','🛠️','📱','🎮','🌈','☕','🍀'] },
                            ] as { label: string; emojis: string[] }[]).map(({ label, emojis }) => (
                              <div key={label}>
                                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">{label}</p>
                                <div className="flex flex-wrap gap-0.5">
                                  {emojis.map(e => (
                                    <button
                                      key={e}
                                      type="button"
                                      className="text-xl p-1 rounded hover:bg-muted transition-colors leading-none"
                                      onClick={() => { setNewMessage(prev => prev + e); setEmojiOpen(false); }}
                                    >{e}</button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Button
                      size="icon"
                      disabled={!newMessage.trim() || sending}
                      onClick={handleSend}
                      className="h-9 w-9 shrink-0 rounded-xl"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                    Press Enter to send · Shift+Enter for new line
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center gap-4">
                <div className="p-6 rounded-full bg-primary/10">
                  <MessageSquarePlus className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-headline">Your Messages</h2>
                  <p className="text-muted-foreground text-sm mt-1 max-w-[24ch]">
                    Select a conversation to start chatting with your exchange partners.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
