// Main App JavaScript
// Shared utilities and initialization

// Check if user is logged in
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentPage = window.location.pathname.split('/').pop();
    
    // Pages that require authentication
    const protectedPages = ['dashboard.html', 'ai-chat.html', 'health-profile.html', 'product-result.html'];
    
    if (!isLoggedIn && protectedPages.includes(currentPage)) {
        window.location.href = 'login.html';
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

// Initialize user info in sidebar
function initializeUserInfo() {
    const userName = localStorage.getItem('userName') || 'User Name';
    const userEmail = localStorage.getItem('userEmail') || 'user@email.com';
    
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    
    if (userNameEl) userNameEl.textContent = userName;
    if (userEmailEl) userEmailEl.textContent = userEmail;
}

// Scanner functions (placeholder - would integrate with actual camera API)
function openScanner() {
    alert('Camera scanner would open here.\n\nIn production, this would:\n- Access device camera\n- Scan barcode using library (e.g., QuaggaJS, ZXing)\n- Send barcode to API: /api/products/scan?barcode={code}\n- Redirect to product-result.html with product data');
}

function showManualSearch() {
    const modal = new bootstrap.Modal(document.getElementById('manualSearchModal'));
    modal.show();
}

function viewProductDetails() {
    window.location.href = 'product-result.html';
}

// Auto-resize textarea
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// Format timestamp
function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' hr ago';
    
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Initialize user info
    initializeUserInfo();
    
    // Auto-resize all textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            autoResizeTextarea(this);
        });
    });
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkAuth,
        logout,
        openScanner,
        showManualSearch,
        viewProductDetails,
        autoResizeTextarea,
        formatTime
    };
}