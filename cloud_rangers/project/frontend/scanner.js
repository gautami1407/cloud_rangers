function transformOpenFoodData(product) {

    return {
        name: product.product_name || "Unknown Product",
        brand: product.brands || "Unknown Brand",
        ingredients: product.ingredients_text || "",
        nutrition: product.nutriments || {},
        additives: product.additives_tags || [],
        nutriscore: product.nutriscore_grade || "unknown",
        allergens: product.allergens || ""
    };
}

window.addEventListener('load', function () {

    const openFoodData = localStorage.getItem("openFoodProduct");

    if (openFoodData) {

        const parsedData = JSON.parse(openFoodData);
        const transformed = transformOpenFoodData(parsedData);

        loadDynamicProduct(transformed);

    } else {

        const selectedProduct = localStorage.getItem('selectedProduct') || 'Dark Chocolate Bar';
        loadProduct(selectedProduct);
    }

});


Quagga.onDetected(async function (data) {

    const barcode = data.codeResult.code;
    console.log("Scanned:", barcode);

    Quagga.stop();

    try {
        const response = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
        );

        const result = await response.json();

        if (result.status === 1) {

            // Store full product data
            localStorage.setItem("openFoodProduct", JSON.stringify(result.product));

            window.location.href = "product.html";

        } else {
            alert("Product not found in Open Food Facts database.");
        }

    } catch (error) {
        console.error(error);
        alert("Error fetching product data.");
    }

});
function loadDynamicProduct(product) {

    document.getElementById("product-name").innerText = product.name;
    document.getElementById("brand-name").innerText = product.brand;

    // Example: show ingredients
    document.getElementById("ingredients").innerText = product.ingredients;

    // Call your scoring engine
    evaluateProduct(product);
}
