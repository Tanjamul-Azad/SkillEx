import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAgoraSession } from '@/hooks/useAgoraSession';
import { useTranscription } from '@/hooks/useTranscription';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { SessionService } from '@/services/sessionService';
import { TokenStore } from '@/services/http/ApiClient';
import type { Session } from '@/types';
import { 
  Video, VideoOff, Mic, MicOff, Monitor, PhoneOff, 
  FileText, MessageSquare, Sparkles, Loader2, Save, Volume2, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: number;
  speakerUserId: string;
  speakerRole: string;
  content: string;
  spokenAt: string;
}

interface SessionNotes {
  sessionId: string;
  keyConcepts: string;
  actionItems: string;
  resourcesMentioned: string;
  summary: string;
  generatedAt: string;
}

export default function SessionRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const token = TokenStore.get();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'transcript' | 'ai-notes' | 'shared-notes'>('transcript');
  const [sessionInfo, setSessionInfo] = useState<Session | null>(null);
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [sharedNotesContent, setSharedNotesContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // AI Notes status
  const [aiNotes, setAiNotes] = useState<SessionNotes | null>(null);
  const [generatingNotes, setGeneratingNotes] = useState(false);

  // WebRTC & Audio capture
  const {
    joined,
    remoteUsers,
    videoEnabled,
    audioEnabled,
    isScreenSharing,
    localVideoTrack,
    localAudioTrack,
    cameras,
    microphones,
    selectedMicrophone,
    selectedCamera,
    joinChannel,
    leaveChannel,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    changeCamera,
    changeMicrophone
  } = useAgoraSession(sessionId || '');

  const [showSettings, setShowSettings] = useState(false);

  const [speechLanguage, setSpeechLanguage] = useState('en-US');
  const {
    recording,
    status: speechStatus,
    interimTranscript,
    errorMessage: speechError,
  } = useTranscription(sessionId || '', joined && audioEnabled, speechLanguage);

  const [localVolume, setLocalVolume] = useState(0);
  const [hearSelf, setHearSelf] = useState(false);

  const [isSecure, setIsSecure] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSecure(window.isSecureContext);
    }
  }, []);

  // Track microphone sound input levels in real-time
  useEffect(() => {
    if (!localAudioTrack || !audioEnabled) {
      setLocalVolume(0);
      return;
    }
    const interval = setInterval(() => {
      const level = localAudioTrack.getVolumeLevel();
      setLocalVolume(Math.round(level * 100));
    }, 100);
    return () => clearInterval(interval);
  }, [localAudioTrack, audioEnabled]);

  // Support local audio loopback if user explicitly wants to test their sound
  useEffect(() => {
    if (localAudioTrack && hearSelf && audioEnabled) {
      try {
        localAudioTrack.play();
      } catch (err) {
        console.warn('[Volume-Loopback] Playback block:', err);
      }
    } else {
      if (localAudioTrack) {
        try {
          localAudioTrack.stop();
        } catch {
          // Track may already be stopped by the Agora SDK.
        }
      }
    }
  }, [localAudioTrack, hearSelf, audioEnabled]);

  // WebSocket connection for real-time collaboration and alerts
  const { subscribe, send } = useWebSocket(token);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const getPeerNameByUid = (uid: string | number) => {
    if (!sessionInfo) return `Partner (${uid})`;
    
    const numericUid = typeof uid === 'string' ? parseInt(uid, 10) : uid;

    const javaHashCode = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      return Math.abs(hash);
    };

    const teacherId = sessionInfo.teacher.id;
    const learnerId = sessionInfo.learner.id;

    if (javaHashCode(teacherId) === numericUid) {
      return `${sessionInfo.teacher.name} (Teacher)`;
    }
    if (javaHashCode(learnerId) === numericUid) {
      return `${sessionInfo.learner.name} (Learner)`;
    }
    return `Partner (${uid})`;
  };

  // Fetch initial session info and notes/transcripts
  useEffect(() => {
    if (!sessionId) return;
    
    SessionService.getById(sessionId)
      .then((data) => {
        setSessionInfo(data);
        if (data.sharedNotes) {
          setSharedNotesContent(data.sharedNotes);
        }
      })
      .catch((err) => console.error('Failed to load session details', err));

    SessionService.getTranscript(sessionId)
      .then((data) => {
        setTranscript(data);
      })
      .catch(() => {});

    SessionService.getNotes(sessionId)
      .then((data) => {
        setAiNotes(data);
      })
      .catch(() => {});
  }, [joinChannel, leaveChannel, sessionId]);

  // Subscribe to WebSocket channels
  useEffect(() => {
    if (!sessionId || !subscribe) return;

    // 1. Subscribe to Live Transcript channel
    const unsubTranscript = subscribe(`/topic/session/${sessionId}/transcript`, (msg) => {
      const payload = JSON.parse(msg.body);
      setTranscript((prev) => {
        if (prev.some((t) => t.id === payload.id)) return prev;
        return [...prev, payload];
      });
    });

    // 2. Subscribe to Collaborative Notes channel
    const unsubNotes = subscribe(`/topic/session/${sessionId}/shared-notes`, (msg) => {
      const payload = JSON.parse(msg.body);
      if (payload.sender !== token) {
        setSharedNotesContent(payload.content);
      }
    });

    // 3. Subscribe to AI Note synthesis channels (notifies when Gemma finishes summarizing)
    const unsubAiNotes = subscribe(`/topic/session/${sessionId}/notes`, (msg) => {
      const payload = JSON.parse(msg.body);
      if (payload.error) {
        setGeneratingNotes(false);
        alert(payload.error);
      } else {
        setAiNotes(payload);
        setGeneratingNotes(false);
        setActiveTab('ai-notes');
      }
    });

    return () => {
      if (unsubTranscript) unsubTranscript();
      if (unsubNotes) unsubNotes();
      if (unsubAiNotes) unsubAiNotes();
    };
  }, [sessionId, subscribe, token]);

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Auto join Agora room when session is loaded
  useEffect(() => {
    if (!sessionId) return;
    
    SessionService.joinRoom(sessionId)
      .then((res) => {
        joinChannel(res.token, res.uid);
      })
      .catch((err) => {
        console.error('Failed to authenticate with Agora room', err);
      });

    return () => {
      leaveChannel();
    };
  }, [joinChannel, leaveChannel, sessionId]);

  // Handle local video element mounting
  useEffect(() => {
    if (localVideoTrack && joined) {
      localVideoTrack.play('local-player');
    }
  }, [localVideoTrack, joined]);

  // Handle remote video elements mounting
  useEffect(() => {
    remoteUsers.forEach((user) => {
      if (user.videoTrack) {
        user.videoTrack.play(`remote-player-${user.uid}`);
      }
    });
  }, [remoteUsers]);

  // Handle local text changes in shared notes
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSharedNotesContent(val);
    setIsTyping(true);

    // Broadcast change to other peer over WS
    if (send && sessionId) {
      send(`/app/session/${sessionId}/shared-notes`, {
        content: val,
        sender: token
      });
    }

    setTimeout(() => setIsTyping(false), 800);
  };

  // Trigger Local Gemma summarizing
  const handleGenerateAINotes = async () => {
    if (!sessionId) return;
    setGeneratingNotes(true);
    try {
      await SessionService.triggerNotes(sessionId);
    } catch (e) {
      console.error(e);
      setGeneratingNotes(false);
    }
  };

  // Save collaborative notes explicitly
  const saveSharedNotesToDb = async () => {
    if (!sessionId) return;
    try {
      await SessionService.updateNotes(sessionId, sharedNotesContent);
      alert('Collaborative notes saved to database successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  // Terminate call session room
  const handleEndCall = async () => {
    if (!sessionId) return;
    const confirmEnd = window.confirm('Are you sure you want to end this session call?');
    if (!confirmEnd) return;

    try {
      await leaveChannel();
      await SessionService.endRoom(sessionId);
      navigate(`/sessions/${sessionId}/review`);
    } catch (err) {
      console.error('Failed to terminate room', err);
    }
  };

  const skillName = sessionInfo?.skill?.name || 'Skill Exchange';

  return (
    <div className="flex flex-col h-screen bg-[#0D1B2A] text-slate-100 overflow-hidden font-sans">
      {/* Immersive Top Bar Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#1B263B]/60 border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-[#00C9C8] animate-pulse" />
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#00C9C8] bg-clip-text text-transparent">
            {skillName} Live Room
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>Active Session Code: {sessionId?.substring(0, 8)}</span>
        </div>
      </header>

      {/* Main Grid View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Hand: WebRTC Stream Column */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Video stream grids */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-3xl overflow-hidden bg-black/30 p-2 border border-white/5">
            {/* Local Feed */}
            <div className="relative rounded-2xl overflow-hidden bg-[#1B263B] border border-white/5 shadow-2xl">
              <div id="local-player" className="h-full w-full object-cover" />
              {!videoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1B263B]/90 text-slate-400">
                  <VideoOff className="h-10 w-10 text-slate-500 animate-pulse" />
                </div>
              )}
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl text-xs border border-white/10 flex items-center gap-2">
                {localVolume > 5 ? (
                  <div className="flex items-end gap-0.5 h-3 w-3 mb-0.5">
                    <span className="w-0.5 bg-[#00C9C8] rounded-full animate-bounce" style={{ animationDelay: '0ms', height: '60%' }} />
                    <span className="w-0.5 bg-[#00C9C8] rounded-full animate-bounce" style={{ animationDelay: '150ms', height: '100%' }} />
                    <span className="w-0.5 bg-[#00C9C8] rounded-full animate-bounce" style={{ animationDelay: '300ms', height: '40%' }} />
                  </div>
                ) : (
                  <span className={cn("w-1.5 h-1.5 rounded-full", audioEnabled ? "bg-green-500" : "bg-red-500")} />
                )}
                You (Presenter)
              </div>
            </div>

            {/* Remote Peer Feed */}
            <div className="relative rounded-2xl overflow-hidden bg-[#1B263B] border border-white/5 shadow-2xl">
              {remoteUsers.length > 0 ? (
                remoteUsers.map((rUser) => {
                  const peerName = getPeerNameByUid(rUser.uid);
                  const hasVideo = rUser.hasVideo && rUser.videoTrack;
                  return (
                    <div key={rUser.uid} className="absolute inset-0 w-full h-full">
                      <div id={`remote-player-${rUser.uid}`} className="h-full w-full object-cover" />
                      {!hasVideo && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1B263B]/95 text-slate-400">
                          <VideoOff className="h-10 w-10 text-slate-500 animate-pulse" />
                          <span className="text-xs text-slate-500 mt-2">Camera is Off</span>
                        </div>
                      )}
                      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl text-xs border border-white/10 z-10">
                        {peerName}
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1B263B]/80 text-slate-400 gap-3">
                    <Loader2 className="h-8 w-8 text-[#00C9C8] animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">Waiting for partner to connect...</span>
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl text-xs border border-white/10">
                    Partner Stream
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Immersive control buttons shelf */}
          <div className="flex justify-center items-center gap-4 mt-6 py-3 px-6 bg-[#1B263B]/40 rounded-2xl border border-white/5 backdrop-blur-md max-w-lg mx-auto w-full">
            <button
              onClick={toggleAudio}
              className={cn(
                "p-3.5 rounded-full transition-all duration-300 transform hover:scale-105 border border-white/10",
                audioEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/20"
              )}
              title="Toggle Microphone"
            >
              {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>

            <button
              onClick={() => setHearSelf(!hearSelf)}
              disabled={!audioEnabled}
              className={cn(
                "p-3.5 rounded-full transition-all duration-300 transform hover:scale-105 border border-white/10 flex items-center justify-center gap-1.5 text-xs font-semibold",
                hearSelf && audioEnabled 
                  ? "bg-[#00C9C8]/20 text-[#00C9C8] border-[#00C9C8]/30 shadow-lg shadow-[#00C9C8]/10 animate-pulse" 
                  : "bg-white/5 hover:bg-white/10 text-slate-400 disabled:opacity-40"
              )}
              title="Hear Your Own Speaker Loopback (Use headphones to avoid echo!)"
            >
              <Volume2 className="h-5 w-5" />
              <span className="text-[10px] uppercase tracking-wider hidden sm:inline">Mic Test</span>
            </button>

            <button
              onClick={toggleVideo}
              className={cn(
                "p-3.5 rounded-full transition-all duration-300 transform hover:scale-105 border border-white/10",
                videoEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/20"
              )}
              title="Toggle Camera"
            >
              {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={cn(
                "p-3.5 rounded-full transition-all duration-300 transform hover:scale-105 border border-white/10",
                isScreenSharing ? "bg-[#00C9C8]/20 text-[#00C9C8] border-[#00C9C8]/30" : "bg-white/10 hover:bg-white/20 text-white"
              )}
              title="Toggle Screenshare"
            >
              <Monitor className="h-5 w-5" />
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="p-3.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-full transition-all duration-300 transform hover:scale-105 border border-white/10"
              title="Device Settings"
            >
              <Settings className="h-5 w-5 text-[#00C9C8]" />
            </button>

            <div className="h-6 w-px bg-white/10 mx-2" />

            <button
              onClick={handleEndCall}
              className="p-3.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-all duration-300 transform hover:scale-105 hover:rotate-12 border border-red-500/20 shadow-lg shadow-red-500/10"
              title="Terminate Call Room"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Right Hand: Interactive Dual Workspace split (Width 400px) */}
        <div className="w-[420px] bg-[#1B263B]/40 border-l border-white/5 flex flex-col overflow-hidden">
          {/* Tab Selection Headings */}
          <div className="flex border-b border-white/5 bg-[#1B263B]/30 p-2 gap-1">
            <button
              onClick={() => setActiveTab('transcript')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300",
                activeTab === 'transcript' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:bg-white/5"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Live Transcript
            </button>

            <button
              onClick={() => setActiveTab('shared-notes')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300",
                activeTab === 'shared-notes' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:bg-white/5"
              )}
            >
              <FileText className="h-4 w-4" />
              Shared Notes
            </button>

            <button
              onClick={() => setActiveTab('ai-notes')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300",
                activeTab === 'ai-notes' ? "bg-white/10 text-[#00C9C8] shadow-sm" : "text-slate-400 hover:bg-white/5"
              )}
            >
              <Sparkles className="h-4 w-4" />
              Gemma Notes
            </button>
          </div>

          {/* Dynamic Content Panel */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* TAB 1: Live Transcript Bubble Board */}
            {activeTab === 'transcript' && (
              <div className="flex-1 flex flex-col overflow-hidden p-4">
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                  {transcript.length > 0 ? (
                    transcript.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col max-w-[85%] rounded-2xl p-3 border text-sm transition-all duration-300",
                          msg.speakerUserId === user?.id
                            ? "bg-[#00C9C8]/10 border-[#00C9C8]/20 self-end ml-auto text-slate-100"
                            : "bg-white/5 border-white/5 self-start text-slate-200"
                        )}
                      >
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                          {msg.speakerRole === 'TEACHER' ? 'Teacher' : 'Learner'}
                        </span>
                        <p className="leading-relaxed">{msg.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6 space-y-3">
                      <Sparkles className="h-6 w-6 text-slate-600 animate-pulse" />
                      <p className="text-xs font-semibold text-slate-400">No spoken text captured yet.</p>
                      <p className="text-[10px] text-slate-600 leading-relaxed max-w-[280px]">
                        Speak after joining the room. Finalized speech will appear here automatically.
                      </p>
                    </div>
                  )}
                  {interimTranscript && (
                    <div className="max-w-[85%] rounded-2xl border border-dashed border-[#00C9C8]/25 bg-[#00C9C8]/5 p-3 text-sm text-slate-300">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#00C9C8]">
                        Capturing now
                      </span>
                      <p className="leading-relaxed">{interimTranscript}</p>
                    </div>
                  )}
                  <div ref={transcriptEndRef} />
                </div>
                <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2">
                    {speechStatus === 'listening' && (
                      <>
                        <div className="h-2 w-2 rounded-full bg-[#00C9C8] animate-ping" />
                        <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">
                          {recording ? 'Listening to your voice...' : 'Starting transcriber...'}
                        </span>
                      </>
                    )}
                    {speechStatus === 'restarting' && (
                      <>
                        <div className="h-2 w-2 rounded-full bg-[#00C9C8] animate-pulse" />
                        <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">
                          Restarting listener...
                        </span>
                      </>
                    )}
                    {speechStatus === 'blocked' && (
                      <>
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">
                          Microphone access blocked
                        </span>
                      </>
                    )}
                    {speechStatus === 'unsupported' && (
                      <>
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                          Browser speech recognition unsupported
                        </span>
                      </>
                    )}
                    {(speechStatus === 'idle' || speechStatus === 'error') && (
                      <>
                        <div className="h-2 w-2 rounded-full bg-slate-500" />
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          {audioEnabled ? 'Transcriber idle' : 'Mic muted'}
                        </span>
                      </>
                    )}
                  </div>

                  {speechError && (
                    <p className="text-[10px] text-red-300 leading-snug sm:max-w-[210px]">{speechError}</p>
                  )}

                  {/* Language Picker */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Language:</span>
                    <select
                      value={speechLanguage}
                      onChange={(e) => setSpeechLanguage(e.target.value)}
                      className="bg-slate-950 border border-white/10 text-slate-200 text-[10px] rounded-lg px-2 py-1 font-semibold outline-none hover:border-[#00C9C8]/40 transition-all cursor-pointer"
                    >
                      <option value="en-US">🇬🇧 English (US)</option>
                      <option value="bn-BD">🇧🇩 Bangla (BD)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Real-time STOMP Collaborative Notes */}
            {activeTab === 'shared-notes' && (
              <div className="flex-1 flex flex-col overflow-hidden p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">
                    {isTyping ? 'Partner is writing...' : 'Collaborative Notepad'}
                  </span>
                  <button
                    onClick={saveSharedNotesToDb}
                    className="flex items-center gap-1 text-[11px] bg-[#00C9C8]/10 text-[#00C9C8] px-2.5 py-1 rounded-lg hover:bg-[#00C9C8]/20 transition border border-[#00C9C8]/10"
                  >
                    <Save className="h-3 w-3" />
                    Save Note
                  </button>
                </div>
                <textarea
                  className="flex-1 w-full bg-[#1B263B]/20 border border-white/5 rounded-2xl p-4 text-sm leading-relaxed text-slate-200 focus:outline-none focus:border-[#00C9C8]/40 resize-none custom-scrollbar shadow-inner"
                  placeholder="Type anything here! Keystrokes are synchronized in real-time across both screens over STOMP..."
                  value={sharedNotesContent}
                  onChange={handleNotesChange}
                />
              </div>
            )}

            {/* TAB 3: Ollama Gemma AI summary boards */}
            {activeTab === 'ai-notes' && (
              <div className="flex-1 flex flex-col overflow-hidden p-4">
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                  {aiNotes ? (
                    <div className="space-y-4">
                      {/* Summary Section */}
                      <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-2">
                        <h4 className="text-xs font-bold text-[#00C9C8] uppercase tracking-wider flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5" />
                          Executive Summary
                        </h4>
                        <p className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">{aiNotes.summary}</p>
                      </div>

                      {/* Key Concepts */}
                      <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-2">
                        <h4 className="text-xs font-bold text-[#00C9C8] uppercase tracking-wider">Concepts Covered</h4>
                        <p className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">{aiNotes.keyConcepts}</p>
                      </div>

                      {/* Action Items */}
                      <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-2">
                        <h4 className="text-xs font-bold text-[#00C9C8] uppercase tracking-wider">Next Action Items</h4>
                        <p className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">{aiNotes.actionItems}</p>
                      </div>

                      {/* Resources Mentioned */}
                      {aiNotes.resourcesMentioned && (
                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-2">
                          <h4 className="text-xs font-bold text-[#00C9C8] uppercase tracking-wider">References & Links</h4>
                          <p className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">{aiNotes.resourcesMentioned}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6 space-y-3">
                      <Sparkles className="h-8 w-8 text-slate-600 animate-pulse" />
                      <p className="text-xs font-medium text-slate-400">Generate Session Summary Notes</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Offload the full chat transcripts to your local **Ollama with Gemma 2** to analyze key technical topics and recommend next actions.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/5">
                  <button
                    onClick={handleGenerateAINotes}
                    disabled={generatingNotes}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#00C9C8]/80 to-[#009291]/80 hover:from-[#00C9C8] hover:to-[#009291] disabled:from-slate-800 disabled:to-slate-800 text-white rounded-xl py-3 text-xs font-bold shadow-lg shadow-[#00C9C8]/5 transition-all duration-300 disabled:opacity-50"
                  >
                    {generatingNotes ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gemma is summarizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate AI Summary with Gemma
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Google Meet-Style Hardware Device Selection Dialog */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#1B263B] border border-white/10 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative p-6 space-y-6 animate-fade-in">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <Settings className="h-5 w-5 text-[#00C9C8] animate-spin" style={{ animationDuration: '6s' }} />
                <h2 className="text-base font-bold text-white">Audio & Video Settings</h2>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white transition-colors text-xs px-2 py-1 rounded-lg hover:bg-white/5"
              >
                Close
              </button>
            </div>

            {/* Content Form */}
            <div className="space-y-5">
              
              {/* Microphone Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Microphone Input</label>
                <select
                  value={selectedMicrophone}
                  onChange={(e) => changeMicrophone(e.target.value)}
                  className="w-full bg-[#0D1B2A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#00C9C8]/50 transition-all cursor-pointer"
                >
                  {microphones.length > 0 ? (
                    microphones.map((mic) => (
                      <option key={mic.deviceId} value={mic.deviceId}>
                        {mic.label || `Microphone (${mic.deviceId.substring(0, 6)})`}
                      </option>
                    ))
                  ) : (
                    <option value="">No Active Microphones Found</option>
                  )}
                </select>

                {/* Live Input Volume Bar Indicator (Google Meet Style) */}
                <div className="space-y-1 mt-2 bg-[#0D1B2A]/50 p-2.5 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Mic Audio Capturing Level</span>
                    <span className={cn(localVolume > 5 ? "text-[#00C9C8]" : "text-slate-500")}>
                      {localVolume > 5 ? "Capturing Sound" : "Silence / Muted"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden relative">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-75",
                          localVolume > 30 ? "bg-green-400" : localVolume > 10 ? "bg-[#00C9C8]" : "bg-slate-700"
                        )}
                        style={{ width: `${Math.min(localVolume * 2, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-[#00C9C8] w-8 text-right">{localVolume}%</span>
                  </div>
                </div>
              </div>

              {/* Camera Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Camera Video</label>
                <select
                  value={selectedCamera}
                  onChange={(e) => changeCamera(e.target.value)}
                  className="w-full bg-[#0D1B2A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#00C9C8]/50 transition-all cursor-pointer"
                >
                  {cameras.length > 0 ? (
                    cameras.map((cam) => (
                      <option key={cam.deviceId} value={cam.deviceId}>
                        {cam.label || `Webcam (${cam.deviceId.substring(0, 6)})`}
                      </option>
                    ))
                  ) : (
                    <option value="">No Active Webcams Found</option>
                  )}
                </select>
              </div>

              {!isSecure && (
                <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-xl text-xs text-red-300 space-y-1">
                  <p className="font-bold uppercase tracking-wider text-red-400">🚫 INSECURE CONNECTION DETECTED</p>
                  <p>Webcams and Microphones are strictly disabled by Chrome/Edge when running on unencrypted IP addresses (HTTP).</p>
                  <p className="font-semibold text-white mt-1">To resolve this, please open the application using:</p>
                  <code className="block bg-black/40 p-1.5 rounded mt-1 text-[#00C9C8] font-mono text-center">http://localhost:5173</code>
                </div>
              )}

              {/* Secure Context Permission Troubleshooting (Helper block) */}
              <div className="bg-[#0D1B2A]/70 p-4 rounded-xl border border-yellow-500/10 text-xs text-slate-400 space-y-1.5 leading-relaxed">
                <p className="font-bold text-yellow-400 flex items-center gap-1.5 uppercase tracking-wider">
                  ⚠️ No popup asking for permission?
                </p>
                <p>
                  1. Click the 🔒 <strong>Lock Icon</strong> in your browser's URL address bar next to <code>localhost</code>.
                </p>
                <p>
                  2. Ensure both 🎙️ <strong>Microphone</strong> and 📷 <strong>Camera</strong> permissions are set to <strong>Allow</strong>.
                </p>
                <p>
                  3. If you still don't see your camera, verify your webcam is not locked by another running program (like Zoom, Teams, or another call window).
                </p>
              </div>

            </div>

            {/* Footer Done Button */}
            <div className="border-t border-white/5 pt-4 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="bg-gradient-to-r from-[#00C9C8] to-[#009291] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 shadow-lg shadow-[#00C9C8]/10 transition-all"
              >
                Apply & Save Device Settings
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
