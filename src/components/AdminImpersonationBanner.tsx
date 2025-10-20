"use client";

import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";
import { useEffect, useState } from "react";

export function AdminImpersonationBanner() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);
  const impersonateUserId = searchParams.get("_impersonate");
  const impersonateRole = searchParams.get("_role");

  useEffect(() => {
    setShow(!!impersonateUserId && !!impersonateRole);
  }, [impersonateUserId, impersonateRole]);

  if (!show) return null;

  const handleClose = () => {
    // Remove query params and reload
    const url = new URL(window.location.href);
    url.searchParams.delete("_impersonate");
    url.searchParams.delete("_role");
    window.location.href = url.toString();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 border-b-2 border-yellow-600">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-yellow-900" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="font-bold text-yellow-900 text-sm">
                CHẾ ĐỘ ADMIN - XEM VỚI QUYỀN {impersonateRole?.toUpperCase()}
              </span>
              <span className="text-xs text-yellow-800">
                User ID: {impersonateUserId}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClose}
            className="text-yellow-900 hover:bg-yellow-600 hover:text-white"
          >
            <X className="h-4 w-4 mr-1" />
            Thoát
          </Button>
        </div>
      </div>
    </div>
  );
}
