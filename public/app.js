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

// Custom Modal Functions
function showModal(message, buttons) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('modal-overlay');
        const messageEl = document.getElementById('modal-message');
        const buttonsEl = document.getElementById('modal-buttons');

        messageEl.textContent = message;
        buttonsEl.innerHTML = '';

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `modal-btn ${btn.primary ? 'primary' : ''}`;
            button.textContent = btn.text;
            button.onclick = () => {
                overlay.classList.remove('active');
                resolve(btn.value);
            };
            buttonsEl.appendChild(button);
        });

        overlay.classList.add('active');
    });
}

function showAlert(message) {
    return showModal(message, [
        { text: 'OK', value: true, primary: true }
    ]);
}

function showConfirm(message) {
    return showModal(message, [
        { text: 'Cancel', value: false },
        { text: 'OK', value: true, primary: true }
    ]);
}

// Download Artwork functionality
const downloadBtn = document.getElementById('download-btn');
const fetchPOBtn = document.getElementById('fetch-po-btn');
const poInput = document.getElementById('po-input');
const progressSection = document.getElementById('progress-section');
const progressLog = document.getElementById('progress-log');
const resultsSection = document.getElementById('results-section');
const resultsBody = document.getElementById('results-body');

// Fetch PO Information button
fetchPOBtn.addEventListener('click', async () => {
    const poNumbers = poInput.value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

    if (poNumbers.length === 0) {
        await showAlert('Please enter at least one PO number');
        return;
    }

    // Reset UI
    progressLog.innerHTML = '';
    resultsBody.innerHTML = '';
    resultsSection.style.display = 'none';
    fetchPOBtn.disabled = true;
    downloadBtn.disabled = true;

    addProgressLog(`Fetching information for ${poNumbers.length} PO(s)...`, 'info');

    try {
        const response = await fetch('/api/fetch-po', {
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
        fetchPOBtn.disabled = false;
        downloadBtn.disabled = false;
    }
});

downloadBtn.addEventListener('click', async () => {
    const poNumbers = poInput.value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

    if (poNumbers.length === 0) {
        await showAlert('Please enter at least one PO number');
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
    progressLog.insertBefore(item, progressLog.firstChild);
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
                addProgressLog('Process completed!', 'success');
                displayResults(data.results);
                downloadBtn.disabled = false;
                fetchPOBtn.disabled = false;
            } else if (data.status === 'failed') {
                clearInterval(pollInterval);
                addProgressLog(`Job failed: ${data.error}`, 'error');
                downloadBtn.disabled = false;
                fetchPOBtn.disabled = false;
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

// Profile functionality
const profileUsername = document.getElementById('profile-username');
const profilePassword = document.getElementById('profile-password');
const saveProfileBtn = document.getElementById('save-profile-btn');
const profileMessage = document.getElementById('profile-message');
const passwordToggle = document.getElementById('password-toggle');

// Toggle password visibility
passwordToggle.addEventListener('click', () => {
    if (profilePassword.type === 'password') {
        profilePassword.type = 'text';
        passwordToggle.textContent = '🙈';
    } else {
        profilePassword.type = 'password';
        passwordToggle.textContent = '👁️';
    }
});

// Load profile when Profile view is activated
document.querySelectorAll('.nav-button').forEach(button => {
    button.addEventListener('click', () => {
        if (button.getAttribute('data-view') === 'profile') {
            loadProfile();
        }
    });
});

// Save profile
saveProfileBtn.addEventListener('click', async () => {
    await saveProfile();
});

async function loadProfile() {
    try {
        const response = await fetch('/api/profile');
        const data = await response.json();
        profileUsername.value = data.username || '';
        profilePassword.value = data.password || '';
    } catch (error) {
        showProfileMessage('Error loading profile: ' + error.message, 'error');
    }
}

async function saveProfile() {
    const username = profileUsername.value.trim();
    const password = profilePassword.value.trim();

    if (!username || !password) {
        showProfileMessage('Username and password are required', 'error');
        return;
    }

    try {
        const response = await fetch('/api/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            throw new Error(`Failed to save profile: ${response.statusText}`);
        }

        const data = await response.json();
        showProfileMessage('Profile updated successfully! Changes will take effect on next login.', 'success');
    } catch (error) {
        showProfileMessage('Error saving profile: ' + error.message, 'error');
    }
}

function showProfileMessage(message, type) {
    profileMessage.textContent = message;
    profileMessage.style.display = 'block';
    profileMessage.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
    profileMessage.style.color = type === 'success' ? '#155724' : '#721c24';
    profileMessage.style.border = `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`;
}

// Order Status functionality
const searchBtn = document.getElementById('search-btn');
const loadMoreBtn = document.getElementById('load-more-btn');
const showAllBtn = document.getElementById('show-all-btn');
const deleteAllBtn = document.getElementById('delete-all-btn');
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
        await showAlert('Please enter a search term');
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

// Delete all POs
deleteAllBtn.addEventListener('click', async () => {
    // Prompt user for confirmation
    const confirmed = await showConfirm('Are you sure you want to delete all Purchase Orders?\n\nThis action cannot be undone.');

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch('/api/orders', {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Failed to delete all POs: ${response.statusText}`);
        }

        const data = await response.json();
        await showAlert('All Purchase Orders deleted successfully');

        // Clear the orders list display
        ordersBody.innerHTML = '<tr><td colspan="19" style="text-align: center;">No orders found</td></tr>';
        currentOrders = [];
        currentOffset = 0;
    } catch (error) {
        await showAlert('Error deleting all POs: ' + error.message);
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
                await showAlert('No more records to load');
                return;
            }
            currentOrders = currentOrders.concat(orders);
        } else {
            currentOrders = orders;
            currentOffset = 0;
        }

        displayOrdersList(currentOrders);
    } catch (error) {
        await showAlert('Error loading orders: ' + error.message);
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
        await showAlert('Error loading orders: ' + error.message);
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
        await showAlert('Error searching orders: ' + error.message);
    }
}

function displayOrdersList(orders) {
    ordersBody.innerHTML = '';
    const ordersFooter = document.getElementById('orders-footer');
    ordersFooter.innerHTML = '';
    ordersListSection.style.display = 'block';
    poDetailSection.style.display = 'none';

    if (orders.length === 0) {
        ordersBody.innerHTML = '<tr><td colspan="19" style="text-align: center;">No orders found</td></tr>';
        return;
    }

    orders.forEach((order, index) => {
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

        // Format quantity with commas
        const qty = order.total_qty || 0;
        const formattedQty = qty.toLocaleString();

        // Format amount with 2 decimal places
        const amount = order.total_amount || 0;
        const formattedAmount = amount.toFixed(2);

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${order.po_number}</td>
            <td>${order.po_date || 'N/A'}</td>
            <td>${order.ship_by || 'N/A'}</td>
            <td>${order.ship_via || 'N/A'}</td>
            <td>${order.order_type || 'N/A'}</td>
            <td>${order.status || 'N/A'}</td>
            <td>${order.loc || 'N/A'}</td>
            <td>${order.prod_rep || 'N/A'}</td>
            <td>${order.company || 'N/A'}</td>
            <td>${order.vendor_name || 'N/A'}</td>
            <td style="text-align: right;">${order.item_count || 0}</td>
            <td style="text-align: right;">${formattedQty}</td>
            <td style="text-align: right;">$${formattedAmount}</td>
            <td>${order.currency || 'N/A'}</td>
            <td>${formattedDate}</td>
            <td><button class="view-detail-btn" data-po="${order.po_number}">View Details</button></td>
            <td><button class="qc-report-btn" data-po="${order.po_number}">QC report</button></td>
            <td><button class="delete-btn" data-po="${order.po_number}">Delete</button></td>
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

    // Add click handlers to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const poNumber = e.target.getAttribute('data-po');
            await deletePO(poNumber);
        });
    });
}

async function loadPODetail(poNumber) {
    try {
        const response = await fetch(`/api/orders/${poNumber}`);
        const data = await response.json();
        displayPODetail(data);
    } catch (error) {
        await showAlert('Error loading PO details: ' + error.message);
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

        await showAlert(`QC report generated successfully for PO ${poNumber}`);
    } catch (error) {
        await showAlert('Error generating QC report: ' + error.message);
    }
}

async function deletePO(poNumber) {
    // Prompt user for confirmation
    const confirmed = await showConfirm(`Are you sure you want to delete PO ${poNumber}?\n\nThis action cannot be undone.`);

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/orders/${poNumber}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Failed to delete PO: ${response.statusText}`);
        }

        const data = await response.json();
        await showAlert(`PO ${poNumber} deleted successfully`);

        // Reload the orders list
        await loadLatestOrders(10);
    } catch (error) {
        await showAlert('Error deleting PO: ' + error.message);
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
            <tr>
                <td style="padding: 10px; border: 1px solid black;"><strong>PO Date:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">${data.po_date || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid black;"><strong>Ship By:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">${data.ship_by || 'N/A'}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid black;"><strong>Ship Via:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">${data.ship_via || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid black;"><strong>Order Type:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">${data.order_type || 'N/A'}</td>
            </tr>
            <tr>
                <td style="padding: 10px; border: 1px solid black;"><strong>Loc:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">${data.loc || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid black;"><strong>Prod Rep:</strong></td>
                <td style="padding: 10px; border: 1px solid black;">${data.prod_rep || 'N/A'}</td>
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

// Message functionality
const fetchMsgBtn = document.getElementById('fetch-msg-btn');
const messageProgressSection = document.getElementById('message-progress-section');
const messageProgressLog = document.getElementById('message-progress-log');
const messagesListSection = document.getElementById('messages-list-section');
const messagesBody = document.getElementById('messages-body');

function addMessageProgressLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    messageProgressLog.appendChild(logEntry);
    messageProgressLog.scrollTop = messageProgressLog.scrollHeight;
}

function pollMessageJobStatus(jobId) {
    const interval = setInterval(async () => {
        try {
            const response = await fetch(`/api/status/${jobId}`);
            const data = await response.json();

            if (data.progress) {
                addMessageProgressLog(data.progress, 'info');
            }

            if (data.status === 'completed') {
                clearInterval(interval);
                addMessageProgressLog('All messages extracted and saved!', 'success');

                // Display messages in the table
                if (data.results && data.results.length > 0) {
                    displayMessages(data.results);
                }

                fetchMsgBtn.disabled = false;
            } else if (data.status === 'failed') {
                clearInterval(interval);
                addMessageProgressLog(`Job failed: ${data.error}`, 'error');
                fetchMsgBtn.disabled = false;
            }
        } catch (error) {
            clearInterval(interval);
            addMessageProgressLog(`Error polling status: ${error.message}`, 'error');
            fetchMsgBtn.disabled = false;
        }
    }, 1000);
}

function displayMessages(messages) {
    messagesBody.innerHTML = '';
    messagesListSection.style.display = 'block';

    // Store messages globally for showMessageDetails
    window.currentMessages = messages;

    messages.forEach(message => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${message.refNumber}</td>
            <td>${message.author}</td>
            <td>${message.receivedDate}</td>
            <td>${message.subject}</td>
            <td>${message.comment}</td>
            <td><button class="submit-btn" onclick="showMessageDetails('${message.refNumber}')">View</button></td>
            <td><button class="submit-btn" onclick="deleteMessageById(${message.id})" style="background-color: #d32f2f;">Delete</button></td>
        `;
        messagesBody.appendChild(row);
    });
}

window.showMessageDetails = function(refNumber) {
    // Find the message in the current results
    const message = window.currentMessages.find(m => m.refNumber === refNumber);
    if (message && message.fullDetails) {
        // Show the message detail modal with styled HTML
        const modal = document.getElementById('message-detail-modal');
        const modalBody = document.getElementById('message-detail-body');
        const messageLink = document.getElementById('message-link');

        // Set the HTML content (preserving styles)
        modalBody.innerHTML = message.fullDetails;

        // Set the message link
        if (message.messageLink) {
            messageLink.href = message.messageLink;
            messageLink.textContent = message.messageLink;
        } else {
            messageLink.href = '#';
            messageLink.textContent = 'No link available';
        }

        // Show the modal
        modal.style.display = 'flex';
    }
};

// Close message detail modal when clicking the X button
document.getElementById('message-close-btn').addEventListener('click', () => {
    const modal = document.getElementById('message-detail-modal');
    modal.style.display = 'none';
});

// Close message detail modal when clicking outside the content
document.getElementById('message-detail-modal').addEventListener('click', (e) => {
    if (e.target.id === 'message-detail-modal') {
        const modal = document.getElementById('message-detail-modal');
        modal.style.display = 'none';
    }
});

// Make deleteMessageById globally accessible
window.deleteMessageById = async function(messageId) {
    try {
        console.log('deleteMessageById called with ID:', messageId);

        if (!messageId) {
            console.error('No message ID provided');
            await showAlert('Error: No message ID provided');
            return;
        }

        console.log('Showing confirmation dialog...');
        const confirmed = await showConfirm('Are you sure you want to delete this message?');
        console.log('User confirmed:', confirmed);

        if (!confirmed) {
            return;
        }

        console.log('Sending delete request...');
        const response = await fetch(`/api/messages/${messageId}`, {
            method: 'DELETE'
        });

        console.log('Delete response status:', response.status);

        if (!response.ok) {
            throw new Error(`Failed to delete message: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Delete result:', result);

        await showAlert('Message deleted successfully');

        // Reload messages by triggering the load button
        const loadBtn = document.getElementById('load-all-msg-btn');
        if (loadBtn) {
            loadBtn.click();
        }
    } catch (error) {
        console.error('Error in deleteMessageById:', error);
        await showAlert('Error deleting message: ' + error.message);
    }
};

fetchMsgBtn.addEventListener('click', async () => {
    messageProgressLog.innerHTML = '';
    messagesBody.innerHTML = '';
    messageProgressSection.style.display = 'block';
    messagesListSection.style.display = 'none';
    fetchMsgBtn.disabled = true;

    addMessageProgressLog('Starting message fetch...', 'info');

    try {
        const response = await fetch('/api/fetch-messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.jobId) {
            addMessageProgressLog(`Job started with ID: ${data.jobId}`, 'info');
            pollMessageJobStatus(data.jobId);
        }

    } catch (error) {
        addMessageProgressLog(`Error: ${error.message}`, 'error');
        fetchMsgBtn.disabled = false;
    }
});

// Load all messages from database button
const loadAllMsgBtn = document.getElementById('load-all-msg-btn');
const messagesTitle = document.getElementById('messages-title');

loadAllMsgBtn.addEventListener('click', async () => {
    try {
        messagesBody.innerHTML = '';
        messageProgressSection.style.display = 'none';
        messagesListSection.style.display = 'block';
        loadAllMsgBtn.disabled = true;

        const response = await fetch('/api/messages');
        const data = await response.json();

        if (data.messages && data.messages.length > 0) {
            messagesTitle.textContent = `All Messages from Database (${data.messages.length} total)`;
            displayMessages(data.messages.map(msg => ({
                id: msg.id,
                refNumber: msg.ref_number,
                author: msg.author,
                receivedDate: msg.received_date,
                subject: msg.subject,
                comment: msg.comment,
                fullDetails: msg.full_details,
                messageLink: msg.message_link
            })));
        } else {
            messagesTitle.textContent = 'No Messages Found';
            messagesBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No messages in database</td></tr>';
        }

        loadAllMsgBtn.disabled = false;
    } catch (error) {
        alert(`Error loading messages: ${error.message}`);
        loadAllMsgBtn.disabled = false;
    }
});

// Delete all messages button
const deleteAllMsgBtn = document.getElementById('delete-all-msg-btn');

deleteAllMsgBtn.addEventListener('click', async () => {
    try {
        const confirmed = await showConfirm('Are you sure you want to delete ALL messages?\n\nThis action cannot be undone.');

        if (!confirmed) {
            return;
        }

        deleteAllMsgBtn.disabled = true;

        const response = await fetch('/api/messages', {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Failed to delete messages: ${response.statusText}`);
        }

        const result = await response.json();
        await showAlert(result.message || 'All messages deleted successfully');

        // Clear the messages display
        messagesBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No messages in database</td></tr>';
        messagesTitle.textContent = 'No Messages Found';
        messagesListSection.style.display = 'none';

        deleteAllMsgBtn.disabled = false;
    } catch (error) {
        await showAlert('Error deleting messages: ' + error.message);
        deleteAllMsgBtn.disabled = false;
    }
});

