"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VideolifyFull_v2 } from '@/components/videolify';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface VideoCallData {
  success: boolean;
  sessionId: number;
  roomName: string;
  userName: string;
  role: 'tutor' | 'student';
  error?: string;
}

export default function VideoCallV2Page() {
  const params = useParams();
  const router = useRouter();
  const accessToken = params.accessToken as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callData, setCallData] = useState<VideoCallData | null>(null);

  useEffect(() => {
    const joinVideoCall = async () => {
      try {
        console.log('🔍 [VideoCallV2Page] Joining with accessToken:', accessToken);

        const response = await fetch('/api/video-call/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        });

        const data = await response.json();

        console.log('📥 [VideoCallV2Page] API Response:', {
          success: data.success,
          userName: data.userName,
          roomName: data.roomName,
          role: data.role,
        });

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Không thể vào lớp');
        }

        // Extract roomName from jitsiUrl if not provided directly
        let roomName = data.roomName;
        if (!roomName && data.jitsiUrl) {
          const urlMatch = data.jitsiUrl.match(/meet\.jit\.si\/([^#?]+)/);
          if (urlMatch) {
            roomName = urlMatch[1];
          }
        }

        if (!roomName || !data.userName) {
          throw new Error('Thiếu thông tin phòng hoặc tên người dùng');
        }

        setCallData({
          success: true,
          sessionId: data.sessionId,
          roomName,
          userName: data.userName,
          role: data.role,
        });

      } catch (err) {
        console.error('❌ [VideoCallV2Page] Error:', err);
        setError(err instanceof Error ? err.message : 'Không thể kết nối video call');
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      joinVideoCall();
    }
  }, [accessToken]);

  const handleMeetingEnd = () => {
    console.log('👋 [VideoCallV2Page] Meeting ended, redirecting...');
    // Redirect based on role
    if (callData?.role === 'tutor') {
      router.push('/tutor/dashboard');
    } else {
      router.push('/student/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="text-center space-y-4 p-8">
          <Loader2 className="h-16 w-16 animate-spin text-blue-500 mx-auto" />
          <p className="text-white text-xl font-semibold">Đang kết nối lớp học...</p>
          <p className="text-gray-400 text-sm">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <Alert variant="destructive" className="max-w-md shadow-xl">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="ml-2">
            <p className="font-semibold mb-2">Không thể tham gia video call</p>
            <p className="text-sm mb-4">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Thử lại
              </button>
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Đăng nhập
              </button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!callData) {
    return null;
  }

  // ✅ ALWAYS render VideolifyFull_v2 (this is video-call-v2 page)
  return (
    <VideolifyFull_v2
      accessToken={accessToken as string}
      roomId={callData.roomName}
      userDisplayName={callData.userName}
      role={callData.role}
      onCallEnd={handleMeetingEnd}
    />
  );
}
