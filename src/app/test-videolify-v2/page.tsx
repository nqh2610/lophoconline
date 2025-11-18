"use client";

import { VideolifyFull_v2 } from '@/components/videolify';
import { useSearchParams } from 'next/navigation';

export default function TestVideolifyV2Page() {
  const searchParams = useSearchParams();

  // Get params from URL
  const roomId = searchParams.get('room') || 'test-room-v2';
  const userName = searchParams.get('name') || 'Test User';
  const userRole = (searchParams.get('role') as 'tutor' | 'student') || 'tutor';
  const testUserId = searchParams.get('testUserId') || '1';
  const accessToken = `test-token-${testUserId}`;

  return (
    <VideolifyFull_v2
      accessToken={accessToken}
      roomId={roomId}
      userDisplayName={userName}
      role={userRole}
      onCallEnd={() => {
        console.log('[TestVideolifyV2] Call ended');
      }}
    />
  );
}
