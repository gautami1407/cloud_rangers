document.addEventListener("DOMContentLoaded", function () {

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#scanner')
        },
        decoder: {
            readers: ["ean_reader", "upc_reader"]
        }
    }, function (err) {
        if (err) {
            console.log(err);
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected(function (data) {
        const code = data.codeResult.code;

        console.log("Scanned:", code);

        localStorage.setItem("scannedBarcode", code);

        Quagga.stop();

        window.location.href = "product.html";
    });

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
