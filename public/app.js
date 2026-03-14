// Navigation between views
document.querySelectorAll('.nav-button[data-view]').forEach(button => {
    button.addEventListener('click', () => {
        // Update active button
        document.querySelectorAll('.nav-button[data-view]').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Show corresponding view
        const viewName = button.getAttribute('data-view');
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById(viewName).classList.add('active');
    });
});

// Theme Toggle (Cyber ↔ Minimal)
const themeToggleBtn = document.getElementById('theme-toggle-btn');
if (themeToggleBtn) {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'minimal') {
        document.body.classList.add('theme-minimal');
        themeToggleBtn.textContent = '[ CYBER ]';
    }
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('theme-minimal');
        const isMinimal = document.body.classList.contains('theme-minimal');
        themeToggleBtn.textContent = isMinimal ? '[ CYBER ]' : '[ MINIMAL ]';
        localStorage.setItem('theme', isMinimal ? 'minimal' : 'cyber');
    });
}

// Universal Table Filter Function
function initializeTableFilters(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const filterInputs = table.querySelectorAll('.table-filter');
    const tbody = table.querySelector('tbody');

    filterInputs.forEach(input => {
        input.addEventListener('input', () => {
            filterTable(table, filterInputs, tbody);
        });
    });
}

function filterTable(table, filterInputs, tbody) {
    const filters = Array.from(filterInputs).map(input => ({
        column: parseInt(input.getAttribute('data-column')),
        value: input.value.toLowerCase().trim()
    }));

    const rows = tbody.querySelectorAll('tr');

    rows.forEach(row => {
        let shouldShow = true;

        filters.forEach(filter => {
            if (filter.value === '') return; // Skip empty filters

            const cell = row.cells[filter.column];
            if (!cell) return;

            const cellText = cell.textContent.toLowerCase();
            if (!cellText.includes(filter.value)) {
                shouldShow = false;
            }
        });

        if (shouldShow) {
            row.classList.remove('filtered-out');
        } else {
            row.classList.add('filtered-out');
        }
    });
}

// Initialize filters for all tables when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeTableFilters('messages-table');
    initializeTableFilters('orders-table');
    initializeTableFilters('po-items-table');
    initializeTableFilters('progress-table');
});

// Re-initialize filters when tables are populated
function reinitializeFilters() {
    initializeTableFilters('messages-table');
    initializeTableFilters('orders-table');
    initializeTableFilters('po-items-table');
    initializeTableFilters('progress-table');
}

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

    // Get headless mode preference (inverted: checked = visible, unchecked = headless)
    const headless = !document.getElementById('download-headless-toggle').checked;

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
            body: JSON.stringify({ poNumbers, headless })
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

    // Get headless mode preference (inverted: checked = visible, unchecked = headless)
    const headless = !document.getElementById('download-headless-toggle').checked;

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
            body: JSON.stringify({ poNumbers, headless })
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

let lastLogMessage = null;

function addProgressLog(message, type = 'info') {
    // Prevent duplicate consecutive messages
    if (lastLogMessage === message) {
        return;
    }
    lastLogMessage = message;

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
                // Show any final progress messages (like email notification)
                if (data.progress) {
                    addProgressLog(data.progress, 'info');
                }
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

        const errorCount = result.errors ? result.errors.length : 0;
        const errorCell = errorCount > 0
            ? `<a href="#" class="error-link" style="color: #d32f2f; text-decoration: underline; cursor: pointer;">${errorCount}</a>`
            : '0';

        row.innerHTML = `
            <td>${result.poNumber}</td>
            <td class="${statusClass}">${statusText}</td>
            <td>${result.itemsProcessed || 0}</td>
            <td>${result.filesDownloaded || 0}</td>
            <td>${formatBytes(result.totalSize || 0)}</td>
            <td>${errorCell}</td>
        `;

        resultsBody.appendChild(row);

        // Add click handler for error link
        if (errorCount > 0) {
            const errorLink = row.querySelector('.error-link');
            errorLink.addEventListener('click', (e) => {
                e.preventDefault();
                showErrorDetails(result.poNumber, result.errors);
            });
        }
    });
}

