import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash, Volume2, Mic, MicOff, Video, VideoOff, Settings,
  LogOut, Send, Eye, Edit2, Play, Users, CheckCircle, Clock,
  ChevronLeft, Sparkles, AlertCircle, FileText, Check, Save, Share2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { TokenStore } from '@/services/http/ApiClient';
import { SessionService } from '@/services/sessionService';
import { MessageService } from '@/services/messageService';
import { UserService } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Session, User } from '@/types';

type ChannelType = 'chat' | 'notes' | 'video';

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
}

export default function StudyRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Active view states
  const [activeChannel, setActiveChannel] = useState<ChannelType>('video');
  const [session, setSession] = useState<Session | null>(null);
  const [peerUser, setPeerUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Notes state
  const [notesText, setNotesText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [notesViewMode, setNotesViewMode] = useState<'edit' | 'preview'>('edit');
  const isTypingRef = useRef(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<string>('--:--');

  // WebSocket Chat Integration
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const token = TokenStore.get();
  const { connected, subscribe, send } = useWebSocket(user ? token : null);

  // Join session notification flag to avoid multiple pushes
  const joinedPushRef = useRef(false);

  // ── Load Session and Peer Profile ──────────────────────────────────────────
  useEffect(() => {
    if (!sessionId || !user) return;

    const loadSessionData = async () => {
      try {
        const data = await SessionService.getById(sessionId);
        setSession(data);
        setNotesText(data.sharedNotes || '');

        // Determine partner user
        const isTeacher = data.teacher.id === user.id;
        const partnerId = isTeacher ? data.learner.id : data.teacher.id;

        // Fetch partner user profile
        const peer = await UserService.getById(partnerId);
        setPeerUser(peer);

        // Notify partner that we entered the room (Debounced / Single push)
        if (!joinedPushRef.current) {
          joinedPushRef.current = true;
          SessionService.joinSession(sessionId).catch(() => {});
        }

        // Fetch history
        const historyRes = await MessageService.getHistory(partnerId);
        const mappedMsgs = historyRes.content.map((m: any) => ({
          id: m.id || `msg-${Date.now()}-${Math.random()}`,
          senderId: m.senderId,
          content: m.content,
          timestamp: new Date(m.createdAt || Date.now())
        }));
        setMessages(mappedMsgs);

        setLoading(false);
      } catch (err) {
        toast({
          title: 'Failed to join study room',
          description: 'Ensure you are a registered participant of this session.',
          variant: 'destructive'
        });
        navigate('/dashboard');
      }
    };

    void loadSessionData();
  }, [sessionId, user, navigate, toast]);

  // ── Session Countdown Timer ───────────────────────────────────────────────
  useEffect(() => {
    if (!session || session.status !== 'scheduled') return;

    const timer = setInterval(() => {
      const scheduled = new Date(session.scheduledAt);
      const durationMs = session.durationMins * 60 * 1000;
      const end = new Date(scheduled.getTime() + durationMs);
      const now = new Date();

      const diff = end.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft('Session Finished');
        clearInterval(timer);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const formatted = [
        hours > 0 ? String(hours).padStart(2, '0') : null,
        String(minutes).padStart(2, '0'),
        String(seconds).padStart(2, '0')
      ].filter(Boolean).join(':');

      setTimeLeft(formatted);
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  // ── WebSocket Real-time Messages Listener ──────────────────────────────────
  useEffect(() => {
    if (!connected || !user || !peerUser) return;

    const unsub = subscribe('/user/queue/messages', (stompMsg) => {
      try {
        const incoming = JSON.parse(stompMsg.body);
        const isFromPartner = incoming.senderId === peerUser.id;
        const isFromMe = incoming.senderId === user.id;

        if (isFromPartner || isFromMe) {
          const newMsg: Message = {
            id: incoming.id || `msg-${Date.now()}`,
            senderId: incoming.senderId,
            content: incoming.content,
            timestamp: new Date(incoming.createdAt || Date.now())
          };
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      } catch (err) {
        // ignore malformed frames
      }
    });

    return () => unsub?.();
  }, [connected, user, peerUser, subscribe]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (activeChannel === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeChannel]);

  // ── Debounced Notes Auto-save ─────────────────────────────────────────────
  useEffect(() => {
    if (activeChannel !== 'notes' || !sessionId) return;

    const timer = setTimeout(async () => {
      if (!isTypingRef.current) return;
      isTypingRef.current = false;
      setIsSavingNotes(true);

      try {
        await SessionService.updateNotes(sessionId, notesText);
        setLastSavedTime(new Date());
      } catch (err) {
        toast({ title: 'Auto-save failed', description: 'Could not sync notes with server.', variant: 'destructive' });
      } finally {
        setIsSavingNotes(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [notesText, sessionId, activeChannel, toast]);

  // ── Periodic Background Notes Sync ────────────────────────────────────────
  useEffect(() => {
    if (!sessionId || activeChannel !== 'notes') return;

    const interval = setInterval(async () => {
      // Don't overwrite if the current user is actively writing
      if (isTypingRef.current) return;

      try {
        const updated = await SessionService.getById(sessionId);
        if (updated.sharedNotes !== notesText) {
          setNotesText(updated.sharedNotes || '');
        }
      } catch (err) {
        // quiet fail on background sync
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionId, activeChannel, notesText]);

  // Send Chat message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !peerUser || !connected) return;

    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistic UI append
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      senderId: user?.id || 'me',
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, tempMsg]);

    send('/app/chat.send', { toUserId: peerUser.id, content: text, type: 'TEXT' });
    setSending(false);
  };

  // Complete Session Handler
  const handleCompleteSession = async () => {
    if (!sessionId) return;
    try {
      await SessionService.complete(sessionId);
      toast({
        title: '🎉 Session Completed!',
        description: 'You earned +1 Skill Swap Score and positive reputation!',
        className: 'bg-gradient-to-r from-[#00E5C3]/20 via-background to-background border-[#00E5C3]'
      });
      navigate('/dashboard');
    } catch (err) {
      toast({ title: 'Could not complete session', variant: 'destructive' });
    }
  };

  if (loading || !session || !peerUser) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center flex-col gap-4 text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#00E5C3] border-t-transparent" />
        <p className="text-sm text-gray-400 animate-pulse">Initializing Secure Discord Study Room...</p>
      </div>
    );
  }

  const isTeacher = session.teacher.id === user?.id;

  return (
    <div className="h-screen w-full bg-[#1e1f22] flex overflow-hidden font-sans select-none text-gray-200">
      
      {/* ── SIDEBAR (DISCORD SERVER NAVIGATION) ────────────────────────────────── */}
      <div className="w-[240px] bg-[#2b2d31] flex flex-col justify-between shrink-0 border-r border-[#1f2023]/40">
        
        <div>
          {/* Server Title Block */}
          <div className="h-12 border-b border-[#1f2023]/50 flex items-center justify-between px-4 shadow-sm bg-[#2b2d31]">
            <span className="font-bold text-sm text-white truncate flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#00E5C3] animate-pulse" />
              {session.skill.name} Swap
            </span>
            <Badge className="bg-[#00E5C3]/10 text-[#00E5C3] hover:bg-[#00E5C3]/20 text-[10px] uppercase font-bold border-0 px-1.5">
              Hub
            </Badge>
          </div>

          {/* Channels list */}
          <div className="p-2 space-y-4">
            <div>
              <div className="text-[11px] font-bold text-gray-400 tracking-wider uppercase px-2 mb-1">
                Classroom Channels
              </div>
              <div className="space-y-0.5">
                
                {/* Video Call Channel */}
                <button
                  onClick={() => setActiveChannel('video')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-all ${
                    activeChannel === 'video'
                      ? 'bg-[#35373c] text-white font-medium'
                      : 'text-gray-400 hover:bg-[#35373c]/60 hover:text-gray-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-red-400" />
                    🔊 Study Classroom
                  </span>
                  <Badge className="bg-red-500/20 text-red-400 text-[9px] px-1 border-0 animate-pulse">Live</Badge>
                </button>

                {/* Text Chat Channel */}
                <button
                  onClick={() => setActiveChannel('chat')}
                  className={`w-full flex items-center px-2.5 py-1.5 rounded-md text-sm transition-all ${
                    activeChannel === 'chat'
                      ? 'bg-[#35373c] text-white font-medium'
                      : 'text-gray-400 hover:bg-[#35373c]/60 hover:text-gray-200'
                  }`}
                >
                  <Hash className="h-4 w-4 mr-2 text-gray-500" />
                  # general-chat
                </button>

                {/* Shared Notes Channel */}
                <button
                  onClick={() => setActiveChannel('notes')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-all ${
                    activeChannel === 'notes'
                      ? 'bg-[#35373c] text-white font-medium'
                      : 'text-gray-400 hover:bg-[#35373c]/60 hover:text-gray-200'
                  }`}
                >
                  <span className="flex items-center">
                    <Hash className="h-4 w-4 mr-2 text-gray-500" />
                    # shared-notes
                  </span>
                  {isSavingNotes && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00E5C3] animate-ping" />
                  )}
                </button>

              </div>
            </div>

            {/* Room Members list */}
            <div>
              <div className="text-[11px] font-bold text-gray-400 tracking-wider uppercase px-2 mb-1.5 flex items-center justify-between">
                <span>Room Members</span>
                <span className="text-[10px] text-gray-500 font-normal">2 online</span>
              </div>
              <div className="space-y-2 px-2">
                
                {/* Teacher Row */}
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={session.teacher.avatar || undefined} />
                      <AvatarFallback className="text-[9px] bg-indigo-600 font-bold">T</AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-500 border border-[#2b2d31]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate flex items-center gap-1">
                      {session.teacher.name}
                      <span title="Teacher Role">👑</span>
                    </div>
                    <p className="text-[9px] text-[#00E5C3] font-bold uppercase tracking-wider">Teacher</p>
                  </div>
                </div>

                {/* Learner Row */}
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={session.learner.avatar || undefined} />
                      <AvatarFallback className="text-[9px] bg-amber-600 font-bold">L</AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-500 border border-[#2b2d31]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate flex items-center gap-1">
                      {session.learner.name}
                      <span title="Learner Role">🎓</span>
                    </div>
                    <p className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Learner</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Bottom User status footer widget */}
        <div className="p-2 bg-[#232428] flex items-center justify-between gap-1">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-[#00E5C3]/10 text-[#00E5C3] font-bold text-xs">U</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate leading-tight">{user?.name}</div>
              <div className="text-[9px] text-[#00E5C3] font-medium tracking-wide uppercase leading-none mt-0.5">
                {isTeacher ? '👑 Teacher' : '🎓 Learner'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:bg-[#35373c] hover:text-white rounded"
              title="Dashboard"
              onClick={() => navigate('/dashboard')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-400 hover:bg-red-500/10 rounded"
              title="Leave study room"
              onClick={() => navigate('/dashboard')}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

      </div>

      {/* ── DYNAMIC CENTER STAGE (ACTIVE VIEW) ─────────────────────────────────── */}
      <div className="flex-1 bg-[#313338] flex flex-col overflow-hidden">
        
        {/* Header Block */}
        <div className="h-12 border-b border-[#1f2023]/50 flex items-center justify-between px-6 bg-[#313338] shadow-sm shrink-0 z-10">
          <div className="flex items-center gap-2">
            {activeChannel === 'chat' && <Hash className="h-5 w-5 text-gray-400" />}
            {activeChannel === 'notes' && <Hash className="h-5 w-5 text-gray-400" />}
            {activeChannel === 'video' && <Volume2 className="h-5 w-5 text-red-400" />}
            
            <h2 className="font-bold text-sm text-white">
              {activeChannel === 'chat' && 'general-chat'}
              {activeChannel === 'notes' && 'shared-notes'}
              {activeChannel === 'video' && 'Study Classroom Voice & Video'}
            </h2>
            <span className="text-xs text-gray-400 ml-2 hidden md:inline border-l border-gray-600/60 pl-3">
              {activeChannel === 'chat' && 'Say hi, ask questions, or exchange code snippets!'}
              {activeChannel === 'notes' && 'Collaborative notebook — autosaves as you write.'}
              {activeChannel === 'video' && 'Production-grade audio/video classroom.'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Timer countdown with animated icon */}
            <div className="flex items-center gap-1.5 bg-[#1e1f22]/60 px-3 py-1 rounded-full text-xs font-medium text-gray-300 border border-[#1f2023]/30">
              <Clock className="h-3.5 w-3.5 text-[#00E5C3] animate-pulse" />
              <span>Time Left: {timeLeft}</span>
            </div>

            {/* End & Complete Session Button */}
            {session.status === 'scheduled' && (
              <Button
                onClick={handleCompleteSession}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-950/20"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Complete Session
              </Button>
            )}

          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            
            {/* ── CHANNEL: VIDEO CALL WORKSPACE ────────────────────────────────────── */}
            {activeChannel === 'video' && (
              <motion.div
                key="video"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="w-full h-full p-4 flex flex-col"
              >
                <div className="flex-1 w-full bg-[#111214] rounded-2xl overflow-hidden shadow-inner flex flex-col relative border border-white/5">
                  <iframe
                    src={`https://meet.jit.si/skillex-session-${session.id}#config.prejoinPageEnabled=false&userInfo.displayName="${user?.name || 'SkillEx User'}"&config.startWithAudioMuted=false&config.startWithVideoMuted=true`}
                    className="w-full h-full border-0 bg-black"
                    allow="camera; microphone; fullscreen; display-capture; autoplay"
                    title="SkillEx Immersive Video Classroom"
                  />
                </div>
              </motion.div>
            )}

            {/* ── CHANNEL: REAL-TIME TEXT CHAT ───────────────────────────────────────── */}
            {activeChannel === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col"
              >
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="h-[40vh] flex flex-col items-center justify-center text-center">
                        <div className="h-12 w-12 bg-[#2b2d31] rounded-full flex items-center justify-center mb-3">
                          <Hash className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-white font-semibold">Welcome to #general-chat!</p>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm">
                          This is the start of your swap session chat history. Send a message to say hello!
                        </p>
                      </div>
                    ) : (
                      messages.map((m, i) => {
                        const isMe = m.senderId === user?.id;
                        const isTemp = m.id.startsWith('temp-');
                        
                        return (
                          <div key={m.id} className="flex gap-4 items-start hover:bg-[#2e3035]/40 p-1.5 rounded-lg transition-colors group">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarImage src={isMe ? user?.avatar : peerUser.avatar || undefined} />
                              <AvatarFallback className="text-xs font-bold bg-[#00E5C3]/10 text-[#00E5C3]">
                                {isMe ? 'Me' : peerUser.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className="text-sm font-bold text-white leading-none">
                                  {isMe ? user?.name : peerUser.name}
                                </span>
                                <span className="text-[10px] text-gray-400 select-none">
                                  {m.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className={`text-sm text-gray-200 mt-1 break-words ${isTemp ? 'opacity-60' : ''}`}>
                                {m.content}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {/* Message input bar */}
                <div className="p-4 bg-[#313338] shrink-0 border-t border-[#1f2023]/30">
                  <div className="flex items-center gap-2 bg-[#383a40] rounded-lg px-3 py-1.5">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder={`Message #general-chat`}
                      className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder-gray-400 text-sm h-9"
                    />
                    <Button
                      onClick={handleSendMessage}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-[#00E5C3] hover:bg-[#35373c]"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── CHANNEL: COLLABORATIVE MARKDOWN NOTES ────────────────────────────── */}
            {activeChannel === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col p-6"
              >
                
                {/* Save status Indicator toolbar */}
                <div className="flex items-center justify-between mb-4 bg-[#2b2d31] p-2.5 rounded-xl border border-white/5 shrink-0">
                  <div className="flex items-center gap-2 text-xs">
                    {isSavingNotes ? (
                      <span className="flex items-center gap-1.5 text-[#00E5C3]">
                        <span className="h-2 w-2 rounded-full bg-[#00E5C3] animate-ping" />
                        Autosaving notes...
                      </span>
                    ) : lastSavedTime ? (
                      <span className="flex items-center gap-1 text-gray-400">
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Saved at {lastSavedTime.toLocaleTimeString()}
                      </span>
                    ) : (
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <Save className="h-3.5 w-3.5" />
                        Autosave on typing is active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant={notesViewMode === 'edit' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setNotesViewMode('edit')}
                      className="h-7 text-xs font-medium rounded-lg"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      Write
                    </Button>
                    <Button
                      variant={notesViewMode === 'preview' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setNotesViewMode('preview')}
                      className="h-7 text-xs font-medium rounded-lg"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>

                {/* Notepad core area */}
                <div className="flex-1 min-h-0 bg-[#2b2d31] rounded-2xl overflow-hidden border border-white/5 flex flex-col">
                  {notesViewMode === 'edit' ? (
                    <textarea
                      value={notesText}
                      onChange={(e) => {
                        isTypingRef.current = true;
                        setNotesText(e.target.value);
                      }}
                      placeholder={`📝 Write markdown notes or code snippets collaboratively here...
                      
Use hashtags, bullets, and standard formatting. Your partner sees these notes in real-time!`}
                      className="w-full flex-1 p-6 bg-transparent text-gray-200 placeholder-gray-500 font-mono text-sm border-0 focus:outline-none focus:ring-0 resize-none leading-relaxed"
                    />
                  ) : (
                    <div className="flex-1 p-6 overflow-y-auto font-sans leading-relaxed text-gray-300">
                      {notesText.trim() === '' ? (
                        <p className="text-gray-500 text-sm italic select-none">No notes content. Start writing to generate markdown preview!</p>
                      ) : (
                        <div className="space-y-3 prose prose-invert max-w-none text-sm">
                          {notesText.split('\n').map((line, idx) => {
                            if (line.startsWith('# ')) {
                              return <h1 key={idx} className="text-xl font-bold text-white border-b border-gray-700/60 pb-1.5 pt-2">{line.substring(2)}</h1>;
                            }
                            if (line.startsWith('## ')) {
                              return <h2 key={idx} className="text-lg font-bold text-white pt-2">{line.substring(3)}</h2>;
                            }
                            if (line.startsWith('### ')) {
                              return <h3 key={idx} className="text-base font-bold text-white pt-1">{line.substring(4)}</h3>;
                            }
                            if (line.startsWith('- ') || line.startsWith('* ')) {
                              return <li key={idx} className="ml-4 list-disc pl-1">{line.substring(2)}</li>;
                            }
                            if (line.trim() === '') {
                              return <div key={idx} className="h-2" />;
                            }
                            return <p key={idx} className="leading-relaxed">{line}</p>;
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
