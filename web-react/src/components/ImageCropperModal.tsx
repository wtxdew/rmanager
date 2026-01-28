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
  const containerRef = useRef<HTMLDivElement>(null);

  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

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

  // Measure container size
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDisplaySize({ width: clientWidth, height: clientHeight });
      }
    };

    // Initial measure
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [isOpen]); // Re-measure when opened

  // Calculate scales for consistent coordinate mapping
  const getScales = useCallback(() => {
    if (!imageElement || displaySize.width === 0 || displaySize.height === 0) {
      return { fitScale: 1, previewScale: 0.5 };
    }

    // fitScale: scaling of the natural image to fit inside the display container (object-contain)
    const fitScale = Math.min(
      displaySize.width / imageElement.naturalWidth,
      displaySize.height / imageElement.naturalHeight
    );

    // previewScale: scaling of the target cropSize to fit nicely in the display container (Visual Mask)
    // We leave some margin so the mask doesn't touch the edges
    const MARGIN = 40;
    const previewScale = Math.min(
      (displaySize.width - MARGIN) / cropSize.width,
      (displaySize.height - MARGIN) / cropSize.height
    );

    return { fitScale, previewScale };
  }, [imageElement, cropSize, displaySize]);

  // Calculate minimum zoom so visual image always covers visual mask
  const minZoom = useCallback(() => {
    if (!imageElement) return 1;
    const { fitScale, previewScale } = getScales();

    // Constraint: VisualImageHeight >= VisualMaskHeight
    // (NaturalHeight * fitScale * zoom) >= (CropSize * previewScale)
    const minZoomH = (cropSize.height * previewScale) / (imageElement.naturalHeight * fitScale);

    return minZoomH;
  }, [imageElement, cropSize, getScales]);

  // Load image
  useEffect(() => {
    if (isOpen && imageSrc && displaySize.width > 0 && displaySize.height > 0) {
      const img = new Image();
      img.onload = () => {
        setImageElement(img);

        // Need to calculate initial zoom based on the just-loaded image
        const localFitScale = Math.min(
          displaySize.width / img.naturalWidth,
          displaySize.height / img.naturalHeight
        );
        const MARGIN = 40;
        const localPreviewScale = Math.min(
          (displaySize.width - MARGIN) / cropSize.width,
          (displaySize.height - MARGIN) / cropSize.height
        );

        const minZ = (cropSize.height * localPreviewScale) / (img.naturalHeight * localFitScale);

        setZoom(minZ);
        setPosition({ x: 0, y: 0 });
        currentPosRef.current = { x: 0, y: 0 };
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc, cropSize, displaySize]);

  const clamp = (val: number, min: number, max: number) =>
    Math.min(Math.max(val, min), max);

  const getBoundaries = useCallback((currentZoom: number) => {
    if (!imageElement) return { limitX: 0, limitY: 0 };

    const { fitScale, previewScale } = getScales();

    const visualImageW = imageElement.naturalWidth * fitScale * currentZoom;
    const visualImageH = imageElement.naturalHeight * fitScale * currentZoom;

    const visualMaskW = cropSize.width * previewScale;
    const visualMaskH = cropSize.height * previewScale;

    // Limit position so mask stays within image
    // Center-to-center difference max
    const limitX = (visualImageW - visualMaskW) / 2;
    const limitY = (visualImageH - visualMaskH) / 2;

    return { limitX: Math.max(0, limitX), limitY: Math.max(0, limitY) };
  }, [imageElement, cropSize, getScales]);

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
    const newZoom = clamp(zoom - e.deltaY * 0.001, minZ, 10);
    setZoom(newZoom);
  };

  const handleApply = async () => {
    if (!imageElement || !canvasRef.current) return;

    const canvas = canvasRef.current;
    // Set canvas size to the target output size (e.g. 1404x1872)
    canvas.width = cropSize.width;
    canvas.height = cropSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Logic to map Visual Coordinates back to Natural Image Coordinates
    const { fitScale, previewScale } = getScales();

    // 1. Calculate the center of the crop area in the Natural Image
    // The Visual Mask Center is at (0,0) in our screen coordinate system (relative to container center)
    // The Visual Image Center is at (position.x, position.y)
    // Visual Offset = Visual Mask Center - Visual Image Center = (0 - pos.x, 0 - pos.y)
    // To get Natural Offset, we undo the zoom and the fitScale
    // Natural Offset = Visual Offset / (zoom * fitScale)

    const naturalDeltaX = -position.x / (zoom * fitScale);
    const naturalDeltaY = -position.y / (zoom * fitScale);

    const naturalCenterX = imageElement.naturalWidth / 2;
    const naturalCenterY = imageElement.naturalHeight / 2;

    const cropCenterX = naturalCenterX + naturalDeltaX;
    const cropCenterY = naturalCenterY + naturalDeltaY;

    // 2. Calculate the dimensions of the crop area in the Natural Image
    // Visual Mask Size = cropSize * previewScale
    // Natural Crop Size = Visual Mask Size / (zoom * fitScale)

    // Note: We use cropSize * previewScale because that is exactly how big the box is drawn on screen.
    const srcCropW = (cropSize.width * previewScale) / (zoom * fitScale);
    const srcCropH = (cropSize.height * previewScale) / (zoom * fitScale);

    const srcCropX = cropCenterX - srcCropW / 2;
    const srcCropY = cropCenterY - srcCropH / 2;

    ctx.drawImage(
      imageElement,
      srcCropX, srcCropY, srcCropW, srcCropH,
      0, 0, cropSize.width, cropSize.height
    );

    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
      }
    }, 'image/png');
  };

  if (!isOpen) return null;






  return (
    // 1. 最外层：全屏遮罩 + Flex 居中
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60  fade-in duration-200">

      {/* 2. Modal 容器：白底、圆角、阴影、固定宽高 */}
      <div className="relative w-full max-w-[600px] h-[85vh] max-h-[700px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        <canvas ref={canvasRef} className="hidden" />

        {/* Header: 改为白底黑字 */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100 z-20 bg-white shrink-0">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <span className="font-bold text-base text-slate-900">Edit media</span>
          <button
            onClick={handleApply}
            className="bg-black text-white px-5 py-1.5 rounded-full text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            Apply
          </button>
        </div>

        {/* Canvas Area: 裁剪操作区 */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden flex items-center justify-center cursor-move select-none touch-none bg-blue-50" // 背景改为浅灰，区分画布
          onPointerDown={handleMouseDown}
          onPointerMove={handleMouseMove}
          onPointerUp={handleMouseUp}
          onPointerLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Image Layer */}
          {imageElement && displaySize.width > 0 && (
            <div
              className="absolute will-change-transform origin-center"
              style={{
                width: `${displaySize.width}px`,
                height: `${displaySize.height}px`,
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              <img
                src={imageSrc}
                alt="Crop preview"
                className="w-full h-full object-contain pointer-events-none select-none"
                draggable={false}
              />
            </div>
          )}

          {/* Mask Overlay */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: imageElement ? cropSize.width * getScales().previewScale : 300,
                height: imageElement ? cropSize.height * getScales().previewScale : 400
              }}
            >
              {/* 外部阴影遮罩 */}
              <div className="w-full h-full shadow-[0_0_0_9999px_rgba(255,255,255,0.6)]"></div> {/* 这里透明度调高一点 0.6，对比更明显 */}

              {/* 裁剪框边框和网格 */}
              <div className="absolute inset-0 border-4 border-blue-500"> {/* 模仿 Twitter 的蓝色边框 */}
                <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className={`
                      ${i % 3 !== 2 ? 'border-r' : ''}
                      ${i < 6 ? 'border-b' : ''}
                      border-white/30`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Controls: 改为白底 */}
        <div className="h-16 bg-white flex items-center justify-center px-8 border-t border-slate-100 z-20 shrink-0">
          <div className="flex items-center gap-4 w-full max-w-[300px]">
            <ZoomOut className="w-5 h-5 text-slate-400" />
            <div className="flex-1 relative h-6 flex items-center group">
              <input
                type="range"
                min={minZoom()}
                max="10"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer focus:outline-none z-10 relative
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:bg-blue-500  /* Twitter 蓝 */
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:active:scale-110"
              />
              {/* 蓝色进度条 */}
              <div
                className="absolute h-1 bg-blue-500 rounded-l-full pointer-events-none top-1/2 -translate-y-1/2 z-0"
                style={{
                  width: `${Math.max(0, Math.min(100, ((zoom - minZoom()) / (10 - minZoom() || 1)) * 100))}%`
                }}
              ></div>
            </div>
            <ZoomIn className="w-5 h-5 text-slate-400" />
          </div>
        </div>

      </div>
    </div>
  );
};
