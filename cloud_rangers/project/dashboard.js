// Show Manual Search Modal
function showManualSearch() {
    const modalEl = document.getElementById('manualSearchModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        // Focus the input
        const input = modalEl.querySelector('#productSearch');
        if (input) input.focus();
    }
}

// Perform Manual Search
async function performManualSearch() {
    const query = document.getElementById('productSearch').value.trim();
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';

    if (!query) {
        resultsContainer.innerHTML = '<p class="text-danger">Please enter a product name or barcode.</p>';
        return;
    }

    resultsContainer.innerHTML = '<p>Searching...</p>';

    try {
        let url;
        if (/^\d+$/.test(query)) {
            // Barcode lookup
            url = `https://world.openfoodfacts.org/api/v0/product/${query}.json`;
        } else {
            // Text search
            url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);

        const data = await response.json();
        resultsContainer.innerHTML = '';

        if (data.status !== undefined) {
            // Barcode lookup result
            if (data.status === 1 && data.product) {
                resultsContainer.innerHTML = `
                    <div class="card p-2 mb-2">
                        <h5>${data.product.product_name || 'No Name'}</h5>
                        <p><strong>Brand:</strong> ${data.product.brands || 'N/A'}</p>
                        <p><strong>Barcode:</strong> ${data.code}</p>
                        <p><strong>Ingredients:</strong> ${data.product.ingredients_text || 'N/A'}</p>
                    </div>
                `;
            } else {
                resultsContainer.innerHTML = '<p>Product not found.</p>';
            }
        } else if (data.products && data.products.length > 0) {
            // Text search results
            data.products.slice(0, 10).forEach(item => {
                resultsContainer.innerHTML += `
                    <div class="card p-2 mb-2">
                        <h5>${item.product_name || 'No Name'}</h5>
                        <p><strong>Brand:</strong> ${item.brands || 'N/A'}</p>
                        <p><strong>Barcode:</strong> ${item.code}</p>
                    </div>
                `;
            });
        } else {
            resultsContainer.innerHTML = '<p>No products found.</p>';
        }
    } catch (err) {
        console.error(err);
        resultsContainer.innerHTML = '<p class="text-danger">Error fetching data. Please try again.</p>';
    }
}

// Add event listener to modal search button
document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('manualSearchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', performManualSearch);
    }

    // Press Enter to search
    const input = document.getElementById('productSearch');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performManualSearch();
        });
    }
});
