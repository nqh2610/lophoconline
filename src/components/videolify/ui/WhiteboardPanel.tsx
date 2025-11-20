'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Eraser } from 'lucide-react';

interface WhiteboardPanelProps {
  show: boolean;
  onClose: () => void;
  onClearCanvas: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  currentColor: string;
  onColorChange: (color: string) => void;
}

export function WhiteboardPanel({
  show,
  onClose,
  onClearCanvas,
  canvasRef,
  currentColor,
  onColorChange,
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
      <div className="px-4 py-2 border-b flex items-center gap-2">
        <span className="text-sm">Màu:</span>
        {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className={`w-6 h-6 rounded-full border-2 ${currentColor === c ? 'border-blue-500' : 'border-gray-300'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex-1 p-4">
        <canvas ref={canvasRef} className="border border-gray-300 w-full h-full" />
      </div>
    </Card>
  );
}
