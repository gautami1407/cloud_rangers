// ============================================
// AUTH CHECK
// ============================================
if (localStorage.getItem("isLoggedIn") !== "true") {
    window.location.href = "login.html";
}

// ============================================
// MAIN LOAD
// ============================================
window.addEventListener("DOMContentLoaded", () => {
    setupBarcodeScan();
});

let lastScannedBarcode = null;

function setupBarcodeScan() {
    const barcodeInput = document.getElementById("barcode-input");
    const fetchBtn = document.getElementById("fetch-barcode-btn");

    if (!barcodeInput || !fetchBtn) return;

    const barcodeHandler = async () => {
        const barcode = barcodeInput.value.trim();
        if (!barcode) return;
        if (barcode === lastScannedBarcode) return; // prevent repeat fetch
        lastScannedBarcode = barcode;

        await fetchProductByBarcode(barcode);
    };

    fetchBtn.addEventListener("click", barcodeHandler);
    barcodeInput.addEventListener("keypress", e => {
        if (e.key === "Enter") barcodeHandler();
    });
}

// ============================================
// FETCH PRODUCT FROM OPEN FOOD FACTS
// ============================================
async function fetchProductByBarcode(barcode) {
    const loading = document.getElementById("loadingContainer");
    const container = document.getElementById("productContainer");

    if (loading) loading.style.display = "block";
    if (container) container.style.display = "none";
    container.innerHTML = '';

    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);

        const data = await res.json();

        if (!data || data.status !== 1 || !data.product) {
            return showError("Product not found in OpenFoodFacts.");
        }

        const product = transformOpenFoodData(data.product);

        // Render immediately
        renderDynamicProduct(product, null);

        // Fetch AI analysis asynchronously
        analyzeIngredientsAI(product).then(aiData => {
            renderDynamicProduct(product, aiData); // update AI section
        });

        // Fetch news asynchronously
        fetchNews(product.name);

    } catch (err) {
        console.error("Error fetching data:", err);
        showError("Error fetching product from OpenFoodFacts.");
    } finally {
        if (loading) loading.style.display = "none";
    }
}
window.addEventListener("DOMContentLoaded", () => {
    startCameraScanner();
});

function startCameraScanner() {
    const codeReader = new ZXing.BrowserBarcodeReader();
    const videoElement = document.getElementById("video");
    const statusEl = document.getElementById("scan-status");

    codeReader
        .listVideoInputDevices()
        .then(videoInputDevices => {
            const firstDeviceId = videoInputDevices[0].deviceId;

            codeReader.decodeFromVideoDevice(firstDeviceId, videoElement, (result, err) => {
                if (result) {
                    const barcode = result.text;
                    statusEl.textContent = `Barcode detected: ${barcode}`;
                    fetchProductByBarcode(barcode);
                    codeReader.reset(); // stop scanning after one scan
                }
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.error(err);
                }
            });
        })
        .catch(err => {
            console.error("Camera init error:", err);
            statusEl.textContent = "Error accessing camera. Use manual input instead.";
        });
}
