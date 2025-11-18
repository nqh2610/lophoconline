/**
 * useFileTransfer - P2P file transfer with chunking
 */

import { useState, useRef, useCallback } from 'react';
import type { FileTransfer, FileMetadata } from '../types';

const CHUNK_SIZE = 65536; // 64KB

export function useFileTransfer() {
  const [incomingFile, setIncomingFile] = useState<FileTransfer | null>(null);
  const [outgoingFile, setOutgoingFile] = useState<FileTransfer | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const pendingFileRef = useRef<File | null>(null);
  const fileHandleRef = useRef<any>(null);

  const setupChannel = useCallback((channel: RTCDataChannel) => {
    channelRef.current = channel;

    channel.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        const msg = JSON.parse(event.data);

        if (msg.type === 'file-offer') {
          setIncomingFile({
            metadata: msg.metadata,
            chunks: [],
            receivedChunks: 0,
            progress: 0,
            status: 'pending',
          });
        } else if (msg.type === 'file-accept') {
          startSending(msg.fileId);
        } else if (msg.type === 'file-reject') {
          setOutgoingFile(null);
        } else if (msg.type === 'file-progress') {
          setIncomingFile((prev) =>
            prev && prev.status === 'transferring' ? { ...prev, progress: msg.progress } : prev
          );
        }
      } else {
        handleChunk(event.data);
      }
    };
  }, []);

  const sendFile = useCallback(async (file: File) => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== 'open') return;

    if (file.size > 100 * 1024 * 1024) {
      const ok = confirm(`File lớn (${(file.size / 1024 / 1024).toFixed(2)} MB). Tiếp tục?`);
      if (!ok) return;
    }

    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const metadata: FileMetadata = {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      totalChunks: Math.ceil(file.size / CHUNK_SIZE),
    };

    channel.send(JSON.stringify({ type: 'file-offer', metadata }));
    setOutgoingFile({
      metadata,
      chunks: [],
      receivedChunks: 0,
      progress: 0,
      status: 'pending',
    });

    pendingFileRef.current = file;
  }, []);

  const acceptFile = useCallback(async () => {
    if (!incomingFile || !channelRef.current) return;

    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: incomingFile.metadata.fileName,
        });
        fileHandleRef.current = handle;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
    }

    setIncomingFile((prev) => (prev ? { ...prev, status: 'transferring', progress: 0 } : null));
    channelRef.current.send(JSON.stringify({ type: 'file-accept', fileId: incomingFile.metadata.fileId }));
  }, [incomingFile]);

  const rejectFile = useCallback(() => {
    if (!incomingFile || !channelRef.current) return;
    channelRef.current.send(JSON.stringify({ type: 'file-reject', fileId: incomingFile.metadata.fileId }));
    setIncomingFile(null);
  }, [incomingFile]);

  const startSending = useCallback(async (fileId: string) => {
    const file = pendingFileRef.current;
    const channel = channelRef.current;
    if (!file || !channel || channel.readyState !== 'open') return;

    setOutgoingFile((prev) => (prev ? { ...prev, status: 'transferring' } : null));
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = await file.slice(start, end).arrayBuffer();

      while (channel.bufferedAmount > CHUNK_SIZE * 4) {
        await new Promise((r) => setTimeout(r, 10));
      }

      channel.send(chunk);

      const progress = Math.round(((i + 1) / totalChunks) * 100);
      setOutgoingFile((prev) => (prev ? { ...prev, progress } : null));

      if (progress % 5 === 0 || progress === 100) {
        await new Promise((r) => setTimeout(r, 10));
        channel.send(JSON.stringify({ type: 'file-progress', progress }));
      }
    }

    setOutgoingFile((prev) => (prev ? { ...prev, status: 'completed' } : null));
    pendingFileRef.current = null;
  }, []);

  const handleChunk = useCallback((arrayBuffer: ArrayBuffer) => {
    setIncomingFile((prev) => {
      if (!prev) return null;

      const chunks = [...prev.chunks, arrayBuffer];
      const receivedChunks = chunks.length;
      const progress = Math.round((receivedChunks / prev.metadata.totalChunks) * 100);

      const updated = { ...prev, chunks, receivedChunks, progress };

      if (receivedChunks === prev.metadata.totalChunks) {
        updated.status = 'completed';
        downloadFile(updated);
      }

      return updated;
    });
  }, []);

  const downloadFile = useCallback(async (transfer: FileTransfer) => {
    const blob = new Blob(transfer.chunks, { type: transfer.metadata.fileType });

    try {
      if (fileHandleRef.current) {
        const writable = await fileHandleRef.current.createWritable();
        await writable.write(blob);
        await writable.close();
        console.log('[useFileTransfer] Saved to chosen location');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = transfer.metadata.fileName;
        a.click();
        URL.revokeObjectURL(url);
        console.log('[useFileTransfer] Downloaded to default folder');
      }
    } catch (err) {
      console.error('[useFileTransfer] Save failed:', err);
    }

    fileHandleRef.current = null;
  }, []);

  return {
    incomingFile,
    outgoingFile,
    sendFile,
    acceptFile,
    rejectFile,
    setupChannel,
  };
}
