// File Manager functionality

const fileManager = {
    documents: [],
    filteredDocs: [],
    currentSort: 'time-desc',

    // Load documents from server
    async load() {
        try {
            const response = await utils.fetchJSON('/api/files');
            if (response.code === 200) {
                this.documents = response.data || [];
                this.filteredDocs = [...this.documents];
                this.applySort();
                this.render();
                this.updateStats();
            }
        } catch (e) {
            console.error('Failed to load files:', e);
            this.renderError('Failed to load documents: ' + e.message);
        }
    },

    // Render file list
    render() {
        const tbody = document.getElementById('file-list');
        if (!tbody) return;

        if (this.filteredDocs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-state-icon">📁</div>
                        <div>No documents found</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredDocs.map(doc => `
            <tr>
                <td class="file-name">
                    ${doc.name}
                    ${doc.pinned ? '<span class="pinned-indicator" title="Pinned">📌</span>' : ''}
                </td>
                <td>
                    <span class="file-type ${doc.type}">${doc.type.toUpperCase()}</span>
                </td>
                <td class="file-size">${utils.formatBytes(doc.size)}</td>
                <td class="file-date">${utils.formatDate(doc.modifiedTime)}</td>
                <td class="file-actions">
                    <button onclick="fileManager.rename('${doc.id}')" class="secondary" title="Rename">✏️</button>
                    <button onclick="fileManager.delete('${doc.id}')" class="danger" title="Delete">🗑️</button>
                </td>
            </tr>
        `).join('');
    },

    // Render error message
    renderError(message) {
        const tbody = document.getElementById('file-list');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <div>${message}</div>
                </td>
            </tr>
        `;
    },

    // Update statistics
    updateStats() {
        const countEl = document.getElementById('file-count');
        const sizeEl = document.getElementById('total-size');

        if (countEl) {
            const count = this.filteredDocs.length;
            countEl.textContent = `${count} document${count !== 1 ? 's' : ''}`;
        }

        if (sizeEl) {
            const totalSize = this.filteredDocs.reduce((sum, doc) => sum + doc.size, 0);
            sizeEl.textContent = utils.formatBytes(totalSize);
        }
    },

    // Search documents
    async search(query) {
        if (!query || query.trim() === '') {
            this.filteredDocs = [...this.documents];
            this.applyFilters();
            return;
        }

        try {
            const response = await utils.fetchJSON('/api/files/search?q=' + encodeURIComponent(query));
            if (response.code === 200) {
                this.filteredDocs = response.data || [];
                this.applyFilters();
            }
        } catch (e) {
            console.error('Search failed:', e);
        }
    },

    // Apply type filter
    applyFilters() {
        const typeFilter = document.getElementById('type-filter');
        if (!typeFilter) return;

        const selectedType = typeFilter.value;

        if (selectedType) {
            this.filteredDocs = this.filteredDocs.filter(doc => doc.type === selectedType);
        }

        this.applySort();
    },

    // Apply sorting
    applySort() {
        const sortBy = document.getElementById('sort-by');
        if (sortBy) {
            this.currentSort = sortBy.value;
        }

        const [field, order] = this.currentSort.split('-');

        this.filteredDocs.sort((a, b) => {
            let aVal, bVal;

            switch (field) {
                case 'name':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'size':
                    aVal = a.size;
                    bVal = b.size;
                    break;
                case 'time':
                default:
                    aVal = parseInt(a.modifiedTime) || 0;
                    bVal = parseInt(b.modifiedTime) || 0;
                    break;
            }

            if (order === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        this.render();
        this.updateStats();
    },

    // Delete document
    async delete(id) {
        const doc = this.documents.find(d => d.id === id);
        if (!doc) return;

        if (!confirm(`Delete "${doc.name}"?\n\nThis will mark the document as deleted.`)) {
            return;
        }

        try {
            const response = await utils.fetchJSON('/api/files/delete?id=' + id, {
                method: 'DELETE'
            });

            if (response.code === 200) {
                await this.refresh();
            } else {
                alert('Failed to delete: ' + response.message);
            }
        } catch (e) {
            alert('Delete failed: ' + e.message);
        }
    },

    // Rename document
    async rename(id) {
        const doc = this.documents.find(d => d.id === id);
        if (!doc) return;

        const newName = prompt('Enter new name:', doc.name);
        if (!newName || newName === doc.name) return;

        try {
            const response = await utils.fetchJSON('/api/files/rename', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, newName })
            });

            if (response.code === 200) {
                await this.refresh();
            } else {
                alert('Failed to rename: ' + response.message);
            }
        } catch (e) {
            alert('Rename failed: ' + e.message);
        }
    },

    // Refresh file list
    async refresh() {
        await this.load();
    }
};

// Auto-load when switching to files tab
document.addEventListener('DOMContentLoaded', () => {
    // Initial load will happen when tab is switched
});
