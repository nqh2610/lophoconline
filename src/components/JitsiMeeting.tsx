"use client";

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Video, VideoOff, Mic, MicOff, Monitor, X } from 'lucide-react';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface JitsiMeetingProps {
  roomName: string;
  jwt: string;
  userName: string;
  moderator?: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
  onError?: (error: Error) => void;
  onReady?: () => void;
}

export function JitsiMeeting({
  roomName,
  jwt,
  userName,
  moderator = false,
  onJoin,
  onLeave,
  onError,
  onReady,
}: JitsiMeetingProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  useEffect(() => {
    // Load Jitsi External API script
    const loadJitsiScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Jitsi script'));
        document.body.appendChild(script);
      });
    };

    // Initialize Jitsi meeting
    const initJitsi = async () => {
      if (!jitsiContainerRef.current) return;

      try {
        await loadJitsiScript();

        const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';

        const options = {
          roomName: roomName,
          width: '100%',
          height: 600,
          parentNode: jitsiContainerRef.current,
          jwt: jwt,
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false, // Skip pre-join page
            disableDeepLinking: true,
            enableWelcomePage: false,
            enableClosePage: false,
            toolbarButtons: moderator
              ? [
                  'microphone',
                  'camera',
                  'closedcaptions',
                  'desktop',
                  'fullscreen',
                  'fodeviceselection',
                  'hangup',
                  'chat',
                  'recording',
                  'livestreaming',
                  'etherpad',
                  'sharedvideo',
                  'settings',
                  'raisehand',
                  'videoquality',
                  'filmstrip',
                  'invite',
                  'stats',
                  'shortcuts',
                  'tileview',
                  'videobackgroundblur',
                  'download',
                  'help',
                  'mute-everyone',
                  'security',
                ]
              : [
                  'microphone',
                  'camera',
                  'closedcaptions',
                  'desktop',
                  'fullscreen',
                  'fodeviceselection',
                  'hangup',
                  'chat',
                  'raisehand',
                  'videoquality',
                  'filmstrip',
                  'stats',
                  'shortcuts',
                  'tileview',
                  'videobackgroundblur',
                ],
            hideConferenceSubject: false,
            hideConferenceTimer: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: '',
            SHOW_POWERED_BY: false,
            DISPLAY_WELCOME_PAGE_CONTENT: false,
            DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
            APP_NAME: 'LopHoc.Online',
            NATIVE_APP_NAME: 'LopHoc.Online',
            PROVIDER_NAME: 'LopHoc.Online',
            MOBILE_APP_PROMO: false,
            TOOLBAR_BUTTONS: moderator
              ? [
                  'microphone',
                  'camera',
                  'closedcaptions',
                  'desktop',
                  'fullscreen',
                  'fodeviceselection',
                  'hangup',
                  'chat',
                  'recording',
                  'livestreaming',
                  'raisehand',
                  'videoquality',
                  'filmstrip',
                  'invite',
                  'stats',
                  'tileview',
                  'settings',
                ]
              : [
                  'microphone',
                  'camera',
                  'closedcaptions',
                  'desktop',
                  'fullscreen',
                  'fodeviceselection',
                  'hangup',
                  'chat',
                  'raisehand',
                  'filmstrip',
                  'tileview',
                ],
            SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile'],
            FILM_STRIP_MAX_HEIGHT: 120,
            ENABLE_FEEDBACK_ANIMATION: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            HIDE_INVITE_MORE_HEADER: !moderator,
          },
          userInfo: {
            displayName: userName,
            email: `${userName}@lophoc.online`,
          },
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);
        apiRef.current = api;

        // Event listeners
        api.addEventListener('videoConferenceJoined', () => {
          setIsJoined(true);
          setLoading(false);
          onJoin?.();
        });

        api.addEventListener('videoConferenceLeft', () => {
          setIsJoined(false);
          onLeave?.();
        });

        api.addEventListener('readyToClose', () => {
          api.dispose();
          apiRef.current = null;
          onLeave?.();
        });

        api.addEventListener('participantJoined', (participant: any) => {
          console.log('Participant joined:', participant);
        });

        api.addEventListener('participantLeft', (participant: any) => {
          console.log('Participant left:', participant);
        });

        api.addEventListener('audioMuteStatusChanged', (status: any) => {
          setIsMuted(status.muted);
        });

        api.addEventListener('videoMuteStatusChanged', (status: any) => {
          setIsVideoMuted(status.muted);
        });

        api.addEventListener('errorOccurred', (error: any) => {
          console.error('Jitsi error:', error);
          setError(error.message || 'An error occurred in the video call');
          onError?.(new Error(error.message));
        });

        api.addEventListener('ready', () => {
          setLoading(false);
          onReady?.();
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize video call';
        setError(errorMessage);
        setLoading(false);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    };

    initJitsi();

    // Cleanup
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomName, jwt, userName, moderator, onJoin, onLeave, onError, onReady]);

  // Control functions
  const toggleAudio = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('toggleAudio');
    }
  };

  const toggleVideo = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('toggleVideo');
    }
  };

  const hangUp = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
    }
  };

  const toggleScreenShare = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('toggleShareScreen');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Call - {moderator ? 'Tutor' : 'Student'}
          </CardTitle>
          {isJoined && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAudio}
                className="gap-2"
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleVideo}
                className="gap-2"
              >
                {isVideoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                {isVideoMuted ? 'Start Video' : 'Stop Video'}
              </Button>
              {moderator && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleScreenShare}
                  className="gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  Share Screen
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={hangUp}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Leave
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Connecting to video call...</p>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div ref={jitsiContainerRef} className="w-full" style={{ minHeight: 600 }} />

        {!loading && !error && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Room:</strong> {roomName}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Role:</strong> {moderator ? 'Tutor (Moderator)' : 'Student (Participant)'}
            </p>
            {moderator && (
              <p className="text-sm text-muted-foreground mt-2">
                As a tutor, you have full control including recording, screen sharing, and managing participants.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
