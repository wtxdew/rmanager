// Real-time system monitoring module

const monitorModule = {
    chart: null,
    maxDataPoints: 20,
    updateInterval: null,

    data: {
        labels: [],
        datasets: [
            {
                label: 'CPU Usage (%)',
                data: [],
                borderColor: 'rgb(99, 102, 241)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true,
                yAxisID: 'y'
            },
            {
                label: 'Memory Usage (%)',
                data: [],
                borderColor: 'rgb(168, 85, 247)',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                tension: 0.4,
                fill: true,
                yAxisID: 'y'
            }
        ]
    },

    init() {
        const canvas = document.getElementById('monitor-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: this.data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        min: 0,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        display: true,
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });

        this.startMonitoring();
    },

    startMonitoring() {
        // Initial update
        this.update();

        // Update every 2 seconds
        this.updateInterval = setInterval(() => this.update(), 2000);
    },

    stopMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    },

    async update() {
        try {
            const response = await utils.fetchJSON('/api/monitor');
            if (response.code === 200) {
                const data = response.data;
                this.addDataPoint(data);
                this.updateStats(data);
            }
        } catch (e) {
            console.error('Failed to fetch monitor data:', e);
        }
    },

    addDataPoint(data) {
        const time = new Date(data.timestamp * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        this.data.labels.push(time);
        this.data.datasets[0].data.push(data.cpu.toFixed(1));
        this.data.datasets[1].data.push(data.memory.toFixed(1));

        // Keep only the last N data points
        if (this.data.labels.length > this.maxDataPoints) {
            this.data.labels.shift();
            this.data.datasets[0].data.shift();
            this.data.datasets[1].data.shift();
        }

        if (this.chart) {
            this.chart.update('none'); // Update without animation for smoother real-time
        }
    },

    updateStats(data) {
        const cpuValue = document.getElementById('cpu-value');
        const memValue = document.getElementById('mem-value');

        if (cpuValue) {
            cpuValue.textContent = data.cpu.toFixed(1) + '%';
        }

        if (memValue) {
            memValue.textContent = `${data.memory.toFixed(1)}% (${data.memUsed} / ${data.memTotal} MB)`;
        }
    },

    destroy() {
        this.stopMonitoring();
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
};

// Initialize monitoring when dashboard tab is active
document.addEventListener('DOMContentLoaded', () => {
    const dashboardTab = document.getElementById('tab-dashboard');
    if (dashboardTab && dashboardTab.classList.contains('active')) {
        monitorModule.init();
    }
});
