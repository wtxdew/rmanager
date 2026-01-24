// Upload functionality for suspend screens and documents

const uploadModule = {
    // Preview suspend screen image before upload
    previewSuspend(input) {
        const preview = document.getElementById('preview-suspend');
        if (!preview) return;

        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => preview.src = e.target.result;
            reader.readAsDataURL(input.files[0]);
        }
    },

    // Upload suspend screen image
    async uploadSuspend() {
        const fileInput = document.getElementById('suspend-file');
        const statusEl = 'suspend-status';

        if (!fileInput || !fileInput.files[0]) {
            utils.showStatus(statusEl, 'Please select an image first', true);
            return;
        }

        const formData = new FormData();
        formData.append('image', fileInput.files[0]);

        try {
            utils.showStatus(statusEl, 'Uploading...', false);
            const msg = await utils.fetchText('/api/upload-suspend', {
                method: 'POST',
                body: formData
            });
            utils.showStatus(statusEl, msg, false);

            // Refresh current screen preview
            const currentImg = document.getElementById('current-suspend');
            if (currentImg) {
                currentImg.src = '/api/current-suspend?t=' + Date.now();
            }
        } catch (e) {
            utils.showStatus(statusEl, 'Upload failed: ' + e.message, true);
        }
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
