/**
 * WebRTC Helper Functions - Safe, Reusable Utilities
 *
 * These are pure functions with NO side effects, making them:
 * ✅ Easy to test
 * ✅ Safe to reuse
 * ✅ Simple to rollback if needed
 */

/**
 * Adds local media tracks to a PeerConnection
 *
 * @param pc - RTCPeerConnection to add tracks to (can be null)
 * @param stream - MediaStream containing tracks (can be null)
 * @param logPrefix - Prefix for console logs (e.g., 'VideolifyFull_v2')
 * @returns Number of tracks added
 *
 * @example
 * ```typescript
 * const tracksAdded = addLocalTracksToPC(
 *   webrtc.peerConnection,
 *   media.localStream,
 *   'VideolifyFull_v2'
 * );
 * ```
 */
export function addLocalTracksToPC(
  pc: RTCPeerConnection | null,
  stream: MediaStream | null,
  logPrefix: string
): number {
  // Guard: Check if PC exists
  if (!pc) {
    console.warn(`[${logPrefix}] ⚠️ Cannot add tracks - PeerConnection is null`);
    return 0;
  }

  // Guard: Check if stream exists
  if (!stream) {
    console.warn(`[${logPrefix}] ⚠️ Cannot add tracks - MediaStream is null`);
    return 0;
  }

  // Get tracks from stream
  const tracks = stream.getTracks();
  console.log(`[${logPrefix}] 📤 Adding ${tracks.length} tracks to PeerConnection`);

  // Add each track with logging
  tracks.forEach((track) => {
    console.log(`[${logPrefix}]    ✅ Adding track: ${track.kind} - ${track.label}`);
    pc.addTrack(track, stream);
  });

  return tracks.length;
}

/**
 * Recreates a PeerConnection by closing the old one and creating a new one
 *
 * @param currentPC - Current RTCPeerConnection (can be null)
 * @param closeOldPC - Function to close the old PeerConnection
 * @param createNewPC - Function to create a new PeerConnection
 * @param logPrefix - Prefix for console logs
 *
 * @example
 * ```typescript
 * recreatePeerConnection(
 *   webrtc.peerConnection,
 *   () => webrtc.close(),
 *   () => webrtc.createPeerConnection(),
 *   'VideolifyFull_v2'
 * );
 * ```
 */
export function recreatePeerConnection(
  currentPC: RTCPeerConnection | null,
  closeOldPC: () => void,
  createNewPC: () => void,
  logPrefix: string
): void {
  if (currentPC) {
    console.log(`[${logPrefix}] ⚠️ PeerConnection exists - closing and recreating`);
    closeOldPC();
  }

  console.log(`[${logPrefix}] 🔌 Creating new PeerConnection`);
  createNewPC();
}

/**
 * Logs track information for debugging
 *
 * @param stream - MediaStream to log tracks from
 * @param logPrefix - Prefix for console logs
 * @param context - Context string (e.g., 'Local', 'Remote')
 *
 * @example
 * ```typescript
 * logStreamTracks(media.localStream, 'VideolifyFull_v2', 'Local');
 * ```
 */
export function logStreamTracks(
  stream: MediaStream | null,
  logPrefix: string,
  context: string
): void {
  if (!stream) {
    console.log(`[${logPrefix}] 📹 ${context} stream: null`);
    return;
  }

  const tracks = stream.getTracks();
  console.log(`[${logPrefix}] 📹 ${context} stream: ${tracks.length} tracks`);
  tracks.forEach((track) => {
    console.log(`[${logPrefix}]    - ${track.kind}: ${track.label} (enabled: ${track.enabled})`);
  });
}
