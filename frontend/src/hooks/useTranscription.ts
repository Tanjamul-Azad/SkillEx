import { useCallback, useEffect, useRef, useState } from 'react';
import { SessionService } from '@/services/sessionService';

export type SpeechStatus = 'listening' | 'blocked' | 'unsupported' | 'idle' | 'error' | 'restarting';

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    item(index: number): SpeechRecognitionResultLike;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  readonly error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const MIN_FINAL_CHARS = 2;
const DUPLICATE_WINDOW_MS = 8_000;

const cleanTranscript = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .replace(/\s+([?.!,])/g, '$1')
    .trim();

export const useTranscription = (sessionId: string, active: boolean, language = 'en-US') => {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ text: string; sentAt: number }>({ text: '', sentAt: 0 });

  const stopSpeechRecognition = useCallback(() => {
    activeRef.current = false;
    intentionalStopRef.current = true;

    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    const recognition = recognitionRef.current;
    recognitionRef.current = null;

    if (recognition) {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      recognition.onstart = null;
      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          // The browser may already have closed the recognition session.
        }
      }
    }

    setRecording(false);
    setInterimTranscript('');
    setStatus('idle');
  }, []);

  const sendFinalTranscript = useCallback(async (text: string) => {
    const cleaned = cleanTranscript(text);
    if (!sessionId || cleaned.length < MIN_FINAL_CHARS) return;

    const now = Date.now();
    const last = lastSentRef.current;
    if (last.text.toLowerCase() === cleaned.toLowerCase() && now - last.sentAt < DUPLICATE_WINDOW_MS) {
      return;
    }

    lastSentRef.current = { text: cleaned, sentAt: now };
    await SessionService.transcribeText(sessionId, cleaned);
  }, [sessionId]);

  const startSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;

    const speechWindow = window as SpeechWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus('unsupported');
      setRecording(false);
      setErrorMessage('This browser does not support live speech recognition. Use Chrome or Edge for free live transcripts.');
      return;
    }

    intentionalStopRef.current = false;
    activeRef.current = true;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = language;

    recognition.onstart = () => {
      setRecording(true);
      setStatus('listening');
      setErrorMessage(null);
    };

    recognition.onresult = (event) => {
      let interim = '';
      const finalChunks: string[] = [];

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = cleanTranscript(result[0]?.transcript ?? '');
        if (!transcript) continue;

        if (result.isFinal) {
          finalChunks.push(transcript);
        } else {
          interim = cleanTranscript(`${interim} ${transcript}`);
        }
      }

      setInterimTranscript(interim);

      if (finalChunks.length > 0) {
        const finalText = cleanTranscript(finalChunks.join(' '));
        void sendFinalTranscript(finalText).catch((error) => {
          setStatus('error');
          setErrorMessage(error instanceof Error ? error.message : 'Could not save transcript text.');
        });
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setStatus('blocked');
        setRecording(false);
        setErrorMessage('Microphone permission is blocked. Allow microphone access and rejoin the room.');
        intentionalStopRef.current = true;
        return;
      }

      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      setStatus('error');
      setErrorMessage(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      setRecording(false);
      setInterimTranscript('');

      if (!activeRef.current || intentionalStopRef.current) {
        setStatus('idle');
        return;
      }

      setStatus('restarting');
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null;
        if (!activeRef.current || !recognitionRef.current) return;

        try {
          recognitionRef.current.start();
        } catch {
          setStatus('error');
          setErrorMessage('Could not restart speech recognition. Toggle the microphone or rejoin the room.');
        }
      }, 700);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setStatus('error');
      setErrorMessage('Could not start speech recognition. Try rejoining the room.');
    }
  }, [language, sendFinalTranscript]);

  useEffect(() => {
    if (active && sessionId) {
      startSpeechRecognition();
    } else {
      stopSpeechRecognition();
    }

    return () => {
      stopSpeechRecognition();
    };
  }, [active, sessionId, language, startSpeechRecognition, stopSpeechRecognition]);

  return {
    recording,
    status,
    interimTranscript,
    errorMessage,
    isSupported: status !== 'unsupported',
  };
};
