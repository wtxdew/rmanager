// Upload functionality for suspend screens and documents

const uploadModule = {
    currentFile: null,
    cropData: null,
    imageLibrary: [],
    zoom: 100,

    // Initialize drag and drop
    init() {
        this.initSuspendDropZone();
        this.initDocumentDropZone();
        this.loadImageLibrary();
    },

    // Initialize suspend screen drop zone
    initSuspendDropZone() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('suspend-file');

        if (!dropZone || !fileInput) return;

        // Click to select
        dropZone.addEventListener('click', () => fileInput.click());

        // Drag and drop events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-active');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-active');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                this.previewSuspend(fileInput);
            }
        });
    },

    // Initialize document drop zone
    initDocumentDropZone() {
        const dropZone = document.getElementById('doc-drop-zone');
        const fileInput = document.getElementById('doc-file');

        if (!dropZone || !fileInput) return;

        dropZone.addEventListener('click', () => fileInput.click());

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-active');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-active');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                utils.showStatus('doc-status', `${files.length} file(s) selected`, false);
            }
        });
    },

    // Preview suspend screen image before upload
    previewSuspend(input) {
        const preview = document.getElementById('preview-suspend');
        const cropContainer = document.getElementById('crop-container');
        const statusEl = 'suspend-status';

        if (!input || !input.files[0]) {
            utils.showStatus(statusEl, 'No file selected', true);
            return;
        }

        this.currentFile = input.files[0];

        // Check file type
        if (!this.currentFile.type.match(/^image\/(png|jpeg|jpg)$/)) {
            utils.showStatus(statusEl, 'Please select a PNG or JPEG image', true);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.initCropCanvas(img);
                preview.style.display = 'none';
                cropContainer.style.display = 'block';
                utils.showStatus(statusEl, 'Drag to position, use zoom controls to adjust size', false);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(this.currentFile);
    },

    // Initialize crop canvas with zoom support
    initCropCanvas(img) {
        const canvas = document.getElementById('crop-canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size to match target aspect ratio (reMarkable screen)
        const targetRatio = 1620 / 2160; // RMPP aspect ratio
        let canvasWidth = 500;
        let canvasHeight = canvasWidth / targetRatio;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Calculate initial view area (100% zoom)
        const imgRatio = img.width / img.height;
        let viewWidth, viewHeight, viewX, viewY;

        if (imgRatio > targetRatio) {
            // Image is wider - fit by height
            viewHeight = img.height;
            viewWidth = viewHeight * targetRatio;
            viewX = (img.width - viewWidth) / 2;
            viewY = 0;
        } else {
            // Image is taller - fit by width
            viewWidth = img.width;
            viewHeight = viewWidth / targetRatio;
            viewX = 0;
            viewY = (img.height - viewHeight) / 2;
        }

        this.cropData = {
            img: img,
            baseViewWidth: viewWidth,
            baseViewHeight: viewHeight,
            viewX: viewX,
            viewY: viewY,
            viewWidth: viewWidth,
            viewHeight: viewHeight,
            isDragging: false,
            startX: 0,
            startY: 0,
            zoom: 100
        };

        this.zoom = 100;
        document.getElementById('zoom-slider').value = 100;

        this.drawCrop(ctx, canvas);
        this.addCropListeners(canvas);
    },

    // Draw crop on canvas
    drawCrop(ctx, canvas) {
        const { img, viewX, viewY, viewWidth, viewHeight } = this.cropData;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, viewX, viewY, viewWidth, viewHeight, 0, 0, canvas.width, canvas.height);
    },

    // Add crop drag listeners with touch support
    addCropListeners(canvas) {
        const ctx = canvas.getContext('2d');

        const startDrag = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            this.cropData.isDragging = true;
            this.cropData.startX = clientX - rect.left;
            this.cropData.startY = clientY - rect.top;
        };

        const moveDrag = (clientX, clientY) => {
            if (!this.cropData.isDragging) return;

            const rect = canvas.getBoundingClientRect();
            const currentX = clientX - rect.left;
            const currentY = clientY - rect.top;

            const deltaX = (currentX - this.cropData.startX) * (this.cropData.img.width / canvas.width);
            const deltaY = (currentY - this.cropData.startY) * (this.cropData.img.height / canvas.height);

            this.cropData.viewX -= deltaX;
            this.cropData.viewY -= deltaY;

            // Constrain to image bounds
            this.cropData.viewX = Math.max(0, Math.min(this.cropData.viewX,
                this.cropData.img.width - this.cropData.viewWidth));
            this.cropData.viewY = Math.max(0, Math.min(this.cropData.viewY,
                this.cropData.img.height - this.cropData.viewHeight));

            this.drawCrop(ctx, canvas);

            this.cropData.startX = currentX;
            this.cropData.startY = currentY;
        };

        const endDrag = () => {
            this.cropData.isDragging = false;
        };

        // Mouse events
        canvas.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
        canvas.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
        canvas.addEventListener('mouseup', endDrag);
        canvas.addEventListener('mouseleave', endDrag);

        // Touch events for mobile
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY);
        });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            moveDrag(touch.clientX, touch.clientY);
        });

        canvas.addEventListener('touchend', endDrag);
    },

    // Zoom functions
    setZoom(value) {
        if (!this.cropData) return;

        this.zoom = parseInt(value);
        const zoomFactor = this.zoom / 100;

        // Calculate new view dimensions (smaller view = more zoom)
        this.cropData.viewWidth = this.cropData.baseViewWidth / zoomFactor;
        this.cropData.viewHeight = this.cropData.baseViewHeight / zoomFactor;

        // Adjust position to keep centered
        const centerXRatio = (this.cropData.viewX + this.cropData.baseViewWidth / 2) / this.cropData.img.width;
        const centerYRatio = (this.cropData.viewY + this.cropData.baseViewHeight / 2) / this.cropData.img.height;

        this.cropData.viewX = centerXRatio * this.cropData.img.width - this.cropData.viewWidth / 2;
        this.cropData.viewY = centerYRatio * this.cropData.img.height - this.cropData.viewHeight / 2;

        // Constrain to image bounds
        this.cropData.viewX = Math.max(0, Math.min(this.cropData.viewX,
            this.cropData.img.width - this.cropData.viewWidth));
        this.cropData.viewY = Math.max(0, Math.min(this.cropData.viewY,
            this.cropData.img.height - this.cropData.viewHeight));

        const canvas = document.getElementById('crop-canvas');
        const ctx = canvas.getContext('2d');
        this.drawCrop(ctx, canvas);
    },

    zoomIn() {
        const slider = document.getElementById('zoom-slider');
        const newZoom = Math.min(300, this.zoom + 10);
        slider.value = newZoom;
        this.setZoom(newZoom);
    },

    zoomOut() {
        const slider = document.getElementById('zoom-slider');
        const newZoom = Math.max(100, this.zoom - 10);
        slider.value = newZoom;
        this.setZoom(newZoom);
    },

    // Reset crop to original
    resetCrop() {
        if (this.currentFile) {
            const input = document.getElementById('suspend-file');
            this.previewSuspend(input);
        }
    },

    // Upload suspend screen image
    async uploadSuspend() {
        const statusEl = 'suspend-status';
        const canvas = document.getElementById('crop-canvas');

        if (!canvas || canvas.style.display === 'none') {
            utils.showStatus(statusEl, 'Please select and crop an image first', true);
            return;
        }

        try {
            utils.showStatus(statusEl, 'Processing and uploading...', false);

            // Get the cropped image as blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], this.currentFile.name, { type: 'image/png' });

            const formData = new FormData();
            formData.append('image', file);

            const msg = await utils.fetchText('/api/upload-suspend', {
                method: 'POST',
                body: formData
            });
            utils.showStatus(statusEl, msg, false);

            // Save to library
            await this.saveToLibrary(file);

            // Refresh current screen preview
            const currentImg = document.getElementById('current-suspend');
            if (currentImg) {
                currentImg.src = '/api/current-suspend?t=' + Date.now();
            }
        } catch (e) {
            utils.showStatus(statusEl, 'Upload failed: ' + e.message, true);
        }
    },

    // Save current wallpaper to library
    async saveCurrentToLibrary() {
        try {
            const response = await fetch('/api/current-suspend?t=' + Date.now());
            const blob = await response.blob();
            const file = new File([blob], 'current-wallpaper-' + Date.now() + '.png', { type: 'image/png' });

            await this.saveToLibrary(file);
            utils.showStatus('suspend-status', 'Current wallpaper saved to library!', false);
        } catch (e) {
            utils.showStatus('suspend-status', 'Failed to save: ' + e.message, true);
        }
    },

    // Save image to library
    async saveToLibrary(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const timestamp = Date.now();
            const libraryItem = {
                id: timestamp,
                name: file.name,
                dataUrl: e.target.result,
                timestamp: timestamp
            };

            // Save to localStorage
            let library = JSON.parse(localStorage.getItem('imageLibrary') || '[]');
            library.unshift(libraryItem);

            // Keep only last 20 images
            if (library.length > 20) {
                library = library.slice(0, 20);
            }

            localStorage.setItem('imageLibrary', JSON.stringify(library));
            this.loadImageLibrary();
        };
        reader.readAsDataURL(file);
    },

    // Load image library
    loadImageLibrary() {
        this.imageLibrary = JSON.parse(localStorage.getItem('imageLibrary') || '[]');
        this.renderLibrary();
    },

    // Toggle library visibility
    toggleLibrary() {
        const library = document.getElementById('image-library');
        if (library.style.display === 'none') {
            library.style.display = 'block';
            this.renderLibrary();
        } else {
            library.style.display = 'none';
        }
    },

    // Render library grid
    renderLibrary() {
        const grid = document.getElementById('library-grid');
        if (!grid) return;

        if (this.imageLibrary.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No images in library yet. Upload some images to build your library!</p>';
            return;
        }

        grid.innerHTML = this.imageLibrary.map(item => `
            <div class="library-item" onclick="uploadModule.selectFromLibrary(${item.id})">
                <img src="${item.dataUrl}" alt="${item.name}">
                <button class="delete-btn" onclick="event.stopPropagation(); uploadModule.deleteFromLibrary(${item.id})">×</button>
            </div>
        `).join('');
    },

    // Select image from library
    selectFromLibrary(id) {
        const item = this.imageLibrary.find(i => i.id === id);
        if (!item) return;

        // Convert dataUrl back to file
        fetch(item.dataUrl)
            .then(res => res.blob())
            .then(blob => {
                this.currentFile = new File([blob], item.name, { type: 'image/png' });
                const input = document.getElementById('suspend-file');
                const container = new DataTransfer();
                container.items.add(this.currentFile);
                input.files = container.files;
                this.previewSuspend(input);
                utils.showStatus('suspend-status', `Selected: ${item.name}`, false);
            });
    },

    // Delete image from library
    deleteFromLibrary(id) {
        if (!confirm('Delete this image from library?')) return;

        this.imageLibrary = this.imageLibrary.filter(i => i.id !== id);
        localStorage.setItem('imageLibrary', JSON.stringify(this.imageLibrary));
        this.renderLibrary();
    },

    // Upload documents (supports multiple files)
    async uploadDocuments() {
        const fileInput = document.getElementById('doc-file');
        const statusEl = 'doc-status';
        const progress = document.getElementById('upload-progress');

        if (!fileInput || !fileInput.files.length) {
            utils.showStatus(statusEl, 'Please select files', true);
            return;
        }

        let uploaded = 0;
        const total = fileInput.files.length;

        for (const file of fileInput.files) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                await utils.fetchText('/api/upload-doc', {
                    method: 'POST',
                    body: formData
                });
                uploaded++;
                if (progress) progress.value = (uploaded / total) * 100;
                utils.showStatus(statusEl, `Uploaded ${uploaded}/${total}`, false);
            } catch (e) {
                utils.showStatus(statusEl, `Failed to upload ${file.name}: ${e.message}`, true);
                break;
            }
        }

        if (uploaded === total) {
            utils.showStatus(statusEl, `Successfully uploaded ${total} file(s)!`, false);
        }
    },

    // Restart xochitl UI
    async restartUI() {
        if (!confirm('Restarting the UI will cause the screen to flash. Continue?')) {
            return;
        }

        try {
            await utils.fetchText('/api/restart-xochitl', { method: 'POST' });
            alert('UI restart command sent. The device will refresh shortly.');
        } catch (e) {
            alert('Failed to restart UI: ' + e.message);
        }
    }
};

// Initialize upload module when DOM is ready
document.addEventListener('DOMContentLoaded', () => uploadModule.init());
