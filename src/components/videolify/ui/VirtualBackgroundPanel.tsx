'use client';

import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Upload, X } from 'lucide-react';
import { PRESET_BACKGROUNDS, VBG_CATEGORIES } from '@/lib/vbgPresets';

interface VirtualBackgroundPanelProps {
  show: boolean;
  onClose: () => void;
  vbgEnabled: boolean;
  vbgMode: string;
  blurAmount: number;
  activePreset: string | null;
  selectedCategory: string;
  onSetCategory: (category: string) => void;
  onVbgNone: () => void;
  onVbgBlur: () => void;
  onVbgImage: (imageUrl: string) => void;
  onSetActivePreset: (preset: string) => void;
  onUpdateBlurAmount: (amount: number) => void;
  localVideoRef: React.RefObject<HTMLVideoElement>;
}

export function VirtualBackgroundPanel({
  show,
  onClose,
  vbgEnabled,
  vbgMode,
  blurAmount,
  activePreset,
  selectedCategory,
  onSetCategory,
  onVbgNone,
  onVbgBlur,
  onVbgImage,
  onSetActivePreset,
  onUpdateBlurAmount,
  localVideoRef,
}: VirtualBackgroundPanelProps) {
  if (!show) return null;

  // Filter presets by category
  let filteredPresets;
  if (selectedCategory === 'All') {
    filteredPresets = PRESET_BACKGROUNDS;
  } else {
    filteredPresets = PRESET_BACKGROUNDS.filter((p) => p.category === selectedCategory);
  }

  return (
    <>
      {/* Backdrop overlay - click to close menu */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* VBG Menu panel - exact v1 styling */}
      <div
        className="fixed md:absolute bottom-0 md:bottom-full left-0 right-0 md:left-auto md:right-0 md:mb-2 bg-gray-900/95 backdrop-blur-xl rounded-t-2xl md:rounded-2xl shadow-2xl border border-gray-700/50 w-full md:w-[420px] z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-200 flex flex-col"
        style={{
          maxHeight: 'min(85vh, 700px)',
          position: 'fixed',
          bottom: '80px',
          left: 'auto',
          right: '50%',
          transform: 'translateX(50%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-gray-700/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm">🎭</span>
            </div>
            <div className="text-sm font-bold text-white">Hiệu ứng nền ảo</div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <div className="p-4 space-y-4">
            {/* No effect & blur section */}
            <div>
              <div className="text-xs font-medium text-gray-400 mb-2.5">Chế độ cơ bản</div>
              <div className="grid grid-cols-3 gap-2">
                {/* No Effect */}
                <button
                  onClick={onVbgNone}
                  className={`h-16 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                    !vbgEnabled
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/20'
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800'
                  }`}
                >
                  <Eye className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Không</span>
                </button>

                {/* Blur Background */}
                <button
                  onClick={onVbgBlur}
                  className={`h-16 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                    vbgMode === 'blur' && !activePreset
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/20'
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800'
                  }`}
                >
                  <EyeOff className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Mờ</span>
                </button>

                {/* Upload Custom Image */}
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e: any) => {
                      const file = e.target?.files?.[0];
                      if (file) {
                        const img = new Image();
                        img.onload = () => {
                          onVbgImage(URL.createObjectURL(file));
                          onSetActivePreset('Custom');
                        };
                        img.src = URL.createObjectURL(file);
                      }
                    };
                    input.click();
                  }}
                  className={`h-16 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                    activePreset === 'Custom'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/20'
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800'
                  }`}
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Tải lên</span>
                </button>
              </div>

              {/* Blur Amount Slider (shown only when blur is active) */}
              {vbgMode === 'blur' && !activePreset && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 font-medium">Độ mờ</span>
                    <span className="text-xs text-white font-semibold bg-gray-800 px-2 py-0.5 rounded">
                      {blurAmount}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    value={blurAmount}
                    onChange={(e) => onUpdateBlurAmount(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>Nhẹ</span>
                    <span>Mạnh</span>
                  </div>
                </div>
              )}
            </div>

            {/* Background Presets */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-xs font-medium text-gray-400">
                  Thư viện nền ({filteredPresets.length})
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {VBG_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => onSetCategory(cat)}
                    className={`text-[10px] px-2.5 py-1 rounded-full transition-all font-medium ${
                      selectedCategory === cat
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'bg-gray-800/70 text-gray-300 hover:bg-gray-700 border border-gray-700'
                    }`}
                  >
                    {cat === 'All' ? 'Tất cả' : cat}
                  </button>
                ))}
              </div>

              {/* Scrollable Grid */}
              <div className="grid grid-cols-4 gap-2">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      onVbgImage(preset.url);
                      onSetActivePreset(preset.name);
                    }}
                    className={`relative aspect-video rounded-lg border-2 transition-all overflow-hidden group ${
                      activePreset === preset.name
                        ? 'border-blue-500 ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/30'
                        : 'border-gray-700/50 hover:border-blue-400 cursor-pointer hover:scale-105'
                    }`}
                  >
                    {/* Background Image Preview */}
                    <img
                      src={preset.url.replace('w=1920', 'w=300').replace('&q=80', '&q=60')}
                      alt={preset.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Overlay with label - ONLY show on hover or when active */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end justify-center pb-1 transition-opacity ${
                        activePreset === preset.name ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <span className="text-[9px] font-semibold text-white drop-shadow-lg px-1 text-center leading-tight line-clamp-2">
                        {preset.emoji}
                      </span>
                    </div>
                    {/* Active indicator */}
                    {activePreset === preset.name && (
                      <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-500 rounded-full ring-2 ring-white shadow-lg" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