function showErrorDetails(poNumber, errors) {
    let errorMessage = `Errors for PO ${poNumber}:\n\n`;

    errors.forEach((error, index) => {
        errorMessage += `Error ${index + 1}:\n`;
        errorMessage += `Item: ${error.itemNumber || 'Unknown'}\n`;
        errorMessage += `Reason: ${error.reason || error.message || error}\n`;
        errorMessage += '\n';
    });

    showAlert(errorMessage);
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

// Informed Parties functionality
const informedPartyEmail = document.getElementById('informed-party-email');
const addInformedPartyBtn = document.getElementById('add-informed-party-btn');
const informedPartiesList = document.getElementById('informed-parties-list');

let informedParties = [];

// Load informed parties when profile loads
async function loadInformedParties() {
    try {
        const response = await fetch('/api/informed-parties');
        const data = await response.json();
        informedParties = data.emails || [];
        renderInformedParties();
    } catch (error) {
        console.error('Error loading informed parties:', error);
    }
}

function renderInformedParties() {
    if (informedParties.length === 0) {
        informedPartiesList.innerHTML = '<p style="color: #888; font-size: 14px;">No informed parties added yet.</p>';
        return;
    }

    informedPartiesList.innerHTML = informedParties.map((email, index) => `
        <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid #4db8a433; margin-bottom: 8px; background-color: #0d0d18;">
            <span style="flex: 1; font-size: 14px;">${email}</span>
            <button class="delete-btn" onclick="removeInformedParty(${index})" style="padding: 5px 10px; font-size: 12px;">Remove</button>
        </div>
    `).join('');
}

addInformedPartyBtn.addEventListener('click', async () => {
    const email = informedPartyEmail.value.trim();

    if (!email) {
        showProfileMessage('Please enter an email address', 'error');
        return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showProfileMessage('Please enter a valid email address', 'error');
        return;
    }

    if (informedParties.includes(email)) {
        showProfileMessage('This email is already in the list', 'error');
        return;
    }

    try {
        const response = await fetch('/api/informed-parties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            throw new Error(`Failed to add email: ${response.statusText}`);
        }

        informedParties.push(email);
        informedPartyEmail.value = '';
        renderInformedParties();
        showProfileMessage('Email added successfully', 'success');
    } catch (error) {
        showProfileMessage('Error adding email: ' + error.message, 'error');
    }
});

async function removeInformedParty(index) {
    const email = informedParties[index];

    try {
        const response = await fetch('/api/informed-parties', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            throw new Error(`Failed to remove email: ${response.statusText}`);
        }

        informedParties.splice(index, 1);
        renderInformedParties();
        showProfileMessage('Email removed successfully', 'success');
    } catch (error) {
        showProfileMessage('Error removing email: ' + error.message, 'error');
    }
}

// Update loadProfile to also load informed parties
const originalLoadProfile = loadProfile;
loadProfile = async function() {
    await originalLoadProfile();
    await loadInformedParties();
};

// Order Status functionality
const searchBtn = document.getElementById('search-btn');
const loadMoreBtn = document.getElementById('load-more-btn');
const showAllBtn = document.getElementById('show-all-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
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

// Export Excel
exportExcelBtn.addEventListener('click', async () => {
    try {
        exportExcelBtn.disabled = true;

        const response = await fetch('/api/export-excel');

        if (!response.ok) {
            throw new Error(`Failed to export Excel: ${response.statusText}`);
        }

        // Get the blob from the response
        const blob = await response.blob();

        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${new Date().toISOString().split('T')[0]}-all-orders-export.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        await showAlert('Excel file exported successfully');
        exportExcelBtn.disabled = false;
    } catch (error) {
        await showAlert('Error exporting Excel: ' + error.message);
        exportExcelBtn.disabled = false;
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
        ordersBody.innerHTML = '<tr><td colspan="22" style="text-align: center;">No orders found</td></tr>';
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

        // Get current PO status or default to 'created PO'
        const currentStatus = order.po_status || 'created PO';

        // Format status display
        const statusDisplay = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);

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
            <td><button class="qc-report-btn" data-po="${order.po_number}">QC report</button></td>
            <td class="progress-status-cell" data-po="${order.po_number}">Loading...</td>
            <td><button class="view-po-btn" data-po="${order.po_number}" data-status="${currentStatus}">View PO#</button></td>
            <td><button class="view-details-btn" data-po="${order.po_number}">View Details</button></td>
            <td><button class="po-status-btn" data-po="${order.po_number}" data-status="${currentStatus}" style="padding: 8px 16px; background-color: #2196F3; color: white; border: none; cursor: pointer; font-size: 13px;">${statusDisplay}</button></td>
            <td><button class="delete-btn" data-po="${order.po_number}">Delete</button></td>
        `;
        ordersBody.appendChild(row);
    });

    // Fetch and populate progress status for each PO
    orders.forEach(async (order) => {
        try {
            const response = await fetch(`/api/progress/${order.po_number}/latest`);
            const progressData = await response.json();

            const cell = document.querySelector(`.progress-status-cell[data-po="${order.po_number}"]`);
            if (cell) {
                if (progressData && progressData.department) {
                    cell.textContent = progressData.department;
                } else {
                    cell.textContent = 'N/A';
                }
            }
        } catch (error) {
            const cell = document.querySelector(`.progress-status-cell[data-po="${order.po_number}"]`);
            if (cell) {
                cell.textContent = 'N/A';
            }
        }
    });

    // Add click handlers to QC report buttons
    document.querySelectorAll('.qc-report-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const poNumber = e.target.getAttribute('data-po');
            await generateQCReport(poNumber);
        });
    });

    // Add click handlers to View PO# buttons (opens modal without action button)
    document.querySelectorAll('.view-po-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const poNumber = e.target.getAttribute('data-po');
            const currentStatus = e.target.getAttribute('data-status');
            await openPODisplayModal(poNumber, currentStatus, false);
        });
    });

    // Add click handlers to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const poNumber = e.target.getAttribute('data-po');
            await deletePO(poNumber);
        });
    });

    // Add click handlers to View Details buttons
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const poNumber = e.target.getAttribute('data-po');
            await openPOFullDetailsModal(poNumber);
        });
    });

    // Add click handlers to PO status buttons (only for pending status)
    document.querySelectorAll('.po-status-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const poNumber = e.target.getAttribute('data-po');
            const currentStatus = e.target.getAttribute('data-status');

            // Only open modal for pending status
            if (currentStatus === 'pending') {
                await openPODisplayModal(poNumber, currentStatus);
            }
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

async function updatePOStatus(poNumber, newStatus) {
    try {
        const response = await fetch(`/api/orders/${poNumber}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ po_status: newStatus })
        });

        if (!response.ok) {
            throw new Error(`Failed to update PO status: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`PO ${poNumber} status updated to: ${newStatus}`);
    } catch (error) {
        await showAlert('Error updating PO status: ' + error.message);
        // Reload the orders list to revert the dropdown to the previous value
        await loadLatestOrders(10);
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
const messageDatePicker = document.getElementById('message-date-picker');
const messageProgressSection = document.getElementById('message-progress-section');
const messageProgressLog = document.getElementById('message-progress-log');
const messagesListSection = document.getElementById('messages-list-section');
const messagesBody = document.getElementById('messages-body');

// Function to load all messages from database
async function loadAllMessagesFromDatabase() {
    try {
        messagesBody.innerHTML = '';
        messageProgressSection.style.display = 'none';
        messagesListSection.style.display = 'block';

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
                messageLink: msg.message_link,
                commentId: msg.comment_id,
                created_at: msg.created_at
            })));
        } else {
            messagesTitle.textContent = 'No Messages Found';
            messagesBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No messages in database</td></tr>';
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        messagesTitle.textContent = 'Error Loading Messages';
        messagesBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Error loading messages</td></tr>';
    }
}

// Set date picker to today's date and auto-load messages when Message view is activated
document.querySelectorAll('.nav-button').forEach(button => {
    button.addEventListener('click', () => {
        if (button.getAttribute('data-view') === 'message') {
            // Set date picker to today
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            messageDatePicker.value = `${year}-${month}-${day}`;

            // Automatically load all messages from database
            loadAllMessagesFromDatabase();
        }
    });
});

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

                // Wait a moment for database to finish saving, then reload messages from database
                setTimeout(async () => {
                    addMessageProgressLog('Loading messages from database...', 'info');
                    await loadAllMessagesFromDatabase();
                }, 500);

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
        // Format created_at timestamp
        let formattedCreatedTime = 'N/A';
        if (message.created_at) {
            const date = new Date(message.created_at);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            formattedCreatedTime = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${message.refNumber}</td>
            <td>${message.author}</td>
            <td>${message.receivedDate}</td>
            <td>${message.subject}</td>
            <td>${message.comment}</td>
            <td>${formattedCreatedTime}</td>
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

        // Intercept clicks on Reply button within the message content
        // Find all input buttons and regular buttons
        const allButtons = modalBody.querySelectorAll('input[type="button"], button');
        allButtons.forEach(btn => {
            // Check if the button text/value contains "Reply"
            const buttonText = (btn.value || btn.textContent || '').trim();
            if (buttonText.toLowerCase().includes('reply')) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Extract CommentId from the stored message link or use the stored commentId
                    let commentId = null;

                    // Try to get commentId from the message object first
                    if (message.commentId) {
                        commentId = message.commentId;
                    } else if (message.messageLink) {
                        // Fallback: extract from URL
                        try {
                            const url = new URL(message.messageLink);
                            commentId = url.searchParams.get('CommentId');
                        } catch (error) {
                            console.error('Could not extract CommentId:', error);
                        }
                    }

                    if (commentId) {
                        // Construct the reply URL
                        const replyUrl = `https://app.e-brandid.com/Bidnet/bidnet2/CommentsNewMessage.aspx?Type=RA&CommentId=${commentId}`;
                        console.log('Opening reply URL:', replyUrl);

                        // Open in new window
                        window.open(replyUrl, '_blank');
                    } else {
                        alert('Could not determine CommentId for reply');
                    }
                });
            }
        });

        // Show the modal
        modal.style.display = 'flex';
    }
};

// Close message detail modal when clicking the X button
document.getElementById('message-close-btn').addEventListener('click', () => {
    const modal = document.getElementById('message-detail-modal');
    modal.style.display = 'none';
});

// Reply button functionality
document.getElementById('message-reply-btn').addEventListener('click', () => {
    // Get the current message from the modal
    const messageLink = document.getElementById('message-link');

    // Extract CommentId from the link
    let commentId = null;
    try {
        const url = new URL(messageLink.href);
        commentId = url.searchParams.get('CommentId');
    } catch (error) {
        console.error('Could not extract CommentId:', error);
    }

    if (commentId) {
        // Open the reply form URL in a new tab
        const replyUrl = `https://app.e-brandid.com/Bidnet/bidnet2/CommentsNewMessage.aspx?Type=RA&CommentId=${commentId}`;
        console.log('Opening reply URL in new tab:', replyUrl);

        // Open in new tab
        window.open(replyUrl, '_blank');
    } else {
        alert('Could not determine CommentId for reply');
    }
});

// Close reply modal when clicking the X button
document.getElementById('reply-modal-close-btn').addEventListener('click', () => {
    const replyModal = document.getElementById('reply-modal');
    const replyIframe = document.getElementById('reply-iframe');

    replyModal.style.display = 'none';
    replyIframe.src = ''; // Clear iframe to stop loading
});

