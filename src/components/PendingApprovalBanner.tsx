"use client";

import { AlertCircle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Link from "next/link";

interface PendingApprovalBannerProps {
  approvalStatus: string;
  rejectionReason?: string | null;
}

export function PendingApprovalBanner({ approvalStatus, rejectionReason }: PendingApprovalBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if approved or dismissed
  if (approvalStatus === 'approved' || isDismissed) {
    return null;
  }

  // Pending status - yellow banner
  if (approvalStatus === 'pending') {
    return (
      <Alert className="mb-6 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
        <AlertDescription className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
              Hồ sơ của bạn đang chờ duyệt
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Quản trị viên sẽ xem xét và phê duyệt hồ sơ của bạn trong vòng 24-48 giờ.
              Bạn vẫn có thể chỉnh sửa hồ sơ trong thời gian chờ duyệt.
            </p>
            <Link href="/tutor/edit-profile">
              <Button variant="link" className="h-auto p-0 text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 mt-2">
                Chỉnh sửa hồ sơ →
              </Button>
            </Link>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-yellow-600 hover:text-yellow-800 dark:text-yellow-500 dark:hover:text-yellow-300 flex-shrink-0"
            onClick={() => setIsDismissed(true)}
            aria-label="Đóng thông báo"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Rejected status - red banner
  if (approvalStatus === 'rejected') {
    return (
      <Alert className="mb-6 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800">
        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
        <AlertDescription className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-medium text-red-800 dark:text-red-200 mb-1">
              Hồ sơ của bạn đã bị từ chối
            </p>
            <p className="text-sm text-red-700 dark:text-red-300 mb-2">
              {rejectionReason || 'Hồ sơ không đáp ứng yêu cầu của hệ thống.'}
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              Vui lòng cập nhật hồ sơ theo yêu cầu và gửi lại để được xem xét.
            </p>
            <Link href="/tutor/edit-profile">
              <Button variant="link" className="h-auto p-0 text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 mt-2">
                Cập nhật hồ sơ →
              </Button>
            </Link>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-300 flex-shrink-0"
            onClick={() => setIsDismissed(true)}
            aria-label="Đóng thông báo"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
