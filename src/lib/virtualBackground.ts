/**
 * Virtual Background using MediaPipe Selfie Segmentation
 * High-performance background blur/replacement with GPU acceleration
 */

import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

export type BackgroundMode = 'none' | 'blur' | 'image';

export interface VirtualBackgroundOptions {
  mode: BackgroundMode;
  blurAmount?: number; // 0-20, default 10
  backgroundImage?: HTMLImageElement | HTMLVideoElement;
  modelSelection?: 0 | 1; // 0 = general (faster), 1 = landscape (better quality)
  smoothing?: number; // 0-1, temporal smoothing strength (default 0.7)
}

export class VirtualBackgroundProcessor {
  private selfieSegmentation: SelfieSegmentation | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private inputVideo: HTMLVideoElement | null = null;
  private outputStream: MediaStream | null = null;
  private isProcessing = false;
  private isProcessingFrame = false; // CRITICAL: Prevent parallel MediaPipe calls
  private options: VirtualBackgroundOptions;
  
  // CRITICAL: Reuse temp canvas to avoid creating new one every frame (PERFORMANCE FIX)
  private tempCanvas: HTMLCanvasElement;
  private tempCtx: CanvasRenderingContext2D;
  
  // Smoothing: Store previous mask for temporal smoothing
  private previousMask: ImageData | null = null;
  private smoothingCanvas: HTMLCanvasElement;
  private smoothingCtx: CanvasRenderingContext2D;
  
  // Performance monitoring
  private lastFrameTime?: number;
  private frameCount?: number;
  private lastFPSLogTime?: number;
  private pushedFrameCount: number = 0;

  constructor() {
    // Create offscreen canvas for processing
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { 
      willReadFrequently: false, // Better performance
      desynchronized: true, // Reduce latency
      alpha: false // No alpha needed for final output
    })!;
    
    // Create temp canvas ONCE (reuse for all frames)
    this.tempCanvas = document.createElement('canvas');
    this.tempCtx = this.tempCanvas.getContext('2d', {
      willReadFrequently: false,
      alpha: true // Need alpha channel for masking
    })!;
    
    // Create smoothing canvas for mask processing
    this.smoothingCanvas = document.createElement('canvas');
    this.smoothingCtx = this.smoothingCanvas.getContext('2d', {
      willReadFrequently: true, // Need to read mask data
      alpha: true
    })!;
    
    // GPU optimization hints
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.tempCtx.imageSmoothingEnabled = true;
    this.tempCtx.imageSmoothingQuality = 'high';
    
