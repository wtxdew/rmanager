
import React, { useEffect, useState } from 'react';
import { X, Clock, Loader2 } from 'lucide-react';
import { suspendScreenAPI } from '../services/api';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageUrl: string) => void;
}

interface HistoryItem {
    filename: string;
    url: string;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            setError(null);
            const items = await suspendScreenAPI.getHistoryLibrary();
            setHistory(items || []);
        } catch (err) {
            setError('Failed to load history');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-500" />
                        History Library
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p>Loading history...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-red-500">{error}</div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            No history found
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {history.map((item) => (
                                <div
                                    key={item.filename}
                                    className="group relative bg-white rounded-lg p-2 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                                    onClick={() => onSelect(item.url)}
                                >
                                    <div className="aspect-[3/4] rounded overflow-hidden bg-slate-100 mb-2 relative">
                                        <img
                                            src={item.url}
                                            alt={item.filename}
                                            className="w-full h-full object-cover object-top"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    </div>
                                    <div className="text-xs text-slate-500 truncate text-center font-mono">
                                        {item.filename.replace('.png', '')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
