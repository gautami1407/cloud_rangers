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
window.addEventListener("DOMContentLoaded", () => {
    // If a product is stored from a previous scan
    const storedProduct = localStorage.getItem("openFoodProduct");

    if (storedProduct) {
        const rawProduct = JSON.parse(storedProduct);
        processProduct(rawProduct);
        localStorage.removeItem("openFoodProduct");
    }

    // Setup barcode scan button
    setupBarcodeScan();
});

// ============================================
// BARCODE SCAN SETUP
// ============================================
function setupBarcodeScan() {
    const barcodeInput = document.getElementById("barcode-input");
    const fetchBtn = document.getElementById("fetch-barcode-btn");

    if (!barcodeInput || !fetchBtn) return;

    const barcodeHandler = async () => {
        const barcode = barcodeInput.value.trim();
        if (!barcode) return showError("Please enter a barcode.");
        await fetchProductByBarcode(barcode);
    };

    fetchBtn.addEventListener("click", barcodeHandler);
    barcodeInput.addEventListener("keypress", e => {
        if (e.key === "Enter") barcodeHandler();
    });
}

// ============================================
// FETCH PRODUCT BY BARCODE
// ============================================
async function fetchProductByBarcode(barcode) {
    const loading = document.getElementById("loadingContainer");
    const container = document.getElementById("productContainer");

    if (loading) loading.style.display = "block";
    if (container) container.style.display = "none";
    container.innerHTML = '';

    try {
        // Fetch product from backend
        const response = await fetch(`https://your-backend-api.com/product?query=${encodeURIComponent(barcode)}`);
        const data = await response.json();

        if (!data || Object.keys(data).length === 0) {
            return showError("No product details found for this barcode.");
        }

        processProduct(data);

    } catch (err) {
        console.error(err);
        showError("Error fetching product details. Try again later.");
    } finally {
        if (loading) loading.style.display = "none";
    }
}

// ============================================
// PROCESS PRODUCT (Render + AI + News)
// ============================================
async function processProduct(rawProduct) {
    const product = transformOpenFoodData(rawProduct);

    // Call AI ingredient analyzer
    const aiAnalysis = await analyzeIngredientsAI(product);

    // Render product
    renderDynamicProduct(product, aiAnalysis);

    // Fetch news related to product
    fetchNews(product.name);
}

// ============================================
// CALL AI INGREDIENT ANALYZER
// ============================================
async function analyzeIngredientsAI(product) {
    if (!product.ingredientsList || product.ingredientsList.length === 0) return null;

    try {
        const response = await fetch("http://127.0.0.1:8000/analyze-ingredients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ingredients: product.ingredientsList })
        });

        const data = await response.json();
        return data;
    } catch (err) {
        console.error("Error analyzing ingredients AI:", err);
        return null;
    }
}

// ============================================
// RENDER PRODUCT
// ============================================
function renderDynamicProduct(product, aiAnalysis) {
    const container = document.getElementById("productContainer");
    const loading = document.getElementById("loadingContainer");

    if (loading) loading.style.display = "none";
    if (container) container.style.display = "block";

    container.innerHTML = generateProductHTML(product, aiAnalysis);
}

// ============================================
// GENERATE PRODUCT HTML
// ============================================
function generateProductHTML(product, aiAnalysis) {
    const concernData = calculateConcern(product);

    let aiHTML = "";
    if (aiAnalysis) {
        aiHTML = `
        <div class="info-card">
            <h3>AI Ingredient Analysis</h3>
            <p><strong>Overall Health Risk:</strong> ${aiAnalysis.overall_health_risk}</p>
            ${aiAnalysis.high_risk_ingredients.length > 0 
                ? `<p><strong>High Risk Ingredients:</strong> ${aiAnalysis.high_risk_ingredients.join(", ")}</p>` 
                : ""}
            ${aiAnalysis.comments && aiAnalysis.comments.length > 0 
                ? `<ul>${aiAnalysis.comments.map(c => `<li>${c}</li>`).join("")}</ul>` 
                : ""}
        </div>`;
    }

    return `
        <div class="product-wrapper">

            <!-- HEADER -->
            <div class="product-header-card">
                <div class="product-left">
                    ${product.image ? `<img src="${product.image}" class="product-img">` : `<div class="product-placeholder">📦</div>`}
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
                    ${product.ingredientsList.length > 0 ? `<ul>${product.ingredientsList.map(i => `<li>${i}</li>`).join("")}</ul>` : `<p>${product.ingredientsText}</p>`}
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
                    ${product.additives.length > 0 ? `<ul>${product.additives.map(a => `<li>${a}</li>`).join("")}</ul>` : `<p>No additives reported</p>`}
                </div>

                <!-- ALLERGENS -->
                <div class="info-card">
                    <h3>Allergens</h3>
                    ${product.allergens ? `<p class="allergen-danger">${product.allergens}</p>` : `<p class="allergen-safe">No allergens reported</p>`}
                </div>

                <!-- AI Analysis -->
                ${aiHTML}
            </div>

            <div class="footer-note">Data sourced live from OpenFoodFacts.</div>
        </div>
    `;
}

// ============================================
// CALCULATE CONCERN SCORE
// ============================================
function calculateConcern(product) {
    let score = 100;
    const nutriScores = { "e": 40, "d": 25, "c": 10 };
    score -= nutriScores[product.nutriscore] || 0;

    if (product.additives.length > 5) score -= 20;
    if (product.ingredientsText.toLowerCase().includes("palm oil")) score -= 10;

    score = Math.max(0, score);

    if (score >= 80) return { score, level: "low", label: "Low Concern" };
    if (score >= 50) return { score, level: "moderate", label: "Moderate Concern" };
    return { score, level: "high", label: "High Concern" };
}

// ============================================
// SHOW ERROR
// ============================================
function showError(message) {
    const container = document.getElementById("productContainer");
    const loading = document.getElementById("loadingContainer");

    if (loading) loading.style.display = "none";
    if (container) container.style.display = "block";

    container.innerHTML = `
        <div style="text-align:center;padding:5rem 2rem;">
            <h2>Product Not Found</h2>
            <p>${message}</p>
            <a href="dashboard.html" class="back-btn">Return to Dashboard</a>
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
        displayNews(data.news || []);
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
                <img src="${n.thumbnail || 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800&q=80'}" 
                     class="news-image" 
                     onerror="this.src='https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800&q=80'"/>
                <div>
                    <div class="news-meta">${n.source || "Unknown Source"} • ${n.date || "Unknown Date"}</div>
                    <div class="news-title">${n.title}</div>
                    <a href="${n.link}" target="_blank">Read More</a>
                </div>
            </div>
        `;
    });
}
