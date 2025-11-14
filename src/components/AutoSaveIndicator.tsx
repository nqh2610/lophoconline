/**
 * Auto-save indicator component
 * Silent auto-save - no visible indicators to avoid confusion with database saves
 */

export interface AutoSaveIndicatorProps {
  // Props kept for backward compatibility but component renders nothing
  lastSavedTimestamp?: number | null;
  showRestoredAlert?: boolean;
  onDismissRestored?: () => void;
  onClearSaved?: () => void;
}

export function AutoSaveIndicator({
  lastSavedTimestamp,
  showRestoredAlert = false,
  onDismissRestored,
  onClearSaved,
}: AutoSaveIndicatorProps) {
  // Silent auto-save - no UI indicators
  return null;
}
