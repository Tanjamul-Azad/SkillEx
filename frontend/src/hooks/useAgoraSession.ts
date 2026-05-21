import { useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  ILocalVideoTrack,
  IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';

// Prevent server-side rendering execution errors
if (typeof window !== 'undefined') {
  AgoraRTC.setLogLevel(3); // Log errors and warnings only
}

const AGORA_APP_ID = 'bf8f5464ba264a64b2c1fe2ccb7a87c3';

export const useAgoraSession = (sessionId: string) => {
  const [joined, setJoined] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

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
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);

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

    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      await client.subscribe(user, mediaType);
      
      setRemoteUsers((prev) => {
        if (prev.some((u) => u.uid === user.uid)) {
          return prev.map((u) => (u.uid === user.uid ? user : u));
        }
        return [...prev, user];
      });

      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
    };

    const handleUserUnpublished = (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      setRemoteUsers((prev) => {
        return prev.map((u) => (u.uid === user.uid ? user : u));
      });
    };

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
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
  }, []);

  // Decoupled hardware device list loading function
  const loadDevices = async () => {
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
  };

  // Load and listen to active hardware devices
  useEffect(() => {
    loadDevices();
    
    // Refresh list dynamically when devices are plugged or unplugged
    navigator.mediaDevices?.addEventListener?.('devicechange', loadDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', loadDevices);
    };
  }, []);

  const joinChannel = async (token: string, uid: number) => {
    if (!clientRef.current) return;
    try {
      // Join Room
      await clientRef.current.join(
        import.meta.env.VITE_AGORA_APP_ID || AGORA_APP_ID,
        sessionId,
        token,
        uid
      );

      let audioTrack: IMicrophoneAudioTrack | null = null;
      let videoTrack: ICameraVideoTrack | null = null;

      // Read most up-to-date chosen hardware device IDs from memory or localStorage
      const activeMicId = localStorage.getItem('skillex_selected_microphone') || selectedMicrophone;
      const activeCamId = localStorage.getItem('skillex_selected_camera') || selectedCamera;

      // 1. Try to initialize microphone independently using the preferred device ID
      try {
        const micConfig = activeMicId ? { microphoneId: activeMicId } : {};
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack(micConfig);
        localAudioTrackRef.current = audioTrack;
        setLocalAudioTrack(audioTrack);
        setAudioEnabled(true);
      } catch (err) {
        console.warn('[Agora-Client] Microphone not available or denied.', err);
        setAudioEnabled(false);
      }

      // 2. Try to initialize camera independently using the preferred device ID
      try {
        const camConfig = activeCamId ? { cameraId: activeCamId } : {};
        videoTrack = await AgoraRTC.createCameraVideoTrack(camConfig);
        localVideoTrackRef.current = videoTrack;
        setLocalVideoTrack(videoTrack);
        setVideoEnabled(true);
      } catch (err) {
        console.warn('[Agora-Client] Webcam not available or denied.', err);
        setVideoEnabled(false);
      }

      // 3. Publish successfully created tracks
      const tracksToPublish = [];
      if (audioTrack) tracksToPublish.push(audioTrack);
      if (videoTrack) tracksToPublish.push(videoTrack);

      if (tracksToPublish.length > 0) {
        await clientRef.current.publish(tracksToPublish);
      }
      
      setJoined(true);
      await loadDevices();
    } catch (error) {
      console.error('[Agora-Client] Failed to join media channel', error);
    }
  };

  const leaveChannel = async () => {
    // Release and stop camera
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current.close();
      localVideoTrackRef.current = null;
    }
    setLocalVideoTrack(null);

    // Release and stop microphone
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current.close();
      localAudioTrackRef.current = null;
    }
    setLocalAudioTrack(null);

    // Release screen share
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current.close();
      screenTrackRef.current = null;
    }

    if (clientRef.current && joined) {
      try {
        await clientRef.current.leave();
      } catch (e) {
        console.error('[Agora-Client] Error leaving channel', e);
      }
    }
    setJoined(false);
    setRemoteUsers([]);
    setIsScreenSharing(false);
  };

  const toggleVideo = async () => {
    if (localVideoTrackRef.current) {
      const nextState = !videoEnabled;
      await localVideoTrackRef.current.setEnabled(nextState);
      setVideoEnabled(nextState);
    } else {
      try {
        const activeCamId = localStorage.getItem('skillex_selected_camera') || selectedCamera;
        const camConfig = activeCamId ? { cameraId: activeCamId } : {};
        const videoTrack = await AgoraRTC.createCameraVideoTrack(camConfig);
        localVideoTrackRef.current = videoTrack;
        setLocalVideoTrack(videoTrack);
        if (clientRef.current && joined) {
          await clientRef.current.publish(videoTrack);
        }
        setVideoEnabled(true);
      } catch (err) {
        console.error('[Agora-Client] Failed to start camera dynamically', err);
        alert('Webcam is not available, or browser permission was denied.');
      }
    }
  };

  const toggleAudio = async () => {
    if (localAudioTrackRef.current) {
      const nextState = !audioEnabled;
      await localAudioTrackRef.current.setEnabled(nextState);
      setAudioEnabled(nextState);
    } else {
      try {
        const activeMicId = localStorage.getItem('skillex_selected_microphone') || selectedMicrophone;
        const micConfig = activeMicId ? { microphoneId: activeMicId } : {};
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack(micConfig);
        localAudioTrackRef.current = audioTrack;
        setLocalAudioTrack(audioTrack);
        if (clientRef.current && joined) {
          await clientRef.current.publish(audioTrack);
        }
        setAudioEnabled(true);
      } catch (err) {
        console.error('[Agora-Client] Failed to start microphone dynamically', err);
        alert('Microphone is not available, or browser permission was denied.');
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!clientRef.current || !joined) return;

    if (isScreenSharing) {
      if (screenTrackRef.current) {
        await clientRef.current.unpublish([screenTrackRef.current]);
        screenTrackRef.current.stop();
        screenTrackRef.current.close();
        screenTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        await clientRef.current.publish([localVideoTrackRef.current]);
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenTrack = await AgoraRTC.createScreenVideoTrack({}, "disable");
        screenTrackRef.current = screenTrack;

        if (localVideoTrackRef.current) {
          await clientRef.current.unpublish([localVideoTrackRef.current]);
        }
        await clientRef.current.publish([screenTrack]);

        screenTrack.on('track-ended', () => {
          toggleScreenShare();
        });

        setIsScreenSharing(true);
      } catch (error) {
        console.error('[Agora-Client] Failed to initiate screenshare', error);
      }
    }
  };

  // Switch camera hardware device dynamically
  const changeCamera = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    localStorage.setItem('skillex_selected_camera', deviceId);
    if (localVideoTrackRef.current) {
      try {
        await localVideoTrackRef.current.setDevice(deviceId);
      } catch (err) {
        console.error('[Agora-Client] Error switching camera device', err);
      }
    }
  };

  // Switch microphone hardware device dynamically
  const changeMicrophone = async (deviceId: string) => {
    setSelectedMicrophone(deviceId);
    localStorage.setItem('skillex_selected_microphone', deviceId);
    if (localAudioTrackRef.current) {
      try {
        await localAudioTrackRef.current.setDevice(deviceId);
      } catch (err) {
        console.error('[Agora-Client] Error switching microphone device', err);
      }
    }
  };

  return {
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
    changeMicrophone,
  };
};
