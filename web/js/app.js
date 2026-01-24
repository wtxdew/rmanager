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
        // Stop monitoring when leaving dashboard
        if (this.currentTab === 'dashboard' && typeof monitorModule !== 'undefined') {
            monitorModule.stopMonitoring();
        }

        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(el => {
            el.classList.remove('active');
        });

        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.remove('active');
        });

        // Show selected tab
        const tabEl = document.getElementById('tab-' + tab);
        if (tabEl) {
            tabEl.classList.add('active');
            this.currentTab = tab;
        }

        // Set active nav item
        const navItem = document.querySelector(`.nav-item[data-tab="${tab}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        // Load content for specific tabs
        if (tab === 'files' && typeof fileManager !== 'undefined') {
            fileManager.load();
        } else if (tab === 'dashboard' && typeof monitorModule !== 'undefined') {
            // Reinitialize monitoring when returning to dashboard
            if (!monitorModule.chart) {
                monitorModule.init();
            } else {
                monitorModule.startMonitoring();
            }
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => app.init());
