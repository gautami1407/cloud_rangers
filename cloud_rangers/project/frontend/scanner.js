document.addEventListener("DOMContentLoaded", function () {

    let scanned = false; // prevent multiple scans

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#scanner'),
            constraints: {
                facingMode: "environment"
            }
        },
        decoder: {
            readers: ["ean_reader", "upc_reader"]
        }
    }, function (err) {
        if (err) {
            console.error(err);
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected(async function (data) {

        if (scanned) return; // prevent double scan
        scanned = true;

        const barcode = data.codeResult.code;
        console.log("Scanned:", barcode);

        try {

            const response = await fetch(
                `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
            );

            const result = await response.json();

            if (result.status === 1) {

                // Store product data
                localStorage.setItem(
                    "openFoodProduct",
                    JSON.stringify(result.product)
                );

                Quagga.stop();

                window.location.href = "product.html";

            } else {
                alert("Product not found in Open Food Facts.");
                scanned = false; // allow retry
            }

        } catch (error) {
            console.error(error);
            alert("Error fetching product data.");
            scanned = false;
        }

    });

});
