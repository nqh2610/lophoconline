/**
 * VideolifyFull v2 - Complete refactored version
 * ALL features with optimized code
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSignaling } from './videolify/hooks/useSignaling';
import { useWebRTC } from './videolify/hooks/useWebRTC';
import { useMediaDevices } from './videolify/hooks/useMediaDevices';
import { useChat } from './videolify/hooks/useChat';
import { useWhiteboard } from './videolify/hooks/useWhiteboard';
import { useScreenShare } from './videolify/hooks/useScreenShare';
import { useFileTransfer } from './videolify/hooks/useFileTransfer';
import { useVirtualBackground } from './videolify/hooks/useVirtualBackground';
import { useRecording } from './videolify/hooks/useRecording';
import type { VideolifyFullProps } from './videolify/types';

import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, MonitorOff,
  MessageSquare, Pencil, Hand, Upload, X, Circle, Sparkles, Eye, EyeOff
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';

export function VideolifyFull_v2({
  roomId,
  accessToken,
  userDisplayName,
  role,
  onCallEnd,
}: VideolifyFullProps) {
  const { toast } = useToast();

  const peerIdRef = useRef<string>('');
  if (!peerIdRef.current) {
    const sessionKey = `videolify-peer-${roomId}`;
    const saved = sessionStorage.getItem(sessionKey);
    peerIdRef.current = saved || `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(sessionKey, peerIdRef.current);
  }
  const peerId = peerIdRef.current;

  const [showChat, setShowChat] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showFileTransfer, setShowFileTransfer] = useState(false);
  const [showVbgPanel, setShowVbgPanel] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [handRaised, setHandRaised] = useState(false);
  const [remoteHandRaised, setRemoteHandRaised] = useState(false);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const whiteboardCanvasRef = useRef<HTMLCanvasElement>(null);
  const remotePeerIdRef = useRef<string | null>(null);
  const controlChannelRef = useRef<RTCDataChannel | null>(null);

  const media = useMediaDevices();
  const chat = useChat({ userName: userDisplayName });
  const whiteboard = useWhiteboard(roomId);
  const fileTransfer = useFileTransfer();
  const vbg = useVirtualBackground();
  const recording = useRecording();

  const webrtc = useWebRTC({
    peerId,
    onTrack: (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    },
    onConnectionStateChange: (state) => {
      if (state === 'connected') {
        setIsConnecting(false);
        toast({ title: 'Đã kết nối' });
      } else if (state === 'failed') {
        toast({ title: 'Mất kết nối', variant: 'destructive' });
      }
    },
    onIceCandidate: (candidate) => {
      if (remotePeerIdRef.current) {
        signaling.sendIceCandidate(candidate, remotePeerIdRef.current);
      }
    },
    onDataChannel: (channel) => {
      if (channel.label === 'chat') chat.setupChannel(channel);
      else if (channel.label === 'whiteboard') whiteboard.setupChannel(channel);
      else if (channel.label === 'control') setupControlChannel(channel);
      else if (channel.label === 'file') fileTransfer.setupChannel(channel);
    },
  });

  const screenShare = useScreenShare(webrtc.peerConnection);

  const signaling = useSignaling({
    roomId,
    peerId,
    accessToken,
    userName: userDisplayName,
    role,
    callbacks: {
      onPeerJoined: async (event) => {
        remotePeerIdRef.current = event.peerId;
        webrtc.createPeerConnection();

        if (media.localStream) {
          media.localStream.getTracks().forEach((track) => {
            webrtc.addTrack(track, media.localStream!);
          });
        }

        if (event.shouldInitiate) {
          const chatCh = webrtc.createDataChannel('chat', { ordered: true });
          const whiteboardCh = webrtc.createDataChannel('whiteboard', { ordered: true });
          const controlCh = webrtc.createDataChannel('control', { ordered: true });
          const fileCh = webrtc.createDataChannel('file', { ordered: false });

          if (chatCh) chat.setupChannel(chatCh);
          if (whiteboardCh) whiteboard.setupChannel(whiteboardCh);
          if (controlCh) setupControlChannel(controlCh);
          if (fileCh) fileTransfer.setupChannel(fileCh);

          const offer = await webrtc.createOffer();
          if (offer) await signaling.sendOffer(offer, event.peerId);
        }
      },
      onOffer: async (event) => {
        remotePeerIdRef.current = event.fromPeerId;
        const answer = await webrtc.handleOffer(event.offer, event.fromPeerId);
        if (answer) await signaling.sendAnswer(answer, event.fromPeerId);
      },
      onAnswer: async (event) => {
        await webrtc.handleAnswer(event.answer);
      },
      onIceCandidate: async (event) => {
        await webrtc.addIceCandidate(event.candidate);
      },
      onVbgSettings: async (event) => {
        if (remoteVideoRef.current && media.localStream) {
          await vbg.applyRemoteVirtualBackground(media.localStream, remoteVideoRef.current, event);
        }
      },
      onPeerLeft: () => {
        toast({ title: 'Người khác đã rời phòng', variant: 'destructive' });
        onCallEnd?.();
      },
    },
  });

  const setupControlChannel = useCallback((channel: RTCDataChannel) => {
    controlChannelRef.current = channel;
    channel.onmessage = (e) => {
      const control = JSON.parse(e.data);
      if (control.type === 'hand-raise') setRemoteHandRaised(control.raised);
      else if (control.type === 'video-toggle') setRemoteVideoEnabled(control.enabled);
      else if (control.type === 'audio-toggle') setRemoteAudioEnabled(control.enabled);
    };
  }, []);

  const sendControl = useCallback((type: string, data: any) => {
    if (controlChannelRef.current?.readyState === 'open') {
      controlChannelRef.current.send(JSON.stringify({ type, ...data }));
    }
  }, []);

  useEffect(() => {
    (async () => {
      const stream = await media.requestPermissions();
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      signaling.connect();
      await signaling.joinRoom();
    })();

    return () => {
      signaling.disconnect();
      webrtc.close();
      media.stopStream();
      vbg.destroy();
    };
  }, []);

  useEffect(() => {
    if (showWhiteboard && whiteboardCanvasRef.current && !whiteboard.canvas) {
      whiteboard.initialize(whiteboardCanvasRef.current);
    }
  }, [showWhiteboard]);

  const handleToggleVideo = useCallback(() => {
    media.toggleVideo();
    sendControl('video-toggle', { enabled: !media.isVideoEnabled });
  }, [media, sendControl]);

  const handleToggleAudio = useCallback(() => {
    media.toggleAudio();
    sendControl('audio-toggle', { enabled: !media.isAudioEnabled });
  }, [media, sendControl]);

  const handleToggleScreenShare = useCallback(() => {
    screenShare.toggleSharing();
    sendControl('screen-share-toggle', { isSharing: !screenShare.isSharing });
  }, [screenShare, sendControl]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    chat.sendMessage(chatInput);
    setChatInput('');
  };

  const toggleHandRaise = () => {
    const newState = !handRaised;
    setHandRaised(newState);
    sendControl('hand-raise', { raised: newState });
  };

  const handleFilePick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        fileTransfer.sendFile(file);
        setShowFileTransfer(true);
      }
    };
    input.click();
  };

  const handleVbgBlur = async () => {
    if (localVideoRef.current && media.localStream) {
      await vbg.enableVirtualBackground(media.localStream, localVideoRef.current, 'blur');
      await signaling.sendVbgSettings({ enabled: true, mode: 'blur', blurAmount: vbg.blurAmount, toPeerId: remotePeerIdRef.current! });
    }
  };

  const handleVbgNone = async () => {
    if (localVideoRef.current) {
      vbg.disableVirtualBackground(localVideoRef.current);
      await signaling.sendVbgSettings({ enabled: false, mode: 'none', toPeerId: remotePeerIdRef.current! });
    }
  };

  const handleVbgImage = async (imageUrl: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = imageUrl;
    });

    if (localVideoRef.current && media.localStream) {
      await vbg.enableVirtualBackground(media.localStream, localVideoRef.current, 'image', { backgroundImage: img });
      await signaling.sendVbgSettings({
        enabled: true,
        mode: 'image',
        backgroundImage: imageUrl,
        toPeerId: remotePeerIdRef.current!,
      });
    }
  };

  const endCall = () => {
    signaling.leaveRoom();
    onCallEnd?.();
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <div className="flex-1 relative">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain" />

        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>

        {isConnecting && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-white text-xl">Đang kết nối...</div>
          </div>
        )}

        {remoteHandRaised && (
          <div className="absolute top-4 right-4 bg-yellow-500 text-white p-2 rounded-full">
            <Hand className="w-6 h-6" />
          </div>
        )}

        <div className="absolute top-4 left-4 flex gap-2">
          {!remoteVideoEnabled && (
            <div className="bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <VideoOff className="w-3 h-3" /> Camera tắt
            </div>
          )}
          {!remoteAudioEnabled && (
            <div className="bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <MicOff className="w-3 h-3" /> Mic tắt
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-900 p-4 flex items-center justify-center gap-4">
        <Button variant={media.isVideoEnabled ? 'default' : 'destructive'} size="lg" onClick={handleToggleVideo}>
          {media.isVideoEnabled ? <Video /> : <VideoOff />}
        </Button>

        <Button variant={media.isAudioEnabled ? 'default' : 'destructive'} size="lg" onClick={handleToggleAudio}>
          {media.isAudioEnabled ? <Mic /> : <MicOff />}
        </Button>

        <Button
          variant={screenShare.isSharing ? 'default' : 'secondary'}
          size="lg"
          onClick={handleToggleScreenShare}
        >
          {screenShare.isSharing ? <MonitorOff /> : <Monitor />}
        </Button>

        <Button variant="secondary" size="lg" onClick={() => setShowChat(!showChat)}>
          <MessageSquare />
        </Button>

        <Button variant="secondary" size="lg" onClick={() => setShowWhiteboard(!showWhiteboard)}>
          <Pencil />
        </Button>

        <Button variant="secondary" size="lg" onClick={handleFilePick}>
          <Upload />
        </Button>

        <Button variant={vbg.enabled ? 'default' : 'secondary'} size="lg" onClick={() => setShowVbgPanel(!showVbgPanel)}>
          <Sparkles />
        </Button>

        <Button variant={handRaised ? 'default' : 'secondary'} size="lg" onClick={toggleHandRaise}>
          <Hand />
        </Button>

        <Button
          variant={recording.isRecording ? 'destructive' : 'secondary'}
          size="lg"
          onClick={() => recording.toggleRecording(media.localStream!)}
        >
          <Circle className={recording.isRecording ? 'fill-red-500' : ''} />
        </Button>

        <Button variant="destructive" size="lg" onClick={endCall}>
          <PhoneOff />
        </Button>
      </div>

      {showChat && (
        <Card className="absolute right-4 top-4 bottom-24 w-80 flex flex-col">
          <div className="p-4 border-b font-semibold flex justify-between">
            <span>Chat</span>
            <Button variant="ghost" size="sm" onClick={() => setShowChat(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 p-4">
            {chat.messages.map((msg, i) => (
              <div key={i} className={`mb-2 ${msg.fromMe ? 'text-right' : 'text-left'}`}>
                <div className="text-xs text-gray-500">{msg.userName}</div>
                <div
                  className={`inline-block px-3 py-2 rounded-lg ${
                    msg.fromMe ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            ))}
          </ScrollArea>
          <div className="p-4 border-t flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Nhập tin nhắn..."
            />
            <Button onClick={handleSendChat}>Gửi</Button>
          </div>
        </Card>
      )}

      {showWhiteboard && (
        <Card className="absolute left-4 top-4 bottom-24 w-96 flex flex-col">
          <div className="p-4 border-b font-semibold flex justify-between">
            <span>Bảng trắng</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={whiteboard.clearCanvas}>
                Xóa
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowWhiteboard(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 p-4">
            <canvas ref={whiteboardCanvasRef} className="border border-gray-300 w-full h-full" />
          </div>
        </Card>
      )}

      {showVbgPanel && (
        <Card className="absolute bottom-24 left-4 w-80 p-4">
          <div className="font-semibold mb-4 flex justify-between">
            <span>Nền ảo</span>
            <Button variant="ghost" size="sm" onClick={() => setShowVbgPanel(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={handleVbgNone} className="w-full">
              Tắt
            </Button>
            <Button variant="outline" size="sm" onClick={handleVbgBlur} className="w-full">
              Làm mờ
            </Button>
            {vbg.mode === 'blur' && (
              <div className="p-2">
                <label className="text-sm">Độ mờ: {vbg.blurAmount}</label>
                <Slider
                  value={[vbg.blurAmount]}
                  onValueChange={([v]) =>
                    localVideoRef.current && vbg.updateBlurAmount(v, localVideoRef.current)
                  }
                  min={5}
                  max={20}
                  step={1}
                />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVbgImage('https://images.unsplash.com/photo-1506905925346-21bda4d32df4')}
              className="w-full"
            >
              Ảnh 1
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVbgImage('https://images.unsplash.com/photo-1579546929518-9e396f3cc809')}
              className="w-full"
            >
              Ảnh 2
            </Button>
          </div>
        </Card>
      )}

      {showFileTransfer && (fileTransfer.incomingFile || fileTransfer.outgoingFile) && (
        <Card className="absolute bottom-24 left-1/2 -translate-x-1/2 w-96 p-4">
          {fileTransfer.incomingFile && (
            <div>
              <div className="font-semibold mb-2">File nhận: {fileTransfer.incomingFile.metadata.fileName}</div>
              <div className="text-sm text-gray-500 mb-2">
                {(fileTransfer.incomingFile.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
              </div>
              {fileTransfer.incomingFile.status === 'pending' && (
                <div className="flex gap-2">
                  <Button onClick={fileTransfer.acceptFile} size="sm">
                    Chấp nhận
                  </Button>
                  <Button onClick={fileTransfer.rejectFile} variant="destructive" size="sm">
                    Từ chối
                  </Button>
                </div>
              )}
              {fileTransfer.incomingFile.status === 'transferring' && (
                <div>
                  <Progress value={fileTransfer.incomingFile.progress} className="mb-2" />
                  <div className="text-sm">{fileTransfer.incomingFile.progress}%</div>
                </div>
              )}
              {fileTransfer.incomingFile.status === 'completed' && (
                <div className="text-green-500">✅ Hoàn thành</div>
              )}
            </div>
          )}

          {fileTransfer.outgoingFile && (
            <div>
              <div className="font-semibold mb-2">Đang gửi: {fileTransfer.outgoingFile.metadata.fileName}</div>
              {fileTransfer.outgoingFile.status === 'transferring' && (
                <div>
                  <Progress value={fileTransfer.outgoingFile.progress} className="mb-2" />
                  <div className="text-sm">{fileTransfer.outgoingFile.progress}%</div>
                </div>
              )}
              {fileTransfer.outgoingFile.status === 'completed' && (
                <div className="text-green-500">✅ Đã gửi</div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
