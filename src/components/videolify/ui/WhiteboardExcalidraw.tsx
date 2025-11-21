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
}: WhiteboardExcalidrawProps) {
  const [cssLoaded, setCssLoaded] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isLocked, setIsLocked] = useState(role === 'student'); // Students start locked
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

      // Send lock state change to student
      if (onSendControl) {
        onSendControl('whiteboard-permission', { allowed: !newLockState });
      }

      toast({
        title: newLockState ? '🔒 Đã khóa' : '🔓 Đã mở khóa',
        description: newLockState
          ? 'Chỉ giáo viên có thể vẽ'
          : 'Học sinh có thể vẽ trên bảng',
      });
    }
  }, [role, isLocked, toast, onSendControl]);

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
      {/* Header - Draggable handle */}
      <div
        className="whiteboard-header p-2 border-b font-semibold flex justify-between items-center bg-white cursor-move select-none"
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <span className="text-sm">🎨 Bảng trắng</span>

          {/* Lock status badge - only show for students */}
          {!isTeacher && (
            <Badge variant={canDraw ? 'default' : 'outline'} className="text-xs">
              {canDraw ? <><Pencil className="w-3 h-3 mr-1" /> Có thể vẽ</> : <><Eye className="w-3 h-3 mr-1" /> Chỉ xem</>}
            </Badge>
          )}
        </div>

        <div className="flex gap-1">
          {/* Student: Request draw permission */}
          {!isTeacher && isLocked && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestDrawPermission}
              disabled={requestingDrawPermission}
              title="Xin phép vẽ"
            >
              <Hand className="w-4 h-4" />
            </Button>
          )}

          {/* Teacher: Lock/Unlock for students */}
          {isTeacher && (
            <Button
              variant={isLocked ? 'outline' : 'default'}
              size="sm"
              onClick={toggleLock}
              title={isLocked ? 'Cho học sinh vẽ' : 'Khóa bảng (chỉ giáo viên)'}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </Button>
          )}

          {/* Teacher: Clear canvas */}
          {permissions.canClear && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              title="Xóa toàn bộ bảng"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}

          {/* Download */}
          {permissions.canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              title="Tải xuống PNG"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}

          {/* Close - Always show close button */}
          {isTeacher && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Excalidraw Canvas */}
      <div
        className="flex-1 overflow-hidden relative"
        onWheelCapture={permissions.viewOnly ? (e) => {
          // ✅ CRITICAL: Block scroll/zoom for students
          e.stopPropagation();
          e.preventDefault();
        } : undefined}
      >
        {/* ✅ Overlay to block all interactions when view-only */}
        {permissions.viewOnly && (
          <div
            className="absolute inset-0 z-50 cursor-not-allowed bg-transparent"
            style={{ pointerEvents: 'all' }}
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
          // ✅ CRITICAL FIX: Do NOT use viewModeEnabled - it blocks programmatic viewport updates!
          // Instead, we use the transparent overlay to block user interactions
          viewModeEnabled={false}
          zenModeEnabled={false}
          gridModeEnabled={false}
          langCode="vi-VN"
        />
      </div>

      {/* Footer - Status bar */}
      <div className="px-3 py-1.5 border-t bg-gray-50 text-xs text-gray-600 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Đang đồng bộ
          </span>
          {permissions.viewOnly && (
            <span className="text-orange-600 font-medium">● Chế độ chỉ xem</span>
          )}
        </div>
        <span className="text-blue-600 font-medium">Excalidraw</span>
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
