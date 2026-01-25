// Navigation between views
document.querySelectorAll('.nav-button').forEach(button => {
    button.addEventListener('click', () => {
        // Update active button
        document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Show corresponding view
        const viewName = button.getAttribute('data-view');
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById(viewName).classList.add('active');
    });
});

// Download Artwork functionality
const downloadBtn = document.getElementById('download-btn');
const poInput = document.getElementById('po-input');
const progressSection = document.getElementById('progress-section');
const progressLog = document.getElementById('progress-log');
const resultsSection = document.getElementById('results-section');
const resultsBody = document.getElementById('results-body');

downloadBtn.addEventListener('click', async () => {
    const poNumbers = poInput.value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

    if (poNumbers.length === 0) {
        alert('Please enter at least one PO number');
        return;
    }

    // Reset UI
    progressLog.innerHTML = '';
    resultsBody.innerHTML = '';
    progressSection.style.display = 'block';
    resultsSection.style.display = 'none';
    downloadBtn.disabled = true;

    addProgressLog(`Starting download for ${poNumbers.length} PO(s)...`, 'info');

    try {
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ poNumbers })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.jobId) {
            addProgressLog(`Job started with ID: ${data.jobId}`, 'info');
            pollJobStatus(data.jobId);
        }
    } catch (error) {
        addProgressLog(`Error: ${error.message}`, 'error');
        downloadBtn.disabled = false;
    }
});

function addProgressLog(message, type = 'info') {
    const item = document.createElement('div');
    item.className = `progress-item ${type}`;
    item.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    progressLog.appendChild(item);
    progressLog.scrollTop = progressLog.scrollHeight;
}

async function pollJobStatus(jobId) {
    const pollInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/status/${jobId}`);
            const data = await response.json();

            if (data.status === 'processing') {
                if (data.currentPO) {
                    addProgressLog(`Processing PO: ${data.currentPO}`, 'info');
                }
                if (data.progress) {
                    addProgressLog(data.progress, 'info');
                }
            } else if (data.status === 'completed') {
                clearInterval(pollInterval);
                addProgressLog('Download completed!', 'success');
                displayResults(data.results);
                downloadBtn.disabled = false;
            } else if (data.status === 'failed') {
                clearInterval(pollInterval);
                addProgressLog(`Job failed: ${data.error}`, 'error');
                downloadBtn.disabled = false;
            }
        } catch (error) {
            clearInterval(pollInterval);
            addProgressLog(`Error polling status: ${error.message}`, 'error');
            downloadBtn.disabled = false;
        }
    }, 2000); // Poll every 2 seconds
}

function displayResults(results) {
    resultsSection.style.display = 'block';
    resultsBody.innerHTML = '';

    results.forEach(result => {
        const row = document.createElement('tr');

        const statusClass = result.status === 'success' && result.filesDownloaded > 0
            ? 'status-success'
            : result.status === 'failed'
            ? 'status-failed'
            : 'status-partial';

        const statusText = result.status === 'success' && result.filesDownloaded > 0
            ? 'Success'
            : result.status === 'failed'
            ? 'Failed'
            : result.filesDownloaded > 0
            ? 'Partial'
            : 'No Files';

        row.innerHTML = `
            <td>${result.poNumber}</td>
            <td class="${statusClass}">${statusText}</td>
            <td>${result.itemsProcessed || 0}</td>
            <td>${result.filesDownloaded || 0}</td>
            <td>${formatBytes(result.totalSize || 0)}</td>
            <td>${result.errors ? result.errors.length : 0}</td>
        `;

        resultsBody.appendChild(row);
    });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
