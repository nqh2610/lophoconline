/**
 * useFileTransfer - P2P file transfer with chunking
 */

import { useState, useRef, useCallback } from 'react';
import type { FileTransfer, FileMetadata } from '../types';

// Mirror V1 chunking behavior
const CHUNK_SIZE = 64 * 1024; // 64KB

export function useFileTransfer() {
  const [incomingFile, setIncomingFile] = useState<FileTransfer | null>(null);
  const [outgoingFile, setOutgoingFile] = useState<FileTransfer | null>(null);

  const channelRef = useRef<RTCDataChannel | null>(null);
  const pendingFileRef = useRef<File | null>(null);
  const fileHandleRef = useRef<any>(null);

  // Queue send if channel not open yet
  const pendingOfferRef = useRef<FileMetadata | null>(null);

  const setupChannel = useCallback((channel: RTCDataChannel) => {
    channelRef.current = channel;

    try {
      // Prefer ArrayBuffer for binary messages
      (channel as any).binaryType = 'arraybuffer';
    } catch (e) {
      // ignore if not supported
    }

    channel.onopen = () => {
      console.log('[useFileTransfer] File channel OPEN');
      // If we queued an offer because channel wasn't open, send it now
      if (pendingOfferRef.current && channelRef.current && channelRef.current.readyState === 'open') {
        channelRef.current.send(JSON.stringify({ type: 'file-offer', metadata: pendingOfferRef.current }));
        pendingOfferRef.current = null;
      }
    };

    channel.onclose = () => {
      console.log('[useFileTransfer] File channel CLOSED');
    };

    channel.onerror = (err) => {
      console.error('[useFileTransfer] File channel ERROR:', err);
    };

    channel.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch (e) {
          console.warn('[useFileTransfer] Invalid JSON on file channel:', event.data);
          return;
        }

        if (msg.type === 'file-offer') {
          setIncomingFile({ metadata: msg.metadata, chunks: [], receivedChunks: 0, progress: 0, status: 'pending' });
        } else if (msg.type === 'file-accept') {
          // remote accepted, start sending
          startSending(msg.fileId);
        } else if (msg.type === 'file-reject') {
          setOutgoingFile(null);
        } else if (msg.type === 'file-progress') {
          setIncomingFile((prev) => prev && prev.status === 'transferring' ? { ...prev, progress: msg.progress } : prev);
        }
      } else {
        // binary chunk
        handleChunk(event.data as ArrayBuffer);
      }
    };
  }, []);

  const sendFile = useCallback(async (file: File) => {
    const channel = channelRef.current;
    if (!channel) {
      alert('Kênh file chưa được thiết lập. Vui lòng thử lại.');
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      if (!confirm(`File rất lớn (${(file.size / 1024 / 1024).toFixed(2)} MB). Tiếp tục?`)) return;
    }

    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const metadata: FileMetadata = {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      totalChunks: Math.ceil(file.size / CHUNK_SIZE),
    };

    // send offer (or queue if channel not open)
    if (channel.readyState === 'open') {
      channel.send(JSON.stringify({ type: 'file-offer', metadata }));
    } else {
      pendingOfferRef.current = metadata;
    }

    setOutgoingFile({ metadata, chunks: [], receivedChunks: 0, progress: 0, status: 'pending' });
    pendingFileRef.current = file;
  }, []);

  const acceptFile = useCallback(async () => {
    const channel = channelRef.current;
    if (!incomingFile || !channel) return;

    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({ suggestedName: incomingFile.metadata.fileName });
        fileHandleRef.current = handle;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('[useFileTransfer] User cancelled save picker');
        return;
      }
    }

    setIncomingFile((prev) => (prev ? { ...prev, status: 'transferring', progress: 0 } : null));
    try {
      channel.send(JSON.stringify({ type: 'file-accept', fileId: incomingFile.metadata.fileId }));
    } catch (err) {
      console.error('[useFileTransfer] Failed to send file-accept:', err);
    }
  }, [incomingFile]);

  const rejectFile = useCallback(() => {
    const channel = channelRef.current;
    if (!incomingFile || !channel) return;
    try {
      channel.send(JSON.stringify({ type: 'file-reject', fileId: incomingFile.metadata.fileId }));
    } catch (err) {
      console.warn('[useFileTransfer] Failed to send file-reject:', err);
    }
    setIncomingFile(null);
  }, [incomingFile]);

  const startSending = useCallback(async (fileId: string) => {
    const file = pendingFileRef.current;
    const channel = channelRef.current;
    if (!file || !channel) {
      console.error('[useFileTransfer] startSending called but no file or channel');
      setOutgoingFile((prev) => (prev ? { ...prev, status: 'error' } : null));
      return;
    }

    if (channel.readyState !== 'open') {
      console.error('[useFileTransfer] Channel not open for sending');
      setOutgoingFile((prev) => (prev ? { ...prev, status: 'error' } : null));
      return;
    }

    setOutgoingFile((prev) => (prev ? { ...prev, status: 'transferring', progress: 0 } : null));

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const startTime = performance.now();

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = await file.slice(start, end).arrayBuffer();

        // backpressure control
        while (channel.bufferedAmount > CHUNK_SIZE * 4) {
          await new Promise((r) => setTimeout(r, 10));
        }

        channel.send(chunk);

        const progress = Math.round(((i + 1) / totalChunks) * 100);
        setOutgoingFile((prev) => (prev ? { ...prev, progress } : null));

        const shouldSendProgress = (progress % 5 === 0 && progress > 0 && progress < 95) || (progress >= 95) || progress === 100;
        if (shouldSendProgress) {
          // small delay so chunk is processed first
          await new Promise((r) => setTimeout(r, 10));
          channel.send(JSON.stringify({ type: 'file-progress', progress }));
        }
      }

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      const speed = (file.size / 1024 / 1024) / duration;
      console.log(`[useFileTransfer] File sent in ${duration.toFixed(2)}s @ ${speed.toFixed(2)} MB/s`);

      setOutgoingFile((prev) => (prev ? { ...prev, status: 'completed', progress: 100 } : null));
      pendingFileRef.current = null;
    } catch (err) {
      console.error('[useFileTransfer] Error sending file:', err);
      setOutgoingFile((prev) => (prev ? { ...prev, status: 'error' } : null));
    }
  }, []);

  const handleChunk = useCallback((data: ArrayBuffer) => {
    setIncomingFile((prev) => {
      if (!prev) return null;

      const chunks = [...prev.chunks, data];
      const receivedChunks = chunks.length;
      const progress = Math.round((receivedChunks / prev.metadata.totalChunks) * 100);

      const updated: FileTransfer = { ...prev, chunks, receivedChunks, progress };

      if (receivedChunks === prev.metadata.totalChunks) {
        updated.status = 'completed';
        // download
        downloadFile(updated);
      }

      return updated;
    });
  }, []);

  const downloadFile = useCallback(async (transfer: FileTransfer) => {
    const blob = new Blob(transfer.chunks, { type: transfer.metadata.fileType || 'application/octet-stream' });

    try {
      if (fileHandleRef.current) {
        const writable = await fileHandleRef.current.createWritable();
        await writable.write(blob);
        await writable.close();
        console.log('[useFileTransfer] Saved to user-selected location');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = transfer.metadata.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
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
