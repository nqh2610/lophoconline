"use client";

import { VideolifyFull } from '@/components/VideolifyFull';

/**
 * Test page for Videolify - bypasses authentication
 * ONLY FOR TESTING - should be disabled in production
 */
export default function TestVideolifyPage() {
  // Use URL params for roomId
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const roomId = params.get('room') || 'test-room-default';
  const userName = params.get('name') || 'Test User';
  const role = (params.get('role') || 'tutor') as 'tutor' | 'student';

  return (
    <VideolifyFull
      roomId={roomId}
      accessToken={roomId} // Use roomId as token for testing
      userDisplayName={userName}
      role={role}
      onCallEnd={() => {
        console.log('Test session ended');
        if (typeof window !== 'undefined') {
          window.close();
        }
      }}
    />
  );
}