// Close reply modal when clicking outside the content
document.getElementById('reply-modal').addEventListener('click', (e) => {
    if (e.target.id === 'reply-modal') {
        const replyModal = document.getElementById('reply-modal');
        const replyIframe = document.getElementById('reply-iframe');

        replyModal.style.display = 'none';
        replyIframe.src = ''; // Clear iframe to stop loading
    }
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
    // Get selected date from date picker
    const selectedDate = messageDatePicker.value;

    if (!selectedDate) {
        await showAlert('Please select a date');
        return;
    }

    // Get headless mode preference (inverted: checked = visible, unchecked = headless)
    const headless = !document.getElementById('message-headless-toggle').checked;

    messageProgressLog.innerHTML = '';
    messagesBody.innerHTML = '';
    messageProgressSection.style.display = 'block';
    messagesListSection.style.display = 'none';
    fetchMsgBtn.disabled = true;

    addMessageProgressLog(`Starting message fetch for ${selectedDate}...`, 'info');

    try {
        const response = await fetch('/api/fetch-messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ date: selectedDate, headless })
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
                messageLink: msg.message_link,
                commentId: msg.comment_id,
                created_at: msg.created_at
            })));
        } else {
            messagesTitle.textContent = 'No Messages Found';
            messagesBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No messages in database</td></tr>';
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

// Item functionality
const itemsBody = document.getElementById('items-body');

// Auto-load items when Item view is activated
document.querySelectorAll('.nav-button').forEach(button => {
    button.addEventListener('click', () => {
        if (button.getAttribute('data-view') === 'item') {
            loadAllItems();
        }
    });
});

async function loadAllItems() {
    try {
        itemsBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading...</td></tr>';

        const response = await fetch('/api/items');
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            displayItems(data.items);
        } else {
            itemsBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No items found</td></tr>';
        }

        // Initialize filters for items table
        initializeTableFilters('items-table');
    } catch (error) {
        itemsBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Error loading items</td></tr>';
        console.error('Error loading items:', error);
    }
}

function displayItems(items) {
    itemsBody.innerHTML = '';

    items.forEach((item, index) => {
        const row = document.createElement('tr');

        // Format created_at date
        let formattedDate = 'N/A';
        if (item.created_at) {
            const date = new Date(item.created_at);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            formattedDate = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
        }

        // Construct full item number
        const fullItemNumber = item.suffix ? `${item.item_1}-${item.suffix}` : item.item_1;

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.internal_seq || 'N/A'}</td>
            <td>${fullItemNumber}</td>
            <td>${item.item_1}</td>
            <td>${item.suffix || ''}</td>
            <td>${formattedDate}</td>
            <td><button class="submit-btn view-item-detail-btn" data-item1="${item.item_1}" data-suffix="${item.suffix || ''}">View Detail</button></td>
        `;

        itemsBody.appendChild(row);
    });

    // Add click handlers to view detail buttons
    document.querySelectorAll('.view-item-detail-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const item1 = e.target.getAttribute('data-item1');
            const suffix = e.target.getAttribute('data-suffix');
            await openItemDetailModal(item1, suffix);
        });
    });
}

// Item Detail Modal functionality
async function openItemDetailModal(item1, suffix) {
    const modal = document.getElementById('item-detail-modal');
    const form = document.getElementById('item-detail-form');

    // Set hidden fields
    document.getElementById('detail-item-1').value = item1;
    document.getElementById('detail-suffix').value = suffix || '';

    // Clear all form fields first
    form.querySelectorAll('input[type="text"]').forEach(input => {
        input.value = '';
    });

    let hasExistingData = false;

    // Try to load existing details
    try {
        // If suffix is empty, use 'null' as a placeholder in the URL
        const suffixParam = (suffix && suffix !== '') ? suffix : 'null';
        const response = await fetch(`/api/items/${encodeURIComponent(item1)}/${encodeURIComponent(suffixParam)}/details`);

        if (response.ok) {
            const data = await response.json();

            // Populate form fields if data exists
            if (data.details) {
                hasExistingData = true;
                const details = data.details;
                document.getElementById('detail-brand-name').value = details.brand_name || '';
                document.getElementById('detail-machine-number').value = details.machine_number || '';
                document.getElementById('detail-machine-opening').value = details.machine_opening || '';
                document.getElementById('detail-pattern-name').value = details.pattern_name || '';
                document.getElementById('detail-pattern-writer').value = details.pattern_writer || '';
                document.getElementById('detail-dragon-head').value = details.dragon_head || '';
                document.getElementById('detail-machine-density').value = details.machine_density || '';
                document.getElementById('detail-pattern-density').value = details.pattern_density || '';
                document.getElementById('detail-total-length-mm').value = details.total_length_mm || '';
                document.getElementById('detail-skirt-opening').value = details.skirt_opening || '';
                document.getElementById('detail-actual-length').value = details.actual_length || '';
                document.getElementById('detail-width-mm').value = details.width_mm || '';
                document.getElementById('detail-x-coordinate').value = details.x_coordinate || '';
                document.getElementById('detail-y-coordinate').value = details.y_coordinate || '';
                document.getElementById('detail-picks').value = details.picks || '';
                document.getElementById('detail-cut-per-group').value = details.cut_per_group || '';
                document.getElementById('detail-total-cut').value = details.total_cut || '';
                document.getElementById('detail-total-assembly').value = details.total_assembly || '';
                document.getElementById('detail-schedule-progress').value = details.schedule_progress || '';
                document.getElementById('detail-actual-cut').value = details.actual_cut || '';
            }
        }
    } catch (error) {
        console.error('Error loading item details:', error);
    }

    // Set form to read-only mode if data exists
    if (hasExistingData) {
        setFormReadOnlyMode(true);
    } else {
        setFormReadOnlyMode(false);
    }

    // Show modal
    modal.style.display = 'flex';
}

// Function to toggle form read-only mode
function setFormReadOnlyMode(isReadOnly) {
    const form = document.getElementById('item-detail-form');
    const saveBtn = form.querySelector('button[type="submit"]');
    const editBtn = document.getElementById('edit-detail-btn');
    const cancelBtn = document.getElementById('cancel-detail-btn');
    const fillDummyBtn = document.getElementById('fill-dummy-btn');

    // Disable/enable all text inputs
    form.querySelectorAll('input[type="text"]').forEach(input => {
        input.disabled = isReadOnly;
    });

    if (isReadOnly) {
        // Read-only mode: show Edit button, hide Save and Fill Dummy buttons
        saveBtn.style.display = 'none';
        fillDummyBtn.style.display = 'none';
        editBtn.style.display = 'inline-block';
    } else {
        // Edit mode: show Save and Fill Dummy buttons, hide Edit button
        saveBtn.style.display = 'inline-block';
        fillDummyBtn.style.display = 'inline-block';
        editBtn.style.display = 'none';
    }
}

// Close item detail modal
document.getElementById('item-detail-close-btn').addEventListener('click', () => {
    document.getElementById('item-detail-modal').style.display = 'none';
});

document.getElementById('cancel-detail-btn').addEventListener('click', () => {
    document.getElementById('item-detail-modal').style.display = 'none';
});

// Edit button - switch from read-only to edit mode
document.getElementById('edit-detail-btn').addEventListener('click', () => {
    setFormReadOnlyMode(false);
});

// Close modal when clicking outside
document.getElementById('item-detail-modal').addEventListener('click', (e) => {
    if (e.target.id === 'item-detail-modal') {
        document.getElementById('item-detail-modal').style.display = 'none';
    }
});

// Fill dummy data
document.getElementById('fill-dummy-btn').addEventListener('click', () => {
    document.getElementById('detail-brand-name').value = 'Sample Brand';
    document.getElementById('detail-machine-number').value = 'M-001';
    document.getElementById('detail-machine-opening').value = '48';
    document.getElementById('detail-pattern-name').value = 'Floral Pattern A';
    document.getElementById('detail-pattern-writer').value = 'John Doe';
    document.getElementById('detail-dragon-head').value = 'DH-123';
    document.getElementById('detail-machine-density').value = '25.5';
    document.getElementById('detail-pattern-density').value = '26.0';
    document.getElementById('detail-total-length-mm').value = '1200';
    document.getElementById('detail-skirt-opening').value = '300';
    document.getElementById('detail-actual-length').value = '1180';
    document.getElementById('detail-width-mm').value = '150';
    document.getElementById('detail-x-coordinate').value = '100';
    document.getElementById('detail-y-coordinate').value = '200';
    document.getElementById('detail-picks').value = '3000';
    document.getElementById('detail-cut-per-group').value = '10';
    document.getElementById('detail-total-cut').value = '100';
    document.getElementById('detail-total-assembly').value = '95';
    document.getElementById('detail-schedule-progress').value = 'In Progress';
    document.getElementById('detail-actual-cut').value = '98';
});

// Save item details
document.getElementById('item-detail-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        item_1: document.getElementById('detail-item-1').value,
        suffix: document.getElementById('detail-suffix').value || null,
        brand_name: document.getElementById('detail-brand-name').value,
        machine_number: document.getElementById('detail-machine-number').value,
        machine_opening: document.getElementById('detail-machine-opening').value,
        pattern_name: document.getElementById('detail-pattern-name').value,
        pattern_writer: document.getElementById('detail-pattern-writer').value,
        dragon_head: document.getElementById('detail-dragon-head').value,
        machine_density: document.getElementById('detail-machine-density').value,
        pattern_density: document.getElementById('detail-pattern-density').value,
        total_length_mm: document.getElementById('detail-total-length-mm').value,
        skirt_opening: document.getElementById('detail-skirt-opening').value,
        actual_length: document.getElementById('detail-actual-length').value,
        width_mm: document.getElementById('detail-width-mm').value,
        x_coordinate: document.getElementById('detail-x-coordinate').value,
        y_coordinate: document.getElementById('detail-y-coordinate').value,
        picks: document.getElementById('detail-picks').value,
        cut_per_group: document.getElementById('detail-cut-per-group').value,
        total_cut: document.getElementById('detail-total-cut').value,
        total_assembly: document.getElementById('detail-total-assembly').value,
        schedule_progress: document.getElementById('detail-schedule-progress').value,
        actual_cut: document.getElementById('detail-actual-cut').value
    };

    console.log('Saving item details:', formData);

    try {
        const response = await fetch('/api/items/details', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        console.log('Save response status:', response.status);

        if (!response.ok) {
            throw new Error(`Failed to save item details: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Save result:', result);

        // Close modal first
        const modal = document.getElementById('item-detail-modal');
        modal.style.display = 'none';
        console.log('Modal closed');

        // Then show success alert
        await showAlert('Item details saved successfully!');
        console.log('Alert dismissed');
    } catch (error) {
        console.error('Error saving item details:', error);
        await showAlert('Error saving item details: ' + error.message);
    }
});

