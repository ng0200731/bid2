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

// Order Status functionality
const searchBtn = document.getElementById('search-btn');
const loadMoreBtn = document.getElementById('load-more-btn');
const showAllBtn = document.getElementById('show-all-btn');
const statusSearch = document.getElementById('status-search');
const ordersListSection = document.getElementById('orders-list-section');
const ordersBody = document.getElementById('orders-body');
const poDetailSection = document.getElementById('po-detail-section');
const poHeaderInfo = document.getElementById('po-header-info');
const poItemsBody = document.getElementById('po-items-body');
const backToListBtn = document.getElementById('back-to-list-btn');

let currentOffset = 0;
let currentOrders = [];

// Auto-load latest 10 POs when Order Status view is activated
document.querySelectorAll('.nav-button').forEach(button => {
    const originalClickHandler = button.onclick;
    button.addEventListener('click', () => {
        if (button.getAttribute('data-view') === 'order-status') {
            loadLatestOrders(10);
        }
    });
});

// Load more orders (10 more)
loadMoreBtn.addEventListener('click', async () => {
    currentOffset += 10;
    await loadLatestOrders(10, currentOffset, true);
});

// Show all orders
showAllBtn.addEventListener('click', async () => {
    await loadAllOrders();
});

// Search orders
searchBtn.addEventListener('click', async () => {
    const searchTerm = statusSearch.value.trim();
    if (!searchTerm) {
        alert('Please enter a search term');
        return;
    }
    await searchOrders(searchTerm);
});

// Allow Enter key to search
statusSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

// Back to list
backToListBtn.addEventListener('click', () => {
    poDetailSection.style.display = 'none';
    ordersListSection.style.display = 'block';
});

async function loadLatestOrders(limit = 10, offset = 0, append = false) {
    try {
        const response = await fetch(`/api/orders?limit=${limit}&offset=${offset}`);
        const orders = await response.json();

        if (append) {
            // If no more records, show alert and don't update display
            if (orders.length === 0) {
                alert('No more records to load');
                return;
            }
            currentOrders = currentOrders.concat(orders);
        } else {
            currentOrders = orders;
            currentOffset = 0;
        }

        displayOrdersList(currentOrders);
    } catch (error) {
        alert('Error loading orders: ' + error.message);
    }
}

async function loadAllOrders() {
    try {
        const response = await fetch('/api/orders');
        const orders = await response.json();
        currentOrders = orders;
        currentOffset = 0;
        displayOrdersList(orders);
    } catch (error) {
        alert('Error loading orders: ' + error.message);
    }
}

async function searchOrders(term) {
    try {
        const response = await fetch(`/api/orders/search/${encodeURIComponent(term)}`);
        const orders = await response.json();
        currentOrders = orders;
        currentOffset = 0;
        displayOrdersList(orders);
    } catch (error) {
        alert('Error searching orders: ' + error.message);
    }
}

function displayOrdersList(orders) {
    ordersBody.innerHTML = '';
    ordersListSection.style.display = 'block';
    poDetailSection.style.display = 'none';

    if (orders.length === 0) {
        ordersBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No orders found</td></tr>';
        return;
    }

    orders.forEach(order => {
        const row = document.createElement('tr');

        // Format created_at as YYYY/MM/DD HH:mm:ss
        let formattedDate = 'N/A';
        if (order.created_at) {
            const date = new Date(order.created_at);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            formattedDate = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
        }

        row.innerHTML = `
            <td>${order.po_number}</td>
            <td>${order.status || 'N/A'}</td>
            <td>${order.company || 'N/A'}</td>
            <td>${order.vendor_name || 'N/A'}</td>
            <td>${order.currency || 'N/A'}</td>
            <td>${formattedDate}</td>
            <td><button class="view-detail-btn" data-po="${order.po_number}">View Details</button></td>
            <td><button class="qc-report-btn" data-po="${order.po_number}">QC report</button></td>
        `;
        ordersBody.appendChild(row);
    });

    // Add click handlers to view detail buttons
    document.querySelectorAll('.view-detail-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const poNumber = e.target.getAttribute('data-po');
            await loadPODetail(poNumber);
        });
    });

    // Add click handlers to QC report buttons
    document.querySelectorAll('.qc-report-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const poNumber = e.target.getAttribute('data-po');
            await generateQCReport(poNumber);
        });
    });
}

