"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { JitsiMeeting } from '@/components/JitsiMeeting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Video,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoCallSession {
  success: boolean;
  sessionId: number;
  jitsiUrl: string;
  roomName: string;
  role: 'tutor' | 'student';
  moderator: boolean;
  joinedAt?: string;
  scheduledEndTime: string;
  message?: string;
}

interface ErrorResponse {
  error: string;
  paymentStatus?: string;
  scheduledStartTime?: string;
  canJoinAt?: string;
  scheduledEndTime?: string;
}

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const accessToken = params.accessToken as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<VideoCallSession | null>(null);
  const [jwt, setJwt] = useState<string>('');
  const [hasLeft, setHasLeft] = useState(false);

  // Join video call session
  useEffect(() => {
    const joinSession = async () => {
      if (status === 'loading') return;

      if (status === 'unauthenticated') {
        setError('Please login to join the video call');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/video-call/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorData = data as ErrorResponse;

          // Handle specific error cases
          if (response.status === 402) {
            setError(`Payment required: ${errorData.error}. Payment status: ${errorData.paymentStatus}`);
          } else if (response.status === 425) {
            const canJoinTime = errorData.canJoinAt ? new Date(errorData.canJoinAt).toLocaleString() : 'soon';
            setError(`${errorData.error}. You can join at: ${canJoinTime}`);
          } else if (response.status === 410) {
            setError('This session has ended or expired');
          } else {
            setError(errorData.error || 'Failed to join video call');
          }

          setLoading(false);
          return;
        }

        // Success - extract JWT from Jitsi URL
        const sessionInfo = data as VideoCallSession;
        const url = new URL(sessionInfo.jitsiUrl);
        const jwtParam = url.searchParams.get('jwt');

        if (!jwtParam) {
          setError('Invalid video call configuration');
          setLoading(false);
          return;
        }

        setJwt(jwtParam);
        setSessionData(sessionInfo);
        setLoading(false);

        toast({
          title: 'Joined successfully',
          description: sessionInfo.message || 'You have joined the video call',
        });

      } catch (err) {
        console.error('Error joining session:', err);
        setError('Failed to connect to video call. Please try again.');
        setLoading(false);
      }
    };

    joinSession();
  }, [accessToken, status, toast]);

  // Handle leaving video call
  const handleLeave = async () => {
    if (!sessionData || hasLeft) return;

    try {
      const response = await fetch('/api/video-call/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionData.sessionId }),
      });

      const data = await response.json();

      if (response.ok) {
        setHasLeft(true);
        toast({
          title: 'Left video call',
          description: data.message || 'You have left the video call',
        });

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push(sessionData.role === 'tutor' ? '/tutor/dashboard' : '/student/dashboard');
        }, 3000);
      }
    } catch (err) {
      console.error('Error leaving session:', err);
      toast({
        title: 'Error',
        description: 'Failed to record leave time',
        variant: 'destructive',
      });
    }
  };

  // Handle Jitsi errors
  const handleJitsiError = (error: Error) => {
    console.error('Jitsi error:', error);
    toast({
      title: 'Video call error',
      description: error.message,
      variant: 'destructive',
    });
  };

  // Auto-redirect if not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              You need to login to join this video call
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[600px] w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Unable to Join Video Call
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="w-full"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success - show left message
  if (hasLeft) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              You have left the call
            </CardTitle>
            <CardDescription>
              Redirecting you to dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main video call interface
  if (!sessionData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video className="h-6 w-6" />
              Video Call Session
            </h1>
            <p className="text-muted-foreground text-sm">
              Room: {sessionData.roomName}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium capitalize">{sessionData.role}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                Ends at: {new Date(sessionData.scheduledEndTime).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Jitsi Meeting Component */}
        <JitsiMeeting
          roomName={sessionData.roomName}
          jwt={jwt}
          userName={session?.user?.name || 'User'}
          moderator={sessionData.moderator}
          onJoin={() => {
            console.log('User joined video call');
          }}
          onLeave={handleLeave}
          onError={handleJitsiError}
          onReady={() => {
            console.log('Jitsi is ready');
          }}
        />

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold capitalize">{sessionData.role}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {sessionData.moderator ? 'Moderator - Full control' : 'Participant'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Session Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                <p className="text-lg font-semibold">Active</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {sessionData.joinedAt
                  ? `Joined at ${new Date(sessionData.joinedAt).toLocaleTimeString()}`
                  : 'Just joined'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.location.reload()}
              >
                Reconnect
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={handleLeave}
              >
                Leave Call
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
