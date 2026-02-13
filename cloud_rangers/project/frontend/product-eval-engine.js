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

    localStorage.removeItem("openFoodProduct");
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
        <div class="product-header">
            <div class="product-main">
                <div class="product-image">
                    ${product.image 
                        ? `<img src="${product.image}" style="max-width:120px;">`
                        : "📦"}
                </div>
                <div class="product-details">
                    <div class="product-brand">${product.brand}</div>
                    <h1 class="product-name">${product.name}</h1>
                    <span class="product-category">Scanned Product</span>
                </div>
            </div>
        </div>

        <div class="concern-score-card">
            <h2>Concern Score: ${concernData.score}</h2>
            <p><strong>${concernData.label}</strong></p>
            <p>${concernData.explanation}</p>
        </div>

        <div class="factor-card">
            <h3>Ingredients</h3>
            ${
                product.ingredientsList.length > 0
                ? `<ul>${product.ingredientsList.map(i => `<li>${i}</li>`).join("")}</ul>`
                : `<p>${product.ingredientsText}</p>`
            }
        </div>

        <div class="factor-card">
            <h3>Nutrition (per 100g)</h3>
            <ul>
                <li>Energy: ${product.nutriments["energy-kcal_100g"] || "N/A"} kcal</li>
                <li>Sugar: ${product.nutriments.sugars_100g || "N/A"} g</li>
                <li>Fat: ${product.nutriments.fat_100g || "N/A"} g</li>
                <li>Salt: ${product.nutriments.salt_100g || "N/A"} g</li>
            </ul>
        </div>

        <div class="factor-card">
            <h3>Additives</h3>
            ${
                product.additives.length > 0
                ? `<ul>${product.additives.map(a => `<li>${a}</li>`).join("")}</ul>`
                : `<p>No additives listed</p>`
            }
        </div>

        <div class="factor-card">
            <h3>Allergens</h3>
            ${
                product.allergens
                ? `<span style="color:red;">${product.allergens}</span>`
                : `<span style="color:green;">No allergens reported</span>`
            }
        </div>

        <div style="margin-top:2rem;padding:1rem;background:#EFF6FF;border-radius:12px;">
            Data sourced live from OpenFoodFacts.
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