// Helper function to get next status in progression
function getNextStatus(currentStatus) {
    const statusProgression = {
        'pending': 'created PO',
        'created PO': 'preparation',
        'preparation': 'processing',
        'processing': 'cutting',
        'cutting': 'packaging',
        'packaging': 'stock',
        'stock': 'shipped out',
        'shipped out': null // Final status
    };
    return statusProgression[currentStatus] || null;
}

// Helper function to get action button text
function getActionButtonText(currentStatus) {
    const buttonText = {
        'pending': 'Create PO',
        'created PO': 'Start Preparation',
        'preparation': 'Start Processing',
        'processing': 'Start Cutting',
        'cutting': 'Start Packaging',
        'packaging': 'Move to Stock',
        'stock': 'Ship Out',
        'shipped out': null // No action for final status
    };
    return buttonText[currentStatus] || null;
}

// PO Display Modal functionality
async function openPODisplayModal(poNumber, currentStatus, showActionButton = true) {
    const modal = document.getElementById('po-display-modal');
    const poDisplayNumber = document.getElementById('po-display-number');
    const poDisplayDate = document.getElementById('po-display-date');
    const poDisplayItems = document.getElementById('po-display-items');
    const poQrCode = document.getElementById('po-qr-code');

    try {
        // Fetch PO details with internal sequence numbers
        const response = await fetch(`/api/orders/${encodeURIComponent(poNumber)}/display`);

        if (!response.ok) {
            throw new Error(`Failed to load PO details: ${response.statusText}`);
        }

        const data = await response.json();

        // Set PO number and date
        poDisplayNumber.textContent = data.po_number;
        poDisplayDate.textContent = data.po_date || 'N/A';

        // Clear and populate items table
        poDisplayItems.innerHTML = '';
        data.items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 10px; border: 1px solid #ddd;">${item.item_number}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${item.description || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${item.color || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${item.qty || 0}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${item.internal_seq || 'N/A'}</td>
            `;
            poDisplayItems.appendChild(row);
        });

        // Clear previous QR code
        poQrCode.innerHTML = '';

        // Generate QR code with PO number
        new QRCode(poQrCode, {
            text: data.po_number,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Add or update action button
        const actionButtonContainer = document.getElementById('po-action-btn-container');

        // Clear existing button if present
        actionButtonContainer.innerHTML = '';

        // Add action button if not in final status and showActionButton is true
        if (showActionButton) {
            const nextStatus = getNextStatus(currentStatus);
            const buttonText = getActionButtonText(currentStatus);

            if (nextStatus && buttonText) {
                const actionButton = document.createElement('button');
                actionButton.id = 'po-action-btn';
                actionButton.className = 'submit-btn';
                actionButton.textContent = buttonText;
                actionButton.style.backgroundColor = '#4CAF50';
                actionButton.style.padding = '8px 16px';
                actionButton.style.fontSize = '14px';

                actionButton.addEventListener('click', async () => {
                    await advancePOStatus(poNumber, nextStatus);
                });

                actionButtonContainer.appendChild(actionButton);
            }
        }

        // Show modal
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error opening PO display modal:', error);
        await showAlert('Error loading PO details: ' + error.message);
    }
}

// Close PO display modal
document.getElementById('po-display-close-btn').addEventListener('click', () => {
    document.getElementById('po-display-modal').style.display = 'none';
});

// Close PO full details modal
document.getElementById('po-full-details-close-btn').addEventListener('click', () => {
    document.getElementById('po-full-details-modal').style.display = 'none';
});

// Open PO Full Details Modal
async function openPOFullDetailsModal(poNumber) {
    const modal = document.getElementById('po-full-details-modal');
    const modalBody = document.getElementById('po-full-details-body');

    try {
        const response = await fetch(`/api/orders/${encodeURIComponent(poNumber)}`);
        if (!response.ok) {
            throw new Error(`Failed to load PO details: ${response.statusText}`);
        }
        const data = await response.json();

        let totalQty = 0;
        let totalAmount = 0;
        let itemsHtml = '';

        if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
                const qty = item.qty || 0;
                const ext = item.extension || 0;
                totalQty += qty;
                totalAmount += ext;
                itemsHtml += `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.item_number || ''}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.description || ''}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.color || ''}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.ship_to || ''}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.need_by || ''}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${qty.toLocaleString()}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.bundle_qty || 'NA'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.unit_price ? item.unit_price.toFixed(5) : '0.00000'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${ext.toFixed(2)}</td>
                    </tr>
                `;
            });
        }

        modalBody.innerHTML = `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; width: 50%; vertical-align: top;">
                        <strong>Purchased From:</strong><br>
                        ${data.vendor_name || 'N/A'}<br>
                        ${data.vendor_address1 || ''}<br>
                        ${data.vendor_address2 || ''}<br>
                        ${data.vendor_address3 || ''}
                    </td>
                    <td style="padding: 10px; border: 1px solid #ddd; width: 25%; vertical-align: top;">
                        <strong>Ship To:</strong><br>
                        ${data.ship_to_name || 'N/A'}<br>
                        ${data.ship_to_address1 || ''}<br>
                        ${data.ship_to_address2 || ''}<br>
                        ${data.ship_to_address3 || ''}
                    </td>
                    <td style="padding: 10px; border: 1px solid #ddd; width: 25%; vertical-align: top;">
                        <strong>Company:</strong> ${data.company || 'N/A'}<br>
                        <strong>Currency:</strong> ${data.currency || 'N/A'}<br>
                        <strong>Cancel Date:</strong> ${data.cancel_date || 'N/A'}<br>
                        <strong>Terms:</strong> ${data.terms || 'N/A'}
                    </td>
                </tr>
            </table>

            <h3 style="margin: 15px 0 10px 0;">Items</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Item #</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Description</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Color</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Ship To</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Need By</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Qty</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Bundle Qty</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">$ Unit Price</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Extension</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr style="background-color: #f5f5f5; font-weight: bold;">
                        <td colspan="5" style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total:</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${totalQty.toLocaleString()}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;"></td>
                        <td style="padding: 8px; border: 1px solid #ddd;"></td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${totalAmount.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>

            <h3 style="margin: 15px 0 10px 0;">Comments</h3>
            <div style="padding: 10px; border: 1px solid #ddd; background: #fafafa; min-height: 30px;">
                ${data.comments || ''}
            </div>

            <h3 style="margin: 15px 0 10px 0;">Note</h3>
            <div style="padding: 10px; border: 1px solid #ddd; background: #fafafa; min-height: 30px;">
                All invoices must be received within ten days of the shipment. If invoices are not received within the ten days, Brand ID will pay net from the date of the invoice receipt. If Brand ID does not receive an invoice within 20 days of the ship date, Brand ID will consider the shipment NO charge.
            </div>
        `;

        modal.style.display = 'block';
    } catch (error) {
        console.error('Error opening PO full details modal:', error);
        await showAlert('Error loading PO details: ' + error.message);
    }
}

// Advance PO status to next step
async function advancePOStatus(poNumber, nextStatus) {
    try {
        const response = await fetch(`/api/orders/${poNumber}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ po_status: nextStatus })
        });

        if (!response.ok) {
            throw new Error(`Failed to update PO status: ${response.statusText}`);
        }

        // Close modal
        document.getElementById('po-display-modal').style.display = 'none';

        // Show success message
        const statusDisplay = nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1);
        await showAlert(`PO status updated to: ${statusDisplay}`);

        // Reload the orders list to show updated status
        await loadLatestOrders(10);
    } catch (error) {
        await showAlert('Error updating PO status: ' + error.message);
    }
}

