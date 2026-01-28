import { useState, useEffect } from 'react';
import { fileManagerAPI, documentAPI } from '../services/api';

export type FileItem = {
  id: string;
  name: string;
  type: string;
  size: number;
  modifiedTime: string;
};

export function useFileList() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const data = await fileManagerAPI.listFiles();
      setFiles(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
      console.error('Failed to fetch files:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (id: string) => {
    try {
      await fileManagerAPI.deleteFile(id);
      await fetchFiles(); // Refresh list
    } catch (err) {
      throw err;
    }
  };

  const renameFile = async (id: string, newName: string) => {
    try {
      await fileManagerAPI.renameFile(id, newName);
      await fetchFiles(); // Refresh list
    } catch (err) {
      throw err;
    }
  };

  const uploadFile = async (file: File) => {
    try {
      await documentAPI.uploadDocument(file);
      await fetchFiles(); // Refresh list
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return { files, loading, error, refetch: fetchFiles, deleteFile, renameFile, uploadFile };
}