async function loadPODetail(poNumber) {
    try {
        const response = await fetch(`/api/orders/${poNumber}`);
        const data = await response.json();
        displayPODetail(data);
    } catch (error) {
        alert('Error loading PO details: ' + error.message);
    }
}

async function generateQCReport(poNumber) {
    try {
        const response = await fetch(`/api/qc-report/${poNumber}`);

        if (!response.ok) {
            throw new Error(`Failed to generate QC report: ${response.statusText}`);
        }

        // Get the blob from the response
        const blob = await response.blob();

        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${new Date().toISOString().split('T')[0]}-${poNumber}-qc.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        alert(`QC report generated successfully for PO ${poNumber}`);
    } catch (error) {
        alert('Error generating QC report: ' + error.message);
    }
}

function displayPODetail(data) {
    ordersListSection.style.display = 'none';
    poDetailSection.style.display = 'block';

    // Display header information
    poHeaderInfo.innerHTML = `
        <table style="width: 100%; border: 1px solid black; margin-bottom: 20px;">
            <tr>
                <td style="padding: 10px; border: 1px solid black;"><strong>PO #:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">${data.po_number}</td>
                <td style="padding: 10px; border: 1px solid black;"><strong>Status:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">${data.status || 'N/A'}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid black;"><strong>Company:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">${data.company || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid black;"><strong>Currency:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">${data.currency || 'N/A'}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid black;"><strong>Terms:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">${data.terms || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid black;"><strong>Cancel Date:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">${data.cancel_date || 'N/A'}</td>
            </tr>
        </table>

        <h3>Vendor Information</h3>
        <table style="width: 100%; border: 1px solid black; margin-bottom: 20px;">
            <tr>
                <td style="padding: 10px; border: 1px solid black;"><strong>Purchased From:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">${data.vendor_name || 'N/A'}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid black;"><strong>Address:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">
                    ${data.vendor_address1 || ''}<br>
                    ${data.vendor_address2 || ''}<br>
                    ${data.vendor_address3 || ''}
                </td>
            </tr>
        </table>

        <h3>Ship To Information</h3>
        <table style="width: 100%; border: 1px solid black; margin-bottom: 20px;">
            <tr>
                <td style="padding: 10px; border: 1px solid black;"><strong>Ship To:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">${data.ship_to_name || 'N/A'}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid black;"><strong>Address:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">
                    ${data.ship_to_address1 || ''}<br>
                    ${data.ship_to_address2 || ''}<br>
                    ${data.ship_to_address3 || ''}
                </td>
            </tr>
        </table>
    `;

    // Display line items
    poItemsBody.innerHTML = '';
    if (data.items && data.items.length > 0) {
        let totalQty = 0;
        let totalAmount = 0;

        data.items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.item_number}</td>
                <td>${item.description}</td>
                <td>${item.color}</td>
                <td>${item.ship_to}</td>
                <td>${item.need_by}</td>
                <td style="text-align: right;">${item.qty}</td>
                <td>${item.bundle_qty}</td>
                <td style="text-align: right;">$${item.unit_price ? item.unit_price.toFixed(5) : '0.00000'}</td>
                <td style="text-align: right;">$${item.extension ? item.extension.toFixed(2) : '0.00'}</td>
            `;
            poItemsBody.appendChild(row);

            totalQty += item.qty || 0;
            totalAmount += item.extension || 0;
        });

        // Add total row
        const totalRow = document.createElement('tr');
        totalRow.style.fontWeight = 'bold';
        totalRow.innerHTML = `
            <td colspan="5" style="text-align: right;">Total:</td>
            <td style="text-align: right;">${totalQty}</td>
            <td></td>
            <td></td>
            <td style="text-align: right;">$${totalAmount.toFixed(2)}</td>
        `;
        poItemsBody.appendChild(totalRow);
    } else {
        poItemsBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No items found</td></tr>';
    }
}

