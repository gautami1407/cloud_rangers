// Dashboard JavaScript
// Handles sidebar toggle, mobile menu, and dashboard interactions

document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');

    // Mobile sidebar toggle
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('active');

            // Close sidebar when clicking outside on mobile
            if (sidebar.classList.contains('active')) {
                document.addEventListener('click', closeSidebarOnOutsideClick);
            }
        });
    }

    function closeSidebarOnOutsideClick(e) {
        if (sidebar && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('active');
            document.removeEventListener('click', closeSidebarOnOutsideClick);
        }
    }

    // Close sidebar on nav link click (mobile)
    const navLinks = document.querySelectorAll('.sidebar .nav-item');
    navLinks.forEach(link => {
        link.addEventListener('click', function () {
            if (window.innerWidth <= 991) {
                sidebar.classList.remove('active');
            }
        });
    });

    // Manual search modal handling
    const manualSearchModal = document.getElementById('manualSearchModal');
    if (manualSearchModal) {
        const productSearchInput = document.getElementById('productSearch');

        manualSearchModal.addEventListener('shown.bs.modal', function () {
            productSearchInput.focus();
        });

        // Handle search (placeholder - would connect to API in production)
        const searchBtn = manualSearchModal.querySelector('.btn-primary');
        if (searchBtn) {
            searchBtn.addEventListener('click', async function () {
                const searchQuery = productSearchInput.value.trim();
                const btnOriginalText = searchBtn.innerHTML;

                if (searchQuery) {
                    searchBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Searching...';
                    searchBtn.disabled = true;

                    try {
                        const response = await fetch(`http://127.0.0.1:8000/api/product/${encodeURIComponent(searchQuery)}`);

                        if (response.ok) {
                            const product = await response.json();
                            // Store for product.html to pick up
                            localStorage.setItem("openFoodProduct", JSON.stringify(product));
                            window.location.href = 'product.html';
                        } else {
                            alert('Product not found. Try a specific barcode or different name.');
                        }
                    } catch (error) {
                        console.error('Search error:', error);
                        alert('An error occurred while searching.');
                    } finally {
                        searchBtn.innerHTML = btnOriginalText;
                        searchBtn.disabled = false;
                    }
                } else {
                    alert('Please enter a product name or barcode');
                }
            });
        }

        // Enter key to search
        productSearchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });
    }

    // Load user profile data to display
    loadUserProfile();
});

// Load and display user profile information
function loadUserProfile() {
    const healthProfile = localStorage.getItem('healthProfile');

    if (healthProfile) {
        try {
            const profile = JSON.parse(healthProfile);

            // You can use this data to customize dashboard display
            // For example, show personalized greeting or warnings
            console.log('User health profile loaded:', profile);

            // Example: Display allergy warning if user has allergies
            if (profile.allergies && profile.allergies.length > 0 && !profile.allergies.includes('none')) {
                displayAllergyReminder(profile.allergies);
            }
        } catch (e) {
            console.error('Error parsing health profile:', e);
        }
    }
}

// Display allergy reminder (example personalization)
function displayAllergyReminder(allergies) {
    // This could be displayed as a banner or card on the dashboard
    console.log('User has allergies:', allergies);

    // In a real implementation, you might show this in the UI:
    // const reminderHtml = `
    //     <div class="alert alert-info">
    //         <i class="bi bi-info-circle"></i>
    //         Remember: You have allergies to ${allergies.join(', ')}
    //     </div>
    // `;
}

// Database Integration Comment for Developers
/*
    DATABASE INTEGRATION NOTES FOR DASHBOARD:
    
    1. RECENT SCANS DISPLAY:
       - Fetch from 'user_scans' table
       - Query: SELECT p.*, us.scan_date, rs.concern_score 
                FROM user_scans us
                JOIN products p ON us.product_id = p.id
                LEFT JOIN risk_scores rs ON p.id = rs.product_id
                WHERE us.user_id = {current_user_id}
                ORDER BY us.scan_date DESC
                LIMIT 10
    
    2. CONCERN SCORE BADGE:
       - Calculate from 'risk_scores' table
       - Color coding: 0-40 (green/low), 41-70 (yellow/medium), 71-100 (red/high)
       - Badge classes: .badge-low, .badge-medium, .badge-high
    
    3. PRODUCT TAGS:
       - Generated from 'ingredients' and 'additives_reference' tables
       - Examples:
         * "Contains Preservatives" if additives with type='preservative'
         * "High Sodium" if sodium > threshold
         * "FSSAI Approved" from compliance_rules table
    
    4. PERSONALIZED WARNINGS:
       - Cross-reference user health profile with product ingredients
       - Check allergen matches
       - Age-based restrictions (e.g., caffeine for children)
    
    5. BARCODE SCANNER INTEGRATION:
       - Use library like QuaggaJS or ZXing
       - On successful scan, call: /api/products/lookup?barcode={code}
       - Expected response: Product object with all details
    
    6. FSSAI VALIDATION:
       - Check 'compliance_rules' table for banned additives
       - Verify license status via FSSAI API
       - Display compliance badges accordingly
*/
// ==========================
// Dashboard: Display User Info
// ==========================
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        // Check login
        if (localStorage.getItem('isLoggedIn') !== 'true') {
            window.location.href = 'login.html';
            return;
        }

        // Get logged-in user
        const user = JSON.parse(localStorage.getItem('loggedInUser'));
        if (user) {
            const nameEl = document.getElementById('userName');
            const emailEl = document.getElementById('userEmail');

            if (nameEl) nameEl.innerText = user.fullName;
            if (emailEl) emailEl.innerText = user.email;
        }
    }
});

// Logout function
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
}
async function performSearch() {
    const query = document.getElementById('productSearch').value.trim();
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = 'Searching...';

    if (!query) {
        resultsContainer.innerHTML = 'Please enter a product name or barcode.';
        return;
    }

    try {
        let url;

        // If input is numeric (likely a barcode)
        if (/^\d+$/.test(query)) {
            url = `https://world.openfoodfacts.org/api/v0/product/${query}.json`;
        } else {
            // Text search
            url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Process barcode lookup result
        if (data.status !== undefined) {
            if (data.status === 1 && data.product) {
                resultsContainer.innerHTML = `
                    <h5>${data.product.product_name}</h5>
                    <p><strong>Barcode:</strong> ${data.code}</p>
                    <p><strong>Brands:</strong> ${data.product.brands || 'N/A'}</p>
                `;
            } else {
                resultsContainer.innerHTML = 'Product not found.';
            }
        } else if (data.products && data.products.length > 0) {
            // Process search results
            resultsContainer.innerHTML = '<h5>Search Results:</h5>';
            data.products.slice(0, 10).forEach(item => {
                resultsContainer.innerHTML += `
                    <div class="search-item">
                        <h6>${item.product_name || 'No name available'}</h6>
                        <p><strong>Barcode:</strong> ${item.code}</p>
                        <hr>
                    </div>
                `;
            });
        } else {
            resultsContainer.innerHTML = 'No products found for your search.';
        }
    } catch (error) {
        console.error('Search error:', error);
        resultsContainer.innerHTML = 'Error fetching data. Please try again.';
    }
}
function showManualSearch() {
    const manualModalEl = document.getElementById('manualSearchModal');
    if (manualModalEl) {
        const modal = new bootstrap.Modal(manualModalEl);
        modal.show();
    }
}
