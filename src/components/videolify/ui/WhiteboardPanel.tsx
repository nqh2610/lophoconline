'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Eraser } from 'lucide-react';

interface WhiteboardPanelProps {
  show: boolean;
  onClose: () => void;
  onClearCanvas: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function WhiteboardPanel({
  show,
  onClose,
  onClearCanvas,
  canvasRef,
}: WhiteboardPanelProps) {
  if (!show) return null;

  return (
    <Card className="absolute left-4 top-4 bottom-24 w-96 flex flex-col">
      <div className="p-4 border-b font-semibold flex justify-between">
        <span>Bảng trắng</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClearCanvas}>
            <Eraser className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 p-4">
        <canvas ref={canvasRef} className="border border-gray-300 w-full h-full" />
      </div>
    </Card>
  );
}
