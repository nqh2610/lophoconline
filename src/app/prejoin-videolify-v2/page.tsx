'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Video, VideoOff, Mic, MicOff, Sparkles, AlertCircle,
  RefreshCw, Monitor, Loader2, X
} from 'lucide-react';
import { VirtualBackgroundPanel } from '@/components/videolify/ui/VirtualBackgroundPanel';
import { CameraOffOverlay } from '@/components/videolify/ui/CameraOffOverlay';
import { VirtualBackgroundProcessor } from '@/lib/virtualBackground';
import { savePrejoinSettings, loadPrejoinSettings } from '@/lib/prejoinSettings';

export default function PrejoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const accessToken = searchParams.get('accessToken') || '';

  // Video refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const vbgProcessorRef = useRef<VirtualBackgroundProcessor | null>(null);
  // Also keep stream in state so we can react when video element mounts
  const [localStreamState, setLocalStreamState] = useState<MediaStream | null>(null);

  // Media state - always start enabled for prejoin
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Virtual Background state
  const [showVbgPanel, setShowVbgPanel] = useState(false);
  const [vbgEnabled, setVbgEnabled] = useState(false);
  const [vbgMode, setVbgMode] = useState<'none' | 'blur' | 'image'>('none');
  const [blurAmount, setBlurAmount] = useState(10);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [isApplyingVBG, setIsApplyingVBG] = useState(false);

  // Audio level indicator
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastAudioUpdateRef = useRef<number>(0);

  // Device selection
  const [availableDevices, setAvailableDevices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
  }>({ cameras: [], microphones: [] });
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  // Load saved settings from localStorage on mount
  useEffect(() => {
    const settings = loadPrejoinSettings();
    // Always start with camera and mic enabled for prejoin
    setIsCameraEnabled(true);
    setIsMicEnabled(true);
    setVbgEnabled(settings.vbgEnabled);
    setVbgMode(settings.vbgMode);
    setBlurAmount(settings.vbgBlurAmount);
    setActivePreset(settings.vbgActivePreset);

    if (settings.vbgBackgroundImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setBackgroundImage(img);
      img.onerror = () => {
        console.error('[Prejoin] Failed to load saved background image');
        setVbgEnabled(false);
      };
      img.src = settings.vbgBackgroundImage;
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyboard(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        toggleCamera();
      }
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        toggleMic();
      }
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        if (!isLoadingMedia && isCameraEnabled) {
          setShowVbgPanel(prev => !prev);
        }
      }
      if (e.key === 'Enter' && !isLoadingMedia) {
        e.preventDefault();
        handleJoin();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleExit();
      }
    }

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [isLoadingMedia, isCameraEnabled]);

  // Loading timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoadingMedia) {
        setLoadingTimeout(true);
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [isLoadingMedia]);

  // Enumerate devices
  async function enumerateDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');
      const microphones = devices.filter(d => d.kind === 'audioinput');

      setAvailableDevices({ cameras, microphones });

      if (cameras.length > 0 && !selectedCamera) {
        setSelectedCamera(cameras[0].deviceId);
      }
      if (microphones.length > 0 && !selectedMicrophone) {
        setSelectedMicrophone(microphones[0].deviceId);
      }

      console.log('[Prejoin] Found devices:', {
        cameras: cameras.length,
        microphones: microphones.length
      });
    } catch (error) {
      console.error('[Prejoin] Failed to enumerate devices:', error);
    }
  }

  // Initialize media stream
  useEffect(() => {
    let mounted = true;

    async function initMedia() {
      try {
        setIsLoadingMedia(true);
        setMediaError(null);
        setPermissionDenied(false);

        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...(selectedMicrophone && { deviceId: { exact: selectedMicrophone } })
          },
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            ...(selectedCamera && { deviceId: { exact: selectedCamera } })
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('[Prejoin] Got media stream:', stream.getTracks().length, 'tracks');

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        localStreamRef.current = stream;
        // store stream in state so an effect can set video.srcObject when the
        // video element actually mounts. This avoids a race where getUserMedia
        // resolves before the <video> ref is attached, which makes the preview
        // not show until another action (like applying VBG) sets srcObject.
        setLocalStreamState(stream);
        // As soon as we have a stream, mark media as loaded so the video
        // element is rendered and the effect that attaches the srcObject can
        // run. Some device enumeration/audio setup may take longer; don't
        // block showing the preview on those.
        setIsLoadingMedia(false);

        await enumerateDevices();
        initAudioLevel(stream);

        // Always enable tracks on prejoin
        stream.getVideoTracks().forEach(track => {
          track.enabled = true;
          console.log('[Prejoin] Video track enabled:', track.enabled, 'ready:', track.readyState);
        });
        stream.getAudioTracks().forEach(track => {
          track.enabled = true;
        });

        setIsLoadingMedia(false);
        console.log('[Prejoin] Media loading complete');

      } catch (error: any) {
        console.error('[Prejoin] Failed to get media:', error);

        if (!mounted) return;

        setIsLoadingMedia(false);

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setPermissionDenied(true);
          setMediaError('Bạn đã từ chối cấp quyền truy cập camera/microphone. Vui lòng cấp quyền trong cài đặt trình duyệt.');
        } else if (error.name === 'NotFoundError') {
          setMediaError('Không tìm thấy camera hoặc microphone. Vui lòng kiểm tra kết nối thiết bị.');
        } else if (error.name === 'NotReadableError') {
          setMediaError('Thiết bị đang được sử dụng bởi ứng dụng khác. Vui lòng đóng các ứng dụng khác và thử lại.');
        } else {
          setMediaError('Không thể truy cập camera/microphone. Vui lòng thử lại.');
        }
      }
    }

    initMedia();

    return () => {
      mounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (vbgProcessorRef.current) {
        vbgProcessorRef.current.destroy();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [selectedCamera, selectedMicrophone]);

  // Initialize audio level detection
  function initAudioLevel(stream: MediaStream) {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      monitorAudioLevel();
    } catch (error) {
      console.error('[Prejoin] Failed to init audio level:', error);
    }
  }

  // Monitor audio level (throttled to ~30fps)
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    function update() {
      if (!analyserRef.current) return;

      const now = performance.now();
      if (now - lastAudioUpdateRef.current > 33) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);
        lastAudioUpdateRef.current = now;
      }

      requestAnimationFrame(update);
    }

    update();
  }, []);

  // When we obtain a local stream, ensure the video element receives it.
  useEffect(() => {
    if (!localStreamState) return;
    if (!videoRef.current) return;

    try {
      console.log('[Prejoin] Attaching stream to video element from state');
      videoRef.current.srcObject = localStreamState;
      videoRef.current.onloadedmetadata = () => {
        console.log('[Prejoin] Video metadata loaded (from state)');
      };
      videoRef.current.play().then(() => {
        console.log('[Prejoin] Video playing (from state)');
      }).catch(err => {
        console.error('[Prejoin] Video play error (from state):', err);
      });
    } catch (error) {
      console.error('[Prejoin] Error attaching stream to video:', error);
    }
  }, [localStreamState]);

  // Toggle camera
  async function toggleCamera() {
    if (!localStreamRef.current) return;

    const newState = !isCameraEnabled;
    setIsCameraEnabled(newState);

    localStreamRef.current.getVideoTracks().forEach(track => {
      track.enabled = newState;
    });

    savePrejoinSettings({ isCameraEnabled: newState });
    announceToScreenReader(newState ? 'Camera đã bật' : 'Camera đã tắt');
  }

  // Toggle microphone
  function toggleMic() {
    if (!localStreamRef.current) return;

    const newState = !isMicEnabled;
    setIsMicEnabled(newState);

    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = newState;
    });

    savePrejoinSettings({ isMicEnabled: newState });
    announceToScreenReader(newState ? 'Microphone đã bật' : 'Microphone đã tắt');
  }

  // Retry media
  async function retryMedia() {
    setLoadingTimeout(false);
    setMediaError(null);
    setPermissionDenied(false);

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');
    if (cameras.length > 0) {
      setSelectedCamera(cameras[0].deviceId);
    }
  }

  // Virtual Background handlers
  async function handleVbgNone() {
    setIsApplyingVBG(true);

    setVbgEnabled(false);
    setVbgMode('none');
    setActivePreset(null);

    if (vbgProcessorRef.current) {
      await vbgProcessorRef.current.destroy();
      vbgProcessorRef.current = null;
    }

    if (videoRef.current && localStreamRef.current) {
      videoRef.current.srcObject = localStreamRef.current;
    }

    savePrejoinSettings({
      vbgEnabled: false,
      vbgMode: 'none',
      vbgActivePreset: null,
      vbgBackgroundImage: null,
    });

    setIsApplyingVBG(false);
  }

  async function handleVbgBlur() {
    if (!localStreamRef.current) return;

    setIsApplyingVBG(true);

    setVbgEnabled(true);
    setVbgMode('blur');
    setActivePreset(null);
    setBackgroundImage(null);

    await applyVirtualBackground('blur', null);

    savePrejoinSettings({
      vbgEnabled: true,
      vbgMode: 'blur',
      vbgBlurAmount: blurAmount,
      vbgActivePreset: null,
      vbgBackgroundImage: null,
    });

    setIsApplyingVBG(false);
  }

  async function handleVbgImage(imageUrl: string) {
    if (!localStreamRef.current) return;

    setIsApplyingVBG(true);

    try {
      const img = await loadImage(imageUrl);

      setVbgEnabled(true);
      setVbgMode('image');
      setBackgroundImage(img);

      await applyVirtualBackground('image', img);

      savePrejoinSettings({
        vbgEnabled: true,
        vbgMode: 'image',
        vbgActivePreset: activePreset,
        vbgBackgroundImage: imageUrl,
      });
    } catch (error) {
      console.error('[Prejoin] Failed to load background image:', error);
      alert('Không thể tải ảnh nền. Vui lòng thử lại.');
    } finally {
      setIsApplyingVBG(false);
    }
  }

  function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  async function handleUpdateBlurAmount(amount: number) {
    setBlurAmount(amount);

    if (vbgMode === 'blur' && vbgProcessorRef.current) {
      vbgProcessorRef.current.updateSettings({
        mode: 'blur',
        blurAmount: amount,
      });

      savePrejoinSettings({ vbgBlurAmount: amount });
    }
  }

  async function applyVirtualBackground(
    mode: 'blur' | 'image',
    bgImage: HTMLImageElement | null
  ) {
    if (!localStreamRef.current) return;

    try {
      if (vbgProcessorRef.current) {
        await vbgProcessorRef.current.destroy();
      }

      const processor = new VirtualBackgroundProcessor();
      vbgProcessorRef.current = processor;

      const processedStream = await processor.startProcessing(
        localStreamRef.current,
        {
          mode,
          blurAmount,
          backgroundImage: bgImage || undefined,
        }
      );

      if (videoRef.current) {
        videoRef.current.srcObject = processedStream;
      }

      console.log('[Prejoin] Virtual background applied:', mode);
    } catch (error) {
      console.error('[Prejoin] Failed to apply VBG:', error);
      throw error;
    }
  }

  function handleJoin() {
    if (accessToken) {
      router.push(`/video-call-v2/${accessToken}`);
    } else {
      alert('Không có access token. Vui lòng kiểm tra lại URL.');
    }
  }

  function handleExit() {
    if (confirm('Bạn có chắc chắn muốn thoát?')) {
      router.back();
    }
  }

  function handleJoinWithoutMedia() {
    setIsCameraEnabled(false);
    setIsMicEnabled(false);
    savePrejoinSettings({ isCameraEnabled: false, isMicEnabled: false });
    handleJoin();
  }

  function announceToScreenReader(message: string) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <TooltipProvider>
        <div className="w-full max-w-6xl">
          {/* Skip link */}
          <a
            href="#join-button"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50"
          >
            Bỏ qua cài đặt và tham gia ngay
          </a>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Column - Video Preview */}
            <div className="flex flex-col">
              <div className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-xl">
                {/* Loading State */}
                {isLoadingMedia && !mediaError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                    <div className="text-white text-center space-y-3">
                      <Loader2 className="animate-spin h-12 w-12 mx-auto text-blue-500" />
                      <div>
                        <p className="font-medium">Đang tải camera...</p>
                        <p className="text-xs text-gray-400 mt-1">Vui lòng cho phép truy cập</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {mediaError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-gray-800">
                    <div className="text-center max-w-sm space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold mb-2">Lỗi truy cập thiết bị</h3>
                        <p className="text-gray-300 text-xs leading-relaxed">{mediaError}</p>
                      </div>
                      <Button onClick={retryMedia} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Thử lại
                      </Button>
                    </div>
                  </div>
                )}

                {/* Timeout State */}
                {loadingTimeout && !mediaError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10">
                    <div className="text-center p-4 space-y-3">
                      <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto" />
                      <p className="text-white">Tải camera quá lâu</p>
                      <Button onClick={retryMedia} size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Thử lại
                      </Button>
                    </div>
                  </div>
                )}

                {/* Video Element */}
                {!isLoadingMedia && !mediaError && (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                      aria-label="Xem trước camera"
                      style={{
                        display: 'block',
                        backgroundColor: 'transparent',
                        zIndex: 1
                      }}
                    />

                    {/* VBG Loading Overlay */}
                    {isApplyingVBG && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center" style={{ zIndex: 15 }}>
                        <div className="text-white text-center">
                          <Loader2 className="animate-spin h-10 w-10 mx-auto mb-2 text-blue-500" />
                          <p className="text-sm">Đang áp dụng nền ảo...</p>
                        </div>
                      </div>
                    )}

                    {/* Camera Off Overlay - only show if camera is actually off */}
                    {!isCameraEnabled && localStreamRef.current && localStreamRef.current.getVideoTracks()[0]?.enabled === false && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 20 }}>
                        <CameraOffOverlay pipSize="large" />
                      </div>
                    )}

                    {/* Control Buttons Overlay - split: camera/mic bottom-left, VBG bottom-right */}
                    <div className="absolute bottom-4 left-3 flex items-center gap-1" style={{ zIndex: 20 }}>
                      {/* Camera Toggle (bottom-left) */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={toggleCamera}
                            disabled={isLoadingMedia || !!mediaError}
                            size="sm"
                            className={`w-10 h-10 rounded-full transition-all shadow-sm ${
                              isCameraEnabled
                                ? 'bg-black/40 hover:bg-black/50 text-white'
                                : 'bg-red-600/50 hover:bg-red-600/60 text-white'
                            }`}
                            aria-label="Bật/tắt camera"
                          >
                            {isCameraEnabled ? (
                              <Video className="w-4 h-4" />
                            ) : (
                              <VideoOff className="w-4 h-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isCameraEnabled ? 'Tắt camera' : 'Bật camera'}</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Mic Toggle (bottom-left) */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={toggleMic}
                            disabled={isLoadingMedia || !!mediaError}
                            size="sm"
                            className={`w-10 h-10 rounded-full transition-all shadow-sm ${
                              isMicEnabled
                                ? 'bg-black/40 hover:bg-black/50 text-white'
                                : 'bg-red-600/50 hover:bg-red-600/60 text-white'
                            }`}
                            aria-label="Bật/tắt mic"
                          >
                            {isMicEnabled ? (
                              <Mic className="w-4 h-4" />
                            ) : (
                              <MicOff className="w-4 h-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isMicEnabled ? 'Tắt mic' : 'Bật mic'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="absolute bottom-4 right-3 flex items-center gap-1" style={{ zIndex: 20 }}>
                      {/* Virtual Background (bottom-right) */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => setShowVbgPanel(!showVbgPanel)}
                            disabled={isLoadingMedia || !isCameraEnabled || !!mediaError}
                            size="sm"
                            className={`w-8 h-8 rounded-full transition-all shadow-sm ${
                              showVbgPanel || vbgEnabled
                                ? 'bg-blue-600/60 hover:bg-blue-600/70 text-white'
                                : 'bg-black/30 hover:bg-black/40 text-white'
                            }`}
                            aria-label="Hiệu ứng nền ảo"
                          >
                            <Sparkles className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Hiệu ứng nền ảo</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </>
                )}
              </div>

              {/* Device Selector Below Video */}
              <div className="mt-4 flex items-center gap-3">
                {availableDevices.cameras.length > 1 && (
                  <div className="flex-1">
                    <select
                      value={selectedCamera}
                      onChange={(e) => setSelectedCamera(e.target.value)}
                      className="w-full bg-gray-100 text-gray-800 text-sm rounded-lg px-3 py-2 border border-gray-300 focus:border-blue-500 focus:outline-none"
                    >
                      {availableDevices.cameras.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {availableDevices.microphones.length > 1 && (
                  <div className="flex-1">
                    <select
                      value={selectedMicrophone}
                      onChange={(e) => setSelectedMicrophone(e.target.value)}
                      className="w-full bg-gray-100 text-gray-800 text-sm rounded-lg px-3 py-2 border border-gray-300 focus:border-blue-500 focus:outline-none"
                    >
                      {availableDevices.microphones.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Mic ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Meeting Info & Actions */}
            <div className="flex flex-col space-y-6">
              {/* Meeting Title */}
              <div>
                <h1 className="text-3xl font-normal text-gray-900 mb-2">Sẵn sàng tham gia?</h1>
                <p className="text-gray-600">Kiểm tra thiết bị trước khi vào lớp</p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  id="join-button"
                  onClick={handleJoin}
                  disabled={isLoadingMedia && !mediaError}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-medium text-base shadow-sm transition-all"
                >
                  Tham gia ngay
                </Button>
                <Button
                  onClick={handleExit}
                  variant="outline"
                  className="w-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 py-4 rounded-lg font-medium text-base transition-all"
                >
                  Thoát
                </Button>
              </div>

              {/* Instructions & Shortcuts - 2 columns */}
              <div className="grid grid-cols-2 gap-4">
                {/* Instructions */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Hướng dẫn:</h3>
                  <ul className="space-y-2.5 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <Video className="w-4 h-4 flex-shrink-0 text-gray-500" />
                      <span>Bật/tắt camera</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Mic className="w-4 h-4 flex-shrink-0 text-gray-500" />
                      <span>Bật/tắt micro</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 flex-shrink-0 text-gray-500" />
                      <span>Đổi nền ảo</span>
                    </li>
                  </ul>
                </div>

                {/* Keyboard Shortcuts */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Phím tắt:</h3>
                  <div className="space-y-2.5 text-sm text-gray-700">
                    <div className="flex items-center justify-between">
                      <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Ctrl+E</kbd>
                      <span className="text-xs text-gray-600">Camera</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Ctrl+D</kbd>
                      <span className="text-xs text-gray-600">Mic</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Ctrl+B</kbd>
                      <span className="text-xs text-gray-600">Nền</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Virtual Background Panel */}
          {showVbgPanel && (
            <VirtualBackgroundPanel
              show={showVbgPanel}
              onClose={() => setShowVbgPanel(false)}
              vbgEnabled={vbgEnabled}
              vbgMode={vbgMode}
              blurAmount={blurAmount}
              activePreset={activePreset}
              selectedCategory={selectedCategory}
              onSetCategory={setSelectedCategory}
              onVbgNone={handleVbgNone}
              onVbgBlur={handleVbgBlur}
              onVbgImage={handleVbgImage}
              onSetActivePreset={setActivePreset}
              onUpdateBlurAmount={handleUpdateBlurAmount}
              localVideoRef={videoRef}
            />
          )}

          {/* Live region for screen readers */}
          <div
            role="status"
            aria-live="polite"
            className="sr-only"
            aria-atomic="true"
          >
            {isApplyingVBG && 'Đang áp dụng nền ảo'}
            {audioLevel > 150 && isMicEnabled && 'Microphone hoạt động tốt'}
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
