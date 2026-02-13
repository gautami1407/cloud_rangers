function transformOpenFoodData(product) {
    return {
        name: product.product_name || "Unknown Product",
        brand: product.brands || "Unknown Brand",
        ingredients: product.ingredients_text || "Not Available",
        nutriments: product.nutriments || {},
        nutriscore: product.nutriscore_grade || "unknown",
        additives: product.additives_tags || [],
        allergens: product.allergens || "None"
    };
}

// ============================================
// PRODUCT EVALUATION ENGINE - 6-FACTOR MODEL
// ============================================

// Check authentication
if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
}
// Barcode to Product Mapping
const barcodeMap = {
    "8901058893227": "Instant Noodles",     // Example Maggi barcode
    "7622210449283": "Dark Chocolate Bar",  // Example chocolate
    "070177154020": "Organic Green Tea",
    "025293001152": "Almond Milk"
};

// Product Database with Complete Analysis
const productDatabase = {
    'Dark Chocolate Bar': {
        emoji: '🍫',
        brand: 'Lindt Excellence',
        fullName: '70% Dark Chocolate Bar',
        category: 'Food Product',
        ingredients: [
            { name: 'Cocoa Mass', purpose: 'Primary ingredient - provides chocolate flavor and texture', chemicalName: 'Theobroma cacao' },
            { name: 'Sugar', purpose: 'Sweetener to balance bitter cocoa taste', chemicalName: 'Sucrose' },
            { name: 'Cocoa Butter', purpose: 'Natural fat for smooth texture and mouthfeel', chemicalName: 'Natural cocoa lipids' },
            { name: 'Vanilla Extract', purpose: 'Natural flavor enhancer', chemicalName: 'Vanilla planifolia extract' },
            { name: 'Soy Lecithin', purpose: 'Emulsifier - helps blend cocoa and fats smoothly', chemicalName: 'E322' }
        ],
        concernScore: 25,
        concernLevel: 'low',
        concernExplanation: 'This product scores low on concern indicators due to minimal processing and natural ingredients. The sugar content is moderate (12g per serving), and all additives serve functional purposes with established safety profiles. Dark chocolate with 70% cocoa provides beneficial antioxidants (flavonoids) that may support cardiovascular health when consumed in moderation.',
        regulatoryStatus: [
            { jurisdiction: 'FDA (USA)', status: 'approved', details: 'All ingredients GRAS (Generally Recognized as Safe)' },
            { jurisdiction: 'EU', status: 'approved', details: 'Compliant with EU food safety regulations' },
            { jurisdiction: 'FSSAI (India)', status: 'approved', details: 'Meets Indian food safety standards' },
            { jurisdiction: 'Health Canada', status: 'approved', details: 'Approved for sale in Canada' }
        ],
        allergenRisks: ['May contain traces of milk', 'Contains soy lecithin', 'Processed in facility with tree nuts'],
        recalls: []
    },
    
    'Instant Noodles': {
        emoji: '🥫',
        brand: 'Maggi',
        fullName: 'Masala Instant Noodles',
        category: 'Processed Food',
        ingredients: [
            { name: 'Refined Wheat Flour', purpose: 'Base ingredient for noodles', chemicalName: 'Triticum aestivum (processed)' },
            { name: 'Palm Oil', purpose: 'Used for frying and preservation', chemicalName: 'Elaeis guineensis oil' },
            { name: 'Salt', purpose: 'Flavor enhancer and preservative', chemicalName: 'Sodium chloride' },
            { name: 'Monosodium Glutamate (MSG)', purpose: 'Flavor enhancer - amplifies savory taste', chemicalName: 'E621' },
            { name: 'Tartrazine', purpose: 'Yellow food coloring', chemicalName: 'E102' },
            { name: 'Sunset Yellow', purpose: 'Orange food coloring', chemicalName: 'E110' },
            { name: 'TBHQ', purpose: 'Antioxidant preservative to prevent rancidity', chemicalName: 'Tertiary butylhydroquinone (E319)' }
        ],
        concernScore: 72,
        concernLevel: 'moderate',
        concernExplanation: 'This product raises moderate concern due to high sodium content (1200mg per serving - 50% of daily recommended limit), artificial food colorings that some individuals may be sensitive to, and ultra-processed nature (NOVA Group 4). The preservative TBHQ is approved but should be consumed within regulated limits. MSG is generally safe for most people but may cause sensitivity reactions in some individuals. Regular consumption of instant noodles is not recommended as a dietary staple.',
        regulatoryStatus: [
            { jurisdiction: 'FDA (USA)', status: 'approved', details: 'All additives within acceptable limits, but product carries high sodium warning' },
            { jurisdiction: 'EU', status: 'restricted', details: 'Tartrazine (E102) must carry warning label about potential effects on children\'s activity' },
            { jurisdiction: 'FSSAI (India)', status: 'approved', details: 'Previously subject to lead content investigations (2015), now meets safety standards' },
            { jurisdiction: 'Australia', status: 'approved', details: 'Approved with mandatory nutrition labeling' }
        ],
        allergenRisks: ['Contains gluten', 'May contain traces of soy'],
        recalls: [
            {
                date: '2015-06',
                authority: 'FSSAI India',
                reason: 'Lead content above permissible limits',
                status: 'Resolved - product reformulated and meets current standards',
                source: 'Official FSSAI bulletin'
            }
        ]
    },
    
    'Organic Green Tea': {
        emoji: '🥤',
        brand: 'Twinings',
        fullName: 'Organic Green Tea',
        category: 'Beverage',
        ingredients: [
            { name: 'Organic Green Tea Leaves', purpose: 'Primary ingredient - provides flavor and antioxidants', chemicalName: 'Camellia sinensis (organic)' }
        ],
        concernScore: 5,
        concernLevel: 'low',
        concernExplanation: 'This product presents minimal concern as it contains only organic green tea leaves with no additives, preservatives, or artificial ingredients. Green tea is rich in polyphenols and catechins, particularly EGCG, which have been studied for potential health benefits including antioxidant and anti-inflammatory properties. The organic certification ensures no synthetic pesticides were used. Note: Contains caffeine (~25mg per cup) which sensitive individuals should consider.',
        regulatoryStatus: [
            { jurisdiction: 'FDA (USA)', status: 'approved', details: 'USDA Organic certified' },
            { jurisdiction: 'EU', status: 'approved', details: 'EU Organic certified' },
            { jurisdiction: 'FSSAI (India)', status: 'approved', details: 'Meets organic food standards' },
            { jurisdiction: 'Japan', status: 'approved', details: 'JAS Organic certified' }
        ],
        allergenRisks: ['None identified'],
        recalls: []
    },
    
    'Almond Milk': {
        emoji: '🥛',
        brand: 'Silk',
        fullName: 'Unsweetened Almond Milk',
        category: 'Dairy Alternative',
        ingredients: [
            { name: 'Filtered Water', purpose: 'Base liquid', chemicalName: 'H2O' },
            { name: 'Almonds', purpose: 'Primary ingredient for flavor and nutrition', chemicalName: 'Prunus dulcis' },
            { name: 'Calcium Carbonate', purpose: 'Fortification - provides calcium', chemicalName: 'CaCO3' },
            { name: 'Sea Salt', purpose: 'Flavor enhancer', chemicalName: 'Sodium chloride' },
            { name: 'Gellan Gum', purpose: 'Stabilizer - prevents separation', chemicalName: 'E418' },
            { name: 'Vitamin D2', purpose: 'Fortification for bone health', chemicalName: 'Ergocalciferol' },
            { name: 'Vitamin E', purpose: 'Antioxidant and nutrition fortification', chemicalName: 'Tocopherol' }
        ],
        concernScore: 18,
        concernLevel: 'low',
        concernExplanation: 'This product shows low concern with natural ingredients and beneficial fortifications. Gellan gum is a plant-based stabilizer with good safety profile. The unsweetened version contains no added sugars. Fortification with calcium and vitamins D and E helps match the nutritional profile of dairy milk. Almond milk is suitable for lactose-intolerant individuals and those following plant-based diets. Note: Almond content is typically 2-3%, so this should not be considered a significant source of almonds\' nutritional benefits.',
        regulatoryStatus: [
            { jurisdiction: 'FDA (USA)', status: 'approved', details: 'All ingredients GRAS status' },
            { jurisdiction: 'EU', status: 'approved', details: 'Meets EU food additive regulations' },
            { jurisdiction: 'FSSAI (India)', status: 'approved', details: 'Approved as dairy alternative' },
            { jurisdiction: 'Canada', status: 'approved', details: 'Meets fortification standards' }
        ],
        allergenRisks: ['Contains tree nuts (almonds)', 'May contain traces of other tree nuts'],
        recalls: []
    }
};

