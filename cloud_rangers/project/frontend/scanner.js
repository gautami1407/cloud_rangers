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
