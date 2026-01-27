// API service for reMarkable Manager

const API_BASE = '/api';

// System APIs
export const systemAPI = {
  async getStatus() {
    const response = await fetch(`${API_BASE}/status`);
    if (!response.ok) throw new Error('Failed to fetch system status');
    return response.json();
  },

  async getMonitor() {
    const response = await fetch(`${API_BASE}/monitor`);
    if (!response.ok) throw new Error('Failed to fetch monitor data');
    return response.json();
  },
};

// Suspend Screen APIs
export const suspendScreenAPI = {
  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE}/upload-suspend`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to upload suspend screen');
    return response.text();
  },

  getCurrentImageUrl() {
    return `${API_BASE}/current-suspend?t=${new Date().getTime()}`;
  },

  async getHistoryLibrary() {
    const response = await fetch(`${API_BASE}/history-suspend`);
    if (!response.ok) throw new Error('Failed to fetch history library');
    return response.json();
  },
};

// Document APIs
export const documentAPI = {
  async uploadDocument(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload-doc`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to upload document');
    return response.text();
  },

  async restartXochitl() {
    const response = await fetch(`${API_BASE}/restart-xochitl`, {
      method: 'POST',
    });

    if (!response.ok) throw new Error('Failed to restart xochitl');
    return response.text();
  },
};

// File Manager APIs
export const fileManagerAPI = {
  async listFiles() {
    const response = await fetch(`${API_BASE}/files`);
    if (!response.ok) throw new Error('Failed to fetch files');
    const data = await response.json();
    return data.data || [];
  },

  async deleteFile(id: string) {
    const response = await fetch(`${API_BASE}/files/delete?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Failed to delete file');
    return response.text();
  },

  async renameFile(id: string, newName: string) {
    const response = await fetch(`${API_BASE}/files/rename`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, newName }),
    });

    if (!response.ok) throw new Error('Failed to rename file');
    return response.text();
  },
};

// WebSocket for terminal
export const createTerminalWebSocket = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}${API_BASE}/ssh`;
  return new WebSocket(wsUrl);
};