// Load product on page load
window.addEventListener('load', function () {

    const storedProduct = localStorage.getItem("openFoodProduct");

    if (storedProduct) {

        const parsed = JSON.parse(storedProduct);
        const product = transformOpenFoodData(parsed);

        loadDynamicProduct(product);

        // Optional: clear storage after loading
        localStorage.removeItem("openFoodProduct");

    } else {

        const selectedProduct =
            localStorage.getItem('selectedProduct') || 'Dark Chocolate Bar';

        loadProduct(selectedProduct);
    }

});



function loadProduct(productName) {
    const product = productDatabase[productName];
    
    if (!product) {
        showError('Product not found in database. Please scan or search for a valid product.');
        return;
    }
    
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    
    // Generate HTML
    const html = generateProductHTML(product, userProfile);
    
    // Hide loading, show content
    document.getElementById('loadingContainer').classList.remove('active');
    document.getElementById('productContainer').classList.add('active');
    document.getElementById('productContainer').innerHTML = html;
}

function generateProductHTML(product, userProfile) {
    return `
        <!-- Product Header -->
        <div class="product-header">
            <div class="product-main">
                <div class="product-image">${product.emoji}</div>
                <div class="product-details">
                    <div class="product-brand">${product.brand}</div>
                    <h1 class="product-name">${product.fullName}</h1>
                    <span class="product-category">${product.category}</span>
                </div>
            </div>
        </div>
        
        <!-- FACTOR 1: Concern Score -->
        <div class="concern-score-card">
            <div class="concern-score-header">
                <div class="concern-score-title">
                    <i class="bi bi-clipboard-data" style="font-size: 2rem; color: var(--primary);"></i>
                    <div>
                        <h2 style="margin: 0;">Concern Score</h2>
                        <p style="margin: 0; font-size: 0.875rem; font-weight: normal; color: #6B7280;">
                            Attention level indicator (not a safety declaration)
                        </p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div class="concern-level">${product.concernScore}</div>
                    <span class="concern-badge ${product.concernLevel}">
                        ${product.concernLevel === 'low' ? 'Low Concern' : product.concernLevel === 'moderate' ? 'Moderate Concern' : 'High Concern'}
                    </span>
                </div>
            </div>
            <div class="concern-explanation">
                <strong>What this means:</strong><br>
                ${product.concernExplanation}
            </div>
        </div>
        
        <div class="factors-grid">
            <!-- FACTOR 2: Ingredient Analysis -->
            <div class="factor-card">
                <div class="factor-header">
                    <div class="factor-icon" style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white;">
                        <i class="bi bi-list-check"></i>
                    </div>
                    <h3 class="factor-title">Ingredient & Component Purpose</h3>
                </div>
                <div class="factor-content">
                    <p><strong>${product.ingredients.length} ingredients identified</strong></p>
                    <ul class="ingredient-list">
                        ${product.ingredients.map(ing => `
                            <li class="ingredient-item">
                                <span class="ingredient-name">${ing.name}</span>
                                <span class="ingredient-purpose">${ing.purpose}</span>
                                ${ing.chemicalName !== ing.name ? `<div style="font-size: 0.75rem; color: #9CA3AF; margin-top: 0.25rem;">Chemical: ${ing.chemicalName}</div>` : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
            
            <!-- FACTOR 3: Regulatory Status -->
            <div class="factor-card">
                <div class="factor-header">
                    <div class="factor-icon" style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); color: white;">
                        <i class="bi bi-globe"></i>
                    </div>
                    <h3 class="factor-title">Global Regulatory Status</h3>
                </div>
                <div class="factor-content">
                    <p>Approval status across major jurisdictions:</p>
                    <table class="regulatory-table">
                        <thead>
                            <tr>
                                <th>Jurisdiction</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${product.regulatoryStatus.map(reg => `
                                <tr>
                                    <td><strong>${reg.jurisdiction}</strong><br>
                                    <small style="color: #6B7280;">${reg.details}</small></td>
                                    <td>
                                        <span class="status-badge ${reg.status}">
                                            <i class="bi bi-${reg.status === 'approved' ? 'check-circle' : reg.status === 'banned' ? 'x-circle' : 'exclamation-circle'}"></i>
                                            ${reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- FACTOR 4: Additives in Plain Language -->
            <div class="factor-card">
                <div class="factor-header">
                    <div class="factor-icon" style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white;">
                        <i class="bi bi-droplet"></i>
                    </div>
                    <h3 class="factor-title">Additive Context</h3>
                </div>
                <div class="factor-content">
                    ${generateAdditiveExplanation(product)}
                </div>
            </div>
            
            <!-- FACTOR 5: Personalized Warnings -->
            <div class="factor-card">
                <div class="factor-header">
                    <div class="factor-icon" style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white;">
                        <i class="bi bi-person-exclamation"></i>
                    </div>
                    <h3 class="factor-title">Your Personal Alerts</h3>
                </div>
                <div class="factor-content">
                    ${generatePersonalWarnings(product, userProfile)}
                </div>
            </div>
            
            <!-- FACTOR 6: Official Recalls & News -->
            <div class="factor-card">
                <div class="factor-header">
                    <div class="factor-icon" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white;">
                        <i class="bi bi-newspaper"></i>
                    </div>
                    <h3 class="factor-title">Verified Recalls & Notices</h3>
                </div>
                <div class="factor-content">
                    ${generateRecallInfo(product)}
                </div>
            </div>
        </div>
        
        <!-- Educational Footer -->
        <div style="background: #EFF6FF; padding: 2rem; border-radius: 20px; text-align: center; margin-top: 2rem;">
            <p style="color: #1E40AF; font-weight: 600; margin: 0;">
                <i class="bi bi-info-circle me-2"></i>
                This analysis is for educational purposes and should not replace professional medical or dietary advice.
            </p>
        </div>
    `;
}

function generateAdditiveExplanation(product) {
    const additives = product.ingredients.filter(ing => 
        ing.purpose.toLowerCase().includes('preservative') || 
        ing.purpose.toLowerCase().includes('color') ||
        ing.purpose.toLowerCase().includes('stabilizer') ||
        ing.purpose.toLowerCase().includes('emulsifier')
    );
    
    if (additives.length === 0) {
        return `
            <div style="background: #D1FAE5; padding: 1.5rem; border-radius: 12px; color: #059669;">
                <strong><i class="bi bi-check-circle me-2"></i>No artificial additives detected</strong>
                <p style="margin: 0.5rem 0 0;">This product uses only natural ingredients without synthetic preservatives, colors, or flavor enhancers.</p>
            </div>
        `;
    }
    
    return `
        <p><strong>Additives identified and their context:</strong></p>
        ${additives.map(add => `
            <div style="background: #FEF3C7; padding: 1rem; border-radius: 10px; margin: 0.5rem 0;">
                <strong>${add.name}</strong> (${add.chemicalName})<br>
                <small>${add.purpose}</small><br>
                <small style="color: #92400E; margin-top: 0.5rem; display: block;">
                    <em>Safe within regulated limits. Approved for use in food products.</em>
                </small>
            </div>
        `).join('')}
    `;
}

function generatePersonalWarnings(product, userProfile) {
    if (!userProfile.allergies || userProfile.allergies.length === 0) {
        return `
            <div style="background: #E0F2FE; padding: 1.5rem; border-radius: 12px;">
                <p style="margin: 0; color: #0369A1;">
                    <i class="bi bi-info-circle me-2"></i>
                    Complete your health profile to receive personalized allergy warnings.
                </p>
                <a href="survey.html" style="display: inline-block; margin-top: 1rem; color: #0369A1; font-weight: 600;">
                    Update Profile →
                </a>
            </div>
        `;
    }
    
    const warnings = [];
    const userAllergies = userProfile.allergies.filter(a => a !== 'none');
    
    // Check for allergen matches
    product.allergenRisks.forEach(risk => {
        userAllergies.forEach(allergy => {
            if (risk.toLowerCase().includes(allergy.toLowerCase())) {
                warnings.push({
                    allergen: allergy,
                    warning: risk,
                    severity: risk.toLowerCase().includes('contains') ? 'high' : 'moderate'
                });
            }
        });
    });
    
    if (warnings.length === 0) {
        return `
            <div style="background: #D1FAE5; padding: 1.5rem; border-radius: 12px; color: #059669;">
                <strong><i class="bi bi-check-circle me-2"></i>No allergen conflicts detected</strong>
                <p style="margin: 0.5rem 0 0;">Based on your profile (${userAllergies.join(', ')}), this product does not contain your listed allergens.</p>
            </div>
        `;
    }
    
    return `
        <div class="personal-warnings">
            <div class="warning-title">
                <i class="bi bi-exclamation-triangle-fill"></i>
                Allergen Alert for Your Profile
            </div>
            <ul class="warning-list">
                ${warnings.map(w => `
                    <li class="warning-item">
                        <i class="bi bi-dot"></i>
                        <div>
                            <strong>${w.allergen.charAt(0).toUpperCase() + w.allergen.slice(1)}:</strong> ${w.warning}
                            ${w.severity === 'high' ? '<br><em style="font-size: 0.875rem;">⚠️ Direct allergen detected - avoid if severely allergic</em>' : ''}
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}

function generateRecallInfo(product) {
    if (product.recalls.length === 0) {
        return `
            <div class="no-recalls">
                <i class="bi bi-shield-check" style="font-size: 1.5rem;"></i>
                <span>No active recalls or safety notices on record</span>
            </div>
            <p style="margin-top: 1rem; color: #6B7280; font-size: 0.875rem;">
                This product has no verified recalls from FDA, FSSAI, EU authorities, or other regulatory bodies.
            </p>
        `;
    }
    
    return `
        <div class="recall-section" style="background: #FEF3C7; border-color: #F59E0B;">
            <div class="recall-title" style="color: #92400E;">
                <i class="bi bi-exclamation-triangle-fill"></i>
                Past Recall History Found
            </div>
            ${product.recalls.map(recall => `
                <div style="background: white; padding: 1rem; border-radius: 10px; margin-bottom: 1rem;">
                    <strong>Date:</strong> ${recall.date}<br>
                    <strong>Authority:</strong> ${recall.authority}<br>
                    <strong>Reason:</strong> ${recall.reason}<br>
                    <strong>Current Status:</strong> <span style="color: #059669; font-weight: 600;">${recall.status}</span><br>
                    <small style="color: #6B7280; margin-top: 0.5rem; display: block;">
                        Source: ${recall.source}
                    </small>
                </div>
            `).join('')}
        </div>
    `;
}

function showError(message) {
    document.getElementById('loadingContainer').classList.remove('active');
    document.getElementById('productContainer').classList.add('active');
    document.getElementById('productContainer').innerHTML = `
        <div style="text-align: center; padding: 5rem 2rem;">
            <i class="bi bi-exclamation-circle" style="font-size: 5rem; color: var(--danger);"></i>
            <h2 style="margin-top: 2rem;">Product Not Found</h2>
            <p style="color: #6B7280;">${message}</p>
            <a href="dashboard.html" class="back-btn" style="display: inline-flex; margin-top: 2rem;">
                <i class="bi bi-arrow-left"></i>Return to Dashboard
            </a>
        </div>
    `;
}
function loadDynamicProduct(product) {

    document.getElementById("product-name").innerText = product.name;
    document.getElementById("brand-name").innerText = product.brand;

    document.getElementById("ingredients").innerText = product.ingredients;

    console.log("Nutriments:", product.nutriments);
    console.log("Nutriscore:", product.nutriscore);

    // Here you can plug into your 6-factor engine
    evaluateDynamicProduct(product);
}
function evaluateDynamicProduct(product) {

    let healthScore = 100;

    // Example scoring logic
    if (product.nutriscore === "e") healthScore -= 40;
    if (product.nutriscore === "d") healthScore -= 25;
    if (product.nutriscore === "c") healthScore -= 10;

    if (product.additives.length > 5) healthScore -= 20;

    if (product.ingredients.toLowerCase().includes("palm oil"))
        healthScore -= 10;

    document.getElementById("health-score").innerText =
        healthScore + "/100";
}

