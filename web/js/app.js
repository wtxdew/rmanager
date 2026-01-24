// Main application logic

const app = {
    currentTab: 'dashboard',

    // Initialize application
    async init() {
        await this.loadStatus();
        // Refresh status every 5 seconds
        setInterval(() => this.loadStatus(), 5000);
    },

    // Load system status
    async loadStatus() {
        try {
            const data = await utils.fetchJSON('/api/status');
            document.getElementById('sys-model').textContent = data.model || '-';
            document.getElementById('sys-uptime').textContent = data.uptime || '-';
            document.getElementById('sys-storage').textContent = data.storage || '-';
        } catch (e) {
            console.error('Failed to load status:', e);
        }
    },

    // Switch between tabs
    switchTab(tab) {
        // Hide all tabs
        document.querySelectorAll('[id^="tab-"]').forEach(el => {
            el.style.display = 'none';
        });

        // Show selected tab
        const tabEl = document.getElementById('tab-' + tab);
        if (tabEl) {
            tabEl.style.display = 'block';
            this.currentTab = tab;
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => app.init());
