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
// CALL AI INGREDIENT ANALYZER (async)
// ============================================
async function analyzeIngredientsAI(product) {
    try {
        if (!product.ingredientsList.length) return null;
        const res = await fetch("http://127.0.0.1:8000/analyze-ingredients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ingredients: product.ingredientsList })
        });
        return await res.json();
    } catch (err) {
        console.error("AI Analysis Error:", err);
        return null;
    }
}

// ============================================
// RENDER PRODUCT
// ============================================
function renderDynamicProduct(product, aiAnalysis) {
    const container = document.getElementById("productContainer");
    container.style.display = "block";
    container.innerHTML = generateProductHTML(product, aiAnalysis);
}

// ============================================
// GENERATE PRODUCT HTML
// ============================================
function generateProductHTML(product, aiAnalysis) {
    const concern = calculateConcern(product);

    let aiHTML = "";
    if (aiAnalysis) {
        aiHTML = `<div class="info-card">
            <h3>AI Ingredient Analysis</h3>
            <p><strong>Overall Health Risk:</strong> ${aiAnalysis.overall_health_risk}</p>
            ${aiAnalysis.high_risk_ingredients?.length ? `<p><strong>High Risk:</strong> ${aiAnalysis.high_risk_ingredients.join(", ")}</p>` : ""}
            ${aiAnalysis.comments?.length ? `<ul>${aiAnalysis.comments.map(c => `<li>${c}</li>`).join("")}</ul>` : ""}
        </div>`;
    }

    return `
        <div class="product-wrapper">
            <div class="product-header-card">
                <div class="product-left">
                    ${product.image ? `<img src="${product.image}" class="product-img">` : `<div class="product-placeholder">📦</div>`}
                </div>
                <div class="product-right">
                    <h1 class="product-title">${product.name}</h1>
                    <p class="product-brand">${product.brand}</p>
                    <div class="concern-badge ${concern.level}">${concern.label} • Score ${concern.score}/100</div>
                </div>
            </div>

            <div class="product-grid">
                <div class="info-card">
                    <h3>Ingredients</h3>
                    ${product.ingredientsList.length ? `<ul>${product.ingredientsList.map(i => `<li>${i}</li>`).join("")}</ul>` : `<p>${product.ingredientsText}</p>`}
                </div>

                <div class="info-card">
                    <h3>Nutrition (per 100g)</h3>
                    <div class="nutrition-grid">
                        <div><strong>Energy</strong><br>${product.nutriments["energy-kcal_100g"] || "N/A"} kcal</div>
                        <div><strong>Sugar</strong><br>${product.nutriments.sugars_100g || "N/A"} g</div>
                        <div><strong>Fat</strong><br>${product.nutriments.fat_100g || "N/A"} g</div>
                        <div><strong>Salt</strong><br>${product.nutriments.salt_100g || "N/A"} g</div>
                    </div>
                </div>

                <div class="info-card">
                    <h3>Additives</h3>
                    ${product.additives.length ? `<ul>${product.additives.map(a => `<li>${a}</li>`).join("")}</ul>` : `<p>No additives reported</p>`}
                </div>

                <div class="info-card">
                    <h3>Allergens</h3>
                    ${product.allergens ? `<p class="allergen-danger">${product.allergens}</p>` : `<p class="allergen-safe">No allergens reported</p>`}
                </div>

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
    container.style.display = "block";
    container.innerHTML = `<div style="text-align:center;padding:5rem 2rem;"><h2>Product Not Found</h2><p>${message}</p></div>`;
}

// ============================================
// FETCH NEWS
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
        console.error("News fetch error:", err);
        displayNews([]);
    }
}

function displayNews(newsList) {
    const container = document.getElementById("news-section");
    container.innerHTML = "";
    if (!newsList.length) {
        container.innerHTML = `<p>No recent safety alerts found.</p>`;
        return;
    }
    newsList.forEach(n => {
        container.innerHTML += `
            <div class="news-card">
                <img src="${n.thumbnail || 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800&q=80'}" class="news-image"/>
                <div>
                    <div class="news-meta">${n.source || "Unknown Source"} • ${n.date || "Unknown Date"}</div>
                    <div class="news-title">${n.title}</div>
                    <a href="${n.link}" target="_blank">Read More</a>
                </div>
            </div>
        `;
    });
}
