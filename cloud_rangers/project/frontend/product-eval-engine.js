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

    document.getElementById("loadingContainer").classList.remove("active");
    document.getElementById("productContainer").classList.add("active");

    document.getElementById("productContainer").innerHTML = generateProductHTML(product);
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
                    ${product.image ? `<img src="${product.image}" style="max-width:120px;">` : "📦"}
                </div>
                <div class="product-details">
                    <div class="product-brand">${product.brand}</div>
                    <h1 class="product-name">${product.name}</h1>
                    <span class="product-category">Scanned Product</span>
                </div>
            </div>
        </div>

        <div class="concern-score-card">
            <div class="concern-score-header">
                <div>
                    <h2>Concern Score</h2>
                    <p style="font-size:0.9rem;color:#6B7280;">
                        Auto-evaluated using OpenFoodFacts data
                    </p>
                </div>
                <div>
                    <div class="concern-level">${concernData.score}</div>
                    <span class="concern-badge ${concernData.level}">
                        ${concernData.label}
                    </span>
                </div>
            </div>
            <div class="concern-explanation">
                ${concernData.explanation}
            </div>
        </div>

        <div class="factors-grid">

            <div class="factor-card">
                <div class="factor-header">
                    <h3>Ingredients</h3>
                </div>
                <div class="factor-content">
                    ${product.ingredientsList.length > 0
                        ? `<ul>${product.ingredientsList.map(i => `<li>${i}</li>`).join("")}</ul>`
                        : `<p>${product.ingredientsText}</p>`
                    }
                </div>
            </div>

            <div class="factor-card">
                <div class="factor-header">
                    <h3>NutriScore</h3>
                </div>
                <div class="factor-content">
                    <h2 style="text-transform:uppercase;">
                        ${product.nutriscore}
                    </h2>
                </div>
            </div>

            <div class="factor-card">
                <div class="factor-header">
                    <h3>Additives</h3>
                </div>
                <div class="factor-content">
                    ${product.additives.length > 0
                        ? `<ul>${product.additives.map(a => `<li>${a}</li>`).join("")}</ul>`
                        : `<p>No additives listed</p>`
                    }
                </div>
            </div>

            <div class="factor-card">
                <div class="factor-header">
                    <h3>Allergens</h3>
                </div>
                <div class="factor-content">
                    ${product.allergens
                        ? `<span style="color:red;">${product.allergens}</span>`
                        : `<span style="color:green;">No allergens reported</span>`
                    }
                </div>
            </div>

        </div>

        <div style="background:#EFF6FF;padding:2rem;border-radius:20px;text-align:center;margin-top:2rem;">
            <p style="color:#1E40AF;font-weight:600;margin:0;">
                Data sourced live from OpenFoodFacts.
            </p>
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
