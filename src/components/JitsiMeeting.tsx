"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface JitsiMeetingProps {
  roomName: string;
  userName: string;
  userEmail?: string;
  onMeetingEnd?: () => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export function JitsiMeeting({ roomName, userName, userEmail, onMeetingEnd }: JitsiMeetingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const initializingRef = useRef(false); // ✅ Prevent double initialization

  // ✅ Memoize callback to prevent re-initialization
  const onMeetingEndCallback = useRef(onMeetingEnd);
  useEffect(() => {
    onMeetingEndCallback.current = onMeetingEnd;
  }, [onMeetingEnd]);

  useEffect(() => {
    // ✅ Prevent double initialization
    if (initializingRef.current) {
      console.log('⚠️ [JitsiMeeting] Already initializing, skipping...');
      return;
    }
    initializingRef.current = true;
    // Load Jitsi External API script with timeout
    const loadJitsiScript = () => {
      return new Promise<void>((resolve, reject) => {
        // Check if already loaded
        if (window.JitsiMeetExternalAPI) {
          console.log('✅ [JitsiMeeting] Script already loaded');
          resolve();
          return;
        }

        console.log('📥 [JitsiMeeting] Loading Jitsi script...');

        // Set timeout for script loading (10 seconds)
        const timeout = setTimeout(() => {
          reject(new Error('Timeout loading Jitsi API (10s)'));
        }, 10000);

        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;

        script.onload = () => {
          clearTimeout(timeout);
          console.log('✅ [JitsiMeeting] Script loaded successfully');
          resolve();
        };

        script.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ [JitsiMeeting] Script load failed:', error);
          reject(new Error('Failed to load Jitsi API - Network error'));
        };

        document.body.appendChild(script);
      });
    };

    const initJitsi = async () => {
      try {
        console.log('🚀 [JitsiMeeting] Starting initialization for room:', roomName);

        await loadJitsiScript();

        // Double check if API is available
        if (!window.JitsiMeetExternalAPI) {
          throw new Error('Jitsi API not available after script load');
        }

        if (!containerRef.current) {
          throw new Error('Container not found - DOM not ready');
        }

        // Jitsi configuration - optimized for UX
        const domain = 'meet.jit.si';
        const options = {
          roomName: roomName,
          width: '100%',
          height: '100%',
          parentNode: containerRef.current,
          configOverwrite: {
            // ✅ Prejoin and lobby
            prejoinPageEnabled: false,
            disableLobby: true,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            enableInsecureRoomNameWarning: false,
            enableLobbyChat: false,

            // ✅ ONLY disable invite functions
            disableInviteFunctions: true,
            hideAddRoomButton: true,

            // ✅ Keep all other features enabled
            disableProfile: false,

            // ✅ Mobile optimization
            disableDeepLinking: false,
            enableNoAudioDetection: true,
            enableNoisyMicDetection: true,

            // ✅ Video quality
            resolution: 720,
            constraints: {
              video: {
                height: { ideal: 720, max: 1080, min: 360 }
              }
            },

            // ✅ Full toolbar for desktop, auto-hide on mobile
            toolbarButtons: [
              'microphone',
              'camera',
              'desktop',
              'fullscreen',
              'hangup',
              'chat',
              'raisehand',
              'tileview',
              'settings',
              'stats',
              'participants-pane',
              // 'invite' excluded - hidden by disableInviteFunctions
            ],
          },
          interfaceConfigOverwrite: {
            // ✅ Hide invite UI
            HIDE_INVITE_MORE_HEADER: true,

            // ✅ Clean UI
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            MOBILE_APP_PROMO: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,

            // ✅ Better UX
            DEFAULT_BACKGROUND: '#1a1a1a',
            DISABLE_VIDEO_BACKGROUND: false,
            FILM_STRIP_MAX_HEIGHT: 120,

            // ✅ Mobile optimizations
            VERTICAL_FILMSTRIP: false,
            TILE_VIEW_MAX_COLUMNS: 4,
          },
          userInfo: {
            displayName: userName,
            email: userEmail,
          },
        };

        console.log('🚀 [JitsiMeeting] Initializing with userName:', userName);

        // Create Jitsi API instance
        const api = new window.JitsiMeetExternalAPI(domain, options);
        apiRef.current = api;

        // Wait for API to be ready
        api.addEventListener('videoConferenceJoined', () => {
          console.log('✅ [JitsiMeeting] Conference joined');

          // ✅ CRITICAL: Set display name via API (this WILL work)
          api.executeCommand('displayName', userName);
          console.log('✅ [JitsiMeeting] Display name set to:', userName);

          setLoading(false);
          setIsJoined(true);

          // ✅ Start keep-alive mechanism to prevent disconnect
          startKeepAlive(api);
        });

        // Handle meeting end
        api.addEventListener('readyToClose', () => {
          console.log('👋 [JitsiMeeting] Meeting ended');
          stopKeepAlive();
          if (onMeetingEndCallback.current) {
            onMeetingEndCallback.current();
          }
        });

        // Handle errors
        api.addEventListener('errorOccurred', (error: any) => {
          console.error('❌ [JitsiMeeting] Error:', error);
          setError('Đã xảy ra lỗi khi kết nối video call');
          setLoading(false);
        });

      } catch (err) {
        console.error('❌ [JitsiMeeting] Init error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Không thể khởi tạo video call';
        setError(errorMessage);
        setLoading(false);

        // ✅ FALLBACK: If iframe fails, offer direct URL option
        console.warn('⚠️ [JitsiMeeting] Iframe approach failed, user can use direct URL fallback');
      }
    };

    initJitsi();

    // ✅ Cleanup on unmount - proper disposal
    return () => {
      console.log('🧹 [JitsiMeeting] Cleaning up...');
      initializingRef.current = false;
      stopKeepAlive();
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch (err) {
          console.warn('⚠️ [JitsiMeeting] Dispose error:', err);
        }
        apiRef.current = null;
      }
    };
    // ✅ Only re-initialize if roomName or userName changes (stable dependencies)
  }, [roomName, userName]);

  /**
   * Keep-alive mechanism to prevent 5-minute disconnect
   * Sends periodic commands to keep connection active
   */
  const startKeepAlive = (api: any) => {
    console.log('💓 [JitsiMeeting] Starting keep-alive mechanism');

    // Send a harmless command every 2 minutes to keep connection alive
    keepAliveIntervalRef.current = setInterval(() => {
      try {
        if (api) {
          // Get participant count (harmless query that keeps connection active)
          const participantCount = api.getNumberOfParticipants();
          console.log('💓 [JitsiMeeting] Keep-alive ping - participants:', participantCount);
        }
      } catch (err) {
        console.warn('⚠️ [JitsiMeeting] Keep-alive ping failed:', err);
      }
    }, 2 * 60 * 1000); // Every 2 minutes
  };

  const stopKeepAlive = () => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
      console.log('💔 [JitsiMeeting] Stopped keep-alive mechanism');
    }
  };

  if (error) {
    // Generate direct URL as fallback
    const directUrl = `https://meet.jit.si/${roomName}`;

    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <Alert variant="destructive" className="max-w-md shadow-xl">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="ml-2">
            <p className="font-semibold mb-2">Không thể kết nối video call</p>
            <p className="text-sm mb-4">{error}</p>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
              >
                🔄 Thử lại
              </button>

              <button
                onClick={() => window.open(directUrl, '_blank', 'noopener,noreferrer')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                🚀 Mở trực tiếp (Fallback)
              </button>

              <p className="text-xs text-gray-400 mt-2">
                💡 Nếu "Thử lại" không hoạt động, hãy dùng "Mở trực tiếp"
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* ✅ Full-screen loading overlay - completely blocks view until joined */}
      {loading && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black z-50">
          <div className="text-center space-y-6 p-8">
            <Loader2 className="h-16 w-16 animate-spin text-blue-500 mx-auto" />
            <div className="space-y-2">
              <p className="text-white text-xl font-semibold">Đang kết nối video call...</p>
              <p className="text-gray-400 text-sm">Tên hiển thị: <span className="text-white font-medium">{userName}</span></p>
            </div>
            <div className="flex flex-col items-center gap-2 text-gray-500 text-xs mt-8">
              <p>💡 Vui lòng cho phép truy cập camera và microphone</p>
              <p>🔒 Kết nối của bạn được mã hóa và bảo mật</p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Jitsi container - full screen, optimized for mobile and desktop */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{
          // ✅ Ensure iframe takes full viewport on mobile
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
    </div>
  );
}
