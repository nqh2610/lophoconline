// Avatar placeholder for better UX
export const AVATAR_PLACEHOLDER = 
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='40' fill='%239ca3af'%3E%3F%3C/text%3E%3C/svg%3E";

// Logo placeholder
export const LOGO_PLACEHOLDER = 
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='60'%3E%3Crect width='200' height='60' fill='%23ddd'/%3E%3C/svg%3E";

// Generate placeholder for any size
export function getImagePlaceholder(width: number, height: number, text?: string): string {
  const displayText = text || '?';
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Crect width='${width}' height='${height}' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='${Math.min(width, height) / 3}' fill='%239ca3af'%3E${displayText}%3C/text%3E%3C/svg%3E`;
}
