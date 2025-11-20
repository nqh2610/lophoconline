'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  X, Download, Maximize2, Minimize2, Trash2, GripVertical,
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
}

export function WhiteboardExcalidraw({
  show,
  onClose,
  excalidrawAPI,
  onAPIReady,
  onChange,
  role = 'student',
  userName = 'User',
}: WhiteboardExcalidrawProps) {
  const [cssLoaded, setCssLoaded] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isLocked, setIsLocked] = useState(role === 'student'); // Students start locked
  const [requestingDrawPermission, setRequestingDrawPermission] = useState(false);
  const [size, setSize] = useState({ width: 800, height: 500 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

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
      setIsFullscreen(false);
      if (role === 'student') {
        setIsLocked(true);
      }
    }
  }, [show, role]);

  // Initialize position (center on screen on first open)
  useEffect(() => {
    if (show && position.x === 0 && position.y === 0) {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      setPosition({
        x: Math.max(16, (screenWidth - size.width) / 2),
        y: Math.max(16, (screenHeight - size.height) / 2 - 50),
      });
    }
  }, [show]);

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

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      container.requestFullscreen?.().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('[WhiteboardExcalidraw] Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('[WhiteboardExcalidraw] Exit fullscreen error:', err);
      });
    }
  }, [isFullscreen]);

  const handleRequestDrawPermission = useCallback(() => {
    setRequestingDrawPermission(true);
    toast({
      title: '✋ Đã gửi yêu cầu',
      description: 'Chờ giáo viên cho phép bạn vẽ',
    });

    // In real implementation, send message to teacher via control channel
    // For now, auto-unlock after 2 seconds (demo)
    setTimeout(() => {
      setIsLocked(false);
      setRequestingDrawPermission(false);
      toast({
        title: '✅ Được phép vẽ',
        description: 'Bạn có thể vẽ trên bảng trắng',
      });
    }, 2000);
  }, [toast]);

  const toggleLock = useCallback(() => {
    if (role === 'teacher') {
      setIsLocked(!isLocked);
      toast({
        title: isLocked ? '🔓 Đã mở khóa' : '🔒 Đã khóa',
        description: isLocked
          ? 'Học sinh có thể vẽ trên bảng'
          : 'Chỉ giáo viên có thể vẽ',
      });
    }
  }, [role, isLocked, toast]);

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
      ref={containerRef}
      id="excalidraw-container"
      className="flex flex-col shadow-2xl overflow-hidden"
      style={{
        width: isFullscreen ? '100vw' : size.width,
        height: isFullscreen ? '100vh' : size.height,
      }}
    >
      {/* Header - Draggable handle */}
      <div
        className="whiteboard-header p-2 border-b font-semibold flex justify-between items-center bg-white cursor-move select-none"
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <span className="text-sm">🎨 Bảng trắng</span>

          {/* Role badge */}
          <Badge variant={isTeacher ? 'default' : 'secondary'} className="text-xs">
            {isTeacher ? '👨‍🏫 Giáo viên' : '👨‍🎓 Học sinh'}
          </Badge>

          {/* Lock status */}
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

          {/* Fullscreen */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>

          {/* Close */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Excalidraw Canvas */}
      <div className="flex-1 overflow-hidden">
        <Excalidraw
          excalidrawAPI={(api) => {
            if (api) {
              console.log('[WhiteboardExcalidraw] Excalidraw API ready');
              onAPIReady(api);
            }
          }}
          onChange={(elements, appState) => {
            // Only sync if user has permission and there are changes
            if (canDraw && (elements.length > 0 || appState)) {
              onChange(elements, appState);
            }
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
          viewModeEnabled={permissions.viewOnly}
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

  // Wrap with Draggable and ResizableBox
  return (
    <>
      {!isFullscreen ? (
        <Draggable
          handle=".whiteboard-header"
          bounds="parent"
          position={position}
          onStop={(e, data) => setPosition({ x: data.x, y: data.y })}
        >
          <div className="absolute z-50" style={{ left: 0, top: 0 }}>
            <ResizableBox
              width={size.width}
              height={size.height}
              minConstraints={[400, 300]}
              maxConstraints={[window.innerWidth - 32, window.innerHeight - 100]}
              onResize={(e, data) => {
                setSize({ width: data.size.width, height: data.size.height });
              }}
              resizeHandles={['se', 'sw', 'ne', 'nw', 's', 'e', 'w', 'n']}
              className="react-resizable-custom"
            >
              {WhiteboardContent}
            </ResizableBox>
          </div>
        </Draggable>
      ) : (
        <div className="fixed inset-0 z-50">
          {WhiteboardContent}
        </div>
      )}

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
