// Upload functionality for suspend screens and documents

const uploadModule = {
    currentFile: null,
    originalImage: null,
    cropData: null,
    imageLibrary: [],
    zoom: 100,
    croppedBlob: null,

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
        const statusEl = 'suspend-status';

        if (!input || !input.files[0]) {
            utils.showStatus(statusEl, 'No file selected', true);
            return;
        }

        this.currentFile = input.files[0];
        this.croppedBlob = null; // Reset cropped data

        // Check file type
        if (!this.currentFile.type.match(/^image\/(png|jpeg|jpg)$/)) {
            utils.showStatus(statusEl, 'Please select a PNG or JPEG image', true);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            // Load image and auto-open editor
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                // Auto-open crop editor
                this.openCropEditor();
            };
            this.originalImage.src = e.target.result;
        };
        reader.readAsDataURL(this.currentFile);
    },

    // Open crop editor modal (Twitter/X style)
    openCropEditor() {
        if (!this.originalImage) {
            utils.showStatus('suspend-status', 'Please select an image first', true);
            return;
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'crop-modal';
        modal.className = 'crop-modal';
        modal.innerHTML = `
            <div class="crop-modal-content">
                <div class="crop-modal-body">
                    <canvas id="modal-crop-canvas"></canvas>
                    <div class="crop-controls">
                        <button onclick="uploadModule.zoomOut()">−</button>
                        <input type="range" id="modal-zoom-slider" min="50" max="200" value="100"
                               oninput="uploadModule.setZoom(this.value)">
                        <button onclick="uploadModule.zoomIn()">+</button>
                    </div>
                </div>
                <div class="crop-modal-footer">
                    <button onclick="uploadModule.closeCropEditor()" class="secondary">取消</button>
                    <button onclick="uploadModule.applyCrop()">套用</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Initialize crop canvas
        setTimeout(() => this.initCropCanvas(this.originalImage), 100);
    },

    // Close crop editor
    closeCropEditor() {
        const modal = document.getElementById('crop-modal');
        if (modal) {
            modal.remove();
        }
        this.cropData = null;
    },

    // Apply crop and update preview
    async applyCrop() {
        if (!this.cropData) return;

        const { img, cropBox, displayWidth, displayHeight } = this.cropData;

        // Create a new canvas for the cropped result at exact device dimensions
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = 954;   // Portrait width
        outputCanvas.height = 1696;  // Portrait height
        const outputCtx = outputCanvas.getContext('2d');

        // Calculate source rectangle in original image coordinates
        const scaleX = img.width / displayWidth;
        const scaleY = img.height / displayHeight;

        const srcX = cropBox.x * scaleX;
        const srcY = cropBox.y * scaleY;
        const srcWidth = cropBox.width * scaleX;
        const srcHeight = cropBox.height * scaleY;

        // Draw cropped portion to output canvas
        outputCtx.drawImage(
            img,
            srcX, srcY, srcWidth, srcHeight,
            0, 0, outputCanvas.width, outputCanvas.height
        );

        // Get cropped image as blob
        this.croppedBlob = await new Promise(resolve => outputCanvas.toBlob(resolve, 'image/png'));

        // Update preview with cropped image
        const preview = document.getElementById('preview-suspend');
        preview.src = URL.createObjectURL(this.croppedBlob);
        preview.style.display = 'block';

        utils.showStatus('suspend-status', 'Crop applied! Ready to upload.', false);
        this.closeCropEditor();
    },

    // Initialize crop canvas with zoom support (X/Twitter style - show full image with crop box)
    initCropCanvas(img) {
        const canvas = document.getElementById('modal-crop-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Target crop dimensions - PORTRAIT orientation
        const targetWidth = 954;
        const targetHeight = 1696;
        const targetRatio = targetWidth / targetHeight;

        // Canvas size - fit entire image with padding
        const maxWidth = 500;
        const maxHeight = 700;

        // Scale image to fit in canvas (contain, not cover)
        const imgRatio = img.width / img.height;
        let displayWidth, displayHeight;

        if (imgRatio > maxWidth / maxHeight) {
            displayWidth = maxWidth;
            displayHeight = maxWidth / imgRatio;
        } else {
            displayHeight = maxHeight;
            displayWidth = maxHeight * imgRatio;
        }

        canvas.width = displayWidth;
        canvas.height = displayHeight;
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';

        // Calculate crop box dimensions to maintain target aspect ratio
        let cropBoxWidth, cropBoxHeight;
        if (displayWidth / displayHeight > targetRatio) {
            // Canvas is wider than target ratio - fit by height
            cropBoxHeight = displayHeight;
            cropBoxWidth = cropBoxHeight * targetRatio;
        } else {
            // Canvas is taller than target ratio - fit by width
            cropBoxWidth = displayWidth;
            cropBoxHeight = cropBoxWidth / targetRatio;
        }

        this.cropData = {
            img: img,
            displayWidth: displayWidth,
            displayHeight: displayHeight,
            cropBox: {
                x: (displayWidth - cropBoxWidth) / 2,
                y: (displayHeight - cropBoxHeight) / 2,
                width: cropBoxWidth,
                height: cropBoxHeight
            },
            minCropWidth: cropBoxWidth * 0.5,  // Minimum 50% zoom out
            maxCropWidth: Math.min(cropBoxWidth * 2, displayWidth), // Maximum 200% zoom in
            isDragging: false,
            startX: 0,
            startY: 0,
            targetRatio: targetRatio
        };

        this.zoom = 100;
        const slider = document.getElementById('modal-zoom-slider');
        if (slider) slider.value = 100;

        this.drawCrop(ctx, canvas);
        this.addCropListeners(canvas);
    },

    // Draw crop on canvas (X/Twitter style - full image with blue crop box overlay)
    drawCrop(ctx, canvas) {
        const { img, displayWidth, displayHeight, cropBox } = this.cropData;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw full image
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

        // Draw dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Clear crop area (show original image)
        ctx.clearRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
        ctx.drawImage(
            img,
            (cropBox.x / displayWidth) * img.width,
            (cropBox.y / displayHeight) * img.height,
            (cropBox.width / displayWidth) * img.width,
            (cropBox.height / displayHeight) * img.height,
            cropBox.x,
            cropBox.y,
            cropBox.width,
            cropBox.height
        );

        // Draw blue border for crop box
        ctx.strokeStyle = '#1d9bf0'; // Twitter blue
        ctx.lineWidth = 3;
        ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);

        // Draw corner handles
        const handleSize = 8;
        ctx.fillStyle = '#1d9bf0';
        // Top-left
        ctx.fillRect(cropBox.x - handleSize/2, cropBox.y - handleSize/2, handleSize, handleSize);
        // Top-right
        ctx.fillRect(cropBox.x + cropBox.width - handleSize/2, cropBox.y - handleSize/2, handleSize, handleSize);
        // Bottom-left
        ctx.fillRect(cropBox.x - handleSize/2, cropBox.y + cropBox.height - handleSize/2, handleSize, handleSize);
        // Bottom-right
        ctx.fillRect(cropBox.x + cropBox.width - handleSize/2, cropBox.y + cropBox.height - handleSize/2, handleSize, handleSize);
    },

    // Add crop drag listeners - drag to move crop box
    addCropListeners(canvas) {
        const ctx = canvas.getContext('2d');

        const startDrag = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            // Check if click is inside crop box
            const { cropBox } = this.cropData;
            if (x >= cropBox.x && x <= cropBox.x + cropBox.width &&
                y >= cropBox.y && y <= cropBox.y + cropBox.height) {
                this.cropData.isDragging = true;
                this.cropData.startX = x;
                this.cropData.startY = y;
                this.cropData.lastCropX = cropBox.x;
                this.cropData.lastCropY = cropBox.y;
                canvas.style.cursor = 'move';
            }
        };

        const moveDrag = (clientX, clientY) => {
            if (!this.cropData.isDragging) return;

            const rect = canvas.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            const deltaX = x - this.cropData.startX;
            const deltaY = y - this.cropData.startY;

            let newX = this.cropData.lastCropX + deltaX;
            let newY = this.cropData.lastCropY + deltaY;

            // Constrain to canvas bounds
            newX = Math.max(0, Math.min(newX, this.cropData.displayWidth - this.cropData.cropBox.width));
            newY = Math.max(0, Math.min(newY, this.cropData.displayHeight - this.cropData.cropBox.height));

            this.cropData.cropBox.x = newX;
            this.cropData.cropBox.y = newY;

            this.drawCrop(ctx, canvas);
        };

        const endDrag = () => {
            this.cropData.isDragging = false;
            canvas.style.cursor = 'default';
        };

        // Mouse events
        canvas.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
        canvas.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
        canvas.addEventListener('mouseup', endDrag);
        canvas.addEventListener('mouseleave', endDrag);

        // Touch events
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

    // Zoom functions - adjust crop box size
    setZoom(value) {
        if (!this.cropData) return;

        this.zoom = parseInt(value);
        const zoomFactor = this.zoom / 100;

        // Calculate new crop box size (inverse - higher zoom = smaller box = more zoomed in)
        const { cropBox, targetRatio, minCropWidth, maxCropWidth, displayWidth, displayHeight } = this.cropData;

        // Calculate base crop box size
        let baseCropWidth, baseCropHeight;
        if (displayWidth / displayHeight > targetRatio) {
            baseCropHeight = displayHeight;
            baseCropWidth = baseCropHeight * targetRatio;
        } else {
            baseCropWidth = displayWidth;
            baseCropHeight = baseCropWidth / targetRatio;
        }

        // Inverse zoom: 50% = larger box (zoomed out), 200% = smaller box (zoomed in)
        const newWidth = baseCropWidth / zoomFactor;
        const newHeight = baseCropHeight / zoomFactor;

        // Constrain to limits
        const constrainedWidth = Math.max(minCropWidth, Math.min(maxCropWidth, newWidth));
        const constrainedHeight = constrainedWidth / targetRatio;

        // Keep crop box centered
        const centerX = cropBox.x + cropBox.width / 2;
        const centerY = cropBox.y + cropBox.height / 2;

        cropBox.width = constrainedWidth;
        cropBox.height = constrainedHeight;
        cropBox.x = centerX - constrainedWidth / 2;
        cropBox.y = centerY - constrainedHeight / 2;

        // Constrain to canvas bounds
        cropBox.x = Math.max(0, Math.min(cropBox.x, displayWidth - cropBox.width));
        cropBox.y = Math.max(0, Math.min(cropBox.y, displayHeight - cropBox.height));

        const canvas = document.getElementById('modal-crop-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.drawCrop(ctx, canvas);
        }
    },

    zoomIn() {
        const slider = document.getElementById('modal-zoom-slider');
        if (!slider) return;
        const newZoom = Math.min(200, this.zoom + 10);
        slider.value = newZoom;
        this.setZoom(newZoom);
    },

    zoomOut() {
        const slider = document.getElementById('modal-zoom-slider');
        if (!slider) return;
        const newZoom = Math.max(50, this.zoom - 10);
        slider.value = newZoom;
        this.setZoom(newZoom);
    },

    // Upload suspend screen image
    async uploadSuspend() {
        const statusEl = 'suspend-status';

        if (!this.currentFile) {
            utils.showStatus(statusEl, 'Please select an image first', true);
            return;
        }

        try {
            utils.showStatus(statusEl, 'Processing and uploading...', false);

            // Use cropped blob if available, otherwise use original file
            let fileToUpload;
            if (this.croppedBlob) {
                fileToUpload = new File([this.croppedBlob], this.currentFile.name, { type: 'image/png' });
            } else {
                fileToUpload = this.currentFile;
            }

            const formData = new FormData();
            formData.append('image', fileToUpload);

            const msg = await utils.fetchText('/api/upload-suspend', {
                method: 'POST',
                body: formData
            });
            utils.showStatus(statusEl, msg, false);

            // Save to library
            await this.saveToLibrary(fileToUpload);

            // Refresh current screen preview
            const currentImg = document.getElementById('current-suspend');
            if (currentImg) {
                currentImg.src = '/api/current-suspend?t=' + Date.now();
            }

            // Reset state
            this.croppedBlob = null;
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
