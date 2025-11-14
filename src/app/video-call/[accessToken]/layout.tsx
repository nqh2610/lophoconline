import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Video Call - LopHoc",
  description: "Online video call classroom",
};

/**
 * Fullscreen layout for video call
 * No header, no footer - just the video call component
 */
export default function VideoCallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-900">
      {children}
    </div>
  );
}
