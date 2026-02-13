// Dashboard JavaScript
// Handles sidebar toggle, mobile menu, and dashboard interactions

document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    
    // Mobile sidebar toggle
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
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
        link.addEventListener('click', function() {
            if (window.innerWidth <= 991) {
                sidebar.classList.remove('active');
            }
        });
    });
    
    // Manual search modal handling
    const manualSearchModal = document.getElementById('manualSearchModal');
    if (manualSearchModal) {
        const productSearchInput = document.getElementById('productSearch');
        
        manualSearchModal.addEventListener('shown.bs.modal', function() {
            productSearchInput.focus();
        });
        
        // Handle search (placeholder - would connect to API in production)
        const searchBtn = manualSearchModal.querySelector('.btn-primary');
        if (searchBtn) {
            searchBtn.addEventListener('click', function() {
                const searchQuery = productSearchInput.value.trim();
                if (searchQuery) {
                    // In production: API call to /api/products/search?q={searchQuery}
                    alert(`Searching for: "${searchQuery}"\n\nIn production, this would:\n- Query product database\n- Display search results\n- Allow user to select a product`);
                    
                    bootstrap.Modal.getInstance(manualSearchModal).hide();
                    
                    // Simulate redirect to product result
                    // window.location.href = 'product-result.html?q=' + encodeURIComponent(searchQuery);
                } else {
                    alert('Please enter a product name or barcode');
                }
            });
        }
        
        // Enter key to search
        productSearchInput.addEventListener('keypress', function(e) {
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