    this.options = {
      mode: 'none',
      blurAmount: 10,
      modelSelection: 1, // Use landscape model (better edges)
      smoothing: 0.7 // Re-enable smoothing for better edges
    };
  }

  /**
   * Initialize MediaPipe Selfie Segmentation
   */
  async initialize(): Promise<void> {
    if (this.selfieSegmentation) return;

    console.log('🎭 [VirtualBG] Initializing MediaPipe Selfie Segmentation...');

    this.selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
      }
    });

    this.selfieSegmentation.setOptions({
      modelSelection: this.options.modelSelection || 1, // Model 1: Better edge quality (landscape optimized)
      selfieMode: false // CRITICAL: Disable mirror effect for video calls
    });

    this.selfieSegmentation.onResults((results) => {
      if (!this.isProcessing) return;
      this.processFrame(results);
    });

    await this.selfieSegmentation.initialize();
    console.log('✅ [VirtualBG] MediaPipe initialized');
  }

  /**
   * Start processing video stream with virtual background
   */
  async startProcessing(
    stream: MediaStream, 
    options: Partial<VirtualBackgroundOptions>
  ): Promise<MediaStream> {
    await this.initialize();

    this.options = { ...this.options, ...options };
    
    // Validation: Log warnings for invalid configurations
    if (this.options.mode === 'image' && !this.options.backgroundImage) {
      console.warn('⚠️ [VBG] Image mode requested but no backgroundImage provided. Falling back to original video.');
    }
    
    console.log('🎭 [VBG] Starting processing with options:', {
      mode: this.options.mode,
      hasImage: !!this.options.backgroundImage,
      blurAmount: this.options.blurAmount,
      modelSelection: this.options.modelSelection,
      smoothing: this.options.smoothing
    });

    // Create video element from input stream
    this.inputVideo = document.createElement('video');
    this.inputVideo.srcObject = stream;
    this.inputVideo.autoplay = true;
    this.inputVideo.playsInline = true;
    await this.inputVideo.play();

    // Wait for video metadata (with timeout)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for video metadata'));
      }, 5000);

      if (this.inputVideo!.readyState >= 2) {
        // Already have metadata
        clearTimeout(timeout);
        resolve();
      } else {
        this.inputVideo!.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };
      }
    });

    // Set canvas size to match video
    this.canvas.width = this.inputVideo.videoWidth || 640;
    this.canvas.height = this.inputVideo.videoHeight || 480;
    
    // CRITICAL: Resize temp canvas to match (do this ONCE, not every frame!)
    this.tempCanvas.width = this.canvas.width;
    this.tempCanvas.height = this.canvas.height;
    
    // Resize smoothing canvas for mask processing
    this.smoothingCanvas.width = this.canvas.width;
    this.smoothingCanvas.height = this.canvas.height;

    // Detect input stream frame rate for reference
    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    const inputFPS = settings.frameRate || 30;
    
    console.log('🎬 [VBG] Video settings:', {
      inputFPS,
      outputMode: 'manual (captureStream(0) + requestFrame())',
      resolution: `${this.canvas.width}x${this.canvas.height}`
    });

    // Start processing loop with async recursion
    // CRITICAL: Async recursion ensures we only process next frame when MediaPipe is ready
    // This eliminates CPU waste from setInterval checking every 16ms
    // Benefits:
    // - No wasted CPU cycles checking if MediaPipe is ready
    // - Automatically adapts to MediaPipe speed (~80-120ms per frame)
    // - Continues even when tab is minimized (setTimeout not throttled like rAF)
    this.isProcessing = true;
    this.processLoop(); // Start the async recursive loop
    
    // Wait for first frame to be drawn (max 2 seconds)
    console.log('⏳ [VBG] Waiting for first frame...');
    await new Promise<void>((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        // Check if canvas has been drawn (not all black/white)
        const imageData = this.ctx!.getImageData(0, 0, 10, 10);
        const hasContent = Array.from(imageData.data).some((v, i) => {
          // Check if not all pixels are black (0,0,0) or white (255,255,255)
          if (i % 4 === 3) return false; // Skip alpha channel
          return v > 10 && v < 245;
        });
        
        if (hasContent || Date.now() - startTime > 2000) {
          clearInterval(checkInterval);
          console.log('✅ [VBG] First frame ready');
          resolve();
        }
      }, 50);
    });

    // ✅ FIX: Use captureStream(0) for manual frame control
    // This prevents browser throttling and gives us full control
    // We will manually push frames using requestFrame() in processFrame()
    const canvasStream = this.canvas.captureStream(0);
    
    // Copy audio tracks from original stream
    const audioTracks = stream.getAudioTracks();
    audioTracks.forEach(track => canvasStream.addTrack(track));

    this.outputStream = canvasStream;

    console.log('✅ [VirtualBG] Processing started:', {
      mode: this.options.mode,
      resolution: `${this.canvas.width}x${this.canvas.height}`
    });

    return this.outputStream;
  }

  /**
   * Stop processing and cleanup
   */
  stopProcessing(): void {
    console.log('🛑 [VirtualBG] Stopping processing...');
    
    this.isProcessing = false;
    this.isProcessingFrame = false; // Reset processing flag

    if (this.inputVideo) {
      this.inputVideo.pause();
      this.inputVideo.srcObject = null;
      this.inputVideo = null;
    }

    if (this.outputStream) {
      this.outputStream.getTracks().forEach(track => track.stop());
      this.outputStream = null;
    }
    
    // CRITICAL: Clear previous mask when stopping to avoid stale data
    this.previousMask = null;
    
    // Reset FPS monitoring counters
    this.pushedFrameCount = 0;
    this.lastFPSLogTime = undefined;
  }

  /**
   * Update background settings without restarting
   */
  updateSettings(options: Partial<VirtualBackgroundOptions>): void {
    this.options = { ...this.options, ...options };
    console.log('🔄 [VirtualBG] Settings updated:', this.options.mode);
  }

  /**
   * Processing loop - sends frames to MediaPipe using async recursion
   * CRITICAL FIX: Async recursion (pull-based) instead of setInterval (push-based)
   * 
   * Why async recursion?
   * - setInterval(16ms) checks 60 times/sec but MediaPipe only processes ~12 times/sec
   * - Result: 48 wasted checks per second (80% CPU waste)
   * - Async recursion: Only process next frame when MediaPipe finishes current frame
   * - Result: 0% wasted checks, perfect synchronization with MediaPipe speed
   * 
   * Why setTimeout(..., 0) instead of direct recursion?
   * - Direct recursion can cause stack overflow after many iterations
   * - setTimeout breaks the call stack, allowing garbage collection
   * - setTimeout(0) not throttled when tab minimized (unlike requestAnimationFrame)
   * - Essential for P2P: local must keep sending frames even when tab minimized
   */
  private async processLoop(): Promise<void> {
    // Stop condition: Check at start of each iteration
    if (!this.isProcessing || !this.inputVideo || !this.selfieSegmentation) {
      console.log('⏹️ [VBG] Processing loop stopped');
      return;
    }

    // CRITICAL: Skip if already processing a frame (prevent race condition)
    // This ensures only 1 MediaPipe call is active at any time
    // Prevents: frame results arriving out of order causing jitter
    if (this.isProcessingFrame) {
      // Retry after a short delay
      setTimeout(() => this.processLoop(), 5);
      return;
    }

    // Performance monitoring (every 100 frames)
    const now = performance.now();
    if (!this.lastFrameTime) {
      this.lastFrameTime = now;
      this.frameCount = 0;
    }
    
    this.frameCount = (this.frameCount || 0) + 1;
    
    if (this.frameCount % 100 === 0) {
      const elapsed = now - this.lastFrameTime;
      const fps = (100 / elapsed) * 1000;
      console.log(`📊 [VBG] Performance: ${fps.toFixed(1)} FPS (${elapsed.toFixed(0)}ms per 100 frames)`);
      this.lastFrameTime = now;
    }

    // Mark as processing to prevent parallel calls
    this.isProcessingFrame = true;

    try {
      // Send frame to MediaPipe - this is async and takes ~80-120ms
      await this.selfieSegmentation.send({ image: this.inputVideo });
    } catch (err) {
      console.error('❌ [VirtualBG] Processing error:', err);
    } finally {
      // Always mark as done, even on error
      this.isProcessingFrame = false;
    }

    // ✅ ASYNC RECURSION: Schedule next iteration after current frame completes
    // - setTimeout(0) breaks call stack (prevents stack overflow)
    // - Only schedules when previous frame done (no wasted CPU checks)
    // - Not throttled when tab minimized (unlike requestAnimationFrame)
    setTimeout(() => this.processLoop(), 0);
  }

  /**
   * Apply temporal smoothing to segmentation mask
   * Reduces jitter by blending current mask with previous mask
   */
  private smoothSegmentationMask(currentMask: any): HTMLCanvasElement {
    const { width, height } = this.canvas;
    const smoothingStrength = this.options.smoothing ?? 0.5;
    
    // Draw current mask to smoothing canvas
    this.smoothingCtx.clearRect(0, 0, width, height);
    this.smoothingCtx.drawImage(currentMask, 0, 0, width, height);
    
    // If no smoothing or first frame, just return current mask
    if (smoothingStrength <= 0 || !this.previousMask) {
      this.previousMask = this.smoothingCtx.getImageData(0, 0, width, height);
      return this.smoothingCanvas;
    }
    
    try {
      // Get current mask data
      const currentData = this.smoothingCtx.getImageData(0, 0, width, height);
      const current = currentData.data;
      const previous = this.previousMask.data;
      
      // Blend each pixel: smoothed = current * (1 - strength) + previous * strength
      // This gives us temporal smoothing between frames
      for (let i = 0; i < current.length; i += 4) {
        // Blend all RGBA channels
        for (let j = 0; j < 4; j++) {
          const idx = i + j;
          current[idx] = current[idx] * (1 - smoothingStrength) + previous[idx] * smoothingStrength;
        }
      }
      
      // Put smoothed data back
      this.smoothingCtx.putImageData(currentData, 0, 0);
      
      // Store for next frame
      this.previousMask = currentData;
    } catch (err) {
      console.warn('⚠️ [VBG] Smoothing failed, using original mask:', err);
    }
    
    return this.smoothingCanvas;
  }

  /**
   * Process frame with segmentation mask
   */
  private processFrame(results: any): void {
    if (!this.ctx || !this.inputVideo) return;

    const { width, height } = this.canvas;

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Save context state
    this.ctx.save();

    // DEBUG: Log mode every 100 frames
    if (Math.random() < 0.01) {
      console.log('🎬 [VBG] Processing frame, mode:', this.options.mode, 'blur:', this.options.blurAmount, 'hasImage:', !!this.options.backgroundImage);
    }

    if (this.options.mode === 'none') {
      // No background effect - just draw original video
      this.ctx.drawImage(this.inputVideo, 0, 0, width, height);
    } else if (this.options.mode === 'blur') {
      // Draw blurred background
      this.drawBlurredBackground(results);
    } else if (this.options.mode === 'image') {
      if (this.options.backgroundImage) {
        // Draw custom background image
        this.drawCustomBackground(results);
      } else {
        // Fallback: No image set, just show original video
        console.warn('⚠️ [VBG] Image mode but no backgroundImage set, showing original');
        this.ctx.drawImage(this.inputVideo, 0, 0, width, height);
      }
    }

    // Restore context
    this.ctx.restore();

    // ✅ FIX: Manually push frame to stream after drawing
    // This ensures every MediaPipe-processed frame gets sent to peer
    // Result: Maximum smoothness possible based on MediaPipe speed
    if (this.outputStream) {
      const videoTrack = this.outputStream.getVideoTracks()[0] as any;
      if (videoTrack && typeof videoTrack.requestFrame === 'function') {
        videoTrack.requestFrame();
        this.pushedFrameCount++;
        
        // 📊 Log actual FPS every 5 seconds
        const now = performance.now();
        if (!this.lastFPSLogTime) {
          this.lastFPSLogTime = now;
        }
        
        const elapsed = now - this.lastFPSLogTime;
        if (elapsed >= 5000) { // Every 5 seconds
          const actualFPS = (this.pushedFrameCount / elapsed) * 1000;
          console.log(`📊 [VBG] Actual output FPS: ${actualFPS.toFixed(1)} FPS (${this.pushedFrameCount} frames in ${(elapsed/1000).toFixed(1)}s)`);
          
          // Reset counters
          this.lastFPSLogTime = now;
          this.pushedFrameCount = 0;
        }
      }
    }
  }

  /**
   * Draw blurred background effect with edge feathering
   */
  private drawBlurredBackground(results: any): void {
    if (!this.ctx || !this.inputVideo) {
      console.warn('⚠️ [VBG] drawBlurredBackground: missing ctx or inputVideo');
      return;
    }

    const { width, height } = this.canvas;
    const blurAmount = this.options.blurAmount || 10;

    // STEP 1: Draw BLURRED version of entire video as background
    this.ctx.filter = `blur(${blurAmount}px)`;
    this.ctx.drawImage(this.inputVideo, 0, 0, width, height);
    this.ctx.filter = 'none';

    // STEP 2: Apply temporal smoothing to mask (reduce jitter)
    const smoothedMask = this.smoothSegmentationMask(results.segmentationMask);

    // STEP 3: Extract PERSON (sharp) using smoothed mask
    // Clear temp canvas
    this.tempCtx.clearRect(0, 0, width, height);
    
    // Draw original video (sharp)
    this.tempCtx.drawImage(this.inputVideo, 0, 0, width, height);

    // EDGE FEATHERING: Slightly blur the mask edges for softer transition
    this.tempCtx.globalCompositeOperation = 'destination-in';
    this.tempCtx.filter = 'blur(1px)'; // Soft edge
    this.tempCtx.drawImage(smoothedMask, 0, 0, width, height);
    this.tempCtx.filter = 'none';
    this.tempCtx.globalCompositeOperation = 'source-over'; // Reset

    // STEP 4: Draw sharp PERSON on top of blurred background
    this.ctx.drawImage(this.tempCanvas, 0, 0, width, height);
    
    // Debug: Log first frame
    if (!this.previousMask || Math.random() < 0.001) {
      console.log('🎭 [VBG] Blur frame drawn successfully');
    }
  }

  /**
   * Draw custom background image with edge feathering
   */
  private drawCustomBackground(results: any): void {
    if (!this.ctx || !this.inputVideo || !this.options.backgroundImage) {
      console.warn('⚠️ [VBG] drawCustomBackground: missing ctx, inputVideo, or backgroundImage');
      return;
    }

    const { width, height } = this.canvas;

    // STEP 1: Draw custom background (scaled to cover entire canvas)
    this.ctx.drawImage(this.options.backgroundImage, 0, 0, width, height);

    // STEP 2: Apply temporal smoothing to mask (reduce jitter)
    const smoothedMask = this.smoothSegmentationMask(results.segmentationMask);

    // STEP 3: Extract PERSON using smoothed mask
    // Clear temp canvas
    this.tempCtx.clearRect(0, 0, width, height);
    
    // Draw original video
    this.tempCtx.drawImage(this.inputVideo, 0, 0, width, height);

    // EDGE FEATHERING: Slightly blur the mask edges for softer transition
    this.tempCtx.globalCompositeOperation = 'destination-in';
    this.tempCtx.filter = 'blur(1px)'; // Soft edge
    this.tempCtx.drawImage(smoothedMask, 0, 0, width, height);
    this.tempCtx.filter = 'none';
    this.tempCtx.globalCompositeOperation = 'source-over'; // Reset

    // STEP 4: Draw person on top of custom background
    this.ctx.drawImage(this.tempCanvas, 0, 0, width, height);
    
    // Debug: Log periodically
    if (!this.previousMask || Math.random() < 0.001) {
      console.log('🎭 [VBG] Custom background frame drawn successfully');
    }
  }

  /**
   * Cleanup and destroy
   */
  async destroy(): Promise<void> {
    this.stopProcessing();

    if (this.selfieSegmentation) {
      this.selfieSegmentation.close();
      this.selfieSegmentation = null;
    }
    
    // Clear smoothing data
    this.previousMask = null;

    console.log('✅ [VirtualBG] Destroyed');
  }
}
