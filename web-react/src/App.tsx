import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Image as ImageIcon, 
  FolderOpen, 
  Terminal as TerminalIcon, 
  Save, 
  Battery, 
  HardDrive, 
  Wifi, 
  Cpu,
  Upload,
  RefreshCw,
  FileText,
  MoreVertical,
  Download,
  Trash2,
  ChevronRight,
  Command,
  AlertCircle,
  CheckCircle2,
  Crop,
  History,
  ZoomIn,
  ZoomOut,
  X,
  Check,
  ArrowLeft
} from 'lucide-react';

// --- Mock Data & Types ---

type SystemStats = {
  battery: number;
  storageUsed: number; // GB
  storageTotal: number; // GB
  ramUsage: number; // %
  ip: string;
  firmware: string;
  isConnected: boolean;
};

type FileItem = {
  id: string;
  name: string;
  type: 'folder' | 'pdf' | 'epub' | 'rm';
  size?: string;
  date: string;
};

type BackupItem = {
  id: string;
  date: string;
  size: string;
  type: 'Full' | 'Metadata';
};

type ScreenHistoryItem = {
    id: string;
    url: string; 
    date: string;
    isActive: boolean;
};

const MOCK_STATS: SystemStats = {
  battery: 82,
  storageUsed: 6.4,
  storageTotal: 8.0,
  ramUsage: 45,
  ip: '192.168.1.15',
  firmware: '3.9.0.2058',
  isConnected: true,
};

const MOCK_FILES: FileItem[] = [
  { id: '1', name: 'Notebooks', type: 'folder', date: '2023-10-24' },
  { id: '2', name: 'Papers', type: 'folder', date: '2023-11-02' },
  { id: '3', name: 'Quantum_Mechanics_Vol1.pdf', type: 'pdf', size: '14.2 MB', date: '2023-11-05' },
  { id: '4', name: 'Thesis_Draft_v2.epub', type: 'epub', size: '2.4 MB', date: '2023-11-01' },
  { id: '5', name: 'Meeting_Notes_Oct.rm', type: 'rm', size: '450 KB', date: '2023-10-30' },
];

const MOCK_BACKUPS: BackupItem[] = [
  { id: 'b1', date: '2023-11-05 14:00', size: '4.2 GB', type: 'Full' },
  { id: 'b2', date: '2023-10-28 09:30', size: '4.1 GB', type: 'Full' },
  { id: 'b3', date: '2023-10-20 18:45', size: '120 MB', type: 'Metadata' },
];

const MOCK_SCREEN_HISTORY: ScreenHistoryItem[] = [
    { id: 's1', url: 'default_sleep.png', date: '2023-11-01', isActive: true },
    { id: 's2', url: 'geometry_v2.png', date: '2023-10-15', isActive: false },
    { id: 's3', url: 'sleeping_cat.png', date: '2023-09-20', isActive: false },
];

// --- Components ---

