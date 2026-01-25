// @ts-nocheck
import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { suspendScreenAPI } from '../services/api';
import { ImageCropperModal } from './ImageCropperModal';

const Card = ({ title, children, className = "", action }: { title: string, children: React.ReactNode, className?: string, action?: React.ReactNode }) => (
  <div className={`bg-white border border-slate-200 rounded-lg p-5 shadow-sm ${className}`}>
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</h3>
      {action && <div>{action}</div>}
    </div>
    {children}
  </div>
);

export const SuspendScreenManager = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [currentScreenUrl, setCurrentScreenUrl] = useState(suspendScreenAPI.getCurrentImage());
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      setMessage('Please select a PNG or JPEG image');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setIsModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleUploadClick = () => {
    if (!croppedBlob) {
      fileInputRef.current?.click();
    }
  };

  const handleCropComplete = (blob: Blob) => {
    setCroppedBlob(blob);
    setIsModalOpen(false);
    setMessage('Image ready to upload.');
  };

  const handleUpload = async (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent triggering the file selector if clicking the upload button

    if (!croppedBlob) return;

    try {
      setUploading(true);
      setMessage('Uploading...');

      const file = new File([croppedBlob], 'suspended.png', { type: 'image/png' });
      const result = await suspendScreenAPI.uploadImage(file);

      setMessage(result);
      setCurrentScreenUrl(suspendScreenAPI.getCurrentImage());
      setCroppedBlob(null);

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setMessage('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleClearPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCroppedBlob(null);
    setMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      {selectedImage && (
        <ImageCropperModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedImage(null);
          }}
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
        {/* Left Column: Active Screen Preview */}
        <div className="flex flex-col h-full">
          <Card title="Current Suspended Screen" className="flex-1 flex flex-col">
            <div className="flex-1 bg-slate-100 rounded border border-slate-200 relative overflow-hidden flex items-center justify-center">
              <img
                src={currentScreenUrl}
                alt="Current suspend screen"
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = '';
                  e.currentTarget.alt = 'No suspend screen found';
                }}
              />
            </div>
          </Card>
        </div>

        {/* Right Column: Upload / Preview */}
        <div className="flex flex-col h-full">
          <Card title="Upload New Screen" className="flex-1 flex flex-col">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleUploadClick}
              className={`flex-1 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-all duration-200 relative
                ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:bg-slate-50'}
                ${!croppedBlob ? 'cursor-pointer' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Drag Overlay */}
              {isDragging && (
                <div className="absolute inset-0 bg-blue-50/90 flex flex-col items-center justify-center z-10 rounded-lg">
                  <Upload className="w-12 h-12 text-blue-500 mb-4 animate-bounce" />
                  <p className="text-blue-600 font-medium text-lg">Drop to upload</p>
                </div>
              )}

              {croppedBlob ? (
                // Preview State
                <div className="w-full h-full flex flex-col items-center relative z-0">
                  <div className="flex-1 w-full flex items-center justify-center overflow-hidden mb-4">
                    <div className="relative aspect-[9/16] h-full max-h-[400px] shadow-md">
                      <img
                        src={URL.createObjectURL(croppedBlob)}
                        alt="Cropped preview"
                        className="w-full h-full object-cover rounded"
                      />
                      <button
                        onClick={handleClearPreview}
                        className="absolute -top-2 -right-2 bg-white text-slate-500 rounded-full p-1 shadow hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Clear preview"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  </div>

                  <div className="w-full space-y-3">
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="w-full py-3 text-sm font-bold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Sync to Device
                        </>
                      )}
                    </button>
                    <p className="text-xs text-slate-400">Clicking sync will replace the device's current suspend screen</p>
                  </div>
                </div>
              ) : (
                // Empty State
                <>
                  <div className="p-4 bg-slate-100 rounded-full mb-4 group-hover:bg-slate-200 transition-colors">
                    <Upload className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-700 mb-2">Drag & drop or Click to Upload</h3>
                  <p className="text-slate-500 text-sm">Support PNG, JPG</p>
                </>
              )}
            </div>

            {message && (
              <div className={`mt-4 p-3 rounded text-sm flex items-center gap-2 ${message.includes('failed') || message.includes('error')
                ? 'bg-red-50 text-red-700'
                : 'bg-blue-50 text-blue-700'
                }`}>
                {message}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};
