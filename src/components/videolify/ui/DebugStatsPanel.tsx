'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ConnectionStats {
  connected: boolean;
  iceConnectionState: string;
  connectionState: string;
  signalingState: string;
  localCandidates: number;
  remoteCandidates: number;
  selectedLocalCandidate?: string;
  selectedRemoteCandidate?: string;
}

interface DebugStatsPanelProps {
  show: boolean;
  onClose: () => void;
  connectionStats: ConnectionStats;
  isRecording: boolean;
}

export function DebugStatsPanel({
  show,
  onClose,
  connectionStats,
  isRecording,
}: DebugStatsPanelProps) {
  if (!show) return null;

  return (
    <Card className="absolute top-4 left-1/2 -translate-x-1/2 w-96 z-50">
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="font-semibold">Connection Stats</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={connectionStats.connected ? 'text-green-600' : 'text-red-600'}>
              {connectionStats.connected ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>ICE State:</span>
            <span>{connectionStats.iceConnectionState}</span>
          </div>
          <div className="flex justify-between">
            <span>Connection State:</span>
            <span>{connectionStats.connectionState}</span>
          </div>
          <div className="flex justify-between">
            <span>Signaling State:</span>
            <span>{connectionStats.signalingState}</span>
          </div>
          <div className="flex justify-between">
            <span>Local Candidates:</span>
            <span>{connectionStats.localCandidates}</span>
          </div>
          <div className="flex justify-between">
            <span>Remote Candidates:</span>
            <span>{connectionStats.remoteCandidates}</span>
          </div>
          {connectionStats.selectedLocalCandidate && (
            <div className="text-xs text-gray-500 mt-2">
              <div>Local: {connectionStats.selectedLocalCandidate}</div>
            </div>
          )}
          {connectionStats.selectedRemoteCandidate && (
            <div className="text-xs text-gray-500">
              <div>Remote: {connectionStats.selectedRemoteCandidate}</div>
            </div>
          )}
          <div className="flex justify-between">
            <span>Recording:</span>
            <span>{isRecording ? '🔴 Yes' : '⚪ No'}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
