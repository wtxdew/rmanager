// Utility functions for API calls and data formatting

const utils = {
    // Fetch JSON from API endpoint
    async fetchJSON(url, options = {}) {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    },

    // Fetch text from API endpoint
    async fetchText(url, options = {}) {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
    },

    // Format bytes to human-readable size
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    // Format timestamp to readable date
    formatDate(timestamp) {
        return new Date(parseInt(timestamp)).toLocaleString();
    },

    // Show status message
    showStatus(elementId, message, isError = false) {
        const el = document.getElementById(elementId);
        if (!el) return;

        el.textContent = message;
        el.className = 'status-message ' + (isError ? 'status-error' : 'status-success');
    }
};