const ProgressBar = ({ value, max, colorClass = "bg-slate-800" }: { value: number, max: number, colorClass?: string }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
      <div 
        className={`h-full ${colorClass} transition-all duration-500`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const Card = ({ title, children, className = "", action }: { title: string, children: React.ReactNode, className?: string, action?: React.ReactNode }) => (
  <div className={`bg-white border border-slate-200 rounded-lg p-5 shadow-sm ${className}`}>
    <div className="flex justify-between items-center mb-3">
        <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</h3>
        {action && <div>{action}</div>}
    </div>
    {children}
  </div>
);

// --- Image Cropper Modal (Rigorous Boundary Logic) ---

const ImageCropperModal = ({ 
    isOpen, 
    onClose, 
    imageSrc 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    imageSrc: string;
}) => {
    // Constants for the mock image and crop box
    const IMG_WIDTH = 600;
    const IMG_HEIGHT = 800;
    const CROP_WIDTH = 351;
    const CROP_HEIGHT = 468;

    // Calculate minimum zoom to ensure image covers crop area
    const minZoom = Math.max(CROP_WIDTH / IMG_WIDTH, CROP_HEIGHT / IMG_HEIGHT);

    const [zoom, setZoom] = useState(minZoom);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const currentPosRef = useRef({ x: 0, y: 0 });

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setZoom(minZoom + 0.2); // Start slightly zoomed in
            setPosition({ x: 0, y: 0 });
            currentPosRef.current = { x: 0, y: 0 };
        }
    }, [isOpen, minZoom]);

    // Helper: Clamp value between min and max
    const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

    // Calculate boundaries based on current zoom
    const getBoundaries = useCallback((currentZoom: number) => {
        const scaledW = IMG_WIDTH * currentZoom;
        const scaledH = IMG_HEIGHT * currentZoom;
        
        // The maximum distance we can move the image center away from the crop center
        // is half the difference between the scaled image size and the crop size.
        const limitX = (scaledW - CROP_WIDTH) / 2;
        const limitY = (scaledH - CROP_HEIGHT) / 2;
        
        return { limitX, limitY };
    }, []);

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
        const newZoom = clamp(zoom - e.deltaY * 0.001, minZoom, 3);
        setZoom(newZoom);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-[#000000] flex flex-col animate-in fade-in duration-200">
            {/* Header - X Style */}
            <div className="h-14 flex items-center justify-between px-4 z-20">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <span className="font-bold text-sm text-white">Edit media</span>
                <button 
                    onClick={onClose} 
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
                {/* Image Layer - Transformed */}
                <div 
                    className="absolute will-change-transform"
                    style={{
                        width: `${IMG_WIDTH}px`,
                        height: `${IMG_HEIGHT}px`,
                        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                >
                    {/* Simulated Image Content */}
                    <div className="w-full h-full bg-gradient-to-br from-[#1d9bf0] via-[#7456f1] to-[#f91880] flex items-center justify-center">
                        <span className="text-white/30 text-6xl font-black rotate-[-15deg] select-none tracking-tighter">
                            {imageSrc.split('.')[0] || 'IMAGE'}
                        </span>
                    </div>
                </div>

                {/* Mask Overlay Layer */}
                <div className="absolute inset-0 pointer-events-none z-10">
                     {/* Outer Dimmed Area (Not pitch black, slightly lighter as requested) */}
                     <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"></div>
                     
                     {/* The Aperture (Clear view) */}
                     {/* We use a compound clipping path or box-shadow trick to 'cut out' the hole visually over the dim layer */}
                     <div 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{ width: CROP_WIDTH, height: CROP_HEIGHT }}
                     >
                        {/* This box shadow technique creates the "hole" effect: A huge shadow covers the screen, the div itself is transparent */}
                        <div className="w-full h-full shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
                        
                        {/* Border & Grid */}
                        <div className="absolute inset-0 border border-white/50">
                            <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-40">
                                <div className="border-r border-b border-white"></div>
                                <div className="border-r border-b border-white"></div>
                                <div className="border-b border-white"></div>
                                <div className="border-r border-b border-white"></div>
                                <div className="border-r border-b border-white"></div>
                                <div className="border-b border-white"></div>
                                <div className="border-r border-white"></div>
                                <div className="border-r border-white"></div>
                                <div></div>
                            </div>
                        </div>
                     </div>
                </div>
            </div>

            {/* Footer / Controls - X Style */}
            <div className="h-16 bg-[#000000] flex items-center justify-center px-8 border-t border-white/10 z-20">
                <div className="flex items-center gap-4 w-full max-w-[300px]">
                    <ZoomOut className="w-5 h-5 text-[#71767b]" />
                    <div className="flex-1 relative h-6 flex items-center">
                        <input 
                            type="range" 
                            min={minZoom} 
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
                                [&::-moz-range-thumb]:border-none
                            "
                        />
                        {/* Custom Track Highlight Simulation (Blue part) */}
                        <div 
                            className="absolute h-1 bg-[#1d9bf0] rounded-l-full pointer-events-none top-1/2 -translate-y-1/2"
                            style={{ width: `${((zoom - minZoom) / (3 - minZoom)) * 100}%` }}
                        ></div>
                    </div>
                    <ZoomIn className="w-5 h-5 text-[#71767b]" />
                </div>
            </div>
        </div>
    );
}

// --- Views ---

