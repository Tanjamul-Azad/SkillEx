import { useCallback, useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  ILocalVideoTrack,
  IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';

// Prevent server-side rendering execution errors
if (typeof window !== 'undefined') {
  // Keep SDK logging quieter for production, still useful in development.
  AgoraRTC.setLogLevel(3);
}

type StreamRole = 'host' | 'audience';

export const useAgoraSession = (sessionId: string) => {
  const [joined, setJoined] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [streamRole, setStreamRoleState] = useState<StreamRole>('host');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [mediaWarning, setMediaWarning] = useState<string | null>(null);

  // Lists of physical devices
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);

  // Persistent Selected Device IDs
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>(() => {
    return localStorage.getItem('skillex_selected_microphone') || '';
  });
  const [selectedCamera, setSelectedCamera] = useState<string>(() => {
    return localStorage.getItem('skillex_selected_camera') || '';
  });

  // Reactive state hooks to trigger component re-renders when tracks change
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const joiningRef = useRef(false);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);
  const streamRoleRef = useRef<StreamRole>('host');

  // Keep refs of values used in stable callbacks to prevent recreating those callbacks on state changes
  const joinedRef = useRef(false);
  useEffect(() => {
    joinedRef.current = joined;
  }, [joined]);

  const selectedMicrophoneRef = useRef(selectedMicrophone);
  const selectedCameraRef = useRef(selectedCamera);
  useEffect(() => {
    selectedMicrophoneRef.current = selectedMicrophone;
  }, [selectedMicrophone]);
  useEffect(() => {
    selectedCameraRef.current = selectedCamera;
  }, [selectedCamera]);

  const stopLocalTracks = useCallback(async () => {
    const client = clientRef.current;
    const tracksToUnpublish: Array<IMicrophoneAudioTrack | ICameraVideoTrack | ILocalVideoTrack> = [];

    if (localAudioTrackRef.current) tracksToUnpublish.push(localAudioTrackRef.current);
    if (localVideoTrackRef.current) tracksToUnpublish.push(localVideoTrackRef.current);
    if (screenTrackRef.current) tracksToUnpublish.push(screenTrackRef.current);

    if (client && tracksToUnpublish.length > 0) {
      try {
        await client.unpublish(tracksToUnpublish);
      } catch (err) {
        console.warn('[Agora-Client] Failed to unpublish local tracks', err);
      }
    }

    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current.close();
      screenTrackRef.current = null;
    }

    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current.close();
      localVideoTrackRef.current = null;
    }
    setLocalVideoTrack(null);

    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current.close();
      localAudioTrackRef.current = null;
    }
    setLocalAudioTrack(null);

    setIsScreenSharing(false);
    setAudioEnabled(false);
    setVideoEnabled(false);
  }, []);

  const leaveChannel = useCallback(async () => {
    joiningRef.current = false;
    await stopLocalTracks();

    if (clientRef.current) {
      try {
        await clientRef.current.leave();
      } catch (e) {
        console.error('[Agora-Client] Error leaving channel', e);
      }
    }
    setJoined(false);
    setRemoteUsers([]);
    setIsScreenSharing(false);
  }, [stopLocalTracks]);

  // Initialize client
  useEffect(() => {
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    // Handle remote user join/leave events
    const handleUserJoined = (user: IAgoraRTCRemoteUser) => {
      setRemoteUsers((prev) => {
        if (prev.some((u) => u.uid === user.uid)) return prev;
        return [...prev, user];
      });
    };

    const setupAutoplayListener = (user: IAgoraRTCRemoteUser) => {
      const resumeAudio = () => {
        try {
          user.audioTrack?.stop(); // Destroy any existing HTML5 audio nodes for this track first to prevent duplicate playbacks!
          user.audioTrack?.play();
        } catch (e) {
          console.warn('[Agora] Failed to play remote audio track on interaction:', e);
        }
        document.removeEventListener('click', resumeAudio);
        document.removeEventListener('touchstart', resumeAudio);
      };
      document.addEventListener('click', resumeAudio);
      document.addEventListener('touchstart', resumeAudio);
    };

    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      await client.subscribe(user, mediaType);
      
      setRemoteUsers((prev) => {
        if (prev.some((u) => u.uid === user.uid)) {
          return prev.map((u) => (u.uid === user.uid ? user : u));
        }
        return [...prev, user];
      });

      if (mediaType === 'audio' && user.audioTrack) {
        try {
          user.audioTrack.stop(); // Destroy existing audio nodes for this track to prevent double-play echo!
          const playResult = user.audioTrack.play() as unknown;
          if (
            playResult
            && typeof playResult === 'object'
            && 'catch' in playResult
            && typeof playResult.catch === 'function'
          ) {
            playResult.catch((err: unknown) => {
              console.warn('[Agora] Autoplay blocked remote audio track (Promise).', err);
              setupAutoplayListener(user);
            });
          }
        } catch (err) {
          console.warn('[Agora] Autoplay blocked remote audio track (Sync).', err);
          setupAutoplayListener(user);
        }
      }
    };

    const handleUserUnpublished = (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      if (mediaType === 'audio') {
        user.audioTrack?.stop();
      } else if (mediaType === 'video') {
        user.videoTrack?.stop();
      }
      setRemoteUsers((prev) => {
        return prev.map((u) => (u.uid === user.uid ? user : u));
      });
    };

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      user.audioTrack?.stop();
      user.videoTrack?.stop();
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    };

    client.on('user-joined', handleUserJoined);
    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-left', handleUserLeft);

    return () => {
      client.off('user-joined', handleUserJoined);
      client.off('user-published', handleUserPublished);
      client.off('user-unpublished', handleUserUnpublished);
      client.off('user-left', handleUserLeft);
      leaveChannel();
    };
  }, [leaveChannel]);

  useEffect(() => {
    streamRoleRef.current = streamRole;
  }, [streamRole]);

  // Decoupled hardware device list loading function
  const loadDevices = useCallback(async () => {
    try {
      const devices = await AgoraRTC.getDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      const audioDevices = devices.filter((d) => d.kind === 'audioinput');
      setCameras(videoDevices);
      setMicrophones(audioDevices);

      // Auto-set persistent defaults if none is selected yet
      if (videoDevices.length > 0 && !localStorage.getItem('skillex_selected_camera')) {
        const defaultCam = videoDevices[0].deviceId;
        setSelectedCamera(defaultCam);
        localStorage.setItem('skillex_selected_camera', defaultCam);
      }
      if (audioDevices.length > 0 && !localStorage.getItem('skillex_selected_microphone')) {
        const defaultMic = audioDevices[0].deviceId;
        setSelectedMicrophone(defaultMic);
        localStorage.setItem('skillex_selected_microphone', defaultMic);
      }
    } catch (err) {
      console.warn('[Agora-Client] Failed to list physical devices', err);
    }
  }, []);

  // Load and listen to active hardware devices
  useEffect(() => {
    loadDevices();
    
    // Refresh list dynamically when devices are plugged or unplugged
    navigator.mediaDevices?.addEventListener?.('devicechange', loadDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', loadDevices);
    };
  }, [loadDevices]);

  const resolvePreferredDeviceId = useCallback(async (
    kind: MediaDeviceKind,
    preferredDeviceId: string,
    storageKey: string,
    setSelectedDevice: (deviceId: string) => void
  ): Promise<string | null> => {
    try {
      const devices = await AgoraRTC.getDevices();
      const matchingDevices = devices.filter((device) => device.kind === kind);
      if (matchingDevices.length === 0) {
        return null;
      }

      const preferredDevice = matchingDevices.find((device) => device.deviceId === preferredDeviceId);
      if (preferredDevice) {
        return preferredDevice.deviceId;
      }

      const fallbackDeviceId = matchingDevices[0].deviceId;
      setSelectedDevice(fallbackDeviceId);
      localStorage.setItem(storageKey, fallbackDeviceId);
      return fallbackDeviceId;
    } catch (err) {
      console.warn('[Agora-Client] Could not refresh media devices before starting tracks.', err);
      return preferredDeviceId || null;
    }
  }, []);

  const startLocalTracks = useCallback(async () => {
    let audioTrack: IMicrophoneAudioTrack | null = null;
    let videoTrack: ICameraVideoTrack | null = null;
    const warnings: string[] = [];

    // Read most up-to-date chosen hardware device IDs from memory or localStorage
    const preferredMicId = localStorage.getItem('skillex_selected_microphone') || selectedMicrophoneRef.current;
    const preferredCamId = localStorage.getItem('skillex_selected_camera') || selectedCameraRef.current;
    const activeMicId = await resolvePreferredDeviceId(
      'audioinput',
      preferredMicId,
      'skillex_selected_microphone',
      setSelectedMicrophone
    );
    const activeCamId = await resolvePreferredDeviceId(
      'videoinput',
      preferredCamId,
      'skillex_selected_camera',
      setSelectedCamera
    );

    // 1. Try to initialize microphone independently using the preferred device ID
    if (!activeMicId) {
      warnings.push('No microphone was found. Live transcription needs a microphone.');
      setAudioEnabled(false);
    } else {
      try {
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          microphoneId: activeMicId,
          AEC: true,
          ANS: true,
          AGC: true
        });
        localAudioTrackRef.current = audioTrack;
        setLocalAudioTrack(audioTrack);
        await audioTrack.setEnabled(true);
        setAudioEnabled(true);
      } catch (err) {
        console.warn('[Agora-Client] Microphone not available or denied.', err);
        warnings.push('Microphone is unavailable or permission was denied.');
        setAudioEnabled(false);
      }
    }

    // 2. Try to initialize camera independently using the preferred device ID
    if (!activeCamId) {
      warnings.push('No camera was found. The room will continue in audio-only mode.');
      setVideoEnabled(false);
    } else {
      try {
        videoTrack = await AgoraRTC.createCameraVideoTrack({ cameraId: activeCamId });
        localVideoTrackRef.current = videoTrack;
        setLocalVideoTrack(videoTrack);
        await videoTrack.setEnabled(true);
        setVideoEnabled(true);
      } catch (err) {
        console.warn('[Agora-Client] Webcam not available or denied.', err);
        warnings.push('Camera is unavailable, busy, or permission was denied. Audio and transcription can still work.');
        setVideoEnabled(false);
      }
    }

    const tracksToPublish: Array<IMicrophoneAudioTrack | ICameraVideoTrack> = [];
    if (audioTrack) tracksToPublish.push(audioTrack);
    if (videoTrack) tracksToPublish.push(videoTrack);

    if (clientRef.current && tracksToPublish.length > 0) {
      await clientRef.current.publish(tracksToPublish);
    }

    setMediaWarning(warnings.length > 0 ? warnings.join(' ') : null);
  }, [resolvePreferredDeviceId]);

  const joinChannel = useCallback(async (token: string | null, uid: number, appId?: string) => {
    if (!clientRef.current) return;
    if (joiningRef.current || joinedRef.current) return;
    joiningRef.current = true;
    try {
      setJoinError(null);
      const resolvedAppId = appId || import.meta.env.VITE_AGORA_APP_ID;
      if (!resolvedAppId) {
        throw new Error('Agora App ID is not configured.');
      }
      const resolvedToken = token && token.trim().length > 0 ? token : null;
      const client = clientRef.current;
      // Join Room
      await client.join(
        resolvedAppId,
        sessionId,
        resolvedToken,
        uid
      );

      if (streamRoleRef.current === 'host') {
        await startLocalTracks();
      } else {
        await stopLocalTracks();
      }
      
      setJoined(true);
      await loadDevices();
    } catch (error) {
      console.error('[Agora-Client] Failed to join media channel', error);
      setJoinError('Could not join live room. Please refresh and allow mic/camera permissions.');
      setJoined(false);
    } finally {
      joiningRef.current = false;
    }
  }, [sessionId, startLocalTracks, stopLocalTracks, loadDevices]);

  const setStreamRole = useCallback(async (nextRole: StreamRole) => {
    if (streamRoleRef.current === nextRole) return;
    streamRoleRef.current = nextRole;
    setStreamRoleState(nextRole);

    if (!clientRef.current || !joinedRef.current) return;

    if (nextRole === 'audience') {
      await stopLocalTracks();
      return;
    }

    await startLocalTracks();
  }, [startLocalTracks, stopLocalTracks]);

  const toggleVideo = useCallback(async () => {
    if (streamRoleRef.current === 'audience') return;
    if (localVideoTrackRef.current) {
      const nextState = !videoEnabled;
      await localVideoTrackRef.current.setEnabled(nextState);
      setVideoEnabled(nextState);
    } else {
      try {
        const preferredCamId = localStorage.getItem('skillex_selected_camera') || selectedCameraRef.current;
        const activeCamId = await resolvePreferredDeviceId(
          'videoinput',
          preferredCamId,
          'skillex_selected_camera',
          setSelectedCamera
        );
        if (!activeCamId) {
          throw new Error('No webcam found.');
        }
        const videoTrack = await AgoraRTC.createCameraVideoTrack({ cameraId: activeCamId });
        localVideoTrackRef.current = videoTrack;
        setLocalVideoTrack(videoTrack);
        if (clientRef.current && joinedRef.current) {
          await clientRef.current.publish(videoTrack);
        }
        setVideoEnabled(true);
        setMediaWarning(null);
      } catch (err) {
        console.error('[Agora-Client] Failed to start camera dynamically', err);
        setMediaWarning('Camera is unavailable, busy, or permission was denied.');
      }
    }
  }, [videoEnabled, resolvePreferredDeviceId]);

  const toggleAudio = useCallback(async () => {
    if (streamRoleRef.current === 'audience') return;
    if (localAudioTrackRef.current) {
      const nextState = !audioEnabled;
      await localAudioTrackRef.current.setEnabled(nextState);
      setAudioEnabled(nextState);
    } else {
      try {
        const preferredMicId = localStorage.getItem('skillex_selected_microphone') || selectedMicrophoneRef.current;
        const activeMicId = await resolvePreferredDeviceId(
          'audioinput',
          preferredMicId,
          'skillex_selected_microphone',
          setSelectedMicrophone
        );
        if (!activeMicId) {
          throw new Error('No microphone found.');
        }
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          microphoneId: activeMicId,
          AEC: true,
          ANS: true,
          AGC: true
        });
        localAudioTrackRef.current = audioTrack;
        setLocalAudioTrack(audioTrack);
        if (clientRef.current && joinedRef.current) {
          await clientRef.current.publish(audioTrack);
        }
        setAudioEnabled(true);
        setMediaWarning(null);
      } catch (err) {
        console.error('[Agora-Client] Failed to start microphone dynamically', err);
        setMediaWarning('Microphone is unavailable or permission was denied.');
      }
    }
  }, [audioEnabled, resolvePreferredDeviceId]);

  const stopScreenShare = useCallback(async () => {
    if (!clientRef.current || !screenTrackRef.current) return;
    try {
      await clientRef.current.unpublish([screenTrackRef.current]);
    } catch (err) {
      console.warn('[Agora-Client] Failed to unpublish screenshare track', err);
    }
    screenTrackRef.current.stop();
    screenTrackRef.current.close();
    screenTrackRef.current = null;

    if (localVideoTrackRef.current) {
      try {
        await clientRef.current.publish([localVideoTrackRef.current]);
        setLocalVideoTrack(localVideoTrackRef.current);
      } catch (err) {
        console.warn('[Agora-Client] Failed to republish camera track after screenshare', err);
      }
    } else {
      setLocalVideoTrack(null);
    }
    setIsScreenSharing(false);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (streamRoleRef.current === 'audience') return;
    if (!clientRef.current || !joinedRef.current) return;

    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      try {
        const screenTrack = await AgoraRTC.createScreenVideoTrack({}, "disable");
        screenTrackRef.current = screenTrack;

        if (localVideoTrackRef.current) {
          await clientRef.current.unpublish([localVideoTrackRef.current]);
        }
        await clientRef.current.publish([screenTrack]);
        // Show shared screen in local preview while screen sharing is active.
        setLocalVideoTrack(screenTrack);

        screenTrack.on('track-ended', () => {
          void stopScreenShare();
        });

        setIsScreenSharing(true);
      } catch (error) {
        console.error('[Agora-Client] Failed to initiate screenshare', error);
        setJoinError('Screen sharing failed. Check browser permission for screen capture.');
      }
    }
  }, [isScreenSharing, stopScreenShare]);

  // Switch camera hardware device dynamically
  const changeCamera = useCallback(async (deviceId: string) => {
    setSelectedCamera(deviceId);
    localStorage.setItem('skillex_selected_camera', deviceId);
    if (localVideoTrackRef.current) {
      try {
        await localVideoTrackRef.current.setDevice(deviceId);
      } catch (err) {
        console.error('[Agora-Client] Error switching camera device', err);
      }
    }
  }, []);

  // Switch microphone hardware device dynamically
  const changeMicrophone = useCallback(async (deviceId: string) => {
    setSelectedMicrophone(deviceId);
    localStorage.setItem('skillex_selected_microphone', deviceId);
    if (localAudioTrackRef.current) {
      try {
        await localAudioTrackRef.current.setDevice(deviceId);
      } catch (err) {
        console.error('[Agora-Client] Error switching microphone device', err);
      }
    }
  }, []);

  return {
    joined,
    remoteUsers,
    videoEnabled,
    audioEnabled,
    isScreenSharing,
    streamRole,
    joinError,
    mediaWarning,
    localVideoTrack,
    localAudioTrack,
    cameras,
    microphones,
    selectedMicrophone,
    selectedCamera,
    joinChannel,
    setStreamRole,
    leaveChannel,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    changeCamera,
    changeMicrophone,
  };
};