// Download PO as PDF
document.getElementById('download-po-pdf-btn').addEventListener('click', async () => {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Get PO details from the modal
        const poNumber = document.getElementById('po-display-number').textContent;
        const poDate = document.getElementById('po-display-date').textContent;

        // Function to add header to each page
        const addHeader = () => {
            // Header: Purchase Order title
            doc.setFontSize(20);
            doc.setFont(undefined, 'bold');
            doc.text('Purchase Order', 105, 20, { align: 'center' });

            // PO Number and Date
            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            doc.text(`PO Number: ${poNumber}`, 20, 35);
            doc.text(`PO Date: ${poDate}`, 20, 42);

            // Add QR Code
            const qrCodeCanvas = document.querySelector('#po-qr-code canvas');
            if (qrCodeCanvas) {
                const qrCodeImage = qrCodeCanvas.toDataURL('image/png');
                doc.addImage(qrCodeImage, 'PNG', 155, 25, 35, 35);
            }
        };

        // Function to add footer with page number
        const addFooter = (pageNum, totalPages) => {
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Page ${pageNum} of ${totalPages}`, 105, 287, { align: 'center' });
        };

        // Add header to first page
        addHeader();

        // Line Items Table
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Line Items', 20, 70);

        // Get table data
        const itemsTable = document.getElementById('po-display-items');
        const rows = itemsTable.querySelectorAll('tr');

        // Table configuration
        const tableStartY = 78;
        const rowHeight = 8;
        const colWidths = [40, 45, 25, 15, 35]; // Item#, Description, Color, Qty, Internal Seq#
        const colX = [20, 60, 105, 130, 145];

        let yPosition = tableStartY;
        doc.setFontSize(8);

        // Draw table header with borders
        doc.setFont(undefined, 'bold');
        doc.setDrawColor(0, 0, 0); // Black color
        doc.setLineWidth(0.3); // 1px border

        // Header background
        doc.setFillColor(240, 240, 240);
        doc.rect(colX[0], yPosition - 6, colWidths[0], rowHeight, 'FD');
        doc.rect(colX[1], yPosition - 6, colWidths[1], rowHeight, 'FD');
        doc.rect(colX[2], yPosition - 6, colWidths[2], rowHeight, 'FD');
        doc.rect(colX[3], yPosition - 6, colWidths[3], rowHeight, 'FD');
        doc.rect(colX[4], yPosition - 6, colWidths[4], rowHeight, 'FD');

        // Header text
        doc.text('Item #', colX[0] + 2, yPosition);
        doc.text('Description', colX[1] + 2, yPosition);
        doc.text('Color', colX[2] + 2, yPosition);
        doc.text('Qty', colX[3] + 2, yPosition);
        doc.text('Internal Seq#', colX[4] + 2, yPosition);

        yPosition += rowHeight;
        doc.setFont(undefined, 'normal');

        // Table rows with borders
        rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
                const itemNum = cells[0].textContent.trim();
                const description = cells[1].textContent.trim();
                const color = cells[2].textContent.trim();
                const qty = cells[3].textContent.trim();
                const internalSeq = cells[4].textContent.trim();

                // Check if we need a new page
                if (yPosition > 260) {
                    doc.addPage();
                    addHeader();
                    yPosition = tableStartY;

                    // Redraw table header on new page
                    doc.setFontSize(8);
                    doc.setFont(undefined, 'bold');
                    doc.setFillColor(240, 240, 240);
                    doc.rect(colX[0], yPosition - 6, colWidths[0], rowHeight, 'FD');
                    doc.rect(colX[1], yPosition - 6, colWidths[1], rowHeight, 'FD');
                    doc.rect(colX[2], yPosition - 6, colWidths[2], rowHeight, 'FD');
                    doc.rect(colX[3], yPosition - 6, colWidths[3], rowHeight, 'FD');
                    doc.rect(colX[4], yPosition - 6, colWidths[4], rowHeight, 'FD');

                    doc.text('Item #', colX[0] + 2, yPosition);
                    doc.text('Description', colX[1] + 2, yPosition);
                    doc.text('Color', colX[2] + 2, yPosition);
                    doc.text('Qty', colX[3] + 2, yPosition);
                    doc.text('Internal Seq#', colX[4] + 2, yPosition);

                    yPosition += rowHeight;
                    doc.setFont(undefined, 'normal');
                }

                // Draw cell borders
                doc.rect(colX[0], yPosition - 6, colWidths[0], rowHeight);
                doc.rect(colX[1], yPosition - 6, colWidths[1], rowHeight);
                doc.rect(colX[2], yPosition - 6, colWidths[2], rowHeight);
                doc.rect(colX[3], yPosition - 6, colWidths[3], rowHeight);
                doc.rect(colX[4], yPosition - 6, colWidths[4], rowHeight);

                // Cell text
                doc.text(itemNum, colX[0] + 2, yPosition);
                doc.text(description.substring(0, 25), colX[1] + 2, yPosition);
                doc.text(color, colX[2] + 2, yPosition);
                doc.text(qty, colX[3] + 2, yPosition);
                doc.text(internalSeq, colX[4] + 2, yPosition);

                yPosition += rowHeight;
            }
        });

        // Add footers with page numbers to all pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addFooter(i, totalPages);
        }

        // Save the PDF
        doc.save(`PO_${poNumber}.pdf`);

        await showAlert('PDF downloaded successfully!');
    } catch (error) {
        console.error('Error generating PDF:', error);
        await showAlert('Error generating PDF: ' + error.message);
    }
});

// ========== PROGRESS TRACKING ==========

let html5QrCode = null;
let lastScannedPO = null;
let progressPieChart = null;
let selectedPieIndex = null; // Track selected pie section
let currentOrderedDepartments = []; // Store current department order for click handlers
let legendVisible = true;

// Initialize QR scanner when progress view is activated
document.querySelectorAll('.nav-button[data-view]').forEach(button => {
    button.addEventListener('click', () => {
        const viewName = button.getAttribute('data-view');

        if (viewName === 'progress') {
            // Load progress data
            loadProgressData();

            // Initialize QR scanner
            if (!html5QrCode) {
                initializeQRScanner();
            }
        } else {
            // Stop QR scanner when leaving progress view
            if (html5QrCode) {
                html5QrCode.stop().catch(err => console.log('Scanner already stopped'));
            }
        }
    });
});

// Initialize QR Scanner
function initializeQRScanner() {
    html5QrCode = new Html5Qrcode("qr-reader");

    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };

    html5QrCode.start(
        { facingMode: "environment" }, // Use rear camera on mobile
        config,
        (decodedText, decodedResult) => {
            // QR code successfully scanned
            if (decodedText !== lastScannedPO) {
                lastScannedPO = decodedText;
                document.getElementById('progress-manual-po').value = decodedText;

                // Visual feedback
                const qrReader = document.getElementById('qr-reader');
                qrReader.style.border = '3px solid #4db8a4';
                setTimeout(() => {
                    qrReader.style.border = '';
                }, 500);
            }
        },
        (errorMessage) => {
            // Scanning error (ignore, happens frequently)
        }
    ).catch(err => {
        console.error('Error starting QR scanner:', err);
        document.getElementById('qr-reader').innerHTML = '<p style="color: #c75070; padding: 20px;">Camera access denied or not available. Please use manual PO entry.</p>';
    });
}

// Submit progress scan
document.getElementById('submit-progress-btn').addEventListener('click', async () => {
    const poNumber = document.getElementById('progress-manual-po').value.trim();
    const department = document.getElementById('progress-department').value;
    const notes = document.getElementById('progress-notes').value.trim();

    if (!poNumber) {
        await showAlert('Please scan a QR code or enter a PO number');
        return;
    }

    if (!department) {
        await showAlert('Please select a department');
        return;
    }

    try {
        const response = await fetch('/api/progress/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                poNumber: poNumber,
                department: department,
                notes: notes || null
            })
        });

        const data = await response.json();

        if (response.ok) {
            await showAlert(`Scan recorded successfully!\nPO: ${poNumber}\nDepartment: ${department}`);

            // Clear form
            document.getElementById('progress-manual-po').value = '';
            document.getElementById('progress-department').value = '';
            document.getElementById('progress-notes').value = '';
            lastScannedPO = null;

            // Reload progress data
            loadProgressData();
        } else {
            await showAlert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error submitting scan:', error);
        await showAlert('Error submitting scan: ' + error.message);
    }
});

// Load progress data
async function loadProgressData() {
    try {
        const response = await fetch('/api/progress');
        const data = await response.json();

        const tbody = document.getElementById('progress-body');
        tbody.innerHTML = '';

        if (data.progress && data.progress.length > 0) {
            // Count departments for pie chart
            const departmentCounts = {};

            data.progress.forEach((item, index) => {
                const row = document.createElement('tr');

                // Format date
                const scanDate = new Date(item.latest_scan_time);
                const formattedDate = scanDate.toLocaleString();

                // Department badge color
                const deptColor = getDepartmentColor(item.latest_department);

                // Count departments
                departmentCounts[item.latest_department] = (departmentCounts[item.latest_department] || 0) + 1;

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td style="font-weight: bold;">${item.po_number}</td>
                    <td><span style="background-color: ${deptColor}; padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px;">${item.latest_department}</span></td>
                    <td>${formattedDate}</td>
                    <td style="text-align: center;"><span style="background-color: #6ba3be; padding: 4px 8px; border-radius: 12px; color: white; font-size: 12px; font-weight: bold;">${item.scan_count}</span></td>
                    <td><button class="view-history-btn" data-po="${item.po_number}">View History</button></td>
                `;

                tbody.appendChild(row);
            });

            // Add click handlers to View History buttons
            document.querySelectorAll('.view-history-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const poNumber = e.target.getAttribute('data-po');
                    await viewProgressHistory(poNumber);
                });
            });

            // Update pie chart
            updateProgressPieChart(departmentCounts);
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #6ba3be;">No progress scans recorded yet</td></tr>';

            // Clear pie chart
            if (progressPieChart) {
                progressPieChart.destroy();
                progressPieChart = null;
            }
        }

        // Reinitialize filters after loading data
        initializeTableFilters('progress-table');
    } catch (error) {
        console.error('Error loading progress data:', error);
    }
}

