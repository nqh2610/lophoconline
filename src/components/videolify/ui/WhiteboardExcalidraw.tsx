'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  X, Download, Trash2, GripVertical,
  Lock, Unlock, Hand, Eye, Pencil
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// Dynamic import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw');
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải bảng trắng...</p>
        </div>
      </div>
    ),
  }
);

interface WhiteboardExcalidrawProps {
  show: boolean;
  onClose: () => void;
  excalidrawAPI: any;
  onAPIReady: (api: any) => void;
  onChange: (elements: any, appState: any) => void;
  role?: 'teacher' | 'student'; // Role-based permissions
  userName?: string;
  onSendControl?: (type: string, data: any) => void; // Send control messages
  drawPermissionGranted?: boolean; // For students: whether teacher allowed drawing
  studentRequestingDraw?: boolean; // For teacher: whether student is requesting permission
  onPermissionChange?: (allowed: boolean) => void; // For teacher: grant/deny permission
}

export function WhiteboardExcalidraw({
  show,
  onClose,
  excalidrawAPI,
  onAPIReady,
  onChange,
  role = 'student',
  userName = 'User',
  onSendControl,
  drawPermissionGranted = false,
  studentRequestingDraw = false,
  onPermissionChange,
}: WhiteboardExcalidrawProps) {
  const [cssLoaded, setCssLoaded] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isLocked, setIsLocked] = useState(true); // ✅ DEFAULT: Always start locked (students can only view)
  const [requestingDrawPermission, setRequestingDrawPermission] = useState(false);

  const { toast } = useToast();

  // Load Excalidraw CSS dynamically
  useEffect(() => {
    if (typeof window !== 'undefined' && !cssLoaded) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/excalidraw.css';
      link.onload = () => {
        console.log('[WhiteboardExcalidraw] CSS loaded successfully');
        setCssLoaded(true);
      };
      link.onerror = () => {
        console.warn('[WhiteboardExcalidraw] CSS load failed, proceeding anyway');
        setCssLoaded(true);
      };
      document.head.appendChild(link);
    }
  }, [cssLoaded]);

  // Reset state when panel closes
  useEffect(() => {
    if (!show) {
      if (role === 'student') {
        setIsLocked(true);
        setRequestingDrawPermission(false);
      }
    }
  }, [show, role]);

  // Update lock state when teacher grants/revokes permission
  useEffect(() => {
    if (role === 'student' && show) {
      setIsLocked(!drawPermissionGranted);
      if (drawPermissionGranted && requestingDrawPermission) {
        setRequestingDrawPermission(false);
        toast({
          title: '✅ Được phép vẽ',
          description: 'Giáo viên đã cho phép bạn vẽ trên bảng',
        });
      } else if (!drawPermissionGranted && !isLocked) {
        toast({
          title: '🔒 Bị khóa',
          description: 'Giáo viên đã thu hồi quyền vẽ',
          variant: 'destructive',
        });
      }
    }
  }, [drawPermissionGranted, role, show, requestingDrawPermission, toast]);

  const handleDownload = useCallback(() => {
    if (!excalidrawAPI) return;

    excalidrawAPI.exportToBlob({
      mimeType: 'image/png',
      quality: 1,
    }).then((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whiteboard-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: '✅ Đã tải xuống',
        description: 'Bảng trắng đã được lưu thành công',
      });
    }).catch((error: any) => {
      console.error('[WhiteboardExcalidraw] Export error:', error);
      toast({
        title: '❌ Lỗi xuất file',
        description: 'Không thể tải xuống bảng trắng',
        variant: 'destructive',
      });
    });
  }, [excalidrawAPI, toast]);

  const handleClearCanvas = useCallback(() => {
    if (!excalidrawAPI) return;

    excalidrawAPI.updateScene({
      elements: [],
    });

    setShowClearDialog(false);
    toast({
      title: '🗑️ Đã xóa bảng',
      description: 'Toàn bộ nội dung đã được xóa',
    });
  }, [excalidrawAPI, toast]);

  const handleRequestDrawPermission = useCallback(() => {
    setRequestingDrawPermission(true);
    toast({
      title: '✋ Đã gửi yêu cầu',
      description: 'Chờ giáo viên cho phép bạn vẽ',
    });

    // Send request to teacher via control channel
    if (onSendControl) {
      onSendControl('whiteboard-draw-request', { userName });
    }
  }, [toast, onSendControl, userName]);

  const toggleLock = useCallback(() => {
    if (role === 'teacher') {
      const newLockState = !isLocked;
      setIsLocked(newLockState);

      // Use the new callback if provided, otherwise fallback to old method
      if (onPermissionChange) {
        onPermissionChange(!newLockState);
      } else if (onSendControl) {
        onSendControl('whiteboard-permission', { allowed: !newLockState });
      }

      toast({
        title: newLockState ? '🔒 Đã khóa' : '🔓 Đã mở khóa',
        description: newLockState
          ? 'Học sinh chỉ có thể xem'
          : 'Học sinh có thể vẽ trên bảng',
      });
    }
  }, [role, isLocked, toast, onSendControl, onPermissionChange]);

  if (!show) return null;

  const isTeacher = role === 'teacher';
  const canDraw = isTeacher || !isLocked;

  // Permissions
  const permissions = {
    canDraw,
    canErase: canDraw,
    canClear: isTeacher,
    canExport: isTeacher,
    canLock: isTeacher,
    viewOnly: !canDraw,
  };

  const WhiteboardContent = (
    <Card
      id="excalidraw-container"
      className="flex flex-col shadow-2xl overflow-hidden w-full h-full"
    >
      {/* ✅ COMPACT HEADER - All-in-one with inline status */}
      <div className="whiteboard-header border-b bg-white">
        {/* Main header row - compact */}
        <div className="px-2 py-1.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold">🎨 Bảng trắng</span>

            {/* Inline compact status badge - right in header */}
            {!isTeacher && (
              <div className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                canDraw
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {canDraw ? (
                  <>
                    <Pencil className="w-3 h-3" />
                    <span>Có thể vẽ</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    <span>Chỉ xem</span>
                  </>
                )}
              </div>
            )}

            {isTeacher && (
              <div className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                isLocked
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {isLocked ? (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>HS chỉ xem</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3" />
                    <span>HS vẽ được</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-1">
            {/* Student: Request permission button - compact */}
            {!isTeacher && isLocked && (
              <Button
                variant={requestingDrawPermission ? 'outline' : 'default'}
                size="sm"
                onClick={handleRequestDrawPermission}
                disabled={requestingDrawPermission}
                className="flex items-center gap-1.5 px-2.5 h-7"
              >
                {requestingDrawPermission ? (
                  <>
                    <div className="w-3 h-3 border-2 border-t-transparent border-orange-600 rounded-full animate-spin"></div>
                    <span className="text-xs">Chờ...</span>
                  </>
                ) : (
                  <>
                    <Hand className="w-3.5 h-3.5" />
                    <span className="text-xs">Xin vẽ</span>
                  </>
                )}
              </Button>
            )}

            {/* Teacher: Lock/Unlock - compact */}
            {isTeacher && (
              <Button
                variant={isLocked ? 'outline' : 'default'}
                size="sm"
                onClick={toggleLock}
                className="flex items-center gap-1 px-2 h-7"
                title={isLocked ? 'Cho học sinh vẽ' : 'Khóa bảng (chỉ giáo viên)'}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </Button>
            )}

            {/* Teacher: Clear canvas */}
            {permissions.canClear && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearDialog(true)}
                title="Xóa toàn bộ bảng"
                className="h-7 w-7 p-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* Download */}
            {permissions.canExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                title="Tải xuống PNG"
                className="h-7 w-7 p-0"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* Close */}
            {isTeacher && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                title="Đóng"
                className="h-7 w-7 p-0"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* ✅ URGENT REQUEST BAR - Only when student requests (teacher view) - compact */}
        {isTeacher && studentRequestingDraw && isLocked && (
          <div className="px-3 py-1.5 bg-yellow-50 border-t border-yellow-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hand className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-900">Học sinh xin vẽ</span>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setIsLocked(false);
                  onPermissionChange?.(true);
                  toast({
                    title: '✅ Đã cho phép',
                    description: 'Học sinh có thể vẽ trên bảng',
                  });
                }}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1 px-2.5 h-6"
              >
                <Unlock className="w-3 h-3" />
                <span className="text-xs">Cho phép</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onPermissionChange?.(false);
                  toast({
                    title: '❌ Đã từ chối',
                    description: 'Học sinh vẫn chỉ có thể xem',
                    variant: 'destructive',
                  });
                }}
                className="flex items-center gap-1 px-2.5 h-6"
              >
                <X className="w-3 h-3" />
                <span className="text-xs">Từ chối</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Excalidraw Canvas */}
      <div className={`flex-1 overflow-hidden relative ${permissions.viewOnly ? 'student-view-only' : ''}`}>
        {/* ✅ Overlay to block all interactions when view-only */}
        {permissions.viewOnly && (
          <div
            className="absolute inset-0 z-50 cursor-not-allowed"
            style={{
              pointerEvents: 'all',
              background: 'transparent',
            }}
            onWheel={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          />
        )}

        <Excalidraw
          excalidrawAPI={(api) => {
            if (api) {
              console.log('[WhiteboardExcalidraw] Excalidraw API ready');
              onAPIReady(api);
            }
          }}
          onChange={(elements, appState) => {
            // ✅ ALWAYS call onChange to allow receiving updates from teacher
            // The hook itself will decide whether to send (teacher) or just receive (student)
            onChange(elements, appState);
          }}
          initialData={{
            elements: [],
            appState: {
              viewBackgroundColor: '#ffffff',
              currentItemStrokeColor: '#000000',
              currentItemBackgroundColor: 'transparent',
              currentItemFillStyle: 'solid',
              currentItemStrokeWidth: 1,
              currentItemRoughness: 0,
              currentItemOpacity: 100,
              currentItemFontFamily: 1,
              currentItemFontSize: 20,
              currentItemTextAlign: 'left',
              currentItemStrokeStyle: 'solid',
              currentItemRoundness: 'round',
              activeTool: { type: 'freedraw' },
            },
          }}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: permissions.canDraw,
              clearCanvas: permissions.canClear,
              export: false,
              loadScene: false,
              saveToActiveFile: false,
              toggleTheme: false,
            },
          }}
          // ✅ CRITICAL: viewModeEnabled=false to allow programmatic viewport updates
          // We hide UI tools for students using CSS instead
          viewModeEnabled={false}
          zenModeEnabled={false}
          gridModeEnabled={false}
          langCode="vi-VN"
        />

        {/* ✅ CSS to hide Excalidraw sidebar for students */}
        {permissions.viewOnly && (
          <style>{`
            .student-view-only .excalidraw .App-menu,
            .student-view-only .excalidraw .layer-ui__wrapper__top-right,
            .student-view-only .excalidraw .layer-ui__wrapper__footer-left,
            .student-view-only .excalidraw .layer-ui__wrapper__footer-right,
            .student-view-only .excalidraw .excalidraw-textEditorContainer,
            .student-view-only .excalidraw .App-toolbar {
              display: none !important;
            }
          `}</style>
        )}
      </div>

      {/* Footer - Status bar - Compact */}
      <div className="px-2 py-1 border-t bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
          <span>Đồng bộ</span>
        </div>
        <span className="text-[10px] text-gray-400">Excalidraw</span>
      </div>
    </Card>
  );

  // ✅ SIMPLE SOLUTION: Always fullscreen for both teacher and student
  // This ensures 100% viewport sync without dealing with window position sync
  return (
    <>
      <div className="fixed inset-0 z-50 bg-white">
        {WhiteboardContent}
      </div>

      {/* Clear Canvas Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa toàn bộ bảng trắng?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa toàn bộ nội dung trên bảng trắng và không thể hoàn tác.
              Bạn có chắc chắn muốn tiếp tục?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCanvas}>
              Xóa toàn bộ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
