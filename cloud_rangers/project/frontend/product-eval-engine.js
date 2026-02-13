// ============================================
// AUTH CHECK
// ============================================
if (localStorage.getItem("isLoggedIn") !== "true") {
    window.location.href = "login.html";
}

// ============================================
// TRANSFORM OPEN FOOD FACTS DATA
// ============================================
function transformOpenFoodData(product) {
    return {
        name: product.product_name || "Unknown Product",
        brand: product.brands || "Unknown Brand",
        ingredientsText: product.ingredients_text || "Not Available",
        ingredientsList: product.ingredients
            ? product.ingredients.map(i => i.text).filter(Boolean)
            : [],
        nutriments: product.nutriments || {},
        nutriscore: product.nutriscore_grade || "unknown",
        additives: product.additives_tags || [],
        allergens: product.allergens || "",
        image: product.image_url || ""
    };
}

// ============================================
// MAIN LOAD
// ============================================
window.addEventListener("load", function () {

    const storedProduct = localStorage.getItem("openFoodProduct");

    if (!storedProduct) {
        showError("No scanned product found. Please scan again.");
        return;
    }

    const rawProduct = JSON.parse(storedProduct);
    const product = transformOpenFoodData(rawProduct);

    renderDynamicProduct(product);
    fetchNews(product.name);

    localStorage.removeItem("openFoodProduct");
    document.getElementById("fetch-barcode-btn").addEventListener("click", () => {
    const barcode = document.getElementById("barcode-input").value.trim();
    fetchProductByBarcode(barcode);
});

});

// ============================================
// RENDER PRODUCT
// ============================================
function renderDynamicProduct(product) {

    const loading = document.getElementById("loadingContainer");
    const container = document.getElementById("productContainer");

    if (loading) loading.style.display = "none";
    if (container) container.style.display = "block";

    container.innerHTML = generateProductHTML(product);
}


// ============================================
// GENERATE FULL 6 FACTOR HTML
// ============================================
function generateProductHTML(product) {

    const concernData = calculateConcern(product);

    return `
        <div class="product-wrapper">

            <!-- HEADER -->
            <div class="product-header-card">
                <div class="product-left">
                    ${product.image 
                        ? `<img src="${product.image}" class="product-img">`
                        : `<div class="product-placeholder">📦</div>`
                    }
                </div>
                <div class="product-right">
                    <h1 class="product-title">${product.name}</h1>
                    <p class="product-brand">${product.brand}</p>
                    <div class="concern-badge ${concernData.level}">
                        ${concernData.label} • Score ${concernData.score}/100
                    </div>
                </div>
            </div>

            <!-- GRID SECTIONS -->
            <div class="product-grid">

                <!-- INGREDIENTS -->
                <div class="info-card">
                    <h3>Ingredients</h3>
                    ${
                        product.ingredientsList.length > 0
                        ? `<ul>${product.ingredientsList.map(i => `<li>${i}</li>`).join("")}</ul>`
                        : `<p>${product.ingredientsText}</p>`
                    }
                </div>

                <!-- NUTRITION -->
                <div class="info-card">
                    <h3>Nutrition (per 100g)</h3>
                    <div class="nutrition-grid">
                        <div><strong>Energy</strong><br>${product.nutriments["energy-kcal_100g"] || "N/A"} kcal</div>
                        <div><strong>Sugar</strong><br>${product.nutriments.sugars_100g || "N/A"} g</div>
                        <div><strong>Fat</strong><br>${product.nutriments.fat_100g || "N/A"} g</div>
                        <div><strong>Salt</strong><br>${product.nutriments.salt_100g || "N/A"} g</div>
                    </div>
                </div>

                <!-- ADDITIVES -->
                <div class="info-card">
                    <h3>Additives</h3>
                    ${
                        product.additives.length > 0
                        ? `<ul>${product.additives.map(a => `<li>${a}</li>`).join("")}</ul>`
                        : `<p>No additives reported</p>`
                    }
                </div>

                <!-- ALLERGENS -->
                <div class="info-card">
                    <h3>Allergens</h3>
                    ${
                        product.allergens
                        ? `<p class="allergen-danger">${product.allergens}</p>`
                        : `<p class="allergen-safe">No allergens reported</p>`
                    }
                </div>

            </div>

            <div class="footer-note">
                Data sourced live from OpenFoodFacts.
            </div>

        </div>
    `;
}



// ============================================
// DYNAMIC CONCERN CALCULATION
// ============================================
function calculateConcern(product) {

    let score = 100;

    if (product.nutriscore === "e") score -= 40;
    else if (product.nutriscore === "d") score -= 25;
    else if (product.nutriscore === "c") score -= 10;

    if (product.additives.length > 5) score -= 20;
    if (product.ingredientsText.toLowerCase().includes("palm oil"))
        score -= 10;

    if (score >= 80)
        return { score, level: "low", label: "Low Concern", explanation: "Good nutritional profile with minimal risk indicators." };

    if (score >= 50)
        return { score, level: "moderate", label: "Moderate Concern", explanation: "Some processed ingredients or moderate nutrition risks detected." };

    return { score, level: "high", label: "High Concern", explanation: "High processing level or poor nutritional score." };
}

// ============================================
// ERROR HANDLER
// ============================================
function showError(message) {

    document.getElementById("loadingContainer").classList.remove("active");
    document.getElementById("productContainer").classList.add("active");

    document.getElementById("productContainer").innerHTML = `
        <div style="text-align:center;padding:5rem 2rem;">
            <h2>Product Not Found</h2>
            <p>${message}</p>
            <a href="dashboard.html" class="back-btn">
                Return to Dashboard
            </a>
        </div>
    `;
}
// ============================================
// FETCH PRODUCT SAFETY NEWS
// ============================================
async function fetchNews(productName) {
    try {
        const res = await fetch("http://127.0.0.1:8000/news", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product_name: productName })
        });
        const data = await res.json();
        if (data.news && data.news.length > 0) {
            displayNews(data.news);
        } else {
            displayNews([]); // show empty state
        }
    } catch (err) {
        console.error("Error fetching news:", err);
        displayNews([]);
    }
}

function displayNews(newsList) {
    const container = document.getElementById("news-section");
    container.innerHTML = "";

    if (!newsList || newsList.length === 0) {
        container.innerHTML = `<p>No recent safety alerts found for this product.</p>`;
        return;
    }

    newsList.forEach(n => {
        container.innerHTML += `
            <div class="news-card">
                <img src="${n.thumbnail}" class="news-image" onerror="this.src='https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800&q=80'"/>
                <div>
                    <div class="news-meta">${n.source} • ${n.date}</div>
                    <div class="news-title">${n.title}</div>
                    <a href="${n.link}" target="_blank">Read More</a>
                </div>
            </div>
        `;
    });
}

async function fetchProductByBarcode(barcode) {
    if (!barcode) {
        alert("Please enter a barcode.");
        return;
    }

    try {
        // Open Food Facts API
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await res.json();

        if (!data.product || data.status !== 1) {
            showError("Product not found for this barcode.");
            return;
        }

        const product = transformOpenFoodData(data.product);
        renderDynamicProduct(product);
        fetchNews(product.name);

    } catch (err) {
        console.error("Error fetching product:", err);
        showError("Failed to fetch product. Try again.");
    }
}