// Update pie chart with department distribution
function updateProgressPieChart(departmentCounts) {
    console.log('updateProgressPieChart called with:', departmentCounts);
    const ctx = document.getElementById('progress-pie-chart');

    if (!ctx) {
        console.error('Canvas element not found!');
        return;
    }

    console.log('Canvas element found:', ctx);

    // Define departments in sequence 1-8
    const departmentOrder = [
        'CS Team',
        'PMC',
        'Material',
        'Production',
        'Cut and Fold',
        'QC',
        'Shipment',
        'Account'
    ];

    // Reorder data according to sequence
    const orderedDepartments = [];
    const orderedCounts = [];
    const orderedColors = [];

    departmentOrder.forEach(dept => {
        if (departmentCounts[dept]) {
            orderedDepartments.push(dept);
            orderedCounts.push(departmentCounts[dept]);
            orderedColors.push(getDepartmentColor(dept));
        }
    });

    // Store for global access in click handlers
    currentOrderedDepartments = [...orderedDepartments];

    // Reset selection when updating chart
    selectedPieIndex = null;

    // Calculate total for percentages
    const total = orderedCounts.reduce((a, b) => a + b, 0);

    // Create labels with percentages
    const labelsWithPercentage = orderedDepartments.map((dept, index) => {
        const percentage = ((orderedCounts[index] / total) * 100).toFixed(1);
        return `${dept} (${percentage}%)`;
    });

    // Destroy existing chart if it exists
    if (progressPieChart) {
        progressPieChart.destroy();
    }

    // Create new chart
    progressPieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labelsWithPercentage,
            datasets: [{
                data: orderedCounts,
                backgroundColor: orderedColors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: {
                    right: 40
                }
            },
            plugins: {
                legend: {
                    display: legendVisible,
                    position: 'right',
                    align: 'start',
                    labels: {
                        color: '#6ba3be',
                        font: {
                            size: 12,
                            family: "'Courier New', monospace"
                        },
                        padding: 10,
                        boxWidth: 20,
                        boxHeight: 20,
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const meta = chart.getDatasetMeta(0);
                                    const style = meta.controller.getStyle(i);
                                    const isHidden = meta.data[i].hidden;

                                    return {
                                        text: label + (isHidden ? ' 👁️‍🗨️' : ' 👁️'),
                                        fillStyle: style.backgroundColor,
                                        strokeStyle: 'transparent',
                                        lineWidth: 0,
                                        hidden: isHidden,
                                        index: i,
                                        // Apply transparency if another section is selected
                                        alpha: selectedPieIndex !== null && selectedPieIndex !== i ? 0.5 : 1
                                    };
                                });
                            }
                            return [];
                        }
                    },
                    onClick: function(_, legendItem, legend) {
                        const index = legendItem.index;
                        const chart = legend.chart;
                        const meta = chart.getDatasetMeta(0);

                        // Check if the slice is visible
                        if (!meta.data[index].hidden) {
                            const department = currentOrderedDepartments[index];

                            // Toggle selection
                            if (selectedPieIndex === index) {
                                // Deselect if clicking the same section
                                selectedPieIndex = null;
                            } else {
                                // Select new section and show detail
                                selectedPieIndex = index;
                                console.log('Legend clicked - Index:', index, 'Department:', department);
                                showDepartmentDetailSplit(department, index);
                            }

                            // Update chart colors with transparency
                            updatePieChartColors(chart, orderedColors);
                        }
                    }
                },
                tooltip: {
                    backgroundColor: '#0a0a12',
                    titleColor: '#4db8a4',
                    bodyColor: '#6ba3be',
                    borderColor: '#4db8a444',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            return `${label}: ${value} POs`;
                        }
                    }
                }
            },
            onClick: (event, elements) => {
                // Only open detail view when clicking on pie slice, not legend
                if (elements.length > 0 && event.type === 'click') {
                    const index = elements[0].index;
                    const meta = progressPieChart.getDatasetMeta(0);

                    // Check if the slice is visible
                    if (!meta.data[index].hidden) {
                        const department = currentOrderedDepartments[index];

                        // Toggle selection
                        if (selectedPieIndex === index) {
                            // Deselect if clicking the same section
                            selectedPieIndex = null;
                        } else {
                            // Select new section and show detail
                            selectedPieIndex = index;
                            console.log('Pie slice clicked - Index:', index, 'Department:', department);
                            showDepartmentDetailSplit(department, index);
                        }

                        // Update chart colors with transparency
                        updatePieChartColors(progressPieChart, orderedColors);
                    }
                }
            }
        }
    });

    // Setup legend toggle button (only once)
    if (!window.legendToggleSetup) {
        setupLegendToggle();
        window.legendToggleSetup = true;
    }
}

