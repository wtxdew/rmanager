// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, ArrowLeft } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (blob: Blob) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete
}) => {
  // Constants for crop box (Portrait for reMarkable)
  // Default fallback values
  const [cropSize, setCropSize] = useState({ width: 954, height: 1696 });

  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch device info on mount
  useEffect(() => {
    const fetchDimensions = async () => {
      try {
        const response = await fetch('/api/status');
        if (response.ok) {
          const data = await response.json();
          if (data.screenWidth && data.screenHeight) {
            setCropSize({ width: data.screenWidth, height: data.screenHeight });
          }
        }
      } catch (error) {
        console.error('Failed to fetch screen dimensions:', error);
      }
    };
    fetchDimensions();
  }, []);

  // Calculate minimum zoom to cover crop area
  const minZoom = useCallback(() => {
    if (!imageElement) return 1;
    return Math.max(
      cropSize.width / imageElement.naturalWidth,
      cropSize.height / imageElement.naturalHeight
    );
  }, [imageElement, cropSize]);

  // Load image
  useEffect(() => {
    if (isOpen && imageSrc) {
      const img = new Image();
      img.onload = () => {
        setImageElement(img);
        const minZ = Math.max(
          cropSize.width / img.naturalWidth,
          cropSize.height / img.naturalHeight
        );
        setZoom(minZ + 0.2);
        setPosition({ x: 0, y: 0 });
        currentPosRef.current = { x: 0, y: 0 };
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc, cropSize]);

  const clamp = (val: number, min: number, max: number) =>
    Math.min(Math.max(val, min), max);

  const getBoundaries = useCallback((currentZoom: number) => {
    if (!imageElement) return { limitX: 0, limitY: 0 };
    const scaledW = imageElement.naturalWidth * currentZoom;
    const scaledH = imageElement.naturalHeight * currentZoom;
    const limitX = (scaledW - cropSize.width) / 2;
    const limitY = (scaledH - cropSize.height) / 2;
    return { limitX, limitY };
  }, [imageElement]);

  // Ensure position is valid when zoom changes
  useEffect(() => {
    const { limitX, limitY } = getBoundaries(zoom);
    setPosition(prev => ({
      x: clamp(prev.x, -limitX, limitX),
      y: clamp(prev.y, -limitY, limitY)
    }));
  }, [zoom, getBoundaries]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    currentPosRef.current = { ...position };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const { limitX, limitY } = getBoundaries(zoom);

    const newX = clamp(currentPosRef.current.x + deltaX, -limitX, limitX);
    const newY = clamp(currentPosRef.current.y + deltaY, -limitY, limitY);

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const minZ = minZoom();
    const newZoom = clamp(zoom - e.deltaY * 0.001, minZ, 3);
    setZoom(newZoom);
  };

  const handleApply = async () => {
    if (!imageElement || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = cropSize.width;
    canvas.height = cropSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate source rectangle
    const scaledW = imageElement.naturalWidth * zoom;
    const scaledH = imageElement.naturalHeight * zoom;

    const centerX = imageElement.naturalWidth / 2;
    const centerY = imageElement.naturalHeight / 2;

    const cropX = centerX - (cropSize.width / 2 - position.x) / zoom;
    const cropY = centerY - (cropSize.height / 2 - position.y) / zoom;
    const cropW = cropSize.width / zoom;
    const cropH = cropSize.height / zoom;

    ctx.drawImage(
      imageElement,
      cropX, cropY, cropW, cropH,
      0, 0, cropSize.width, cropSize.height
    );

    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
      }
    }, 'image/png');
  };

  if (!isOpen) return null;

  const displayWidth = 600;
  const displayHeight = 800;

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] flex flex-col animate-in fade-in duration-200">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 z-20">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <span className="font-bold text-sm text-white">Edit media</span>
        <button
          onClick={handleApply}
          className="bg-white text-black px-5 py-1.5 rounded-full text-sm font-bold hover:bg-slate-200 transition-colors"
        >
          Apply
        </button>
      </div>

      {/* Canvas Area */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center cursor-move select-none touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Image Layer */}
        {imageElement && (
          <div
            className="absolute will-change-transform"
            style={{
              width: `${displayWidth}px`,
              height: `${displayHeight}px`,
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            <img
              src={imageSrc}
              alt="Crop preview"
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>
        )}

        {/* Mask Overlay */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute inset-0 bg-black/50"></div>

          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: cropSize.width / 2, height: cropSize.height / 2 }}
          >
            <div className="w-full h-full shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>

            {/* Border & Grid */}
            <div className="absolute inset-0 border border-white/50">
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-40">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className={`${i % 3 !== 2 ? 'border-r' : ''} ${i < 6 ? 'border-b' : ''} border-white`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="h-16 bg-[#000000] flex items-center justify-center px-8 border-t border-white/10 z-20">
        <div className="flex items-center gap-4 w-full max-w-[300px]">
          <ZoomOut className="w-5 h-5 text-[#71767b]" />
          <div className="flex-1 relative h-6 flex items-center">
            <input
              type="range"
              min={minZoom()}
              max="3"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1 bg-[#2f3336] rounded-full appearance-none cursor-pointer focus:outline-none
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-moz-range-thumb]:w-4
                [&::-moz-range-thumb]:h-4
                [&::-moz-range-thumb]:bg-white
                [&::-moz-range-thumb]:border-none"
            />
            <div
              className="absolute h-1 bg-[#1d9bf0] rounded-l-full pointer-events-none top-1/2 -translate-y-1/2"
              style={{ width: `${((zoom - minZoom()) / (3 - minZoom())) * 100}%` }}
            ></div>
          </div>
          <ZoomIn className="w-5 h-5 text-[#71767b]" />
        </div>
      </div>
    </div>
  );
};
