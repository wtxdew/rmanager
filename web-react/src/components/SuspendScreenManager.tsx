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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCropComplete = (blob: Blob) => {
    setCroppedBlob(blob);
    setIsModalOpen(false);
    setMessage('Image cropped. Click "Sync to Device" to upload.');
  };

  const handleUpload = async () => {
    if (!croppedBlob) {
      setMessage('Please crop an image first');
      return;
    }

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
        <div className="lg:col-span-2 space-y-6 flex flex-col h-full">
            <Card title="Upload New Screen">
                <div
                    onClick={handleUploadClick}
                    className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="p-3 bg-slate-100 rounded-full mb-3 group-hover:bg-slate-200 transition-colors">
                        <Upload className="w-6 h-6 text-slate-600" />
                    </div>
                    <h3 className="text-base font-medium text-slate-700">Drag & drop or Click to Upload</h3>
                    <p className="text-slate-500 text-xs mt-1">PNG/JPG (Opens Editor)</p>
                </div>

                {message && (
                  <div className={`mt-4 p-3 rounded text-sm ${
                    message.includes('failed') || message.includes('error')
                      ? 'bg-red-50 text-red-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}>
                    {message}
                  </div>
                )}
            </Card>

            {croppedBlob && (
              <Card title="Preview">
                <div className="aspect-[9/16] max-w-sm mx-auto bg-slate-100 rounded border border-slate-200 overflow-hidden">
                  <img
                    src={URL.createObjectURL(croppedBlob)}
                    alt="Cropped preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </Card>
            )}
        </div>

        <div className="lg:col-span-1 flex flex-col h-full">
            <Card
                title="Active Screen Preview"
                className="flex-1 flex flex-col"
            >
                <div className="flex-1 bg-slate-100 rounded border border-slate-200 relative overflow-hidden flex items-center justify-center">
                    <img
                      src={currentScreenUrl}
                      alt="Current suspend screen"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = '';
                        e.currentTarget.alt = 'No suspend screen set';
                      }}
                    />
                </div>

                <div className="mt-4 space-y-2">
                    <button
                      onClick={handleUpload}
                      disabled={!croppedBlob || uploading}
                      className="w-full py-2 text-sm font-medium bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? 'Uploading...' : 'Sync to Device'}
                    </button>
                </div>
            </Card>
        </div>
        </div>
    </>
  );
};
