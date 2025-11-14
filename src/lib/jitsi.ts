import { randomBytes, createHash } from 'crypto';
import { SignJWT } from 'jose';

// Jitsi Configuration
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';
const JITSI_APP_ID = process.env.JITSI_APP_ID || 'lophoc-online';
const JITSI_APP_SECRET = process.env.JITSI_APP_SECRET || 'your-jitsi-secret-key';

interface JitsiTokenOptions {
  roomName: string;
  userId: string;
  userName: string;
  email?: string;
  moderator?: boolean;
  expiresIn?: number; // seconds
}

/**
 * Generate a unique, secure room name
 * Format: prefix_timestamp_random
 */
export function generateRoomName(prefix: string = 'room'): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate a unique access token for video call session
 * This token is used to identify the session, not for Jitsi JWT
 */
export function generateAccessToken(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(32).toString('hex');
  const combined = `${timestamp}-${random}`;
  return createHash('sha256').update(combined).digest('hex');
}

/**
 * Generate Jitsi JWT token for authentication
 * This allows users to join Jitsi rooms with specific permissions
 */
export async function generateJitsiToken(options: JitsiTokenOptions): Promise<string> {
  const {
    roomName,
    userId,
    userName,
    email,
    moderator = false,
    expiresIn = 7200, // 2 hours default
  } = options;

  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresIn;

  // Encode the secret key
  const secretKey = new TextEncoder().encode(JITSI_APP_SECRET);

  // Create JWT payload according to Jitsi spec
  const payload = {
    context: {
      user: {
        id: userId,
        name: userName,
        email: email || `${userId}@lophoc.online`,
        moderator,
      },
      features: {
        livestreaming: false, // Disable livestreaming
        recording: false, // Disable recording
        transcription: false, // Disable transcription
        // ✅ FIX: Use proper feature names (no hyphens in object keys)
      },
    },
    aud: JITSI_APP_ID,
    iss: JITSI_APP_ID,
    sub: JITSI_DOMAIN,
    room: roomName,
    exp,
    nbf: now - 10, // Allow 10 seconds clock skew
    iat: now,
  };

  // Sign the JWT
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secretKey);

  return jwt;
}

/**
 * Generate Jitsi meeting URL with disabled invite features
 * NOTE: meet.jit.si does NOT support JWT authentication for free tier
 * So we use public rooms with config parameters to hide invite buttons
 */
export function generateJitsiUrl(roomName: string, jwt: string, userName?: string): string {
  // Build URL with proper encoding
  const baseUrl = `https://${JITSI_DOMAIN}/${roomName}`;

  // ✅ FIX: Use hash fragment (#) for configs to work with meet.jit.si
  // Query strings (?) don't auto-apply configs on meet.jit.si free tier
  const configs: string[] = [];

  // CRITICAL: Add user display name (must be in hash fragment)
  if (userName) {
    configs.push(`userInfo.displayName=${encodeURIComponent(userName)}`);
  }

  // NOTE: JWT is not used with meet.jit.si free tier (they don't support it)
  // If you use self-hosted Jitsi or 8x8.vc, add jwt to configs

  // Core config - disable prejoin and lobby
  configs.push('config.prejoinPageEnabled=false');
  configs.push('config.requireDisplayName=false');
  configs.push('config.startWithAudioMuted=false');
  configs.push('config.startWithVideoMuted=false');

  // Disable lobby completely (no authentication)
  configs.push('config.enableLobbyChat=false');
  configs.push('config.disableLobby=true');
  configs.push('config.enableInsecureRoomNameWarning=false');

  // ✅ ONLY disable invite and sharing features - KEEP all other features
  configs.push('config.disableInviteFunctions=true');
  configs.push('config.hideAddRoomButton=true');

  // ✅ Keep participants pane (useful for seeing who's in the call)
  // configs.push('config.disableParticipantsPane=true'); // REMOVED - too restrictive

  // ✅ Keep ALL standard toolbar buttons EXCEPT invite-related ones
  // Jitsi will respect disableInviteFunctions and hide invite buttons automatically
  const toolbarButtons = [
    'microphone',
    'camera',
    'desktop',
    'fullscreen',
    'hangup',
    'chat',
    'raisehand',
    'tileview',
    'settings',           // ✅ Keep settings
    'stats',              // ✅ Keep stats
    'participants-pane',  // ✅ Keep participants pane (invite button will be hidden by disableInviteFunctions)
    // 'invite' is automatically excluded due to config.disableInviteFunctions=true
  ];

  configs.push(`config.toolbarButtons=${JSON.stringify(toolbarButtons)}`);
  configs.push(`interfaceConfig.TOOLBAR_BUTTONS=${JSON.stringify(toolbarButtons)}`);

  // ✅ Hide only invite-related UI elements, keep other features
  configs.push('interfaceConfig.HIDE_INVITE_MORE_HEADER=true');
  configs.push('interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS=false');
  configs.push('interfaceConfig.SHOW_JITSI_WATERMARK=false');
  configs.push('interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false');
  configs.push('interfaceConfig.MOBILE_APP_PROMO=false');

  // ✅ Use hash fragment (#) instead of query string (?)
  return `${baseUrl}#${configs.join('&')}`;
}

/**
 * Check if video call session is still valid (not expired)
 */
export function isSessionValid(expiresAt: Date): boolean {
  return new Date() < expiresAt;
}

/**
 * Calculate session duration in minutes
 */
export function calculateSessionDuration(
  startTime: Date | null,
  endTime: Date | null
): number | null {
  if (!startTime || !endTime) return null;
  const durationMs = endTime.getTime() - startTime.getTime();
  return Math.floor(durationMs / 60000); // Convert to minutes
}

/**
 * Check if current time is within allowed join window
 * Allow joining 15 minutes before scheduled start and up to scheduled end time
 */
export function canJoinNow(scheduledStart: Date, scheduledEnd: Date): boolean {
  const now = new Date();
  const joinWindowStart = new Date(scheduledStart.getTime() - 15 * 60 * 1000); // 15 min before
  return now >= joinWindowStart && now <= scheduledEnd;
}

/**
 * Get session expiry time (scheduled end + 1 hour grace period)
 */
export function getSessionExpiry(scheduledEnd: Date): Date {
  return new Date(scheduledEnd.getTime() + 60 * 60 * 1000); // +1 hour
}

/**
 * Validate IP address format (basic check)
 */
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Parse IP addresses from stored JSON string
 */
export function parseIPAddresses(ipJson: string | null): string[] {
  if (!ipJson) return [];
  try {
    const parsed = JSON.parse(ipJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Add IP address to session tracking
 */
export function addIPAddress(existingIPs: string[], newIP: string): string {
  const ips = parseIPAddresses(existingIPs.length > 0 ? existingIPs[0] : null);
  if (!ips.includes(newIP) && isValidIP(newIP)) {
    ips.push(newIP);
  }
  return JSON.stringify(ips);
}