// Update pie chart colors with transparency based on selection
function updatePieChartColors(chart, originalColors) {
    if (!chart) return;

    const dataset = chart.data.datasets[0];

    // Apply transparency to non-selected sections
    dataset.backgroundColor = originalColors.map((color, index) => {
        if (selectedPieIndex === null) {
            // No selection - show all at full opacity
            return color;
        } else if (selectedPieIndex === index) {
            // Selected section - full opacity
            return color;
        } else {
            // Non-selected sections - 50% transparency
            return color + '80'; // Add 50% alpha (80 in hex)
        }
    });

    chart.update();
}

// Setup legend toggle functionality
function setupLegendToggle() {
    const toggleBtn = document.getElementById('toggle-legend-btn');
    const eyeIcon = document.getElementById('legend-eye-icon');
    const toggleText = document.getElementById('legend-toggle-text');

    if (!toggleBtn) return;

    toggleBtn.onclick = function() {
        legendVisible = !legendVisible;

        if (legendVisible) {
            eyeIcon.textContent = '👁️';
            toggleText.textContent = 'Hide Legend';
        } else {
            eyeIcon.textContent = '👁️‍🗨️';
            toggleText.textContent = 'Show Legend';
        }

        // Update chart legend visibility
        if (progressPieChart) {
            progressPieChart.options.plugins.legend.display = legendVisible;
            progressPieChart.update();
        }
    };
}