const DashboardHome = ({ stats }: { stats: SystemStats }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Battery Status">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Battery className={`w-8 h-8 ${stats.battery < 20 ? 'text-red-500' : 'text-slate-700'}`} />
              <span className="text-2xl font-bold text-slate-800">{stats.battery}%</span>
            </div>
            <span className="text-xs text-slate-500">Discharging</span>
          </div>
          <div className="mt-3">
             <ProgressBar value={stats.battery} max={100} colorClass={stats.battery < 20 ? 'bg-red-500' : 'bg-slate-800'} />
          </div>
        </Card>

        <Card title="Internal Storage">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="w-8 h-8 text-slate-700" />
              <span className="text-2xl font-bold text-slate-800">{((stats.storageUsed / stats.storageTotal) * 100).toFixed(0)}%</span>
            </div>
            <span className="text-xs text-slate-500">{stats.storageUsed}GB / {stats.storageTotal}GB</span>
          </div>
          <div className="mt-3">
             <ProgressBar value={stats.storageUsed} max={stats.storageTotal} />
          </div>
        </Card>

        <Card title="Memory Load">
           <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu className="w-8 h-8 text-slate-700" />
              <span className="text-2xl font-bold text-slate-800">{stats.ramUsage}%</span>
            </div>
            <span className="text-xs text-slate-500">Active</span>
          </div>
          <div className="mt-3">
             <ProgressBar value={stats.ramUsage} max={100} />
          </div>
        </Card>

        <Card title="Connection">
           <div className="flex items-center justify-between h-full pb-2">
            <div className="flex items-center gap-3">
              <Wifi className={`w-8 h-8 ${stats.isConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div>
                <div className="text-sm font-bold text-slate-800">{stats.ip}</div>
                <div className="text-xs text-slate-500">USB / Wi-Fi</div>
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${stats.isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Device Information" className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-sm text-slate-500">Model</span>
              <span className="text-sm font-medium text-slate-800">reMarkable 2</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-sm text-slate-500">Firmware</span>
              <span className="text-sm font-medium text-slate-800">{stats.firmware}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-sm text-slate-500">Serial</span>
              <span className="text-sm font-medium text-slate-800">RM110-392-492</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-sm text-slate-500">Uptime</span>
              <span className="text-sm font-medium text-slate-800">4d 12h 30m</span>
            </div>
          </div>
        </Card>

        <Card title="Quick Actions" className="lg:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all group">
                    <RefreshCw className="w-6 h-6 text-slate-600 mb-2 group-hover:text-slate-900" />
                    <span className="text-sm font-medium text-slate-700">Restart Xochitl</span>
                </button>
                <button className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all group">
                    <Upload className="w-6 h-6 text-slate-600 mb-2 group-hover:text-slate-900" />
                    <span className="text-sm font-medium text-slate-700">Quick Upload</span>
                </button>
                <button className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all group">
                    <Save className="w-6 h-6 text-slate-600 mb-2 group-hover:text-slate-900" />
                    <span className="text-sm font-medium text-slate-700">Backup Metadata</span>
                </button>
                 <button className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all group">
                    <TerminalIcon className="w-6 h-6 text-slate-600 mb-2 group-hover:text-slate-900" />
                    <span className="text-sm font-medium text-slate-700">SSH Connect</span>
                </button>
            </div>
        </Card>
      </div>
    </div>
  );
};

const SuspendScreenManager = () => {
  const [history, setHistory] = useState<ScreenHistoryItem[]>(MOCK_SCREEN_HISTORY);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<string>('');

  const handleHistorySelect = (id: string) => {
      setHistory(prev => prev.map(item => ({
          ...item,
          isActive: item.id === id
      })));
  };

  const handleUploadClick = () => {
      // In a real app, this would get the file blob
      setEditingImage('New Upload.png');
      setIsModalOpen(true);
  };

  const handleEditClick = (url: string) => {
      setEditingImage(url);
      setIsModalOpen(true);
  }

  const getActiveImage = () => history.find(h => h.isActive);

  return (
    <>
        <ImageCropperModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            imageSrc={editingImage} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
        <div className="lg:col-span-2 space-y-6 flex flex-col h-full">
            <Card title="Upload New Screen">
                <div 
                    onClick={handleUploadClick}
                    className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                    <div className="p-3 bg-slate-100 rounded-full mb-3 group-hover:bg-slate-200 transition-colors">
                        <Upload className="w-6 h-6 text-slate-600" />
                    </div>
                    <h3 className="text-base font-medium text-slate-700">Drag & drop or Click to Upload</h3>
                    <p className="text-slate-500 text-xs mt-1">PNG/JPG (Opens Editor)</p>
                </div>
            </Card>

            <Card title="Library History" className="flex-1 flex flex-col overflow-hidden" action={
                <div className="flex gap-2">
                    <button className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-800">
                        <History className="w-3 h-3" /> Clear History
                    </button>
                </div>
            }>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-auto p-1">
                    {history.map((item) => (
                        <div 
                            key={item.id} 
                            onClick={() => handleHistorySelect(item.id)}
                            className={`group relative aspect-[3/4] rounded border cursor-pointer transition-all overflow-hidden ${
                                item.isActive 
                                ? 'border-slate-800 ring-2 ring-slate-800 ring-offset-2' 
                                : 'border-slate-200 hover:border-slate-400'
                            }`}
                        >
                            <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                                {/* Simulated Thumbnail */}
                                <div className="w-8 h-12 bg-slate-300 rounded flex items-center justify-center text-[10px] text-slate-500">
                                    IMG
                                </div>
                            </div>
                            
                            {/* Overlay Controls */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleEditClick(item.url); }}
                                    className="bg-white/90 p-1.5 rounded-full shadow-sm hover:scale-110 transition-transform"
                                >
                                    <Crop className="w-4 h-4 text-slate-800" />
                                </button>
                            </div>

                            {item.isActive && (
                                <div className="absolute top-2 right-2 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center shadow-sm z-10">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-white/90 p-2 text-[10px] text-slate-500 border-t border-slate-100 truncate">
                                {item.url}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>

        <div className="lg:col-span-1 flex flex-col h-full">
            <Card 
                title="Active Screen Preview" 
                className="flex-1 flex flex-col"
                action={
                    <button 
                        onClick={() => handleEditClick(getActiveImage()?.url || '')}
                        className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-2 py-1 rounded"
                    >
                        <Crop className="w-3 h-3" /> Edit
                    </button>
                }
            >
                <div className="flex-1 bg-slate-100 rounded border border-slate-200 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-2 bg-white flex flex-col items-center justify-center shadow-sm">
                        <span className="font-serif italic text-2xl text-slate-800 select-none">
                            {getActiveImage()?.url || 'suspend'}
                        </span>
                        <div className="mt-4 w-16 h-1 bg-slate-800"></div>
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                     <div className="flex items-center justify-between text-xs text-slate-500 mb-2 px-1">
                        <span>Auto-invert colors</span>
                        <div className="w-8 h-4 bg-slate-200 rounded-full relative cursor-pointer">
                            <div className="w-3 h-3 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                        </div>
                    </div>
                    <button className="w-full py-2 text-sm font-medium bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors">
                        Sync to Device
                    </button>
                </div>
            </Card>
        </div>
        </div>
    </>
  );
};

const FileManager = () => {
    return (
        <Card title="File System" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded">
                    <span className="font-semibold text-slate-800">/</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className="hover:underline cursor-pointer">home</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className="hover:underline cursor-pointer">root</span>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded hover:bg-slate-50">
                        <FolderOpen className="w-4 h-4" /> New Folder
                    </button>
                     <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-slate-800 text-white rounded hover:bg-slate-700">
                        <Upload className="w-4 h-4" /> Upload
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                    <thead className="text-slate-500 border-b border-slate-200">
                        <tr>
                            <th className="font-medium py-3 px-2">Name</th>
                            <th className="font-medium py-3 px-2 w-24">Type</th>
                            <th className="font-medium py-3 px-2 w-24">Size</th>
                            <th className="font-medium py-3 px-2 w-32">Date</th>
                            <th className="font-medium py-3 px-2 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {MOCK_FILES.map((file) => (
                            <tr key={file.id} className="group hover:bg-slate-50 transition-colors cursor-default">
                                <td className="py-3 px-2 flex items-center gap-3">
                                    {file.type === 'folder' ? 
                                        <FolderOpen className="w-5 h-5 text-amber-400 fill-amber-100" /> : 
                                        <FileText className="w-5 h-5 text-slate-400" />
                                    }
                                    <span className="text-slate-700 font-medium group-hover:text-slate-900">{file.name}</span>
                                </td>
                                <td className="py-3 px-2 text-slate-500 uppercase text-xs font-semibold">{file.type}</td>
                                <td className="py-3 px-2 text-slate-500 font-mono text-xs">{file.size || '-'}</td>
                                <td className="py-3 px-2 text-slate-500 text-xs">{file.date}</td>
                                <td className="py-3 px-2 text-right">
                                    <button className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}

const Terminal = () => {
    const [lines, setLines] = useState<string[]>([
        "reMarkable: ~/ $ connected via SSH",
        "Linux remarkable 4.1.15-2.0.0-zero-gravitas #1 PREEMPT",
        "Type 'help' for available custom commands."
    ]);
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [lines]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const newLines = [...lines, `reMarkable: ~/ $ ${input}`];
            
            // Mock response logic
            if (input.trim() === 'help') {
                newLines.push("Available: systemctl restart xochitl, df -h, top, ls");
            } else if (input.trim() === 'ls') {
                newLines.push("xochitl  draft.lines  suspended.png  backup.tar.gz");
            } else if (input.trim() !== '') {
                 newLines.push(`bash: ${input}: command not found`);
            }
            
            setLines(newLines);
            setInput("");
        }
    }

    return (
        <div className="h-full flex flex-col bg-slate-900 rounded-lg overflow-hidden font-mono text-sm border border-slate-700 shadow-xl">
            <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <TerminalIcon className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300 text-xs">root@192.168.1.15</span>
                </div>
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                </div>
            </div>
            <div className="flex-1 p-4 overflow-auto text-slate-300 space-y-1">
                {lines.map((line, i) => (
                    <div key={i} className="break-all">{line}</div>
                ))}
                <div ref={bottomRef}></div>
            </div>
            <div className="p-3 bg-slate-800 border-t border-slate-700 flex items-center gap-2">
                <span className="text-emerald-400 font-bold">$</span>
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="bg-transparent border-none outline-none text-white w-full placeholder-slate-600"
                    placeholder="Enter command..."
                    autoFocus
                />
            </div>
        </div>
    )
}

const BackupManager = () => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card title="Quick Backup">
                    <div className="text-center py-6">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Save className="w-8 h-8 text-slate-600" />
                        </div>
                        <h4 className="font-medium text-slate-800">Create New Snapshot</h4>
                        <p className="text-xs text-slate-500 mt-1 mb-4">Archives all user data & config</p>
                        <button className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded hover:bg-slate-700">Start Backup</button>
                    </div>
                 </Card>
                 
                 <Card title="Restore Strategy" className="md:col-span-2">
                    <div className="space-y-4">
                        <div className="flex gap-4 items-start">
                             <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                             <div>
                                 <h5 className="text-sm font-medium text-slate-800">Warning</h5>
                                 <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                     Restoring a backup will overwrite current documents on the device. Ensure Xochitl is stopped before proceeding with a raw file restore.
                                 </p>
                             </div>
                        </div>
                        <div className="h-px bg-slate-100"></div>
                        <div className="flex gap-4 items-start">
                             <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                             <div>
                                 <h5 className="text-sm font-medium text-slate-800">Status</h5>
                                 <p className="text-xs text-slate-500 mt-1">
                                     Last successful backup verified integrity 2 days ago.
                                 </p>
                             </div>
                        </div>
                    </div>
                 </Card>
            </div>

            <Card title="Backup History">
                <table className="w-full text-left text-sm">
                    <thead className="text-slate-500 border-b border-slate-200">
                        <tr>
                            <th className="font-medium py-3 px-2">Date Created</th>
                            <th className="font-medium py-3 px-2">Type</th>
                            <th className="font-medium py-3 px-2">Size</th>
                            <th className="font-medium py-3 px-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {MOCK_BACKUPS.map((backup) => (
                            <tr key={backup.id} className="group hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-2 font-mono text-slate-700">{backup.date}</td>
                                <td className="py-3 px-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        backup.type === 'Full' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {backup.type}
                                    </span>
                                </td>
                                <td className="py-3 px-2 text-slate-500">{backup.size}</td>
                                <td className="py-3 px-2 flex items-center justify-end gap-2">
                                    <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Restore">
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                     <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Download">
                                        <Download className="w-4 h-4" />
                                    </button>
                                     <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    )
}

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'suspend' | 'files' | 'terminal' | 'backup'>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardHome stats={MOCK_STATS} />;
      case 'suspend': return <SuspendScreenManager />;
      case 'files': return <FileManager />;
      case 'terminal': return <Terminal />;
      case 'backup': return <BackupManager />;
      default: return <DashboardHome stats={MOCK_STATS} />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'suspend', label: 'Suspend Screen', icon: ImageIcon },
    { id: 'files', label: 'File Manager', icon: FolderOpen },
    { id: 'terminal', label: 'Web Terminal', icon: TerminalIcon },
    { id: 'backup', label: 'Backup & Restore', icon: Save },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-slate-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-slate-900">
            <Command className="w-6 h-6" />
            <span>rM Manager</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Web Interface v2.0</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-slate-800 text-white shadow-md shadow-slate-200' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-slate-300' : 'text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">RM</div>
            <div className="flex flex-col">
                <span className="text-sm font-medium">ReMarkable 2</span>
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Connected
                </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-xl font-semibold text-slate-800 tracking-tight capitalize">{activeTab.replace('-', ' ')}</h2>
          <div className="flex items-center gap-4">
             <span className="px-3 py-1 bg-slate-100 rounded text-xs font-mono text-slate-600">v3.9.0.2058</span>
             <button className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">Settings</button>
             <button className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">Logout</button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
            <div className="max-w-6xl mx-auto h-full">
                {renderContent()}
            </div>
        </div>
      </main>
    </div>
  );
}
