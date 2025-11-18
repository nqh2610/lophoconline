/**
 * useWhiteboard - Fabric.js canvas + P2P sync
 */

import { useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import type { DrawEvent } from '../types';

export function useWhiteboard(roomId: string) {
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const queueRef = useRef<string[]>([]);

  const initialize = useCallback((canvasElement: HTMLCanvasElement) => {
    if (canvasRef.current) return;

    const parentWidth = canvasElement.parentElement?.clientWidth || 1280;
    const parentHeight = canvasElement.parentElement?.clientHeight || 720;

    const canvas = new fabric.Canvas(canvasElement, {
      width: parentWidth,
      height: parentHeight,
      isDrawingMode: true,
      selection: false,
    });

    canvas.freeDrawingBrush.width = 3;
    canvas.freeDrawingBrush.color = '#000000';

    // Load saved state
    const saved = localStorage.getItem(`whiteboard-${roomId}`);
    if (saved) {
      canvas.loadFromJSON(saved, () => canvas.renderAll());
    }

    canvas.on('path:created', (e: any) => {
      const path = e.path;
      path.set({
        id: `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        selectable: false,
        evented: false,
      });

      sendEvent({ type: 'draw', data: path.toJSON(['id']) });
      saveState(canvas);
    });

    canvas.on('object:removed', (e: any) => {
      if (e.target?.id) {
        sendEvent({ type: 'erase', objectId: e.target.id });
        saveState(canvas);
      }
    });

    canvasRef.current = canvas;
  }, [roomId]);

  const sendEvent = useCallback((event: DrawEvent) => {
    const data = JSON.stringify(event);
    const channel = channelRef.current;

    if (!channel || channel.readyState !== 'open') {
      if (queueRef.current.length < 100) {
        queueRef.current.push(data);
      }
      return;
    }

    try {
      channel.send(data);
    } catch (e) {
      queueRef.current.push(data);
    }
  }, []);

  const applyEvent = useCallback((event: DrawEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (event.type === 'draw' && event.data) {
      fabric.util.enlivenObjects([event.data], (objects: fabric.Object[]) => {
        objects.forEach((obj: any) => {
          obj.set({ selectable: false, evented: false });
          canvas.add(obj);
        });
        canvas.renderAll();
      }, '');
    } else if (event.type === 'erase' && event.objectId) {
      const obj = canvas.getObjects().find((o: any) => o.id === event.objectId);
      if (obj) {
        canvas.remove(obj);
        canvas.renderAll();
      }
    } else if (event.type === 'clear') {
      canvas.clear();
    }
  }, []);

  const setupChannel = useCallback((channel: RTCDataChannel) => {
    channelRef.current = channel;

    channel.onmessage = (e) => {
      const event = JSON.parse(e.data) as DrawEvent;
      applyEvent(event);
    };

    channel.onopen = () => {
      // Drain queue
      while (queueRef.current.length > 0) {
        const msg = queueRef.current.shift();
        if (msg) channel.send(msg);
      }
    };
  }, [applyEvent]);

  const saveState = useCallback((canvas: fabric.Canvas) => {
    setTimeout(() => {
      const json = JSON.stringify(canvas.toJSON(['id']));
      localStorage.setItem(`whiteboard-${roomId}`, json);
    }, 1000);
  }, [roomId]);

  const clearCanvas = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.clear();
      sendEvent({ type: 'clear' });
      localStorage.removeItem(`whiteboard-${roomId}`);
    }
  }, [roomId, sendEvent]);

  const setDrawingMode = useCallback((enabled: boolean) => {
    if (canvasRef.current) {
      canvasRef.current.isDrawingMode = enabled;
    }
  }, []);

  return {
    initialize,
    setupChannel,
    clearCanvas,
    setDrawingMode,
    canvas: canvasRef.current,
  };
}
