'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileText, Minimize2, Maximize2, X, CheckCircle, XCircle } from 'lucide-react';

interface FileMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  fileId: string;
}

interface FileTransfer {
  metadata: FileMetadata;
  progress: number;
  status: 'pending' | 'transferring' | 'completed' | 'rejected' | 'error';
}

interface FileTransferPanelProps {
  show: boolean;
  incomingFile: FileTransfer | null;
  outgoingFile: FileTransfer | null;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onAcceptFile: () => void;
  onRejectFile: () => void;
  onCancelTransfer: () => void;
  onClose: () => void;
}

export function FileTransferPanel({
  show,
  incomingFile,
  outgoingFile,
  isMinimized,
  onToggleMinimize,
  onAcceptFile,
  onRejectFile,
  onCancelTransfer,
  onClose,
}: FileTransferPanelProps) {
  if (!show || (!incomingFile && !outgoingFile)) return null;

  const currentTransfer = incomingFile || outgoingFile;
  const isIncoming = !!incomingFile;

  return (
    <Card
      className={`absolute ${
        isMinimized ? 'bottom-20 right-4 w-60' : 'bottom-24 left-1/2 -translate-x-1/2 w-96'
      } transition-all`}
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span className="font-semibold text-sm">File Transfer</span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onToggleMinimize}>
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && currentTransfer && (
          <div className="space-y-3">
            <div className="text-sm">
              <div className="font-medium truncate">{currentTransfer.metadata.fileName}</div>
              <div className="text-gray-500">
                {(currentTransfer.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>

            {currentTransfer.status === 'pending' && isIncoming && (
              <div className="flex gap-2">
                <Button onClick={onAcceptFile} size="sm" className="flex-1">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Chấp nhận
                </Button>
                <Button onClick={onRejectFile} variant="destructive" size="sm" className="flex-1">
                  <XCircle className="w-4 h-4 mr-1" />
                  Từ chối
                </Button>
              </div>
            )}

            {currentTransfer.status === 'transferring' && (
              <>
                <Progress value={currentTransfer.progress} />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{currentTransfer.progress}%</span>
                  <Button variant="ghost" size="sm" onClick={onCancelTransfer}>
                    Hủy
                  </Button>
                </div>
              </>
            )}

            {currentTransfer.status === 'completed' && (
              <div className="text-green-600 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {isIncoming ? 'Đã tải xuống' : 'Đã gửi'}
              </div>
            )}

            {currentTransfer.status === 'rejected' && (
              <div className="text-red-600 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                File bị từ chối
              </div>
            )}

            {currentTransfer.status === 'error' && (
              <div className="text-red-600 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Lỗi khi truyền file
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