// Show department detail modal
async function showDepartmentDetail(department) {
    try {
        const response = await fetch('/api/progress');
        const data = await response.json();

        // Filter POs by department
        const filteredPOs = data.progress.filter(po => po.latest_department === department);

        const modal = document.getElementById('department-detail-modal');
        const title = document.getElementById('department-detail-title');
        const tbody = document.getElementById('department-detail-tbody');

        title.textContent = `${department} - ${filteredPOs.length} POs`;
        tbody.innerHTML = '';

        filteredPOs.forEach(po => {
            const row = document.createElement('tr');
            const scanTime = po.last_scan_time ? new Date(po.last_scan_time).toLocaleString() : 'N/A';
            row.innerHTML = `
                <td style="padding: 10px; border: 1px solid #ddd;">${po.po_number}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${scanTime}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${po.scan_count || 0}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">
                    <button onclick="viewProgressHistory('${po.po_number}')" style="padding: 5px 10px; background-color: #6ba3be; color: white; border: none; border-radius: 3px; cursor: pointer;">View History</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Setup fuzzy search
        setupDepartmentFilters(filteredPOs);

        // Setup close button
        const closeBtn = document.getElementById('department-detail-close-btn');
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };

        // Setup click outside to close
        modal.onclick = function(e) {
            if (e.target.id === 'department-detail-modal') {
                modal.style.display = 'none';
            }
        };

        // Setup export button
        const exportBtn = document.getElementById('export-department-excel');
        exportBtn.onclick = function() {
            exportDepartmentToExcel(department, filteredPOs);
        };

        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading department details:', error);
    }
}

// Show department detail in split view
async function showDepartmentDetailSplit(department, index) {
    try {
        const response = await fetch('/api/progress');
        const data = await response.json();

        // Filter POs by department
        const filteredPOs = data.progress.filter(po => po.latest_department === department);

        console.log('Filtered POs for', department, ':', filteredPOs);

        // Fetch item counts and quantities for each PO
        const poDataPromises = filteredPOs.map(async (po) => {
            // Skip invalid PO numbers
            if (!po.po_number || po.po_number === 'PO' || po.po_number.length < 3) {
                console.warn('Skipping invalid PO number:', po.po_number);
                return { ...po, itemCount: 0, totalQty: 0 };
            }

            try {
                const itemsResponse = await fetch(`/api/po/${po.po_number}/items`);
                if (!itemsResponse.ok) {
                    console.warn(`Failed to fetch items for PO ${po.po_number}`);
                    return { ...po, itemCount: 0, totalQty: 0 };
                }
                const itemsData = await itemsResponse.json();
                const items = itemsData.items || [];
                const itemCount = items.length;
                const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
                return { ...po, itemCount, totalQty };
            } catch (error) {
                console.error(`Error fetching items for PO ${po.po_number}:`, error);
                return { ...po, itemCount: 0, totalQty: 0 };
            }
        });

        const enrichedPOs = await Promise.all(poDataPromises);

        // Update chart section to shrink
        const chartSection = document.getElementById('chart-section');
        const detailSection = document.getElementById('detail-section');

        chartSection.style.flex = '0 0 40%';
        detailSection.style.flex = '1';
        detailSection.style.opacity = '1';

        // Update detail section
        const title = document.getElementById('detail-section-title');
        const tbody = document.getElementById('detail-section-tbody');

        // Calculate total quantity across all POs
        const totalQuantity = enrichedPOs.reduce((sum, po) => sum + po.totalQty, 0);

        title.textContent = `${department} - ${filteredPOs.length} POs (${totalQuantity.toLocaleString()} total qty)`;
        tbody.innerHTML = '';

        enrichedPOs.forEach(po => {
            const row = document.createElement('tr');
            const scanTime = po.latest_scan_time ? new Date(po.latest_scan_time).toLocaleString() : 'N/A';
            row.style.backgroundColor = 'white';
            row.innerHTML = `
                <td style="padding: 10px; border: 1px solid #ddd; color: #333;">${po.po_number}</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: #333; text-align: center;">${po.itemCount}</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: #333; text-align: right;">${po.totalQty.toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: #333;">${scanTime}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">
                    <button onclick="viewProgressHistory('${po.po_number}')" style="padding: 5px 10px; background-color: #6ba3be; color: white; border: none; border-radius: 3px; cursor: pointer;">View History</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Setup fuzzy search
        setupDetailSectionFilters(enrichedPOs);

        // Setup close button
        const closeBtn = document.getElementById('close-detail-section');
        closeBtn.onclick = function() {
            closeDetailSection();
        };

        // Setup export button
        const exportBtn = document.getElementById('export-detail-excel');
        exportBtn.onclick = function() {
            exportDepartmentToExcel(department, enrichedPOs);
        };

    } catch (error) {
        console.error('Error loading department details:', error);
    }
}

// Close detail section and restore full chart
function closeDetailSection() {
    const chartSection = document.getElementById('chart-section');
    const detailSection = document.getElementById('detail-section');

    chartSection.style.flex = '1';
    detailSection.style.flex = '0';
    detailSection.style.opacity = '0';
}

// Setup fuzzy search filters for detail section
function setupDetailSectionFilters(data) {
    let filteredData = [...data];

    const filterPO = document.getElementById('filter-detail-po');
    const filterItems = document.getElementById('filter-detail-items');
    const filterQty = document.getElementById('filter-detail-qty');
    const filterTime = document.getElementById('filter-detail-time');

    function applyFilters() {
        const poFilter = filterPO.value.toLowerCase();
        const itemsFilter = filterItems.value.toLowerCase();
        const qtyFilter = filterQty.value.toLowerCase();
        const timeFilter = filterTime.value.toLowerCase();

        filteredData = data.filter(po => {
            const matchPO = po.po_number.toLowerCase().includes(poFilter);
            const matchItems = (po.itemCount || 0).toString().includes(itemsFilter);
            const matchQty = (po.totalQty || 0).toString().includes(qtyFilter);
            const matchTime = po.latest_scan_time ? new Date(po.latest_scan_time).toLocaleString().toLowerCase().includes(timeFilter) : false;
            return matchPO && matchItems && matchQty && matchTime;
        });

        renderDetailSectionTable(filteredData);
    }

    filterPO.oninput = applyFilters;
    filterItems.oninput = applyFilters;
    filterQty.oninput = applyFilters;
    filterTime.oninput = applyFilters;
}

// Render detail section table
function renderDetailSectionTable(data) {
    const tbody = document.getElementById('detail-section-tbody');
    tbody.innerHTML = '';

    data.forEach(po => {
        const row = document.createElement('tr');
        const scanTime = po.latest_scan_time ? new Date(po.latest_scan_time).toLocaleString() : 'N/A';
        row.style.backgroundColor = 'white';
        row.innerHTML = `
            <td style="padding: 10px; border: 1px solid #ddd; color: #333;">${po.po_number}</td>
            <td style="padding: 10px; border: 1px solid #ddd; color: #333; text-align: center;">${po.itemCount || 0}</td>
            <td style="padding: 10px; border: 1px solid #ddd; color: #333; text-align: right;">${(po.totalQty || 0).toLocaleString()}</td>
            <td style="padding: 10px; border: 1px solid #ddd; color: #333;">${scanTime}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">
                <button onclick="viewProgressHistory('${po.po_number}')" style="padding: 5px 10px; background-color: #6ba3be; color: white; border: none; border-radius: 3px; cursor: pointer;">View History</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Setup fuzzy search filters for department modal
function setupDepartmentFilters(data) {
    let filteredData = [...data];

    const filterPO = document.getElementById('filter-po');
    const filterTime = document.getElementById('filter-time');
    const filterCount = document.getElementById('filter-count');

    function applyFilters() {
        const poFilter = filterPO.value.toLowerCase();
        const timeFilter = filterTime.value.toLowerCase();
        const countFilter = filterCount.value.toLowerCase();

        filteredData = data.filter(po => {
            const matchPO = po.po_number.toLowerCase().includes(poFilter);
            const matchTime = new Date(po.last_scan_time).toLocaleString().toLowerCase().includes(timeFilter);
            const matchCount = po.scan_count.toString().includes(countFilter);
            return matchPO && matchTime && matchCount;
        });

        renderDepartmentTable(filteredData);
    }

    filterPO.oninput = applyFilters;
    filterTime.oninput = applyFilters;
    filterCount.oninput = applyFilters;
}

// Render department table
function renderDepartmentTable(data) {
    const tbody = document.getElementById('department-detail-tbody');
    tbody.innerHTML = '';

    data.forEach(po => {
        const row = document.createElement('tr');
        const scanTime = po.last_scan_time ? new Date(po.last_scan_time).toLocaleString() : 'N/A';
        row.innerHTML = `
            <td style="padding: 10px; border: 1px solid #ddd;">${po.po_number}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${scanTime}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${po.scan_count || 0}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">
                <button onclick="viewProgressHistory('${po.po_number}')" style="padding: 5px 10px; background-color: #6ba3be; color: white; border: none; border-radius: 3px; cursor: pointer;">View History</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Export department data to Excel
function exportDepartmentToExcel(department, data) {
    const headers = ['PO Number', 'Last Scan Time', 'Scan Count'];
    const rows = data.map(po => [
        po.po_number,
        new Date(po.last_scan_time).toLocaleString(),
        po.scan_count
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${department}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// Get department badge color
function getDepartmentColor(department) {
    const colors = {
        'CS Team': '#2196F3',
        'PMC': '#9C27B0',
        'Material': '#FF9800',
        'Production': '#4CAF50',
        'Cut and Fold': '#009688',
        'QC': '#F44336',
        'Shipment': '#795548',
        'Account': '#607D8B'
    };
    return colors[department] || '#666';
}

// View progress history for a PO
async function viewProgressHistory(poNumber) {
    try {
        const response = await fetch(`/api/progress/${poNumber}`);
        const data = await response.json();

        const modal = document.getElementById('progress-history-modal');
        const tbody = document.getElementById('progress-history-tbody');
        tbody.innerHTML = '';

        // Update modal title
        document.querySelector('#progress-history-modal h2').textContent = `Progress History - PO ${poNumber}`;

        // All departments in sequence
        const allDepartments = [
            'CS Team',
            'PMC',
            'Material',
            'Production',
            'Cut and Fold',
            'QC',
            'Shipment',
            'Account'
        ];

        // Create a map of scanned departments
        const scannedMap = {};
        if (data.progress && data.progress.length > 0) {
            data.progress.forEach(scan => {
                scannedMap[scan.department] = scan;
            });
        }

        // Display all departments in order
        allDepartments.forEach(dept => {
            const row = document.createElement('tr');
            const deptColor = getDepartmentColor(dept);

            if (scannedMap[dept]) {
                const scan = scannedMap[dept];
                const scanDate = new Date(scan.scanned_at);
                const formattedDate = scanDate.toLocaleString();

                row.innerHTML = `
                    <td><span style="background-color: ${deptColor}; padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px;">${dept}</span></td>
                    <td>${formattedDate}</td>
                    <td>${scan.notes || '-'}</td>
                `;
            } else {
                row.innerHTML = `
                    <td><span style="background-color: #999; padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px;">${dept}</span></td>
                    <td>---</td>
                    <td>---</td>
                `;
            }

            tbody.appendChild(row);
        });

        // Setup close button handler
        const closeBtn = document.getElementById('progress-history-close-btn');
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };

        // Setup click outside to close
        modal.onclick = function(e) {
            if (e.target.id === 'progress-history-modal') {
                modal.style.display = 'none';
            }
        };

        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading progress history:', error);
        await showAlert('Error loading progress history: ' + error.message);
    }
}



